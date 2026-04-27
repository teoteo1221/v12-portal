"use client";

import { useState } from "react";
import {
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  Radar, ResponsiveContainer,
} from "recharts";

// ─── Types ────────────────────────────────────────────────────────────────────
type Position = "Punta / Receptor" | "Central" | "Opuesto" | "Armador" | "Líbero";
type Sex      = "male" | "female";
type Dim      = "potencia" | "fuerza" | "hábito" | "progreso" | "agilidad" | "resistencia" | "dolores" | "mentalidad";

interface Option {
  label: string;
  value: string | number;
  icon:  string;
}

interface Question {
  id:      string;
  dim:     Dim | null;
  text:    string;
  sub?:    string;
  options: Option[];
}

interface LeadData {
  name:      string;
  email:     string;
  instagram: string;
}

type Answers = Record<string, string | number>;
type Scores  = Partial<Record<Dim, number>>;

// ─── Brand tokens ─────────────────────────────────────────────────────────────
const V12 = {
  navy:      "#173B61", navyLight: "#1E4A7A", orange: "#F3701E",
  beige:     "#E8D8C9", white:     "#FFFFFF", greyLight: "#A8B4C2",
  red:       "#E04040", green:     "#2EAD65", yellow: "#E8A838",
  bgDark:    "#0D1F33", bgCard:    "#132D4A", border: "rgba(255,255,255,0.08)",
};

const RESULTADOS_URL = "https://mateosoto-v12.carrd.co/";

// ─── Data ─────────────────────────────────────────────────────────────────────
const positions: Position[] = ["Punta / Receptor", "Central", "Opuesto", "Armador", "Líbero"];

const benchmarks: Record<Position, Record<Sex, Record<string, number>>> = {
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
    { icon: "🔄", title: "Resistencia de salto",       desc: "No alcanza saltar alto una vez — necesitás mantenerlo en el 5to set." },
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
    { icon: "⚡", title: "Velocidad reactiva y agilidad", desc: "Llegás a bolas que los demás no llegan. Eso es pura velocidad de reacción y desplazamiento." },
    { icon: "↔️", title: "Fuerza de frenado",             desc: "Frenar y cambiar de dirección sin cargarte la rodilla requiere fuerza excéntrica específica." },
    { icon: "🦵", title: "Cuidar la espalda baja",        desc: "Bucear repetidamente genera sobrecarga lumbar que con el tiempo se convierte en lesión." },
    { icon: "🔋", title: "Resistencia y recuperación",    desc: "Jugás prácticamente todos los puntos. Tu capacidad de recuperar entre jugadas define tu nivel." },
  ],
};

// ─── Questions ────────────────────────────────────────────────────────────────
// 0  position     (no dim)
// 1  level        (no dim — filter, not scored)
// 2  sex          (no dim — for benchmarks)
// 3  age          (no dim — stats)
// 4  jump         (dim: potencia)
// 5  strength     (dim: fuerza)
// 6  consistency  (dim: hábito)
// 7  progress     (dim: progreso)
// 8  agility      (dim: agilidad)
// 9  resistance   (dim: resistencia)
// 10 injury       (dim: dolores)
// 11 injuryZone   (no dim — skip when injury === 5)
// 12 mindset      (dim: mentalidad)

