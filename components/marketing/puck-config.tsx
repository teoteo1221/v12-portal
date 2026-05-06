"use client";

/**
 * Bloques Puck para las landing pages de V12.
 * Cada bloque tiene: fields (panel lateral de edición) + render (vista pública).
 */

import { useState } from "react";
import type { Config } from "@measured/puck";

// ── Config de Puck ────────────────────────────────────────────────────────────

/* eslint-disable @typescript-eslint/no-explicit-any */
export const puckConfig: Config = {
  components: {

    // ── Hero ──────────────────────────────────────────────────────────────────
    Hero: {
      label: "Hero — Encabezado principal",
      fields: {
        badge: { type: "text", label: "Badge (ej: Gratis · 2 min)" },
        title: { type: "text", label: "Título" },
        subtitle: { type: "textarea", label: "Subtítulo" },
        ctaText: { type: "text", label: "Botón principal" },
        ctaHref: { type: "text", label: "Link botón principal" },
        secondaryText: { type: "text", label: "Link secundario" },
        secondaryHref: { type: "text", label: "URL link secundario" },
      },
      defaultProps: {
        badge: "Gratis · 2 minutos",
        title: "Descubrí tu nivel real como jugador de vóley",
        subtitle: "Completá el diagnóstico V12 y recibí un plan personalizado según tus resultados.",
        ctaText: "Empezar ahora →",
        ctaHref: "/test",
        secondaryText: "¿Cómo funciona?",
        secondaryHref: "#como-funciona",
      },
      render: ({ badge, title, subtitle, ctaText, ctaHref, secondaryText, secondaryHref }: any) => (
        <section className="relative overflow-hidden bg-gradient-to-br from-[#0f2942] to-[#173b61] px-6 py-20 text-white md:py-28">
          <div className="mx-auto max-w-3xl text-center">
            {badge && (
              <div className="mb-4 inline-flex items-center rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-bold uppercase tracking-widest text-white/80">
                {badge}
              </div>
            )}
            <h1 className="text-balance text-4xl font-black leading-tight tracking-tight md:text-5xl">
              {title}
            </h1>
            {subtitle && (
              <p className="mt-4 text-lg leading-relaxed text-white/75 md:text-xl">
                {subtitle}
              </p>
            )}
            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              {ctaText && (
                <a
                  href={ctaHref || "#"}
                  className="inline-flex items-center rounded-xl bg-[#F3701E] px-7 py-3.5 text-base font-black text-white shadow-lg transition hover:bg-[#e05e0d] hover:shadow-xl"
                >
                  {ctaText}
                </a>
              )}
              {secondaryText && (
                <a
                  href={secondaryHref || "#"}
                  className="text-sm font-semibold text-white/70 underline underline-offset-2 transition hover:text-white"
                >
                  {secondaryText}
                </a>
              )}
            </div>
          </div>
          <div className="pointer-events-none absolute -bottom-16 -right-16 h-64 w-64 rounded-full bg-white/5" />
          <div className="pointer-events-none absolute -left-8 top-8 h-32 w-32 rounded-full bg-[#F3701E]/10" />
        </section>
      ),
    },

    // ── TextBlock ─────────────────────────────────────────────────────────────
    TextBlock: {
      label: "Texto — Sección con título y cuerpo",
      fields: {
        eyebrow: { type: "text", label: "Eyebrow (texto pequeño sobre el título)" },
        title: { type: "text", label: "Título" },
        body: { type: "textarea", label: "Cuerpo" },
        align: {
          type: "select",
          label: "Alineación",
          options: [
            { label: "Izquierda", value: "left" },
            { label: "Centro", value: "center" },
            { label: "Derecha", value: "right" },
          ],
        },
      },
      defaultProps: {
        eyebrow: "",
        title: "¿Por qué V12?",
        body: "Más de 500 atletas ya mejoraron su rendimiento con el método V12. El diagnóstico es el primer paso.",
        align: "center",
      },
      render: ({ eyebrow, title, body, align }: any) => (
        <section className="bg-white px-6 py-16">
          <div className="mx-auto max-w-2xl" style={{ textAlign: align }}>
            {eyebrow && (
              <p className="mb-3 text-xs font-extrabold uppercase tracking-[0.16em] text-[#F3701E]">
                {eyebrow}
              </p>
            )}
            {title && (
              <h2 className="text-3xl font-black tracking-tight text-[#0f2942]">{title}</h2>
            )}
            {body && (
              <p className="mt-4 text-lg leading-relaxed text-gray-600">{body}</p>
            )}
          </div>
        </section>
      ),
    },

    // ── CTABanner ─────────────────────────────────────────────────────────────
    CTABanner: {
      label: "CTA Banner — Llamado a la acción",
      fields: {
        title: { type: "text", label: "Título" },
        subtitle: { type: "text", label: "Subtítulo" },
        ctaText: { type: "text", label: "Texto del botón" },
        ctaHref: { type: "text", label: "Link del botón" },
      },
      defaultProps: {
        title: "¿Listo para conocer tu nivel?",
        subtitle: "El diagnóstico tarda menos de 2 minutos.",
        ctaText: "Hacer el diagnóstico gratis →",
        ctaHref: "/test",
      },
      render: ({ title, subtitle, ctaText, ctaHref }: any) => (
        <section className="bg-[#F3701E] px-6 py-14 text-white">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-black tracking-tight">{title}</h2>
            {subtitle && <p className="mt-2 text-lg text-white/80">{subtitle}</p>}
            {ctaText && (
              <a
                href={ctaHref || "#"}
                className="mt-6 inline-flex items-center rounded-xl bg-white px-7 py-3.5 text-base font-black text-[#F3701E] shadow-lg transition hover:shadow-xl"
              >
                {ctaText}
              </a>
            )}
          </div>
        </section>
      ),
    },

    // ── LeadForm ──────────────────────────────────────────────────────────────
    LeadForm: {
      label: "Formulario — Captura de leads",
      fields: {
        title: { type: "text", label: "Título del form" },
        subtitle: { type: "text", label: "Subtítulo" },
        ctaText: { type: "text", label: "Texto del botón" },
        namePlaceholder: { type: "text", label: "Placeholder nombre" },
        contactPlaceholder: { type: "text", label: "Placeholder email/IG" },
        successMessage: { type: "text", label: "Mensaje de éxito" },
        landingSlug: { type: "text", label: "Slug de esta landing (para atribución)" },
      },
      defaultProps: {
        title: "Quiero mi diagnóstico gratis",
        subtitle: "Te lo enviamos a tu Instagram o email en minutos.",
        ctaText: "Quiero mi diagnóstico →",
        namePlaceholder: "Tu nombre",
        contactPlaceholder: "Email o @instagram",
        successMessage: "¡Listo! Te contactamos pronto.",
        landingSlug: "",
      },
      render: (props: any) => <LeadFormBlock {...props} />,
    },

    // ── Testimonial ───────────────────────────────────────────────────────────
    Testimonial: {
      label: "Testimonio",
      fields: {
        quote: { type: "textarea", label: "Cita" },
        author: { type: "text", label: "Nombre del atleta" },
        role: { type: "text", label: "Rol / contexto" },
        stars: {
          type: "select",
          label: "Estrellas",
          options: [
            { label: "5 ⭐", value: 5 },
            { label: "4 ⭐", value: 4 },
            { label: "3 ⭐", value: 3 },
          ],
        },
      },
      defaultProps: {
        quote: "El diagnóstico fue exactamente lo que necesitaba para entender en qué mejorar.",
        author: "Nombre Apellido",
        role: "Jugador amateur · Buenos Aires",
        stars: 5,
      },
      render: ({ quote, author, role, stars }: any) => (
        <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
          <div className="mb-3 flex gap-0.5">
            {Array.from({ length: 5 }).map((_, i) => (
              <span key={i} className={i < stars ? "text-[#F3701E]" : "text-gray-200"}>★</span>
            ))}
          </div>
          <p className="text-base leading-relaxed text-gray-700">"{quote}"</p>
          <div className="mt-4">
            <div className="font-black text-[#0f2942]">{author}</div>
            <div className="text-sm text-gray-500">{role}</div>
          </div>
        </div>
      ),
    },

    // ── TestimonialsGrid ──────────────────────────────────────────────────────
    TestimonialsGrid: {
      label: "Grilla de testimonios",
      fields: {
        title: { type: "text", label: "Título de la sección" },
        t1_quote: { type: "textarea", label: "Testimonio 1 — Cita" },
        t1_author: { type: "text", label: "Testimonio 1 — Nombre" },
        t1_role: { type: "text", label: "Testimonio 1 — Rol" },
        t2_quote: { type: "textarea", label: "Testimonio 2 — Cita" },
        t2_author: { type: "text", label: "Testimonio 2 — Nombre" },
        t2_role: { type: "text", label: "Testimonio 2 — Rol" },
        t3_quote: { type: "textarea", label: "Testimonio 3 — Cita" },
        t3_author: { type: "text", label: "Testimonio 3 — Nombre" },
        t3_role: { type: "text", label: "Testimonio 3 — Rol" },
      },
      defaultProps: {
        title: "Lo que dicen los atletas",
        t1_quote: "Mejoré mi salto en 6 semanas con el plan V12.",
        t1_author: "Atleta 1",
        t1_role: "Jugador · Córdoba",
        t2_quote: "Por fin entendí en qué estaba fallando.",
        t2_author: "Atleta 2",
        t2_role: "Jugadora · Buenos Aires",
        t3_quote: "El diagnóstico fue el punto de quiebre.",
        t3_author: "Atleta 3",
        t3_role: "Amateur · Rosario",
      },
      render: ({ title, t1_quote, t1_author, t1_role, t2_quote, t2_author, t2_role, t3_quote, t3_author, t3_role }: any) => (
        <section className="bg-gray-50 px-6 py-16">
          <div className="mx-auto max-w-5xl">
            {title && (
              <h2 className="mb-10 text-center text-3xl font-black text-[#0f2942]">{title}</h2>
            )}
            <div className="grid gap-5 md:grid-cols-3">
              {[
                { q: t1_quote, a: t1_author, r: t1_role },
                { q: t2_quote, a: t2_author, r: t2_role },
                { q: t3_quote, a: t3_author, r: t3_role },
              ].map((t, i) => (
                <div key={i} className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
                  <div className="mb-3 text-[#F3701E]">★★★★★</div>
                  <p className="leading-relaxed text-gray-700">"{t.q}"</p>
                  <div className="mt-4 font-black text-[#0f2942]">{t.a}</div>
                  <div className="text-sm text-gray-500">{t.r}</div>
                </div>
              ))}
            </div>
          </div>
        </section>
      ),
    },

    // ── FAQ ───────────────────────────────────────────────────────────────────
    FAQ: {
      label: "Preguntas frecuentes",
      fields: {
        title: { type: "text", label: "Título" },
        q1: { type: "text", label: "Pregunta 1" },
        a1: { type: "textarea", label: "Respuesta 1" },
        q2: { type: "text", label: "Pregunta 2" },
        a2: { type: "textarea", label: "Respuesta 2" },
        q3: { type: "text", label: "Pregunta 3" },
        a3: { type: "textarea", label: "Respuesta 3" },
        q4: { type: "text", label: "Pregunta 4" },
        a4: { type: "textarea", label: "Respuesta 4" },
      },
      defaultProps: {
        title: "Preguntas frecuentes",
        q1: "¿Es gratis?",
        a1: "Sí, el diagnóstico es 100% gratuito.",
        q2: "¿Cuánto tarda?",
        a2: "Menos de 2 minutos.",
        q3: "¿Qué recibo al terminar?",
        a3: "Tu score por dimensión y recomendaciones personalizadas.",
        q4: "¿Necesito crear una cuenta?",
        a4: "No, solo tu nombre y forma de contacto.",
      },
      render: ({ title, q1, a1, q2, a2, q3, a3, q4, a4 }: any) => {
        const items = [
          { q: q1, a: a1 },
          { q: q2, a: a2 },
          { q: q3, a: a3 },
          { q: q4, a: a4 },
        ].filter((x) => x.q);
        return (
          <section className="bg-white px-6 py-16">
            <div className="mx-auto max-w-2xl">
              {title && (
                <h2 className="mb-8 text-center text-3xl font-black text-[#0f2942]">{title}</h2>
              )}
              <div className="space-y-4">
                {items.map((item, i) => (
                  <details key={i} className="group rounded-xl border border-gray-200 p-5">
                    <summary className="cursor-pointer list-none text-base font-bold text-[#0f2942] group-open:text-[#F3701E]">
                      {item.q}
                    </summary>
                    <p className="mt-3 text-gray-600">{item.a}</p>
                  </details>
                ))}
              </div>
            </div>
          </section>
        );
      },
    },

    // ── Spacer ────────────────────────────────────────────────────────────────
    Spacer: {
      label: "Espacio vertical",
      fields: {
        size: {
          type: "select",
          label: "Tamaño",
          options: [
            { label: "Pequeño (24px)", value: "sm" },
            { label: "Mediano (48px)", value: "md" },
            { label: "Grande (80px)", value: "lg" },
            { label: "Extra grande (120px)", value: "xl" },
          ],
        },
      },
      defaultProps: { size: "md" },
      render: ({ size }: any) => {
        const h: Record<string, number> = { sm: 24, md: 48, lg: 80, xl: 120 };
        return <div style={{ height: h[size] ?? 48 }} />;
      },
    },

    // ── ImageBlock ────────────────────────────────────────────────────────────
    ImageBlock: {
      label: "Imagen",
      fields: {
        src: { type: "text", label: "URL de la imagen" },
        alt: { type: "text", label: "Texto alternativo" },
        caption: { type: "text", label: "Pie de foto" },
        rounded: {
          type: "radio",
          label: "Bordes redondeados",
          options: [
            { label: "Sí", value: true },
            { label: "No", value: false },
          ],
        },
      },
      defaultProps: {
        src: "https://placehold.co/1200x600",
        alt: "Imagen V12",
        caption: "",
        rounded: true,
      },
      render: ({ src, alt, caption, rounded }: any) => (
        <section className="bg-white px-6 py-8">
          <div className="mx-auto max-w-4xl">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={src}
              alt={alt}
              className={`w-full object-cover ${rounded ? "rounded-2xl" : ""}`}
            />
            {caption && (
              <p className="mt-3 text-center text-sm text-gray-500">{caption}</p>
            )}
          </div>
        </section>
      ),
    },

  },
};

