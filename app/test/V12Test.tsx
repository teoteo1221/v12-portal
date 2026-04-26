"use client";

import { useState } from "react";
import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  ResponsiveContainer,
} from "recharts";

const V12 = {
  navy:      "#173B61",
  navyLight: "#1E4A7A",
  orange:    "#F3701E",
  beige:     "#E8D8C9",
  white:     "#FFFFFF",
  greyLight: "#A8B4C2",
  red:       "#E04040",
  green:     "#2EAD65",
  yellow:    "#E8A838",
  bgDark:    "#0D1F33",
  bgCard:    "#132D4A",
  border:    "rgba(255,255,255,0.08)",
};

type Position = "Punta / Receptor" | "Central" | "Opuesto" | "Armador" | "Líbero";
type Sex = "male" | "female";

const positions: Position[] = ["Punta / Receptor", "Central", "Opuesto", "Armador", "Líbero"];

const benchmarks: Record<Position, Record<Sex, { low: number; avg: number; good: number; elite: number }>> = {
  "Punta / Receptor": { male: { low: 42, avg: 50, good: 58, elite: 65 }, female: { low: 28, avg: 34, good: 42, elite: 50 } },
  "Central":          { male: { low: 40, avg: 48, good: 56, elite: 63 }, female: { low: 27, avg: 33, good: 40, elite: 48 } },
  "Opuesto":          { male: { low: 43, avg: 51, good: 59, elite: 66 }, female: { low: 29, avg: 35, good: 43, elite: 51 } },
  "Armador":          { male: { low: 35, avg: 42, good: 50, elite: 58 }, female: { low: 25, avg: 30, good: 37, elite: 44 } },
  "Líbero":           { male: { low: 33, avg: 40, good: 48, elite: 55 }, female: { low: 24, avg: 29, good: 35, elite: 42 } },
};

const positionDemands: Record<Position, { icon: string; title: string; desc: string }[]> = {
  "Punta / Receptor": [
    { icon: "⬆️", title: "Potencia de salto máxima",  desc: "Necesitás el mayor pico de fuerza en el menor tiempo posible para el remate." },
    { icon: "🦵", title: "Cuidar la rodilla",          desc: "El volumen de saltos y aterrizajes en tu posición es el más alto de la cancha." },
    { icon: "🔄", title: "Resistencia de salto",       desc: "No alcanza saltar alto una vez — necesitás mantenerlo en el 3er set." },
    { icon: "💪", title: "Fuerza de tren superior",    desc: "La potencia del remate viene del hombro, pecho y espalda bien entrenados." },
  ],
  "Central": [
    { icon: "⚡", title: "Velocidad reactiva",         desc: "Bloqueás en décimas de segundo. Tu sistema nervioso necesita estar entrenado para eso." },
    { icon: "↔️", title: "Desplazamientos laterales",  desc: "Cubrís todo el frente de la red. La agilidad lateral es tu cualidad clave." },
    { icon: "🦵", title: "Cuidar la rodilla",          desc: "Los bloqueos repetidos son de las acciones con más carga articular del vóley." },
    { icon: "💪", title: "Fuerza de tren superior",    desc: "Un bloqueo firme necesita brazos y hombros fuertes para no perder la posición." },
  ],
  "Opuesto": [
    { icon: "⬆️", title: "Pico de salto máximo",      desc: "Sos el principal rematador del equipo. Tu altura de remate define las opciones del ataque." },
    { icon: "💪", title: "Potencia de brazo",          desc: "El opuesto remata desde cualquier posición y necesita generar fuerza en condiciones difíciles." },
    { icon: "🦵", title: "Cuidar la rodilla",          desc: "Saltos repetitivos desde zona 2 generan carga asimétrica que hay que manejar." },
    { icon: "🔄", title: "Resistencia de potencia",   desc: "Necesitás mantener la fuerza del remate durante todo el partido, no solo en el primero." },
  ],
  "Armador": [
    { icon: "⚡", title: "Velocidad y agilidad",       desc: "Tomás decisiones en menos de un segundo. Tu rapidez de desplazamiento cambia el juego." },
    { icon: "🦵", title: "Cuidar la rodilla y tobillo",desc: "Los cambios de dirección constantes cargan mucho las articulaciones del tren inferior." },
    { icon: "💪", title: "Fuerza de muñeca y hombro", desc: "Armás decenas de veces por partido. La estabilidad del hombro te cuida y mejora tu precisión." },
    { icon: "🔋", title: "Resistencia específica",     desc: "Sos el jugador con más toques del equipo. Tu capacidad aeróbica-anaeróbica define tu nivel al final." },
  ],
  "Líbero": [
    { icon: "⚡", title: "Velocidad reactiva y agilidad",desc: "Llegás a bolas que los demás no llegan. Eso es pura velocidad de reacción y desplazamiento." },
    { icon: "↔️", title: "Fuerza de frenado",          desc: "Frenar y cambiar de dirección sin cargarte la rodilla requiere fuerza excéntrica específica." },
    { icon: "🦵", title: "Cuidar la espalda baja",     desc: "Bucear repetidamente genera sobrecarga lumbar que con el tiempo se convierte en lesión." },
    { icon: "🔋", title: "Resistencia y recuperación", desc: "Jugás prácticamente todos los puntos. Tu capacidad de recuperar entre jugadas define tu nivel." },
  ],
};

