"use client";

import { useEditor, EditorContent, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import { Color } from "@tiptap/extension-color";
import { TextStyle } from "@tiptap/extension-text-style";
import Highlight from "@tiptap/extension-highlight";
import TextAlign from "@tiptap/extension-text-align";
import Link from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";
import { useCallback, useEffect, useMemo, useRef } from "react";
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  Strikethrough,
  Highlighter,
  List,
  ListOrdered,
  Heading1,
  Heading2,
  Heading3,
  Quote,
  Code,
  Undo2,
  Redo2,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Link as LinkIcon,
  Unlink,
  Minus,
  Eraser,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  minHeight?: number;
  className?: string;
  autoFocus?: boolean;
  spellCheck?: boolean;
}

/**
 * Editor rich-text basado en TipTap.
 *
 * Guarda HTML como string. El storage (textarea / JSONB) es opaco al editor —
 * solo consume y devuelve strings. Si el contenido no es HTML válido (ej:
 * documentos viejos que eran markdown crudo), TipTap los trata como texto
 * plano envuelto en <p>.
 *
 * Toolbar incluye: headings 1-3, negrita / itálica / subrayado / tachado,
 * resaltado (amarillo), color de texto (paleta V12), listas, cita, código,
 * alineación, link, línea horizontal, limpiar formato, undo/redo.
 */
