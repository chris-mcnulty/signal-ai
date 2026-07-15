import { useEffect, useRef, useState } from "react";
import { useEditor, EditorContent, Editor } from "@tiptap/react";
import { BubbleMenu } from "@tiptap/react/menus";
import { Node, mergeAttributes } from "@tiptap/core";
import StarterKit from "@tiptap/starter-kit";
import { Image } from "@tiptap/extension-image";
import { Link } from "@tiptap/extension-link";
import { Table } from "@tiptap/extension-table";
import { TableRow } from "@tiptap/extension-table-row";
import { TableCell } from "@tiptap/extension-table-cell";
import { TableHeader } from "@tiptap/extension-table-header";
import { Typography } from "@tiptap/extension-typography";
import TurndownService from "turndown";
import {
  Bold,
  Italic,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  Quote,
  Link as LinkIcon,
  Image as ImageIcon,
  Code,
  Undo,
  Redo,
  AlignLeft,
  AlignCenter,
  AlignRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const turndown = new TurndownService({ headingStyle: "atx", codeBlockStyle: "fenced" });

// ---------------------------------------------------------------------------
// Custom Image extension with size + alignment attributes
// ---------------------------------------------------------------------------
const CustomImage = Image.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      "data-size": {
        default: "full",
        parseHTML: (el) => el.getAttribute("data-size") ?? "full",
        renderHTML: (attrs) => ({ "data-size": (attrs["data-size"] as string) ?? "full" }),
      },
      "data-align": {
        default: "center",
        parseHTML: (el) => el.getAttribute("data-align") ?? "center",
        renderHTML: (attrs) => ({ "data-align": (attrs["data-align"] as string) ?? "center" }),
      },
    };
  },
});

// ---------------------------------------------------------------------------
// RichTextEditor public API
// ---------------------------------------------------------------------------
export interface RichTextEditorChange {
  html: string;
  markdown: string;
}

interface Props {
  value: string;
  onChange: (change: RichTextEditorChange) => void;
  placeholder?: string;
}

function ToolbarButton({
  onClick,
  active,
  disabled,
  label,
  children,
}: {
  onClick: () => void;
  active?: boolean;
  disabled?: boolean;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={label}
      aria-label={label}
      className={cn(
        "h-8 w-8 inline-flex items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground transition-colors",
        active && "text-foreground bg-muted",
        disabled && "opacity-40 cursor-not-allowed pointer-events-none",
      )}
    >
      {children}
    </button>
  );
}