const questions: Question[] = [
  {
    id: "position", dim: null,
    text: "¿Cuál es tu posición principal?",
    options: positions.map((p) => ({
      label: p, value: p,
      icon: p === "Punta / Receptor" ? "🏐" : p === "Central" ? "🧱" : p === "Opuesto" ? "💥" : p === "Armador" ? "🎯" : "🛡",
    })),
  },
  {
    id: "level", dim: null,
    text: "¿Cuál es el nivel más alto en el que competís actualmente?",
    options: [
      { label: "Selección provincial o nacional",              value: "elite",       icon: "🌎" },
      { label: "Liga o torneo oficial (club competitivo)",     value: "competitive", icon: "🏆" },
      { label: "Universitario / interuniversitario",           value: "university",  icon: "🎓" },
      { label: "Amateur / recreativo sin competencia oficial", value: "amateur",     icon: "🏐" },
      { label: "Todavía no compito en torneos",                value: "beginner",    icon: "🔰" },
    ],
  },
  {
    id: "sex", dim: null,
    text: "¿Cuál es tu sexo?",
    options: [
      { label: "Masculino", value: "male",   icon: "♂" },
      { label: "Femenino",  value: "female", icon: "♀" },
    ],
  },
  {
    id: "age", dim: null,
    text: "¿Cuántos años tenés?",
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
    text: "¿Cuánto saltás en CMJ (salto vertical sin carrera)?",
    sub: "Si nunca lo mediste, elegí 'No lo medí' y igual obtenés el resultado.",
    options: [
      { label: "Menos de 30 cm", value: 1, icon: "📏" },
      { label: "30–39 cm",       value: 2, icon: "📏" },
      { label: "40–49 cm",       value: 3, icon: "📏" },
      { label: "50–59 cm",       value: 4, icon: "📏" },
      { label: "60 cm o más",    value: 5,         icon: "🚀" },
      { label: "No lo medí",     value: "unknown", icon: "❓" },
    ],
  },
  {
    id: "strength", dim: "fuerza",
    text: "¿Hacés entrenamiento de fuerza específico además del vóley?",
    options: [
      { label: "Nunca entrené fuerza fuera del vóley",               value: 1, icon: "❌" },
      { label: "Muy poco o muy irregular",                            value: 2, icon: "😅" },
      { label: "1–2 veces por semana, hace menos de 6 meses",         value: 3, icon: "💪" },
      { label: "2–3 veces por semana, hace 6 meses o más",            value: 4, icon: "🏋️" },
      { label: "3+ veces por semana, parte de mi rutina hace 1+ año", value: 5, icon: "⚡" },
    ],
  },
  {
    id: "consistency", dim: "hábito",
    text: "¿Con qué frecuencia entrenás físico además de los entrenamientos de vóley?",
    options: [
      { label: "Solo vóley, nada de físico extra",                      value: 1, icon: "🏐" },
      { label: "Muy irregular, cuando puedo",                           value: 2, icon: "😅" },
      { label: "1 vez por semana más o menos",                          value: 3, icon: "📅" },
      { label: "2–3 veces por semana con cierta consistencia",          value: 4, icon: "💪" },
      { label: "3+ veces por semana, es parte de mi rutina hace meses", value: 5, icon: "🏆" },
    ],
  },
  {
    id: "progress", dim: "progreso",
    text: "En el último año, ¿tu rendimiento físico avanzó?",
    options: [
      { label: "No. Estoy igual o peor que hace 12 meses", value: 1, icon: "📉" },
      { label: "Muy poco, casi no noto diferencia",        value: 2, icon: "😐" },
      { label: "Algo, pero menos de lo que esperaba",      value: 3, icon: "🙂" },
      { label: "Sí, mejoré bastante",                      value: 4, icon: "💪" },
      { label: "Sí, mejoré mucho y lo tengo medido",       value: 5, icon: "🚀" },
    ],
  },
  {
    id: "agility", dim: "agilidad",
    text: "¿Cómo describís tu velocidad para llegar a las bolas difíciles?",
    options: [
      { label: "Llego tarde a casi todo",           value: 1, icon: "🐢" },
      { label: "A veces llego, a veces no",         value: 2, icon: "😐" },
      { label: "Llego en la mayoría de los casos",  value: 3, icon: "🙂" },
      { label: "Soy de los más rápidos del equipo", value: 4, icon: "⚡" },
      { label: "Referente defensivo del equipo",    value: 5, icon: "🦅" },
    ],
  },
  {
    id: "resistance", dim: "resistencia",
    text: "¿Cómo te sentís físicamente en el 5to set o partido seguido?",
    options: [
      { label: "Me caigo a pedazos en el 5to set",              value: 1, icon: "😵" },
      { label: "Bajo mucho el nivel en el final del partido",   value: 2, icon: "😓" },
      { label: "Me mantengo pero noto el cansancio",            value: 3, icon: "😐" },
      { label: "Rindo casi igual todo el partido",              value: 4, icon: "💪" },
      { label: "Mi rendimiento no baja, incluso en doble fecha",value: 5, icon: "🔥" },
    ],
  },
  {
    id: "injury", dim: "dolores",
    text: "¿Tenés algún dolor o molestia que te limite hoy?",
    options: [
      { label: "Sin ninguna molestia, me siento bien",        value: 5, icon: "✅" },
      { label: "Algo que siento pero puedo entrenar y jugar", value: 3, icon: "🟡" },
      { label: "Una molestia que me frena seguido",           value: 2, icon: "⚠️" },
      { label: "Dolor crónico que me limita bastante",        value: 1, icon: "🚨" },
    ],
  },
  {
    id: "injuryZone", dim: null,
    text: "¿Qué zona te molesta principalmente?",
    sub: "Solo para personalizar tu diagnóstico.",
    options: [
      { label: "Rodilla",      value: "rodilla",  icon: "🦵" },
      { label: "Tobillo",      value: "tobillo",  icon: "🦶" },
      { label: "Hombro",       value: "hombro",   icon: "💪" },
      { label: "Espalda baja", value: "espalda",  icon: "🔙" },
      { label: "Varias zonas", value: "multiple", icon: "🤕" },
      { label: "Otra zona",    value: "other",    icon: "❓" },
    ],
  },
  {
    id: "mindset", dim: "mentalidad",
    text: "¿Cómo describís tu relación con el entrenamiento físico?",
    options: [
      { label: "Lo evito, no es lo mío",                    value: 1, icon: "😶" },
      { label: "Lo hago cuando toca, sin motivación extra", value: 2, icon: "😑" },
      { label: "Me cuesta pero lo hago",                    value: 3, icon: "🙂" },
      { label: "Lo disfruto y lo busco activamente",        value: 4, icon: "😊" },
      { label: "Es parte de mi identidad como jugador",     value: 5, icon: "🔥" },
    ],
  },
];