export function RichTextEditor({
  value,
  onChange,
  placeholder = "Escribí acá…",
  minHeight = 400,
  className,
  autoFocus = false,
  spellCheck = true,
}: Props) {
  // Evitar loops de onChange → setValue → editor.setContent → onChange
  const lastEmitted = useRef<string>(value);

  const editor = useEditor({
    // SSR-safe: Next.js 15 renderiza el componente en server pero TipTap necesita
    // hidratar desde cliente. La opción immediatelyRender:false evita el warning.
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
        // StarterKit trae listas y blockquote por default.
      }),
      Underline,
      TextStyle,
      Color,
      Highlight.configure({ multicolor: false }),
      TextAlign.configure({
        types: ["heading", "paragraph"],
      }),
      Link.configure({
        openOnClick: false,
        autolink: true,
        HTMLAttributes: {
          class: "text-v12-orange-dark underline underline-offset-2",
          rel: "noreferrer noopener",
          target: "_blank",
        },
      }),
      Placeholder.configure({ placeholder }),
    ],
    content: value || "",
    editorProps: {
      attributes: {
        spellcheck: String(spellCheck),
        class: cn(
          "prose-v12 max-w-none px-4 py-3 focus:outline-none",
          "text-[15px] leading-relaxed text-v12-ink",
        ),
      },
    },
    onUpdate: ({ editor }) => {
      const html = editor.getHTML();
      lastEmitted.current = html;
      onChange(html);
    },
    autofocus: autoFocus,
  });

  // Si el valor externo cambia (ej: cargó otro plan, revertió una versión)
  // sincronizar el editor sin disparar onChange.
  useEffect(() => {
    if (!editor) return;
    if (value === lastEmitted.current) return;
    // Evitar re-set mientras el usuario está escribiendo (cursor).
    if (editor.isFocused && value === editor.getHTML()) return;
    editor.commands.setContent(value || "", { emitUpdate: false });
    lastEmitted.current = value;
  }, [value, editor]);

  if (!editor) {
    return (
      <div
        className={cn(
          "rounded-md border border-v12-line bg-v12-surface px-4 py-3 text-sm text-v12-muted",
          className,
        )}
      >
        Cargando editor…
      </div>
    );
  }

  return (
    <div
      className={cn(
        "rounded-md border border-v12-line bg-v12-surface shadow-sm",
        "focus-within:border-v12-orange focus-within:ring-1 focus-within:ring-v12-orange/20",
        className,
      )}
    >
      <Toolbar editor={editor} />
      <div
        className="overflow-y-auto"
        style={{ minHeight }}
        onClick={() => editor.chain().focus().run()}
      >
        <EditorContent editor={editor} />
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────
// Toolbar
// ──────────────────────────────────────────────────────────────────────

const V12_TEXT_COLORS: Array<{ label: string; value: string }> = [
  { label: "Default", value: "" },
  { label: "Navy", value: "#173B61" },
  { label: "Naranja", value: "#F3701E" },
  { label: "Verde", value: "#059669" },
  { label: "Rojo", value: "#B91C1C" },
  { label: "Gris", value: "#64748B" },
];

function Toolbar({ editor }: { editor: Editor }) {
  const setLink = useCallback(() => {
    const previous = editor.getAttributes("link").href as string | undefined;
    const url = window.prompt("URL del link", previous ?? "https://");
    if (url === null) return; // cancelado
    if (url === "") {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
      return;
    }
    editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
  }, [editor]);

  return (
    <div
      className={cn(
        "sticky top-0 z-10 flex flex-wrap items-center gap-0.5 border-b border-v12-line-soft bg-v12-bg/80 px-2 py-1.5 backdrop-blur",
      )}
    >
      <Group>
        <ToolButton
          onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
          active={editor.isActive("heading", { level: 1 })}
          title="Título grande"
          icon={Heading1}
        />
        <ToolButton
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          active={editor.isActive("heading", { level: 2 })}
          title="Subtítulo"
          icon={Heading2}
        />
        <ToolButton
          onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
          active={editor.isActive("heading", { level: 3 })}
          title="Sub-subtítulo"
          icon={Heading3}
        />
      </Group>
      <Sep />
      <Group>
        <ToolButton
          onClick={() => editor.chain().focus().toggleBold().run()}
          active={editor.isActive("bold")}
          title="Negrita (Ctrl+B)"
          icon={Bold}
        />
        <ToolButton
          onClick={() => editor.chain().focus().toggleItalic().run()}
          active={editor.isActive("italic")}
          title="Itálica (Ctrl+I)"
          icon={Italic}
        />
        <ToolButton
          onClick={() => editor.chain().focus().toggleUnderline().run()}
          active={editor.isActive("underline")}
          title="Subrayado (Ctrl+U)"
          icon={UnderlineIcon}
        />
        <ToolButton
          onClick={() => editor.chain().focus().toggleStrike().run()}
          active={editor.isActive("strike")}
          title="Tachado"
          icon={Strikethrough}
        />
        <ToolButton
          onClick={() => editor.chain().focus().toggleHighlight().run()}
          active={editor.isActive("highlight")}
          title="Resaltar"
          icon={Highlighter}
        />
      </Group>
      <Sep />
      <Group>
        <ColorPicker editor={editor} />
      </Group>
      <Sep />
      <Group>
        <ToolButton
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          active={editor.isActive("bulletList")}
          title="Lista con viñetas"
          icon={List}
        />
        <ToolButton
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          active={editor.isActive("orderedList")}
          title="Lista numerada"
          icon={ListOrdered}
        />
        <ToolButton
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
          active={editor.isActive("blockquote")}
          title="Cita"
          icon={Quote}
        />
        <ToolButton
          onClick={() => editor.chain().focus().toggleCodeBlock().run()}
          active={editor.isActive("codeBlock")}
          title="Bloque de código"
          icon={Code}
        />
      </Group>
      <Sep />
      <Group>
        <ToolButton
          onClick={() => editor.chain().focus().setTextAlign("left").run()}
          active={editor.isActive({ textAlign: "left" })}
          title="Alinear izquierda"
          icon={AlignLeft}
        />
        <ToolButton
          onClick={() => editor.chain().focus().setTextAlign("center").run()}
          active={editor.isActive({ textAlign: "center" })}
          title="Centrar"
          icon={AlignCenter}
        />
        <ToolButton
          onClick={() => editor.chain().focus().setTextAlign("right").run()}
          active={editor.isActive({ textAlign: "right" })}
          title="Alinear derecha"
          icon={AlignRight}
        />
      </Group>
      <Sep />
      <Group>
        <ToolButton
          onClick={setLink}
          active={editor.isActive("link")}
          title="Insertar link"
          icon={LinkIcon}
        />
        <ToolButton
          onClick={() => editor.chain().focus().unsetLink().run()}
          disabled={!editor.isActive("link")}
          title="Quitar link"
          icon={Unlink}
        />
        <ToolButton
          onClick={() => editor.chain().focus().setHorizontalRule().run()}
          title="Línea horizontal"
          icon={Minus}
        />
        <ToolButton
          onClick={() =>
            editor
              .chain()
              .focus()
              .unsetAllMarks()
              .clearNodes()
              .run()
          }
          title="Limpiar formato"
          icon={Eraser}
        />
      </Group>
      <Sep />
      <Group>
        <ToolButton
          onClick={() => editor.chain().focus().undo().run()}
          disabled={!editor.can().undo()}
          title="Deshacer (Ctrl+Z)"
          icon={Undo2}
        />
        <ToolButton
          onClick={() => editor.chain().focus().redo().run()}
          disabled={!editor.can().redo()}
          title="Rehacer (Ctrl+Shift+Z)"
          icon={Redo2}
        />
      </Group>
    </div>
  );
}

function Group({ children }: { children: React.ReactNode }) {
  return <div className="flex items-center gap-0.5">{children}</div>;
}

function Sep() {
  return <div className="mx-1 h-5 w-px bg-v12-line" aria-hidden />;
}

function ToolButton({
  onClick,
  active,
  disabled,
  title,
  icon: Icon,
}: {
  onClick: () => void;
  active?: boolean;
  disabled?: boolean;
  title: string;
  icon: React.ComponentType<{ className?: string }>;
}) {
  return (
    <button
      type="button"
      onMouseDown={(e) => {
        // Evitar que el botón robe el focus y corte la selección del editor.
        e.preventDefault();
      }}
      onClick={onClick}
      disabled={disabled}
      title={title}
      aria-label={title}
      className={cn(
        "inline-flex h-7 w-7 items-center justify-center rounded-md text-v12-muted transition",
        "hover:bg-v12-surface hover:text-v12-ink",
        active && "bg-v12-navy text-white shadow-sm hover:bg-v12-navy hover:text-white",
        disabled && "cursor-not-allowed opacity-40 hover:bg-transparent hover:text-v12-muted",
      )}
    >
      <Icon className="h-3.5 w-3.5" />
    </button>
  );
}

function ColorPicker({ editor }: { editor: Editor }) {
  const current = useMemo(
    () => (editor.getAttributes("textStyle").color as string | undefined) ?? "",
    [editor, editor.state.selection.from, editor.state.selection.to],
  );
  return (
    <div className="flex items-center gap-1">
      {V12_TEXT_COLORS.map((c) => (
        <button
          key={c.value || "default"}
          type="button"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => {
            if (!c.value) {
              editor.chain().focus().unsetColor().run();
            } else {
              editor.chain().focus().setColor(c.value).run();
            }
          }}
          title={`Color: ${c.label}`}
          aria-label={`Color ${c.label}`}
          className={cn(
            "relative inline-flex h-5 w-5 items-center justify-center rounded-full border border-v12-line transition hover:scale-110",
            current === c.value && "ring-2 ring-v12-navy ring-offset-1",
            !c.value && "bg-gradient-to-br from-v12-bg to-v12-line",
          )}
          style={c.value ? { backgroundColor: c.value } : undefined}
        />
      ))}
    </div>
  );
}