export function RichTextEditor({ value, onChange }: Props) {
  const lastValueRef = useRef(value);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        codeBlock: { HTMLAttributes: { class: "bg-muted p-3 rounded text-sm font-mono" } },
      }),
      CustomImage.configure({
        inline: false,
        HTMLAttributes: { class: "rounded-md max-w-full" },
      }),
      Link.configure({
        openOnClick: false,
        autolink: true,
        HTMLAttributes: { class: "underline text-primary" },
      }),
      Table.configure({ resizable: false, HTMLAttributes: { class: "border-collapse w-full" } }),
      TableRow,
      TableHeader.configure({ HTMLAttributes: { class: "border border-border bg-muted px-2 py-1 text-left" } }),
      TableCell.configure({ HTMLAttributes: { class: "border border-border px-2 py-1" } }),
      Typography,
    ],
    content: value || "",
    editorProps: {
      attributes: {
        class:
          "prose dark:prose-invert max-w-none min-h-[480px] px-4 py-4 focus:outline-none text-sm leading-relaxed",
      },
    },
    onUpdate: ({ editor }) => {
      const html = editor.getHTML();
      lastValueRef.current = html;
      const markdown = turndown.turndown(html);
      onChange({ html, markdown });
    },
  });

  useEffect(() => {
    if (!editor) return;
    if (value !== lastValueRef.current) {
      lastValueRef.current = value;
      editor.commands.setContent(value || "", { emitUpdate: false });
    }
  }, [value, editor]);

  if (!editor) {
    return <div className="border border-border rounded-md min-h-[520px] bg-card" />;
  }

  return (
    <div className="border border-border rounded-md bg-card overflow-hidden">
      <ImageFloatingToolbar editor={editor} />
      <Toolbar editor={editor} />
      <div className="border-t border-border max-h-[640px] overflow-y-auto">
        <EditorContent editor={editor} />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Floating toolbar for selected images
// ---------------------------------------------------------------------------
const IMAGE_SIZES = [
  { value: "small",  label: "S",    title: "Small (33%)"  },
  { value: "medium", label: "M",    title: "Medium (50%)" },
  { value: "full",   label: "Full", title: "Full width"   },
] as const;

const IMAGE_ALIGNS = [
  { value: "left",   Icon: AlignLeft,   title: "Float left" },
  { value: "center", Icon: AlignCenter, title: "Center"     },
  { value: "right",  Icon: AlignRight,  title: "Float right"},
] as const;

function ImageFloatingToolbar({ editor }: { editor: Editor }) {
  const activeSize  = (editor.getAttributes("image")["data-size"]  as string | undefined) ?? "full";
  const activeAlign = (editor.getAttributes("image")["data-align"] as string | undefined) ?? "center";

  return (
    <BubbleMenu
      editor={editor}
      shouldShow={({ editor: e }: { editor: Editor; element: HTMLElement; view: unknown; state: unknown; oldState?: unknown; from: number; to: number }) =>
        e.isActive("image")
      }
    >
      <div className="flex items-center gap-0.5 rounded-md border border-border bg-card shadow-md px-1 py-1">
        <span className="text-[10px] text-muted-foreground px-1 select-none">Size</span>
        {IMAGE_SIZES.map(({ value, label, title }) => (
          <button
            key={value}
            type="button"
            title={title}
            aria-label={title}
            onMouseDown={(e) => {
              e.preventDefault();
              editor.chain().focus().updateAttributes("image", { "data-size": value }).run();
            }}
            className={cn(
              "h-7 min-w-[2rem] px-1.5 inline-flex items-center justify-center rounded text-xs font-medium",
              activeSize === value
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
          >
            {label}
          </button>
        ))}
        <div className="w-px h-5 bg-border mx-1" />
        <span className="text-[10px] text-muted-foreground px-1 select-none">Align</span>
        {IMAGE_ALIGNS.map(({ value, Icon, title }) => (
          <button
            key={value}
            type="button"
            title={title}
            aria-label={title}
            onMouseDown={(e) => {
              e.preventDefault();
              editor.chain().focus().updateAttributes("image", { "data-align": value }).run();
            }}
            className={cn(
              "h-7 w-7 inline-flex items-center justify-center rounded",
              activeAlign === value
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
          >
            <Icon className="h-3.5 w-3.5" />
          </button>
        ))}
      </div>
    </BubbleMenu>
  );
}

// ---------------------------------------------------------------------------
// Main toolbar
// ---------------------------------------------------------------------------
function Toolbar({ editor }: { editor: Editor }) {
  const [linkOpen,  setLinkOpen]  = useState(false);
  const [linkUrl,   setLinkUrl]   = useState("");
  const [imageOpen, setImageOpen] = useState(false);
  const [imageUrl,  setImageUrl]  = useState("");

  const insertLink = () => {
    setLinkUrl(editor.getAttributes("link").href ?? "");
    setLinkOpen(true);
    setImageOpen(false);
  };

  const applyLink = () => {
    if (linkUrl) {
      editor.chain().focus().extendMarkRange("link").setLink({ href: linkUrl }).run();
    } else {
      editor.chain().focus().unsetLink().run();
    }
    setLinkOpen(false);
  };

  const applyImage = () => {
    const url = imageUrl.trim();
    if (!url) return;
    editor.chain().focus().setImage({ src: url }).run();
    setImageOpen(false);
    setImageUrl("");
  };

  return (
    <div className="sticky top-12 z-20 flex flex-wrap items-center gap-0.5 px-2 py-1.5 bg-card border-b border-border rounded-t-md">
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleBold().run()}
        active={editor.isActive("bold")}
        label="Bold"
      >
        <Bold className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleItalic().run()}
        active={editor.isActive("italic")}
        label="Italic"
      >
        <Italic className="h-4 w-4" />
      </ToolbarButton>

      <div className="w-px h-5 bg-border mx-1" />

      <ToolbarButton
        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        active={editor.isActive("heading", { level: 2 })}
        label="Heading 2"
      >
        <Heading2 className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
        active={editor.isActive("heading", { level: 3 })}
        label="Heading 3"
      >
        <Heading3 className="h-4 w-4" />
      </ToolbarButton>

      <div className="w-px h-5 bg-border mx-1" />

      <ToolbarButton
        onClick={() => editor.chain().focus().toggleBulletList().run()}
        active={editor.isActive("bulletList")}
        label="Bullet list"
      >
        <List className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
        active={editor.isActive("orderedList")}
        label="Ordered list"
      >
        <ListOrdered className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleBlockquote().run()}
        active={editor.isActive("blockquote")}
        label="Blockquote"
      >
        <Quote className="h-4 w-4" />
      </ToolbarButton>

      <div className="w-px h-5 bg-border mx-1" />

      <ToolbarButton
        onClick={insertLink}
        active={editor.isActive("link")}
        label="Insert link"
      >
        <LinkIcon className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => { setImageUrl(""); setImageOpen(true); setLinkOpen(false); }}
        label="Insert image by URL"
      >
        <ImageIcon className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleCode().run()}
        active={editor.isActive("code")}
        label="Inline code"
      >
        <Code className="h-4 w-4" />
      </ToolbarButton>

      <div className="ml-auto flex items-center">
        <ToolbarButton
          onClick={() => editor.chain().focus().undo().run()}
          disabled={!editor.can().undo()}
          label="Undo"
        >
          <Undo className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().redo().run()}
          disabled={!editor.can().redo()}
          label="Redo"
        >
          <Redo className="h-4 w-4" />
        </ToolbarButton>
      </div>

      {/* Link panel */}
      {linkOpen && (
        <div className="basis-full mt-1 flex items-center gap-2">
          <input
            type="url"
            value={linkUrl}
            onChange={(e) => setLinkUrl(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && applyLink()}
            placeholder="https://example.com"
            className="flex-1 h-9 px-3 rounded-md border border-border bg-background text-sm focus:outline-none focus:ring-1 focus:ring-ring"
            autoFocus
          />
          <Button type="button" size="sm" onClick={applyLink}>Apply</Button>
          <Button type="button" size="sm" variant="ghost" onClick={() => { editor.chain().focus().unsetLink().run(); setLinkOpen(false); }}>Remove</Button>
          <Button type="button" size="sm" variant="outline" onClick={() => setLinkOpen(false)}>Cancel</Button>
        </div>
      )}

      {/* Image URL panel */}
      {imageOpen && (
        <div className="basis-full mt-1 flex items-center gap-2">
          <input
            type="url"
            value={imageUrl}
            onChange={(e) => setImageUrl(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && applyImage()}
            placeholder="https://example.com/image.jpg"
            className="flex-1 h-9 px-3 rounded-md border border-border bg-background text-sm focus:outline-none focus:ring-1 focus:ring-ring"
            autoFocus
          />
          <Button type="button" size="sm" onClick={applyImage} disabled={!imageUrl.trim()}>Insert</Button>
          <Button type="button" size="sm" variant="outline" onClick={() => setImageOpen(false)}>Cancel</Button>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sanitized HTML renderer (for display-only use on the public site)
// ---------------------------------------------------------------------------
const ALLOWED_TAGS = new Set([
  "P", "BR", "STRONG", "B", "EM", "I", "U", "SPAN",
  "UL", "OL", "LI",
  "H1", "H2", "H3", "H4",
  "A", "IMG",
  "BLOCKQUOTE", "HR",
  "TABLE", "THEAD", "TBODY", "TR", "TH", "TD",
  "PRE", "CODE",
]);

const ALLOWED_ATTRS: Record<string, Set<string>> = {
  A:   new Set(["href", "title", "rel", "target"]),
  IMG: new Set(["src", "alt", "width", "height", "title", "data-size", "data-align"]),
  TD:  new Set(["colspan", "rowspan"]),
  TH:  new Set(["colspan", "rowspan"]),
};

function isSafeUrl(url: string): boolean {
  const t = url.trim().toLowerCase();
  return !!t && !t.startsWith("javascript:") && !(t.startsWith("data:") && !t.startsWith("data:image/"));
}

function sanitizeNode(node: Node, doc: Document): ChildNode | null {
  if (node.nodeType === Node.TEXT_NODE) return doc.createTextNode(node.textContent ?? "");
  if (node.nodeType !== Node.ELEMENT_NODE) return null;
  const el = node as Element;
  const tag = el.tagName.toUpperCase();

  if (!ALLOWED_TAGS.has(tag)) {
    const frag = doc.createDocumentFragment();
    el.childNodes.forEach((c) => { const out = sanitizeNode(c, doc); if (out) frag.appendChild(out); });
    return frag as unknown as ChildNode;
  }

  const cleaned = doc.createElement(el.tagName.toLowerCase());
  const allowed = ALLOWED_ATTRS[tag] ?? new Set<string>();
  for (const attr of Array.from(el.attributes)) {
    if (!allowed.has(attr.name.toLowerCase())) continue;
    if ((attr.name === "href" || attr.name === "src") && !isSafeUrl(attr.value)) continue;
    cleaned.setAttribute(attr.name, attr.value);
  }
  if (tag === "A") {
    const href = cleaned.getAttribute("href") ?? "";
    if (/^https?:\/\//i.test(href)) {
      cleaned.setAttribute("target", "_blank");
      cleaned.setAttribute("rel", "noopener noreferrer");
    }
  }
  el.childNodes.forEach((c) => { const out = sanitizeNode(c, doc); if (out) cleaned.appendChild(out); });
  return cleaned;
}

export function sanitizeHtml(html: string): string {
  if (!html) return "";
  if (typeof window === "undefined" || typeof DOMParser === "undefined") return html.replace(/<[^>]*>/g, "");
  const doc = new DOMParser().parseFromString(`<div>${html}</div>`, "text/html");
  const wrapper = doc.body.firstElementChild;
  if (!wrapper) return "";
  const out = doc.createElement("div");
  wrapper.childNodes.forEach((c) => { const n = sanitizeNode(c, doc); if (n) out.appendChild(n); });
  return out.innerHTML;
}