type Dim = "potencia" | "fuerza" | "agilidad" | "resistencia" | "salud" | "hábito" | "mentalidad";

const dimensionNames: Record<Dim, string> = {
  potencia:    "Potencia",
  fuerza:      "Fuerza",
  agilidad:    "Agilidad",
  resistencia: "Resistencia",
  salud:       "Salud",
  hábito:      "Hábito",
  mentalidad:  "Mentalidad",
};

type Question = {
  id: string;
  dim: Dim | null;
  text: string;
  sub?: string;
  options: { label: string; value: number | string; icon: string }[];
};

const questions: Question[] = [
  {
    id: "sex", dim: null, text: "¿Cuál es tu sexo?",
    options: [
      { label: "Masculino", value: "male",   icon: "♂" },
      { label: "Femenino",  value: "female", icon: "♀" },
    ],
  },
  {
    id: "position", dim: null, text: "¿Cuál es tu posición principal?",
    options: positions.map((p) => ({
      label: p, value: p,
      icon: p === "Punta / Receptor" ? "🏐" : p === "Central" ? "🧱" : p === "Opuesto" ? "💥" : p === "Armador" ? "🎯" : "🛡",
    })),
  },
  {
    id: "age", dim: null, text: "¿Cuántos años tenés?",
    options: [
      { label: "15–17", value: "15-17", icon: "🔰" },
      { label: "18–21", value: "18-21", icon: "⚡" },
      { label: "22–28", value: "22-28", icon: "🔥" },
      { label: "29–35", value: "29-35", icon: "💪" },
      { label: "+35",   value: "35+",   icon: "🏆" },
    ],
  },
  {
    id: "jump", dim: "potencia",
    text: "¿Cuánto saltás en CMJ (salto sin carrera)?",
    sub:  "Si nunca mediste, estimá. Si no tenés idea, elegí 'No sé'.",
    options: [
      { label: "Menos de 30 cm", value: 1, icon: "📏" },
      { label: "30–39 cm",       value: 2, icon: "📏" },
      { label: "40–49 cm",       value: 3, icon: "📏" },
      { label: "50–59 cm",       value: 4, icon: "📏" },
      { label: "60 cm o más",    value: 5, icon: "🚀" },
      { label: "No sé",          value: 2, icon: "❓" },
    ],
  },
  {
    id: "strength", dim: "fuerza",
    text: "¿Hacés entrenamiento de fuerza regularmente?",
    options: [
      { label: "Nunca entrené fuerza",              value: 1, icon: "❌" },
      { label: "Muy poco o inconsistente",           value: 2, icon: "😅" },
      { label: "1–2 veces/semana, hace poco",        value: 3, icon: "💪" },
      { label: "2–3 veces/semana, hace 6+ meses",   value: 4, icon: "🏋️" },
      { label: "3+ veces/semana, hace 1+ año",       value: 5, icon: "⚡" },
    ],
  },
  {
    id: "agility", dim: "agilidad",
    text: "¿Cómo describís tu velocidad para llegar a las bolas difíciles?",
    options: [
      { label: "Llego tarde a casi todo",            value: 1, icon: "🐢" },
      { label: "A veces llego, a veces no",          value: 2, icon: "😐" },
      { label: "Llego en la mayoría de los casos",   value: 3, icon: "🙂" },
      { label: "Soy de los más rápidos del equipo",  value: 4, icon: "⚡" },
      { label: "Referente defensivo del equipo",     value: 5, icon: "🦅" },
    ],
  },
  {
    id: "resistance", dim: "resistencia",
    text: "¿Cómo te sentís físicamente en el 3er set o partido seguido?",
    options: [
      { label: "Me caigo a pedazos en el 3er set",             value: 1, icon: "😵" },
      { label: "Bajo mucho el nivel en el final del partido",   value: 2, icon: "😓" },
      { label: "Me mantengo pero noto el cansancio",            value: 3, icon: "😐" },
      { label: "Rindo casi igual todo el partido",              value: 4, icon: "💪" },
      { label: "Mi rendimiento no baja, incluso en doble fecha",value: 5, icon: "🔥" },
    ],
  },
  {
    id: "injury", dim: "salud",
    text: "¿Tenés algún dolor o molestia que te limite hoy?",
    options: [
      { label: "Sí, molestia crónica que me frena",           value: 1, icon: "🚨" },
      { label: "Sí, algo que siento pero puedo jugar",        value: 2, icon: "⚠️" },
      { label: "A veces aparece pero no es constante",        value: 3, icon: "🟡" },
      { label: "Casi nunca, muy eventualmente",               value: 4, icon: "🟢" },
      { label: "Sin ninguna molestia, me siento bien",        value: 5, icon: "✅" },
    ],
  },
  {
    id: "consistency", dim: "hábito",
    text: "¿Con qué frecuencia entrenás físico además de los entrenamientos de vóley?",
    options: [
      { label: "Solo vóley, nada de físico extra",                   value: 1, icon: "🏐" },
      { label: "Muy irregular, cuando puedo",                        value: 2, icon: "😅" },
      { label: "1 vez/semana más o menos",                           value: 3, icon: "📅" },
      { label: "2–3 veces/semana con cierta consistencia",           value: 4, icon: "💪" },
      { label: "3+ veces/semana, es parte de mi rutina hace meses",  value: 5, icon: "🏆" },
    ],
  },
  {
    id: "mindset", dim: "mentalidad",
    text: "¿Cómo describís tu relación con el entrenamiento físico?",
    options: [
      { label: "Lo evito, no es lo mío",                        value: 1, icon: "😶" },
      { label: "Lo hago cuando toca, sin motivación extra",     value: 2, icon: "😑" },
      { label: "Me cuesta pero lo hago",                        value: 3, icon: "🙂" },
      { label: "Lo disfruto y lo busco activamente",            value: 4, icon: "😊" },
      { label: "Es parte de mi identidad como jugador",         value: 5, icon: "🔥" },
    ],
  },
];