// ── LeadForm client component ────────────────────────────────────────────────

function LeadFormBlock({
  title,
  subtitle,
  ctaText,
  namePlaceholder,
  contactPlaceholder,
  successMessage,
  landingSlug,
}: {
  title: string;
  subtitle: string;
  ctaText: string;
  namePlaceholder: string;
  contactPlaceholder: string;
  successMessage: string;
  landingSlug: string;
}) {
  const [nombre, setNombre] = useState("");
  const [contacto, setContacto] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!nombre.trim() || !contacto.trim()) return;
    setLoading(true);
    try {
      await fetch("/api/lp-lead", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nombre, contacto, source: landingSlug || "landing" }),
      });
      setDone(true);
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }

  if (done) {
    return (
      <section className="bg-gray-50 px-6 py-16">
        <div className="mx-auto max-w-md rounded-2xl border border-green-200 bg-green-50 p-8 text-center">
          <div className="mb-3 text-4xl">✓</div>
          <p className="text-lg font-bold text-green-800">{successMessage}</p>
        </div>
      </section>
    );
  }

  return (
    <section className="bg-gray-50 px-6 py-16">
      <div className="mx-auto max-w-md">
        {title && <h2 className="mb-2 text-center text-2xl font-black text-[#0f2942]">{title}</h2>}
        {subtitle && <p className="mb-6 text-center text-gray-600">{subtitle}</p>}
        <form onSubmit={handleSubmit} className="space-y-3">
          <input
            type="text"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            placeholder={namePlaceholder}
            required
            className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-base font-medium outline-none focus:border-[#F3701E] focus:ring-2 focus:ring-[#F3701E]/20"
          />
          <input
            type="text"
            value={contacto}
            onChange={(e) => setContacto(e.target.value)}
            placeholder={contactPlaceholder}
            required
            className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-base font-medium outline-none focus:border-[#F3701E] focus:ring-2 focus:ring-[#F3701E]/20"
          />
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-[#F3701E] px-6 py-3.5 text-base font-black text-white transition hover:bg-[#e05e0d] disabled:opacity-60"
          >
            {loading ? "Enviando…" : ctaText}
          </button>
        </form>
      </div>
    </section>
  );
}
