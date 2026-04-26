import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Severidad derivada de la columna `severity` de validation_rules.
 * - `error_block`: bloquea la publicación.
 * - `alerta_revision`: requiere revisión manual.
 * - `sugerencia`: mejora opcional.
 */
export type RuleSeverity = "error_block" | "alerta_revision" | "sugerencia";

/**
 * Estado de una regla aplicada a un content_piece:
 * - `pass`: la pieza cumple.
 * - `fail`: la pieza infringe la regla.
 * - `manual`: la regla no se puede verificar automáticamente (requiere OCR
 *   o lectura humana de las slides); aparece en la UI como checklist.
 */
export type FindingStatus = "pass" | "fail" | "manual";

export interface ValidationRule {
  id: number;
  code: string;
  category: string;
  severity: RuleSeverity;
  title: string;
  description: string;
  check_logic: string | null;
  suggested_fix: string | null;
  sort_order: number;
}

export interface ValidationFinding {
  code: string;
  category: string;
  severity: RuleSeverity;
  title: string;
  description: string;
  suggested_fix: string | null;
  status: FindingStatus;
  details: string | null; // Explicación específica del caso (ej.: "keyword=VOLEY")
}

export interface ValidationReport {
  piece_id: string;
  validated_at: string; // ISO datetime
  status: "ok" | "warn" | "blocked";
  // counts
  passed: number;
  failed: number;
  manual: number;
  blockers: number; // fail + severity=error_block
  findings: ValidationFinding[];
}

/**
 * Datos de la pieza que consume el runner. Se arma en el server-side
 * antes de llamar a runValidation(): la función ya no toca Supabase.
 */
export interface ValidationContext {
  piece: {
    id: string;
    titulo: string;
    tipo: string;
    estado: string;
    plataforma: string | null;
    cuerpo: string | null;
    caption: string | null;
    scheduled_date: string | null;
    publicar_en: string | null;
    week_type_code: string | null;
    funnel_type: string | null;
    keyword_id: number | null;
    template_id: number | null;
    pillar_id: number | null;
  };
  // Contexto resuelto
  weekday: number | null; // 1=Lun..7=Dom calculado de scheduled_date
  keyword: {
    id: number;
    keyword: string;
    valid_days: string[];
    status: string;
  } | null;
  template: {
    id: number;
    name: string;
    producer: string | null;
  } | null;
  // Piezas vecinas (mismo día, misma semana, últimas 2 semanas) usadas
  // para las reglas G5 y G7.
  same_day_pieces: Array<{
    id: string;
    pillar_id: number | null;
    template_id: number | null;
  }>;
  previous_day_piece: {
    id: string;
    template_id: number | null;
  } | null;
  // Testimonios y capturas documentadas — para G2 y G6.
  documented_testimonials_count: number;
  documented_captures_count: number;
}

const DAY_CODE_BY_ISO: Record<number, string> = {
  1: "mon",
  2: "tue",
  3: "wed",
  4: "thu",
  5: "fri",
  6: "sat",
  7: "sun",
};

function isoWeekdayFromDate(iso: string | null): number | null {
  if (!iso) return null;
  const [y, m, d] = iso.slice(0, 10).split("-").map(Number);
  if (!y || !m || !d) return null;
  const dt = new Date(y, m - 1, d);
  // getDay: 0=Sun..6=Sat -> convert to ISO 1=Mon..7=Sun
  const js = dt.getDay();
  return js === 0 ? 7 : js;
}

/**
 * Arma el ValidationContext leyendo el piece + sus vecinos + catálogos.
 * Separa I/O de la lógica pura del runner para facilitar tests.
 */