function getJumpScore(value: number, sex: Sex | undefined, position: Position | undefined): number {
  if (!position || !sex) return value;
  const b = benchmarks[position][sex];
  const cmjMap: Record<number, number> = {
    1: b.low * 0.7,
    2: b.low * 0.9,
    3: (b.low + b.avg) / 2,
    4: (b.avg + b.good) / 2,
    5: b.good,
  };
  const estimated = cmjMap[value] ?? b.avg;
  if (estimated >= b.elite) return 5;
  if (estimated >= b.good)  return 4;
  if (estimated >= b.avg)   return 3;
  if (estimated >= b.low)   return 2;
  return 1;
}

type Answers = Record<string, number | string>;

function computeScores(answers: Answers): Record<string, number> {
  const dimScores: Record<string, number> = {};
  const dimCounts: Record<string, number> = {};
  questions.forEach((q) => {
    if (!q.dim) return;
    const val = answers[q.id];
    if (val === undefined) return;
    let score = Number(val);
    if (q.id === "jump") {
      score = getJumpScore(Number(val), answers.sex as Sex, answers.position as Position);
    }
    dimScores[q.dim] = (dimScores[q.dim] || 0) + score;
    dimCounts[q.dim] = (dimCounts[q.dim] || 0) + 1;
  });
  const result: Record<string, number> = {};
  Object.keys(dimScores).forEach((d) => {
    result[d] = Math.round((dimScores[d] / dimCounts[d]) * 20);
  });
  return result;
}