const dimensionNames: Record<Dim, string> = {
  potencia:    "Potencia",
  fuerza:      "Fuerza",
  hábito:      "Hábito",
  progreso:    "Progreso",
  agilidad:    "Agilidad",
  resistencia: "Resistencia",
  dolores:     "Dolores",
  mentalidad:  "Mentalidad",
};

// ─── Score helpers ────────────────────────────────────────────────────────────
function getJumpScore(value: number, sex: Sex | undefined, position: Position | undefined): number {
  if (!position || !sex) return value;
  const b = benchmarks[position][sex];
  const cmjMap: Record<number, number> = {
    1: b.low * 0.7, 2: b.low * 0.9, 3: (b.low + b.avg) / 2, 4: (b.avg + b.good) / 2, 5: b.good,
  };
  const estimated = cmjMap[value] ?? b.avg;
  if (estimated >= b.elite) return 5;
  if (estimated >= b.good)  return 4;
  if (estimated >= b.avg)   return 3;
  if (estimated >= b.low)   return 2;
  return 1;
}

function computeScores(answers: Answers): Scores {
  const dimScores: Record<string, number> = {};
  const dimCounts: Record<string, number> = {};
  questions.forEach((q) => {
    if (!q.dim) return;
    const val = answers[q.id];
    if (val === undefined) return;
    let score = Number(val);
    if (q.id === "jump") score = getJumpScore(val === "unknown" ? 2 : Number(val), answers.sex as Sex, answers.position as Position);
    dimScores[q.dim] = (dimScores[q.dim] || 0) + score;
    dimCounts[q.dim] = (dimCounts[q.dim] || 0) + 1;
  });
  const result: Scores = {};
  (Object.keys(dimScores) as Dim[]).forEach((d) => {
    result[d] = Math.round((dimScores[d] / dimCounts[d]) * 20);
  });
  return result;
}

function getLevel(score: number): { label: string; color: string } {
  if (score >= 80) return { label: "Avanzado",     color: V12.green  };
  if (score >= 60) return { label: "Intermedio",   color: V12.yellow };
  if (score >= 40) return { label: "En desarrollo",color: V12.orange };
  return               { label: "Básico",          color: V12.red    };
}

function getOverallScore(scores: Scores): number {
  const vals = Object.values(scores) as number[];
  return vals.length ? Math.round(vals.reduce((a, b) => a + b, 0) / vals.length) : 0;
}

function getCTACopy(score: number): { title: string; body: string } {
  if (score < 45) return {
    title: "Tu físico tiene brechas concretas que te frenan",
    body:  "Los jugadores con tu perfil son los que más progresan en V12. Las brechas que ves arriba se pueden cerrar en 12 semanas con el sistema correcto.",
  };
  if (score < 65) return {
    title: "Tenés base, pero hay gaps específicos que te limitan",
    body:  "Hay dimensiones clave para tu posición que no están al nivel que podrían estar. V12 trabaja exactamente eso en 12 semanas.",
  };
  if (score < 80) return {
    title: "Tu físico está bien — el paso siguiente es optimizarlo",
    body:  "Un sistema específico para vóley puede llevar tu rendimiento al siguiente nivel. Mirá qué lograron jugadores con tu perfil.",
  };
  return {
    title: "Sos un jugador avanzado — seguir mejorando requiere precisión",
    body:  "En V12 trabajamos con jugadores de tu nivel que quieren mantener el techo alto y seguir empujando con medición real.",
  };
}