export async function buildValidationContext(
  supabase: SupabaseClient,
  pieceId: string,
): Promise<ValidationContext | null> {
  const pieceRes = await supabase
    .from("content_pieces")
    .select(
      "id,titulo,tipo,estado,plataforma,cuerpo,caption,scheduled_date,publicar_en,week_type_code,funnel_type,keyword_id,template_id,pillar_id",
    )
    .eq("id", pieceId)
    .maybeSingle();
  if (pieceRes.error) throw pieceRes.error;
  if (!pieceRes.data) return null;
  const piece = pieceRes.data as ValidationContext["piece"];

  const weekday = isoWeekdayFromDate(piece.scheduled_date || piece.publicar_en);

  const keywordPromise = piece.keyword_id
    ? supabase
        .from("manychat_keywords")
        .select("id,keyword,valid_days,status")
        .eq("id", piece.keyword_id)
        .maybeSingle()
    : Promise.resolve({ data: null, error: null } as const);
  const templatePromise = piece.template_id
    ? supabase
        .from("design_templates")
        .select("id,name,producer")
        .eq("id", piece.template_id)
        .maybeSingle()
    : Promise.resolve({ data: null, error: null } as const);
  const testimonialsPromise = supabase
    .from("testimonials")
    .select("id", { count: "exact", head: true })
    .eq("active", true);
  const capturesPromise = supabase
    .from("whatsapp_captures")
    .select("id", { count: "exact", head: true })
    .eq("active", true);

  // Piezas del mismo día (excluyendo la propia)
  const sameDayPromise = piece.scheduled_date
    ? supabase
        .from("content_pieces")
        .select("id,pillar_id,template_id,scheduled_date")
        .eq("scheduled_date", piece.scheduled_date)
        .neq("id", piece.id)
    : Promise.resolve({ data: [], error: null } as const);

  // Pieza del día anterior (para G5_04)
  const prevDay = piece.scheduled_date
    ? addDaysIso(piece.scheduled_date, -1)
    : null;
  const prevDayPromise = prevDay
    ? supabase
        .from("content_pieces")
        .select("id,template_id")
        .eq("scheduled_date", prevDay)
        .order("publicar_en", { ascending: false })
        .limit(1)
    : Promise.resolve({ data: [], error: null } as const);

  const [
    keywordRes,
    templateRes,
    testimonialsRes,
    capturesRes,
    sameDayRes,
    prevDayRes,
  ] = await Promise.all([
    keywordPromise,
    templatePromise,
    testimonialsPromise,
    capturesPromise,
    sameDayPromise,
    prevDayPromise,
  ]);
  if (keywordRes.error) throw keywordRes.error;
  if (templateRes.error) throw templateRes.error;
  if (testimonialsRes.error) throw testimonialsRes.error;
  if (capturesRes.error) throw capturesRes.error;
  if (sameDayRes.error) throw sameDayRes.error;
  if (prevDayRes.error) throw prevDayRes.error;

  const prevList = (prevDayRes.data || []) as Array<{
    id: string;
    template_id: number | null;
  }>;

  return {
    piece,
    weekday,
    keyword: (keywordRes.data as ValidationContext["keyword"]) ?? null,
    template: (templateRes.data as ValidationContext["template"]) ?? null,
    same_day_pieces: (sameDayRes.data || []) as ValidationContext["same_day_pieces"],
    previous_day_piece: prevList[0] ?? null,
    documented_testimonials_count:
      (testimonialsRes.count as number | null) ?? 0,
    documented_captures_count: (capturesRes.count as number | null) ?? 0,
  };
}