function getLevel(score: number): { label: string; color: string } {
  if (score >= 80) return { label: "Avanzado",       color: V12.green };
  if (score >= 60) return { label: "Intermedio",     color: V12.yellow };
  if (score >= 40) return { label: "En desarrollo",  color: V12.orange };
  return               { label: "Básico",            color: V12.red };
}

function getOverallScore(scores: Record<string, number>): number {
  const vals = Object.values(scores);
  return vals.length ? Math.round(vals.reduce((a, b) => a + b, 0) / vals.length) : 0;
}

export default function V12Test() {
  const [step, setStep]             = useState(0);
  const [answers, setAnswers]       = useState<Answers>({});
  const [showResult, setShowResult] = useState(false);

  const q       = questions[step];
  const total   = questions.length;
  const progress = (step / total) * 100;

  function handleSelect(value: number | string) {
    const newAnswers = { ...answers, [q.id]: value };
    setAnswers(newAnswers);
    if (step < total - 1) {
      setTimeout(() => setStep(step + 1), 200);
    } else {
      setTimeout(() => setShowResult(true), 300);
    }
  }

  const scores        = computeScores(answers);
  const overall       = getOverallScore(scores);
  const overallLevel  = getLevel(overall);
  const weakDims      = Object.entries(scores).sort((a, b) => a[1] - b[1]).slice(0, 2).map(([d]) => d);
  const radarData     = Object.entries(scores).map(([dim, val]) => ({
    subject:  dimensionNames[dim as Dim] || dim,
    value:    val,
    fullMark: 100,
  }));

  const positionDemandList = positionDemands[answers.position as Position] || [];

  /* ── RESULT SCREEN ── */
  if (showResult) {
    return (
      <div style={{ background: V12.bgDark, minHeight: "100vh", fontFamily: "'Montserrat', sans-serif", color: V12.white, padding: "24px 16px" }}>
        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <div style={{ fontSize: 13, color: V12.greyLight, letterSpacing: 3, textTransform: "uppercase", marginBottom: 6 }}>@mateogsoto</div>
          <div style={{ fontSize: 26, fontWeight: 700, color: V12.white, lineHeight: 1.2 }}>Tu diagnóstico de rendimiento</div>
        </div>

        {/* Score Card */}
        <div style={{ background: V12.bgCard, borderRadius: 16, padding: "24px 20px", marginBottom: 20, border: `1px solid ${V12.border}`, textAlign: "center" }}>
          <div style={{ fontSize: 72, fontWeight: 900, color: overallLevel.color, lineHeight: 1 }}>{overall}</div>
          <div style={{ fontSize: 13, color: V12.greyLight, marginTop: 4, marginBottom: 8 }}>puntos sobre 100</div>
          <div style={{ display: "inline-block", background: overallLevel.color + "22", border: `1px solid ${overallLevel.color}`, borderRadius: 20, padding: "4px 16px", fontSize: 14, fontWeight: 700, color: overallLevel.color }}>{overallLevel.label}</div>
          {answers.position && (
            <div style={{ marginTop: 12, fontSize: 13, color: V12.greyLight }}>
              Evaluación para <span style={{ color: V12.beige, fontWeight: 600 }}>{answers.position}</span>
            </div>
          )}
        </div>

        {/* Radar */}
        <div style={{ background: V12.bgCard, borderRadius: 16, padding: "20px 16px", marginBottom: 20, border: `1px solid ${V12.border}` }}>
          <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 16, color: V12.beige }}>Perfil de rendimiento</div>
          <ResponsiveContainer width="100%" height={240}>
            <RadarChart data={radarData}>
              <PolarGrid stroke="rgba(255,255,255,0.12)" />
              <PolarAngleAxis dataKey="subject" tick={{ fill: V12.greyLight, fontSize: 11 }} />
              <PolarRadiusAxis domain={[0, 100]} tick={false} axisLine={false} />
              <Radar dataKey="value" stroke={V12.orange} fill={V12.orange} fillOpacity={0.2} strokeWidth={2} />
            </RadarChart>
          </ResponsiveContainer>
        </div>

        {/* Dims breakdown */}
        <div style={{ background: V12.bgCard, borderRadius: 16, padding: "20px 16px", marginBottom: 20, border: `1px solid ${V12.border}` }}>
          <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 16, color: V12.beige }}>Desglose por dimensión</div>
          {Object.entries(scores).map(([dim, val]) => {
            const lvl = getLevel(val);
            return (
              <div key={dim} style={{ marginBottom: 14 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                  <span style={{ fontSize: 13, color: weakDims.includes(dim) ? V12.orange : V12.white, fontWeight: weakDims.includes(dim) ? 700 : 400 }}>
                    {weakDims.includes(dim) ? "⚠️ " : ""}{dimensionNames[dim as Dim]}
                  </span>
                  <span style={{ fontSize: 13, fontWeight: 700, color: lvl.color }}>{val}/100</span>
                </div>
                <div style={{ height: 6, background: "rgba(255,255,255,0.08)", borderRadius: 3 }}>
                  <div style={{ height: 6, background: lvl.color, borderRadius: 3, width: `${val}%`, transition: "width 0.8s ease" }} />
                </div>
              </div>
            );
          })}
        </div>

        {/* Weak dims message */}
        {weakDims.length > 0 && (
          <div style={{ background: V12.navy, borderRadius: 16, padding: "20px 16px", marginBottom: 20, border: `1px solid ${V12.orange}44` }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: V12.orange, marginBottom: 10 }}>Tus mayores oportunidades</div>
            <p style={{ fontSize: 13, color: V12.greyLight, lineHeight: 1.6, margin: 0 }}>
              Tus dimensiones más débiles son{" "}
              <strong style={{ color: V12.white }}>{weakDims.map((d) => dimensionNames[d as Dim]).join(" y ")}</strong>.
              Esto no es un juicio — es el punto de partida. Los jugadores que más progresan en V12 son exactamente los que tienen gaps claros acá.
            </p>
          </div>
        )}

        {/* Position demands */}
        {positionDemandList.length > 0 && (
          <div style={{ background: V12.bgCard, borderRadius: 16, padding: "20px 16px", marginBottom: 20, border: `1px solid ${V12.border}` }}>
            <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 4, color: V12.beige }}>Lo que necesita un {answers.position as string}</div>
            <div style={{ fontSize: 12, color: V12.greyLight, marginBottom: 16 }}>Las 4 cualidades clave de tu posición</div>
            {positionDemandList.map((d, i) => (
              <div key={i} style={{ display: "flex", gap: 12, marginBottom: 14 }}>
                <div style={{ fontSize: 22, flexShrink: 0, width: 32, textAlign: "center" }}>{d.icon}</div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: V12.white, marginBottom: 3 }}>{d.title}</div>
                  <div style={{ fontSize: 12, color: V12.greyLight, lineHeight: 1.5 }}>{d.desc}</div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* CTA */}
        <div style={{ background: V12.navy, borderRadius: 16, padding: "24px 20px", textAlign: "center", border: `1px solid ${V12.orange}` }}>
          <div style={{ fontSize: 18, fontWeight: 800, color: V12.white, marginBottom: 8 }}>¿Querés saber cómo mejorar?</div>
          <p style={{ fontSize: 13, color: V12.greyLight, lineHeight: 1.6, marginBottom: 20 }}>
            Este diagnóstico muestra dónde estás hoy. V12 es el sistema de 12 semanas que trabaja exactamente las dimensiones que te frenan — específico para jugadores de vóley.
          </p>
          <a
            href="https://instagram.com/mateogsoto"
            target="_blank"
            rel="noreferrer"
            style={{ display: "block", background: V12.orange, color: V12.white, fontWeight: 800, fontSize: 15, padding: "14px 0", borderRadius: 12, textDecoration: "none", letterSpacing: 1 }}
          >
            Escribí RESULTADOS en Instagram
          </a>
          <div style={{ marginTop: 12, fontSize: 12, color: V12.greyLight }}>@mateogsoto — Preparación física para voleibol</div>
        </div>

        <div style={{ height: 40 }} />
      </div>
    );
  }

  /* ── QUESTION SCREEN ── */
  return (
    <div style={{ background: V12.bgDark, minHeight: "100vh", fontFamily: "'Montserrat', sans-serif", color: V12.white, padding: "24px 16px", maxWidth: 480, margin: "0 auto" }}>
      {/* Progress */}
      <div style={{ marginBottom: 28 }}>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: V12.greyLight, marginBottom: 8 }}>
          <span style={{ color: V12.beige, fontWeight: 600, letterSpacing: 2, textTransform: "uppercase", fontSize: 11 }}>@mateogsoto</span>
          <span>{step + 1} / {total}</span>
        </div>
        <div style={{ height: 4, background: "rgba(255,255,255,0.08)", borderRadius: 2 }}>
          <div style={{ height: 4, background: V12.orange, borderRadius: 2, width: `${progress}%`, transition: "width 0.4s ease" }} />
        </div>
      </div>

      {/* Question */}
      <div style={{ marginBottom: 8 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: V12.orange, letterSpacing: 2, textTransform: "uppercase", marginBottom: 10 }}>
          {q.dim ? `Dimensión: ${dimensionNames[q.dim]}` : "Información inicial"}
        </div>
        <div style={{ fontSize: 20, fontWeight: 800, lineHeight: 1.3, color: V12.white, marginBottom: q.sub ? 8 : 24 }}>{q.text}</div>
        {q.sub && <div style={{ fontSize: 13, color: V12.greyLight, marginBottom: 24, lineHeight: 1.5 }}>{q.sub}</div>}
      </div>

      {/* Options */}
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {q.options.map((opt) => {
          const selected = answers[q.id] === opt.value;
          return (
            <button
              key={opt.label}
              onClick={() => handleSelect(opt.value)}
              style={{
                background:   selected ? V12.orange : V12.bgCard,
                border:       `1px solid ${selected ? V12.orange : V12.border}`,
                borderRadius: 12,
                padding:      "14px 16px",
                cursor:       "pointer",
                display:      "flex",
                alignItems:   "center",
                gap:          14,
                transition:   "all 0.2s",
                textAlign:    "left",
              }}
            >
              <span style={{ fontSize: 22, width: 32, textAlign: "center", flexShrink: 0 }}>{opt.icon}</span>
              <span style={{ fontSize: 14, fontWeight: selected ? 700 : 400, color: selected ? V12.white : V12.beige, lineHeight: 1.3 }}>{opt.label}</span>
            </button>
          );
        })}
      </div>

      {step > 0 && (
        <button
          onClick={() => setStep(step - 1)}
          style={{ marginTop: 20, background: "transparent", border: "none", color: V12.greyLight, fontSize: 13, cursor: "pointer", padding: "8px 0", display: "block" }}
        >
          ← Volver
        </button>
      )}
    </div>
  );
}
