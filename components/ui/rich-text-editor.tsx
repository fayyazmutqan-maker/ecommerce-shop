"use client";

import { useEditor, EditorContent, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Image from "@tiptap/extension-image";
import Link from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";
import Underline from "@tiptap/extension-underline";
import TextAlign from "@tiptap/extension-text-align";
import Highlight from "@tiptap/extension-highlight";
import {
  Bold, Italic, Underline as UnderlineIcon, Strikethrough,
  Heading1, Heading2, Heading3,
  List, ListOrdered, Quote, Code, Minus,
  AlignLeft, AlignCenter, AlignRight,
  Link as LinkIcon, Image as ImageIcon, Highlighter,
  Undo, Redo, RemoveFormatting,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useCallback, useRef } from "react";
import { toast } from "sonner";

interface RichTextEditorProps {
  content: string;
  onChange: (html: string) => void;
  placeholder?: string;
  className?: string;
}

export function RichTextEditor({ content, onChange, placeholder = "Write your content...", className }: RichTextEditorProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
      }),
      Underline,
      Highlight.configure({ multicolor: false }),
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: { class: "text-primary underline" },
      }),
      Image.configure({
        HTMLAttributes: { class: "rounded-lg max-w-full mx-auto" },
      }),
      Placeholder.configure({ placeholder }),
    ],
    content,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
    editorProps: {
      attributes: {
        class: "prose prose-sm sm:prose dark:prose-invert max-w-none min-h-[300px] p-4 focus:outline-none bg-white dark:bg-zinc-950",
      },
    },
  });

  const uploadImage = useCallback(async (file: File) => {
    const formData = new FormData();
    formData.append("files", file);
    try {
      const res = await fetch("/api/upload?folder=blog", { method: "POST", body: formData });
      if (!res.ok) throw new Error("Upload failed");
      const data = await res.json();
      if (data.uploaded?.[0]?.url) {
        editor?.chain().focus().setImage({ src: data.uploaded[0].url }).run();
      }
    } catch {
      toast.error("Failed to upload image");
    }
  }, [editor]);

  const handleImageUpload = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) uploadImage(file);
    e.target.value = "";
  }, [uploadImage]);

  const addLink = useCallback(() => {
    if (!editor) return;
    const prev = editor.getAttributes("link").href;
    const url = window.prompt("URL", prev || "https://");
    if (url === null) return;
    if (url === "") {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
    } else {
      editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
    }
  }, [editor]);

  if (!editor) return null;

  return (
    <div className={cn("rounded-md border bg-background", className)}>
      <Toolbar editor={editor} onAddLink={addLink} onAddImage={handleImageUpload} />
      <EditorContent editor={editor} />
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        className="sr-only"
        onChange={handleFileChange}
      />
    </div>
  );
}

function ToolbarButton({
  onClick,
  active,
  disabled,
  children,
  title,
}: {
  onClick: () => void;
  active?: boolean;
  disabled?: boolean;
  children: React.ReactNode;
  title?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={cn(
        "p-1.5 rounded hover:bg-muted transition-colors",
        active && "bg-muted text-primary",
        disabled && "opacity-40 cursor-not-allowed"
      )}
    >
      {children}
    </button>
  );
}

