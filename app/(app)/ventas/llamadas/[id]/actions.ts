"use server";

import { createSupabaseServer } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

const VALID_RESULTS = ["pendiente", "cerro", "no_cerro", "no_show", "reagendar"] as const;
type Result = (typeof VALID_RESULTS)[number];

function resultToStage(r: Result): string | null {
  switch (r) {
    case "cerro":
      return "cerrado";
    case "no_cerro":
      return "no_cerro";
    case "no_show":
      return "reactivacion";
    case "reagendar":
      return "agendado";
    default:
      return null;
  }
}

export async function updateCallResult(formData: FormData) {
  const callId = String(formData.get("call_id") || "");
  if (!callId) return { ok: false, error: "ID de llamada inválido" } as const;

  const result = String(formData.get("result") || "pendiente") as Result;
  if (!VALID_RESULTS.includes(result)) {
    return { ok: false, error: "Resultado inválido" } as const;
  }

  const closeReason = (formData.get("close_reason") as string) || null;
  const notes = (formData.get("notes") as string) || null;

  const priceRaw = formData.get("price_quoted");
  let price: number | null = null;
  if (priceRaw !== null && priceRaw !== "") {
    const n = Number(priceRaw);
    price = Number.isFinite(n) && n >= 0 ? n : null;
  }

  const currency = ((formData.get("currency") as string) || "USD").toUpperCase();

  const supabase = await createSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Sin sesión" } as const;

  // Update the call row
  const { data: updated, error } = await supabase
    .from("calls")
    .update({
      result,
      close_reason: closeReason,
      notes,
      price_quoted: price,
      currency,
      updated_at: new Date().toISOString(),
    })
    .eq("id", callId)
    .select("id, lead_id")
    .single();

  if (error) {
    return { ok: false, error: error.message } as const;
  }

  // If result maps to a lead stage, move the lead
  const nextStage = resultToStage(result);
  if (updated?.lead_id && nextStage) {
    await supabase
      .from("leads")
      .update({
        stage: nextStage,
        stage_updated_at: new Date().toISOString(),
        last_interaction_at: new Date().toISOString(),
      })
      .eq("id", updated.lead_id);

    // Log as interaction
    await supabase.from("lead_interactions").insert({
      lead_id: updated.lead_id,
      kind: "call_result",
      direction: "internal",
      channel: "manual",
      summary: `Resultado de llamada: ${result}${closeReason ? ` — ${closeReason}` : ""}`,
      payload: { result, close_reason: closeReason, price_quoted: price, currency },
      actor_type: "setter",
      occurred_at: new Date().toISOString(),
    });
  }

  revalidatePath(`/ventas/llamadas/${callId}`);
  revalidatePath("/ventas/llamadas");
  revalidatePath("/ventas");
  revalidatePath("/ventas/pipeline");
  revalidatePath("/ventas/listado");

  return { ok: true } as const;
}
