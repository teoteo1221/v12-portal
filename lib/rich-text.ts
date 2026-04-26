/**
 * Helpers para migrar entre markdown crudo (formato viejo del
 * raw_document) y el HTML que genera TipTap.
 *
 * Estrategia:
 * - Si el contenido ya parece HTML (empieza con una etiqueta de bloque)
 *   lo devolvemos tal cual.
 * - Si parece markdown plano (headings con `#`, listas con `-`, etc),
 *   hacemos una conversión mínima y determinística. Suficiente para que
 *   el editor abra los documentos existentes con formato razonable.
 *
 * No se pretende un parser markdown completo — si Mateo escribe mucho,
 * el editor rich-text toma el control y devuelve HTML.
 */

const HTML_BLOCK_RE =
  /^\s*<(p|h1|h2|h3|h4|h5|h6|ul|ol|li|blockquote|pre|hr|div|article|section)[\s>]/i;

export function looksLikeHtml(raw: string | null | undefined): boolean {
  if (!raw) return false;
  return HTML_BLOCK_RE.test(raw.trim());
}

export function markdownToHtml(raw: string | null | undefined): string {
  if (!raw) return "";
  if (looksLikeHtml(raw)) return raw;

  const lines = raw.replace(/\r\n/g, "\n").split("\n");
  const out: string[] = [];
  let listBuffer: { tag: "ul" | "ol"; items: string[] } | null = null;

  const flushList = () => {
    if (!listBuffer) return;
    out.push(`<${listBuffer.tag}>`);
    for (const item of listBuffer.items) {
      out.push(`<li>${inlineMd(item)}</li>`);
    }
    out.push(`</${listBuffer.tag}>`);
    listBuffer = null;
  };

  for (const rawLine of lines) {
    const line = rawLine.trimEnd();

    // Líneas vacías: cerrar lista si hay, y punto.
    if (line.trim() === "") {
      flushList();
      continue;
    }

    // Headings
    const h = /^(#{1,3})\s+(.*)$/.exec(line);
    if (h) {
      flushList();
      const level = h[1].length;
      out.push(`<h${level}>${inlineMd(h[2])}</h${level}>`);
      continue;
    }

    // HR
    if (/^-{3,}$/.test(line.trim()) || /^\*{3,}$/.test(line.trim())) {
      flushList();
      out.push("<hr>");
      continue;
    }

    // Blockquote
    if (line.startsWith("> ")) {
      flushList();
      out.push(`<blockquote><p>${inlineMd(line.slice(2))}</p></blockquote>`);
      continue;
    }

    // Listas numeradas
    const ol = /^\s*\d+\.\s+(.*)$/.exec(line);
    if (ol) {
      if (!listBuffer || listBuffer.tag !== "ol") {
        flushList();
        listBuffer = { tag: "ol", items: [] };
      }
      listBuffer.items.push(ol[1]);
      continue;
    }

    // Listas con viñetas
    const ul = /^\s*[-*]\s+(.*)$/.exec(line);
    if (ul) {
      if (!listBuffer || listBuffer.tag !== "ul") {
        flushList();
        listBuffer = { tag: "ul", items: [] };
      }
      listBuffer.items.push(ul[1]);
      continue;
    }

    // Párrafo común
    flushList();
    out.push(`<p>${inlineMd(line)}</p>`);
  }
  flushList();

  return out.join("\n");
}

/**
 * Inline markdown: negrita (**x**), itálica (*x* o _x_), código (`x`),
 * links [texto](url). No busca perfección; busca legibilidad.
 */
function inlineMd(raw: string): string {
  let s = escapeHtml(raw);
  // Código primero (protege el contenido del resto).
  s = s.replace(/`([^`]+)`/g, "<code>$1</code>");
  // Negrita
  s = s.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  // Itálica (*x* y _x_)
  s = s.replace(/(^|[^*])\*([^*\s][^*]*)\*/g, "$1<em>$2</em>");
  s = s.replace(/(^|[^_])_([^_\s][^_]*)_/g, "$1<em>$2</em>");
  // Links
  s = s.replace(
    /\[([^\]]+)\]\(([^)]+)\)/g,
    '<a href="$2" rel="noreferrer noopener" target="_blank">$1</a>',
  );
  return s;
}

function escapeHtml(raw: string): string {
  return raw
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