function getProjection(score: number): string {
  if (score < 45) return "Con un programa específico para tu posición, jugadores con tu perfil suelen mejorar entre 20 y 30 puntos en 12 semanas.";
  if (score < 65) return "Con un programa específico para tu posición, jugadores con tu perfil suelen mejorar entre 12 y 20 puntos en 12 semanas.";
  return "Con el sistema correcto, jugadores de tu nivel siguen mejorando 8 a 15 puntos en 12 semanas — con medición real.";
}

function getInjuryZoneLabel(zone: string | undefined): string | null {
  const map: Record<string, string> = { rodilla: "rodilla", tobillo: "tobillo", hombro: "hombro", espalda: "espalda baja" };
  return zone ? (map[zone] || null) : null;
}

// ─── Validation ───────────────────────────────────────────────────────────────
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

function validateLead(data: LeadData): Record<string, string> {
  const errors: Record<string, string> = {};
  if (!data.name || data.name.trim().length < 2) errors.name = "Ingresá tu nombre (mínimo 2 caracteres)";
  if (!data.email || !EMAIL_REGEX.test(data.email.trim())) errors.email = "Ingresá un email válido";
  const ig = data.instagram.trim();
  if (!ig || ig.length < 3 || /\s/.test(ig)) errors.instagram = "Ingresá tu usuario sin espacios (mínimo 3 caracteres)";
  return errors;
}