function addDaysIso(iso: string, days: number): string {
  const [y, m, d] = iso.slice(0, 10).split("-").map(Number);
  const dt = new Date(y, (m ?? 1) - 1, d);
  dt.setDate(dt.getDate() + days);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())}`;
}

// ================================================================
// Checkers por código de regla.
// Cada uno devuelve un FindingStatus + detalles. Si la regla no aplica
// a la pieza (por falta de datos), devuelve 'pass'.
// ================================================================

type Checker = (ctx: ValidationContext) => {
  status: FindingStatus;
  details: string | null;
};

const checkers: Record<string, Checker> = {
  // ----- G1 keywords -----
  G1_01: (ctx) => {
    if (!ctx.keyword) return { status: "pass", details: null };
    if (ctx.keyword.keyword.toUpperCase() === "VOLEY") {
      return {
        status: "fail",
        details: `La pieza tiene asignada la keyword VOLEY (flow inactivo).`,
      };
    }
    return { status: "pass", details: null };
  },
  G1_02: (ctx) => {
    if (!ctx.keyword || ctx.weekday === null)
      return { status: "pass", details: null };
    const kw = ctx.keyword.keyword.toUpperCase();
    if (
      (kw === "RESULTADOS" || kw === "V12") &&
      [4, 5, 6, 7].includes(ctx.weekday) &&
      ctx.piece.week_type_code === "cerrado_normal"
    ) {
      return {
        status: "fail",
        details: `${kw} no está permitida en ${weekdayLabel(ctx.weekday)} de semana cerrada.`,
      };
    }
    return { status: "pass", details: null };
  },
  G1_03: (ctx) => {
    if (!ctx.keyword || ctx.weekday === null)
      return { status: "pass", details: null };
    if (ctx.weekday === 6 || ctx.weekday === 7) {
      return {
        status: "fail",
        details: `La pieza tiene keyword asignada un ${weekdayLabel(ctx.weekday)} (Emanuel no disponible).`,
      };
    }
    // Chequear también valid_days si la keyword los tiene
    if (ctx.keyword.valid_days.length > 0) {
      const todayCode = DAY_CODE_BY_ISO[ctx.weekday];
      if (!ctx.keyword.valid_days.includes(todayCode)) {
        return {
          status: "fail",
          details: `La keyword ${ctx.keyword.keyword} no está habilitada en ${weekdayLabel(ctx.weekday)} (valid_days: ${ctx.keyword.valid_days.join(", ")}).`,
        };
      }
    }
    return { status: "pass", details: null };
  },
  G1_04: (ctx) => {
    // Buscar dos keywords en un mismo CTA — heurística sobre caption.
    if (!ctx.piece.caption) return { status: "pass", details: null };
    const matches = ctx.piece.caption.match(
      /\*\*(RESULTADOS|TEST|SALTO|RODILLA|POTENCIA|ATAQUE|V12|VOLEY)\*\*/g,
    );
    if (matches && matches.length >= 2) {
      return {
        status: "fail",
        details: `Se detectaron ${matches.length} keywords en la caption: ${matches.join(", ")}.`,
      };
    }
    return { status: "pass", details: null };
  },
  G1_05: () => ({
    status: "manual",
    details:
      "Verificar manualmente que el CTA prometa lo mismo que entrega el flow de la keyword.",
  }),

  // ----- G2 prueba social -----
  G2_01: (ctx) => {
    if (ctx.template?.producer?.toLowerCase() !== "claude")
      return { status: "pass", details: null };
    return {
      status: "manual",
      details:
        "Template producido por Claude: revisar manualmente que no aparezcan nombres reales de jugadores.",
    };
  },
  G2_02: (ctx) => {
    if (ctx.template?.producer?.toLowerCase() !== "claude")
      return { status: "pass", details: null };
    return {
      status: "manual",
      details:
        "Template producido por Claude: revisar manualmente que no haya capturas de WhatsApp.",
    };
  },
  G2_03: (ctx) => {
    if (ctx.template?.producer?.toLowerCase() !== "claude")
      return { status: "pass", details: null };
    const text = (ctx.piece.cuerpo ?? "") + " " + (ctx.piece.caption ?? "");
    if (/\+?\d{1,2}\s?%/g.test(text)) {
      return {
        status: "fail",
        details: "Se detectó un porcentaje de mejora en una pieza producida por Claude.",
      };
    }
    return {
      status: "manual",
      details:
        "Template producido por Claude: confirmar que no haya porcentajes de mejora en los slides.",
    };
  },
  G2_04: (ctx) => {
    // Si hay cm de salto en el cuerpo/caption, la regla pide que esté en testimonials.
    const text = (ctx.piece.cuerpo ?? "") + " " + (ctx.piece.caption ?? "");
    if (/\d{2,3}\s?cm/i.test(text)) {
      if (ctx.documented_testimonials_count === 0) {
        return {
          status: "fail",
          details:
            "La pieza menciona un resultado en cm pero no hay testimonios cargados en la DB.",
        };
      }
      return {
        status: "manual",
        details:
          "La pieza menciona cm de salto — verificá manualmente que el resultado esté en la lista documentada.",
      };
    }
    return { status: "pass", details: null };
  },
  G2_05: (ctx) => {
    const text = (ctx.piece.cuerpo ?? "") + " " + (ctx.piece.caption ?? "");
    if (/whatsapp|captura|chat/i.test(text)) {
      return {
        status: "manual",
        details:
          "Se detectó mención a WhatsApp/chat/captura — confirmar que el texto sea literal y esté en la lista documentada.",
      };
    }
    return { status: "pass", details: null };
  },

  // ----- G3 voz / tono -----
  G3_01: (ctx) => {
    const text = `${ctx.piece.cuerpo ?? ""} ${ctx.piece.caption ?? ""}`.toLowerCase();
    if (/transferencia|transferir/i.test(text)) {
      return {
        status: "fail",
        details: 'Usa "transferencia/transferir" — palabra evitada por V12.',
      };
    }
    return { status: "pass", details: null };
  },
  G3_02: (ctx) => {
    const text = `${ctx.piece.cuerpo ?? ""} ${ctx.piece.caption ?? ""}`.toLowerCase();
    if (/prevenci[oó]n de lesiones/i.test(text)) {
      return {
        status: "fail",
        details: 'Usa "prevención de lesiones" — reemplazar por "cuidarse de lesiones".',
      };
    }
    return { status: "pass", details: null };
  },
  G3_03: (ctx) => {
    const text = `${ctx.piece.cuerpo ?? ""} ${ctx.piece.caption ?? ""}`;
    // Heurística: detectar palabras comunes en inglés (ignora nombres propios típicos).
    const english =
      /\b(the|your|please|click|download|training|performance|jump|workout|get|now)\b/i;
    if (english.test(text)) {
      return {
        status: "manual",
        details:
          "Se detectaron palabras que parecen inglés — revisar si hace falta traducir.",
      };
    }
    return { status: "pass", details: null };
  },
  G3_04: (ctx) => {
    const cap = ctx.piece.caption ?? "";
    const head = cap.slice(0, 125).toLowerCase();
    if (!cap) {
      return {
        status: "manual",
        details: "No hay caption — no se puede verificar los primeros 125 caracteres.",
      };
    }
    if (!/vole(ibol|y)/i.test(head)) {
      return {
        status: "fail",
        details: `Falta "voleibol" o "vóley" en los primeros 125 caracteres de la caption.`,
      };
    }
    return { status: "pass", details: null };
  },
  G3_05: (ctx) => {
    const body = ctx.piece.cuerpo ?? "";
    if (body.trim().length === 0) {
      return {
        status: "manual",
        details:
          "No hay cuerpo cargado — revisar manualmente que los slides mencionen voleibol/vóley.",
      };
    }
    if (!/vole(ibol|y)/i.test(body)) {
      return {
        status: "manual",
        details: `"Voleibol" o "vóley" no aparece en el cuerpo — confirmar visualmente en los slides.`,
      };
    }
    return { status: "pass", details: null };
  },

  // ----- G4 identidad visual (todas manual por ahora) -----
  G4_01: () => ({
    status: "manual",
    details: "Verificá visualmente que @mateogsoto no aparezca en slide 1 o 2.",
  }),
  G4_02: () => ({
    status: "manual",
    details: "Verificá que el logo V12 no aparezca en ningún slide ni frame.",
  }),
  G4_03: () => ({
    status: "manual",
    details: "Verificá que el doodle (avatar + balón) no esté en la pieza.",
  }),
  G4_04: () => ({
    status: "manual",
    details:
      "Chequear que todos los colores pertenezcan a la paleta oficial V12 (navy/naranja/beige/blanco/negro/crema/verde/rojo).",
  }),

  // ----- G5 arco semanal -----
  G5_01: (ctx) => {
    if (ctx.piece.funnel_type !== "CONV" || ctx.weekday === null)
      return { status: "pass", details: null };
    if (
      ctx.weekday !== 5 &&
      ctx.piece.week_type_code === "cerrado_normal"
    ) {
      return {
        status: "fail",
        details: `Pieza de conversión agendada un ${weekdayLabel(ctx.weekday)} en semana cerrada (debería ser viernes).`,
      };
    }
    return { status: "pass", details: null };
  },
  G5_02: (ctx) => {
    if (ctx.piece.funnel_type !== "PRUE" || ctx.weekday === null)
      return { status: "pass", details: null };
    if (ctx.weekday !== 3) {
      return {
        status: "fail",
        details: `Pieza de prueba agendada un ${weekdayLabel(ctx.weekday)} (debería ser miércoles).`,
      };
    }
    return { status: "pass", details: null };
  },
  G5_03: (ctx) => {
    if (!ctx.piece.pillar_id) return { status: "pass", details: null };
    const samePillar = ctx.same_day_pieces.filter(
      (p) => p.pillar_id === ctx.piece.pillar_id,
    );
    if (samePillar.length >= 1) {
      return {
        status: "fail",
        details: `Hay ${samePillar.length} pieza(s) más con el mismo pilar el mismo día.`,
      };
    }
    return { status: "pass", details: null };
  },
  G5_04: (ctx) => {
    if (!ctx.piece.template_id || !ctx.previous_day_piece)
      return { status: "pass", details: null };
    if (ctx.previous_day_piece.template_id === ctx.piece.template_id) {
      return {
        status: "fail",
        details: "El día anterior se usó el mismo template — alternar formatos.",
      };
    }
    return { status: "pass", details: null };
  },
  G5_05: (ctx) => {
    if (ctx.template?.producer?.toLowerCase() !== "pachu")
      return { status: "pass", details: null };
    const samePachu = ctx.same_day_pieces.filter(
      (p) => p.template_id === ctx.piece.template_id,
    );
    // Chequeamos por producer sería más exacto, pero si viene el mismo template_id (de Pachu), ya es señal.
    if (samePachu.length >= 1) {
      return {
        status: "fail",
        details:
          "Pachu ya está asignada a otra pieza el mismo día — no debería aparecer dos veces.",
      };
    }
    return { status: "pass", details: null };
  },

  // ----- G6 inventado (todas manual — requieren cross-ref humano) -----
  G6_01: (ctx) => ({
    status: "manual",
    details:
      ctx.documented_testimonials_count > 0
        ? `Hay ${ctx.documented_testimonials_count} testimonios documentados — confirmá que los que aparezcan en la pieza estén ahí.`
        : "No hay testimonios cargados — cualquier testimonio aquí requiere fuente.",
  }),
  G6_02: () => ({
    status: "manual",
    details:
      "Chequear que cualquier dato técnico (porcentajes, estudios) tenga fuente documentada.",
  }),
  G6_03: (ctx) => {
    const text = `${ctx.piece.cuerpo ?? ""} ${ctx.piece.caption ?? ""}`;
    if (!/whatsapp|captura/i.test(text)) return { status: "pass", details: null };
    if (ctx.documented_captures_count === 0) {
      return {
        status: "fail",
        details:
          "La pieza menciona capturas de WhatsApp pero no hay capturas cargadas en la DB.",
      };
    }
    return {
      status: "manual",
      details: `Confirmá que la captura usada esté en la lista (${ctx.documented_captures_count} capturas cargadas).`,
    };
  },

  // ----- G7 repetición -----
  G7_01: () => ({
    status: "manual",
    details:
      "Revisá el historial de los últimos 7 días: si el tema se repite el mismo día, elegí otra variante.",
  }),
  G7_02: () => ({
    status: "manual",
    details:
      "Verificá que el jugador/testimonio no se haya usado más de una vez en los últimos 14 días.",
  }),
};

function weekdayLabel(n: number): string {
  return (
    ["lunes", "martes", "miércoles", "jueves", "viernes", "sábado", "domingo"][
      n - 1
    ] || `día ${n}`
  );
}

/**
 * Ejecuta todas las reglas activas contra el contexto y arma el reporte.
 */
export function runValidation(
  rules: ValidationRule[],
  ctx: ValidationContext,
): ValidationReport {
  const findings: ValidationFinding[] = [];
  let passed = 0;
  let failed = 0;
  let manual = 0;
  let blockers = 0;

  for (const rule of rules) {
    const check = checkers[rule.code];
    const result = check
      ? check(ctx)
      : { status: "manual" as FindingStatus, details: null };

    findings.push({
      code: rule.code,
      category: rule.category,
      severity: rule.severity,
      title: rule.title,
      description: rule.description,
      suggested_fix: rule.suggested_fix,
      status: result.status,
      details: result.details,
    });

    if (result.status === "pass") passed++;
    else if (result.status === "fail") {
      failed++;
      if (rule.severity === "error_block") blockers++;
    } else manual++;
  }

  const status: ValidationReport["status"] =
    blockers > 0 ? "blocked" : failed + manual > 0 ? "warn" : "ok";

  return {
    piece_id: ctx.piece.id,
    validated_at: new Date().toISOString(),
    status,
    passed,
    failed,
    manual,
    blockers,
    findings,
  };
}

export async function fetchValidationRules(
  supabase: SupabaseClient,
): Promise<ValidationRule[]> {
  const { data, error } = await supabase
    .from("validation_rules")
    .select("id,code,category,severity,title,description,check_logic,suggested_fix,sort_order")
    .eq("active", true)
    .order("sort_order");
  if (error) throw error;
  return (data || []) as ValidationRule[];
}

/**
 * Corre el validador completo contra un content_piece y persiste el reporte
 * en content_pieces.validation_report + validation_status.
 * Devuelve el reporte.
 */
export async function validateAndPersist(
  supabase: SupabaseClient,
  pieceId: string,
): Promise<ValidationReport | null> {
  const [rules, ctx] = await Promise.all([
    fetchValidationRules(supabase),
    buildValidationContext(supabase, pieceId),
  ]);
  if (!ctx) return null;
  const report = runValidation(rules, ctx);

  const { error } = await supabase
    .from("content_pieces")
    .update({
      validation_report: report as unknown as Record<string, unknown>,
      validation_status: report.status,
    })
    .eq("id", pieceId);
  if (error) throw error;

  return report;
}

/**
 * Lista de piezas candidatas a validar: todas las que estén en
 * estado borrador/revision/listo (no idea ni publicado ni archivado).
 */
export async function fetchValidationCandidates(supabase: SupabaseClient) {
  const { data, error } = await supabase
    .from("content_pieces")
    .select(
      "id,titulo,tipo,estado,plataforma,scheduled_date,publicar_en,validation_status,validation_report",
    )
    .in("estado", ["borrador", "revision", "listo"])
    .order("scheduled_date", { ascending: true, nullsFirst: false })
    .order("updated_at", { ascending: false });
  if (error) throw error;
  return (data || []) as Array<{
    id: string;
    titulo: string;
    tipo: string;
    estado: string;
    plataforma: string | null;
    scheduled_date: string | null;
    publicar_en: string | null;
    validation_status: string;
    validation_report: ValidationReport | Record<string, never>;
  }>;
}