function Toolbar({ editor, onAddLink, onAddImage }: { editor: Editor; onAddLink: () => void; onAddImage: () => void }) {
  const s = 16;

  return (
    <div className="flex flex-wrap items-center gap-0.5 border-b p-1.5">
      {/* Undo / Redo */}
      <ToolbarButton onClick={() => editor.chain().focus().undo().run()} disabled={!editor.can().undo()} title="Undo">
        <Undo size={s} />
      </ToolbarButton>
      <ToolbarButton onClick={() => editor.chain().focus().redo().run()} disabled={!editor.can().redo()} title="Redo">
        <Redo size={s} />
      </ToolbarButton>

      <div className="w-px h-5 bg-border mx-1" />

      {/* Text formatting */}
      <ToolbarButton onClick={() => editor.chain().focus().toggleBold().run()} active={editor.isActive("bold")} title="Bold">
        <Bold size={s} />
      </ToolbarButton>
      <ToolbarButton onClick={() => editor.chain().focus().toggleItalic().run()} active={editor.isActive("italic")} title="Italic">
        <Italic size={s} />
      </ToolbarButton>
      <ToolbarButton onClick={() => editor.chain().focus().toggleUnderline().run()} active={editor.isActive("underline")} title="Underline">
        <UnderlineIcon size={s} />
      </ToolbarButton>
      <ToolbarButton onClick={() => editor.chain().focus().toggleStrike().run()} active={editor.isActive("strike")} title="Strikethrough">
        <Strikethrough size={s} />
      </ToolbarButton>
      <ToolbarButton onClick={() => editor.chain().focus().toggleHighlight().run()} active={editor.isActive("highlight")} title="Highlight">
        <Highlighter size={s} />
      </ToolbarButton>

      <div className="w-px h-5 bg-border mx-1" />

      {/* Headings */}
      <ToolbarButton onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} active={editor.isActive("heading", { level: 1 })} title="Heading 1">
        <Heading1 size={s} />
      </ToolbarButton>
      <ToolbarButton onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} active={editor.isActive("heading", { level: 2 })} title="Heading 2">
        <Heading2 size={s} />
      </ToolbarButton>
      <ToolbarButton onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} active={editor.isActive("heading", { level: 3 })} title="Heading 3">
        <Heading3 size={s} />
      </ToolbarButton>

      <div className="w-px h-5 bg-border mx-1" />

      {/* Lists */}
      <ToolbarButton onClick={() => editor.chain().focus().toggleBulletList().run()} active={editor.isActive("bulletList")} title="Bullet List">
        <List size={s} />
      </ToolbarButton>
      <ToolbarButton onClick={() => editor.chain().focus().toggleOrderedList().run()} active={editor.isActive("orderedList")} title="Ordered List">
        <ListOrdered size={s} />
      </ToolbarButton>
      <ToolbarButton onClick={() => editor.chain().focus().toggleBlockquote().run()} active={editor.isActive("blockquote")} title="Blockquote">
        <Quote size={s} />
      </ToolbarButton>
      <ToolbarButton onClick={() => editor.chain().focus().toggleCodeBlock().run()} active={editor.isActive("codeBlock")} title="Code Block">
        <Code size={s} />
      </ToolbarButton>
      <ToolbarButton onClick={() => editor.chain().focus().setHorizontalRule().run()} title="Horizontal Rule">
        <Minus size={s} />
      </ToolbarButton>

      <div className="w-px h-5 bg-border mx-1" />

      {/* Alignment */}
      <ToolbarButton onClick={() => editor.chain().focus().setTextAlign("left").run()} active={editor.isActive({ textAlign: "left" })} title="Align Left">
        <AlignLeft size={s} />
      </ToolbarButton>
      <ToolbarButton onClick={() => editor.chain().focus().setTextAlign("center").run()} active={editor.isActive({ textAlign: "center" })} title="Align Center">
        <AlignCenter size={s} />
      </ToolbarButton>
      <ToolbarButton onClick={() => editor.chain().focus().setTextAlign("right").run()} active={editor.isActive({ textAlign: "right" })} title="Align Right">
        <AlignRight size={s} />
      </ToolbarButton>

      <div className="w-px h-5 bg-border mx-1" />

      {/* Link & Image */}
      <ToolbarButton onClick={onAddLink} active={editor.isActive("link")} title="Add Link">
        <LinkIcon size={s} />
      </ToolbarButton>
      <ToolbarButton onClick={onAddImage} title="Insert Image">
        <ImageIcon size={s} />
      </ToolbarButton>

      <div className="w-px h-5 bg-border mx-1" />

      {/* Clear formatting */}
      <ToolbarButton onClick={() => editor.chain().focus().clearNodes().unsetAllMarks().run()} title="Clear Formatting">
        <RemoveFormatting size={s} />
      </ToolbarButton>
    </div>
  );
}