function inputStyle(hasError: boolean): React.CSSProperties {
  return {
    width: "100%", boxSizing: "border-box",
    background: hasError ? "rgba(224,64,64,0.08)" : V12.bgDark,
    border: `1px solid ${hasError ? V12.red : V12.border}`,
    borderRadius: 10, padding: "12px 14px",
    color: V12.white, fontSize: 14, fontFamily: "inherit", outline: "none",
  };
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function V12Test() {
  const [showIntro, setShowIntro]   = useState(true);
  const [step, setStep]             = useState(0);
  const [answers, setAnswers]       = useState<Answers>({});
  const [showGate, setShowGate]     = useState(false);
  const [showResult, setShowResult] = useState(false);
  const [leadData, setLeadData]     = useState<LeadData>({ name: "", email: "", instagram: "" });
  const [leadErrors, setLeadErrors] = useState<Record<string, string>>({});
  const [copied, setCopied]         = useState(false);

  const q        = questions[step];
  const total    = questions.length;
  const progress = (step / total) * 100;

  const scores       = computeScores(answers);
  const overall      = getOverallScore(scores);
  const overallLevel = getLevel(overall);
  const weakDims     = (Object.entries(scores) as [Dim, number][]).sort((a, b) => a[1] - b[1]).slice(0, 2).map(([d]) => d);
  const radarData    = (Object.entries(scores) as [Dim, number][]).map(([dim, val]) => ({
    subject: dimensionNames[dim] || dim, value: val, fullMark: 100,
  }));
  const positionDemandList = positionDemands[answers.position as Position] || [];
  const ctaCopy = getCTACopy(overall);

  // ── Navigation ──────────────────────────────────────────────────────────────
  function handleSelect(value: string | number) {
    const newAnswers = { ...answers, [q.id]: value };
    setAnswers(newAnswers);

    if (q.id === "injury" && value === 5) {
      const nextStep = step + 2;
      setTimeout(() => {
        if (nextStep < total) setStep(nextStep);
        else setShowGate(true);
      }, 200);
      return;
    }

    if (step < total - 1) {
      setTimeout(() => setStep(step + 1), 200);
    } else {
      setTimeout(() => setShowGate(true), 300);
    }
  }

  function handleBack() {
    if (showGate) { setShowGate(false); return; }
    if (step === 12 && answers.injury === 5) setStep(10);
    else setStep(step - 1);
  }

  // ── Lead gate ───────────────────────────────────────────────────────────────
  function handleLeadChange(field: keyof LeadData, value: string) {
    setLeadData(prev => ({ ...prev, [field]: value }));
    if (leadErrors[field]) setLeadErrors(prev => { const n = { ...prev }; delete n[field]; return n; });
  }

  async function handleLeadSubmit() {
    const errors = validateLead(leadData);
    if (Object.keys(errors).length > 0) { setLeadErrors(errors); return; }

    fetch("/api/test-lead", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name:      leadData.name.trim(),
        email:     leadData.email.trim(),
        instagram: leadData.instagram.trim(),
        position:  answers.position,
        sex:       answers.sex,
        age:       answers.age,
        scores,
        overall,
        answers,
      }),
    }).catch(() => {/* graceful degradation */});

    setShowGate(false);
    setShowResult(true);
  }

  // ── Share ───────────────────────────────────────────────────────────────────
  function handleShare() {
    const text = `Hice el diagnóstico de rendimiento de @mateogsoto y obtuve ${overall}/100 como ${answers.position || "voleibolista"} (${overallLevel.label}). ¿Cuál es el tuyo?`;
    if (navigator.share) {
      navigator.share({ title: "Mi diagnóstico V12", text, url: window.location.href });
    } else {
      navigator.clipboard.writeText(text + "  " + window.location.href).then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2500);
      });
    }
  }

  // ════════════════════════════════════════════════════════════════════════════
  // INTRO SCREEN
  // ════════════════════════════════════════════════════════════════════════════
  if (showIntro) {
    return (
      <div style={{ background: V12.bgDark, minHeight: "100vh", fontFamily: "'Montserrat', sans-serif", color: V12.white, padding: "40px 20px", maxWidth: 480, margin: "0 auto", display: "flex", flexDirection: "column", justifyContent: "center" }}>

        {/* Logo / handle */}
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <div style={{ fontSize: 11, color: V12.orange, letterSpacing: 3, textTransform: "uppercase", fontWeight: 700, marginBottom: 16 }}>@mateogsoto</div>
          <div style={{ fontSize: 28, fontWeight: 900, color: V12.white, lineHeight: 1.15, marginBottom: 12 }}>
            ¿Estás entrenando como un jugador de voleibol competitivo de verdad?
          </div>
          <div style={{ fontSize: 14, color: V12.greyLight, lineHeight: 1.6 }}>
            13 preguntas · menos de 3 minutos · resultado personalizado por posición
          </div>
        </div>

        {/* What you get */}
        <div style={{ background: V12.bgCard, borderRadius: 16, padding: "20px 18px", marginBottom: 28, border: `1px solid ${V12.border}` }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: V12.orange, letterSpacing: 1, textTransform: "uppercase", marginBottom: 14 }}>Vas a obtener</div>
          {[
            { icon: "📊", text: "Tu puntaje de rendimiento físico sobre 100" },
            { icon: "🎯", text: "Perfil radar con 8 dimensiones clave del vóley" },
            { icon: "⚠️", text: "Las 2 brechas que más te frenan hoy" },
            { icon: "📍", text: "Análisis específico para tu posición" },
          ].map((item, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: i < 3 ? 12 : 0 }}>
              <span style={{ fontSize: 18, width: 28, textAlign: "center", flexShrink: 0 }}>{item.icon}</span>
              <span style={{ fontSize: 13, color: V12.beige, lineHeight: 1.4 }}>{item.text}</span>
            </div>
          ))}
        </div>

        <button
          onClick={() => setShowIntro(false)}
          style={{ width: "100%", background: V12.orange, color: V12.white, fontWeight: 800, fontSize: 16, padding: "17px 0", borderRadius: 14, border: "none", cursor: "pointer", fontFamily: "inherit", letterSpacing: 0.5 }}
        >
          Empezar el diagnóstico →
        </button>
      </div>
    );
  }

  // ════════════════════════════════════════════════════════════════════════════
  // GATE SCREEN
  // ════════════════════════════════════════════════════════════════════════════
  if (showGate) {
    return (
      <div style={{ background: V12.bgDark, minHeight: "100vh", fontFamily: "'Montserrat', sans-serif", color: V12.white, padding: "24px 16px", maxWidth: 480, margin: "0 auto" }}>

        <div style={{ textAlign: "center", marginBottom: 20 }}>
          <div style={{ fontSize: 11, color: V12.orange, letterSpacing: 3, textTransform: "uppercase", fontWeight: 700, marginBottom: 8 }}>@mateogsoto</div>
          <div style={{ fontSize: 22, fontWeight: 800, color: V12.white, lineHeight: 1.2 }}>Tu diagnóstico está listo</div>
          <div style={{ fontSize: 13, color: V12.greyLight, marginTop: 6 }}>Completá tus datos para desbloquearlo</div>
        </div>

        {/* Blurred preview */}
        <div style={{ position: "relative", marginBottom: 24, borderRadius: 16, overflow: "hidden" }}>
          <div style={{ filter: "blur(7px)", pointerEvents: "none", userSelect: "none", opacity: 0.65 }}>
            <div style={{ background: V12.bgCard, padding: "20px 16px 8px", textAlign: "center" }}>
              <div style={{ fontSize: 60, fontWeight: 900, color: V12.orange, lineHeight: 1 }}>??</div>
              <div style={{ fontSize: 11, color: V12.greyLight, marginBottom: 8 }}>puntos sobre 100</div>
              <ResponsiveContainer width="100%" height={150}>
                <RadarChart data={radarData}>
                  <PolarGrid stroke="rgba(255,255,255,0.12)" />
                  <PolarAngleAxis dataKey="subject" tick={{ fill: V12.greyLight, fontSize: 9 }} />
                  <PolarRadiusAxis domain={[0, 100]} tick={false} axisLine={false} />
                  <Radar dataKey="value" stroke={V12.orange} fill={V12.orange} fillOpacity={0.2} strokeWidth={2} />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          </div>
          <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 6 }}>
            <div style={{ fontSize: 30 }}>🔒</div>
            <div style={{ fontSize: 12, color: V12.beige, fontWeight: 700 }}>Completá tus datos para ver el resultado</div>
          </div>
        </div>

        {/* Form */}
        <div style={{ background: V12.bgCard, borderRadius: 16, padding: "24px 20px", border: `1px solid ${V12.border}` }}>

          <div style={{ marginBottom: 16 }}>
            <label style={{ fontSize: 12, color: V12.greyLight, display: "block", marginBottom: 6, fontWeight: 600 }}>Nombre *</label>
            <input
              type="text" placeholder="Tu nombre" value={leadData.name}
              onChange={e => handleLeadChange("name", e.target.value)}
              style={inputStyle(!!leadErrors.name)}
            />
            {leadErrors.name && <div style={{ fontSize: 11, color: V12.red, marginTop: 4 }}>{leadErrors.name}</div>}
          </div>

          <div style={{ marginBottom: 16 }}>
            <label style={{ fontSize: 12, color: V12.greyLight, display: "block", marginBottom: 6, fontWeight: 600 }}>Email *</label>
            <input
              type="email" placeholder="tu@email.com" value={leadData.email}
              onChange={e => handleLeadChange("email", e.target.value)}
              style={inputStyle(!!leadErrors.email)}
            />
            {leadErrors.email && <div style={{ fontSize: 11, color: V12.red, marginTop: 4 }}>{leadErrors.email}</div>}
          </div>

          <div style={{ marginBottom: 24 }}>
            <label style={{ fontSize: 12, color: V12.greyLight, display: "block", marginBottom: 6, fontWeight: 600 }}>Usuario de Instagram *</label>
            <div style={{ position: "relative" }}>
              <span style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", color: V12.greyLight, fontSize: 14, fontWeight: 700, pointerEvents: "none" }}>@</span>
              <input
                type="text" placeholder="tuusuario" value={leadData.instagram}
                onChange={e => handleLeadChange("instagram", e.target.value.replace(/[@\s]/g, ""))}
                style={{ ...inputStyle(!!leadErrors.instagram), paddingLeft: 30 }}
              />
            </div>
            {leadErrors.instagram && <div style={{ fontSize: 11, color: V12.red, marginTop: 4 }}>{leadErrors.instagram}</div>}
          </div>

          <button
            onClick={handleLeadSubmit}
            style={{ width: "100%", background: V12.orange, color: V12.white, fontWeight: 800, fontSize: 15, padding: "15px 0", borderRadius: 12, border: "none", cursor: "pointer", fontFamily: "inherit", letterSpacing: 0.5 }}
          >
            Ver mi resultado →
          </button>
        </div>

        <button
          onClick={handleBack}
          style={{ marginTop: 16, background: "transparent", border: "none", color: V12.greyLight, fontSize: 13, cursor: "pointer", padding: "8px 0", display: "block", fontFamily: "inherit" }}
        >
          ← Volver a las preguntas
        </button>
        <div style={{ height: 32 }} />
      </div>
    );
  }

  // ════════════════════════════════════════════════════════════════════════════
  // RESULT SCREEN
  // ════════════════════════════════════════════════════════════════════════════
  if (showResult) {
    const injuryZoneLabel = getInjuryZoneLabel(answers.injuryZone as string | undefined);

    return (
      <div style={{ background: V12.bgDark, minHeight: "100vh", fontFamily: "'Montserrat', sans-serif", color: V12.white, padding: "24px 16px", maxWidth: 480, margin: "0 auto" }}>

        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <div style={{ fontSize: 11, color: V12.greyLight, letterSpacing: 3, textTransform: "uppercase", marginBottom: 6 }}>@mateogsoto</div>
          <div style={{ fontSize: 22, fontWeight: 700, color: V12.white, lineHeight: 1.2 }}>Tu diagnóstico de rendimiento</div>
          {leadData.name.trim() && (
            <div style={{ fontSize: 13, color: V12.greyLight, marginTop: 4 }}>
              Hola, <span style={{ color: V12.beige, fontWeight: 600 }}>{leadData.name.trim()}</span>
            </div>
          )}
        </div>

        {/* Score card */}
        <div style={{ background: V12.bgCard, borderRadius: 16, padding: "24px 20px", marginBottom: 20, border: `1px solid ${V12.border}`, textAlign: "center" }}>
          <div style={{ fontSize: 72, fontWeight: 900, color: overallLevel.color, lineHeight: 1 }}>{overall}</div>
          <div style={{ fontSize: 13, color: V12.greyLight, marginTop: 4, marginBottom: 8 }}>puntos sobre 100</div>
          <div style={{ display: "inline-block", background: overallLevel.color + "22", border: `1px solid ${overallLevel.color}`, borderRadius: 20, padding: "4px 16px", fontSize: 14, fontWeight: 700, color: overallLevel.color }}>
            {overallLevel.label}
          </div>
          {answers.position && (
            <div style={{ marginTop: 10, fontSize: 13, color: V12.greyLight }}>
              Evaluación para <span style={{ color: V12.beige, fontWeight: 600 }}>{answers.position as string}</span>
            </div>
          )}
          <div style={{ marginTop: 14, fontSize: 12, color: V12.greyLight, lineHeight: 1.6, fontStyle: "italic", borderTop: `1px solid ${V12.border}`, paddingTop: 12 }}>
            {getProjection(overall)}
          </div>
        </div>

        {/* Radar */}
        <div style={{ background: V12.bgCard, borderRadius: 16, padding: "20px 16px", marginBottom: 20, border: `1px solid ${V12.border}` }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: V12.beige }}>Perfil de rendimiento</div>
            <button
              onClick={handleShare}
              style={{ background: V12.bgDark, border: `1px solid ${V12.border}`, borderRadius: 20, padding: "6px 14px", color: copied ? V12.green : V12.greyLight, fontSize: 12, cursor: "pointer", fontFamily: "inherit", transition: "color 0.2s" }}
            >
              {copied ? "¡Copiado!" : "Compartir →"}
            </button>
          </div>
          <ResponsiveContainer width="100%" height={240}>
            <RadarChart data={radarData}>
              <PolarGrid stroke="rgba(255,255,255,0.12)" />
              <PolarAngleAxis dataKey="subject" tick={{ fill: V12.greyLight, fontSize: 11 }} />
              <PolarRadiusAxis domain={[0, 100]} tick={false} axisLine={false} />
              <Radar dataKey="value" stroke={V12.orange} fill={V12.orange} fillOpacity={0.2} strokeWidth={2} />
            </RadarChart>
          </ResponsiveContainer>
        </div>

        {/* Dimension breakdown */}
        <div style={{ background: V12.bgCard, borderRadius: 16, padding: "20px 16px", marginBottom: 20, border: `1px solid ${V12.border}` }}>
          <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 16, color: V12.beige }}>Desglose por dimensión</div>
          {(Object.entries(scores) as [Dim, number][]).map(([dim, val]) => {
            const lvl    = getLevel(val);
            const isWeak = weakDims.includes(dim);
            return (
              <div key={dim} style={{ marginBottom: 14 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                  <span style={{ fontSize: 13, color: isWeak ? V12.orange : V12.white, fontWeight: isWeak ? 700 : 400 }}>
                    {isWeak ? "⚠️ " : ""}{dimensionNames[dim]}
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
              <strong style={{ color: V12.white }}>{weakDims.map(d => dimensionNames[d]).join(" y ")}</strong>.
              {" "}Esto no es un juicio — es el punto de partida. Los jugadores que más progresan en V12 son exactamente los que tienen gaps claros acá.
            </p>
          </div>
        )}

        {/* Injury personalization */}
        {injuryZoneLabel && (
          <div style={{ background: V12.bgCard, borderRadius: 16, padding: "16px 18px", marginBottom: 20, border: `1px solid ${V12.border}` }}>
            <div style={{ fontSize: 13, color: V12.greyLight, lineHeight: 1.6 }}>
              Reportaste molestia en{" "}
              <strong style={{ color: V12.beige }}>{injuryZoneLabel}</strong>.
              {" "}En V12 el manejo de carga articular es parte del plan desde el día uno — no entrenás a pesar de la molestia, entrenás para resolverla.
            </div>
          </div>
        )}

        {/* Position demands */}
        {positionDemandList.length > 0 && (
          <div style={{ background: V12.bgCard, borderRadius: 16, padding: "20px 16px", marginBottom: 20, border: `1px solid ${V12.border}` }}>
            <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 4, color: V12.beige }}>
              Lo que necesita un {answers.position as string}
            </div>
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
          <div style={{ fontSize: 18, fontWeight: 800, color: V12.white, marginBottom: 8, lineHeight: 1.3 }}>
            {ctaCopy.title}
          </div>
          <p style={{ fontSize: 13, color: V12.greyLight, lineHeight: 1.6, marginBottom: 20 }}>
            {ctaCopy.body}
          </p>
          <p style={{ fontSize: 13, color: V12.beige, lineHeight: 1.6, marginBottom: 20, fontWeight: 600 }}>
            ¿Querés ver qué resultados consiguen jugadores como vos?
          </p>
          <a
            href={RESULTADOS_URL}
            target="_blank"
            rel="noopener noreferrer"
            style={{ display: "block", background: V12.orange, color: V12.white, fontWeight: 800, fontSize: 15, padding: "15px 0", borderRadius: 12, textDecoration: "none", letterSpacing: 0.5 }}
          >
            Ver clase de resultados →
          </a>
          <div style={{ marginTop: 12, fontSize: 12, color: V12.greyLight }}>
            @mateogsoto — Preparación física para voleibol
          </div>
        </div>

        <div style={{ height: 40 }} />
      </div>
    );
  }

  // ════════════════════════════════════════════════════════════════════════════
  // QUESTION SCREEN
  // ════════════════════════════════════════════════════════════════════════════
  return (
    <div style={{ background: V12.bgDark, minHeight: "100vh", fontFamily: "'Montserrat', sans-serif", color: V12.white, padding: "24px 16px", maxWidth: 480, margin: "0 auto" }}>

      <div style={{ marginBottom: 28 }}>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: V12.greyLight, marginBottom: 8 }}>
          <span style={{ color: V12.beige, fontWeight: 600, letterSpacing: 2, textTransform: "uppercase", fontSize: 11 }}>@mateogsoto</span>
          <span>{step + 1} / {total}</span>
        </div>
        <div style={{ height: 4, background: "rgba(255,255,255,0.08)", borderRadius: 2 }}>
          <div style={{ height: 4, background: V12.orange, borderRadius: 2, width: `${progress}%`, transition: "width 0.4s ease" }} />
        </div>
      </div>

      <div style={{ marginBottom: 0 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: V12.orange, letterSpacing: 2, textTransform: "uppercase", marginBottom: 10 }}>
          {q.dim ? `Dimensión: ${dimensionNames[q.dim]}` : "Información inicial"}
        </div>
        <div style={{ fontSize: 20, fontWeight: 800, lineHeight: 1.3, color: V12.white, marginBottom: q.sub ? 8 : 0 }}>
          {q.text}
        </div>
        {q.sub && <div style={{ fontSize: 13, color: V12.greyLight, lineHeight: 1.5 }}>{q.sub}</div>}
      </div>

      <div style={{ height: 20 }} />

      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {q.options.map((opt) => {
          const selected = answers[q.id] === opt.value;
          return (
            <button
              key={opt.label}
              onClick={() => handleSelect(opt.value)}
              style={{
                background: selected ? V12.orange : V12.bgCard,
                border: `1px solid ${selected ? V12.orange : V12.border}`,
                borderRadius: 12, padding: "14px 16px", cursor: "pointer",
                display: "flex", alignItems: "center", gap: 14,
                transition: "all 0.2s", textAlign: "left",
              }}
            >
              <span style={{ fontSize: 22, width: 32, textAlign: "center", flexShrink: 0 }}>{opt.icon}</span>
              <span style={{ fontSize: 14, fontWeight: selected ? 700 : 400, color: selected ? V12.white : V12.beige, lineHeight: 1.3 }}>
                {opt.label}
              </span>
            </button>
          );
        })}
      </div>

      {step > 0 && (
        <button
          onClick={handleBack}
          style={{ marginTop: 20, background: "transparent", border: "none", color: V12.greyLight, fontSize: 13, cursor: "pointer", padding: "8px 0", display: "block", fontFamily: "inherit" }}
        >
          ← Volver
        </button>
      )}
    </div>
  );
}
