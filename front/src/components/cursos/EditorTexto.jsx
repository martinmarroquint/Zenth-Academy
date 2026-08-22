// front/src/components/cursos/EditorTexto.jsx
// VERSIÓN CORREGIDA - ESTILOS SCOPED CON WRAPPER

import React from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import Image from '@tiptap/extension-image';
import Placeholder from '@tiptap/extension-placeholder';
import {
  Bold,
  Italic,
  Strikethrough,
  Heading1,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  Quote,
  Code2,
  Link as LinkIcon,
  Image as ImageIcon,
  Undo2,
  Redo2
} from 'lucide-react';

// =============================================
// BARRA DE HERRAMIENTAS
// =============================================
const MenuBar = ({ editor }) => {
  if (!editor) {
    return null;
  }

  const addLink = () => {
    const url = window.prompt('URL del enlace:');
    if (url) {
      editor.chain().focus().setLink({ href: url }).run();
    }
  };

  const addImage = () => {
    const url = window.prompt('URL de la imagen:');
    if (url) {
      editor.chain().focus().setImage({ src: url }).run();
    }
  };

  const Button = ({ onClick, active, disabled, children, title }) => (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`p-1.5 rounded transition-colors ${
        active ? 'bg-gray-200 text-gray-900' : 'text-gray-500 hover:bg-gray-100 hover:text-gray-700'
      } disabled:opacity-40 disabled:cursor-not-allowed`}
      title={title}
      type="button"
    >
      {children}
    </button>
  );

  return (
    <div className="flex flex-wrap items-center gap-0.5 p-1.5 border-b border-gray-200 bg-gray-50/80 rounded-t-lg sticky top-0 z-10">
      {/* Negrita, Cursiva, Tachado */}
      <div className="flex items-center gap-0.5 border-r border-gray-200 pr-1 mr-1">
        <Button
          onClick={() => editor.chain().focus().toggleBold().run()}
          active={editor.isActive('bold')}
          title="Negrita"
        >
          <Bold className="w-4 h-4" />
        </Button>
        <Button
          onClick={() => editor.chain().focus().toggleItalic().run()}
          active={editor.isActive('italic')}
          title="Cursiva"
        >
          <Italic className="w-4 h-4" />
        </Button>
        <Button
          onClick={() => editor.chain().focus().toggleStrike().run()}
          active={editor.isActive('strike')}
          title="Tachado"
        >
          <Strikethrough className="w-4 h-4" />
        </Button>
      </div>

      {/* Títulos */}
      <div className="flex items-center gap-0.5 border-r border-gray-200 pr-1 mr-1">
        <Button
          onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
          active={editor.isActive('heading', { level: 1 })}
          title="Título 1"
        >
          <Heading1 className="w-4 h-4" />
        </Button>
        <Button
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          active={editor.isActive('heading', { level: 2 })}
          title="Título 2"
        >
          <Heading2 className="w-4 h-4" />
        </Button>
        <Button
          onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
          active={editor.isActive('heading', { level: 3 })}
          title="Título 3"
        >
          <Heading3 className="w-4 h-4" />
        </Button>
      </div>

      {/* Listas y citas */}
      <div className="flex items-center gap-0.5 border-r border-gray-200 pr-1 mr-1">
        <Button
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          active={editor.isActive('bulletList')}
          title="Lista desordenada"
        >
          <List className="w-4 h-4" />
        </Button>
        <Button
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          active={editor.isActive('orderedList')}
          title="Lista ordenada"
        >
          <ListOrdered className="w-4 h-4" />
        </Button>
        <Button
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
          active={editor.isActive('blockquote')}
          title="Cita"
        >
          <Quote className="w-4 h-4" />
        </Button>
        <Button
          onClick={() => editor.chain().focus().toggleCodeBlock().run()}
          active={editor.isActive('codeBlock')}
          title="Código"
        >
          <Code2 className="w-4 h-4" />
        </Button>
      </div>

      {/* Enlaces e Imágenes */}
      <div className="flex items-center gap-0.5 border-r border-gray-200 pr-1 mr-1">
        <Button onClick={addLink} title="Insertar enlace">
          <LinkIcon className="w-4 h-4" />
        </Button>
        <Button onClick={addImage} title="Insertar imagen">
          <ImageIcon className="w-4 h-4" />
        </Button>
      </div>

      {/* Deshacer/Rehacer */}
      <div className="flex items-center gap-0.5">
        <Button
          onClick={() => editor.chain().focus().undo().run()}
          disabled={!editor.can().undo()}
          title="Deshacer"
        >
          <Undo2 className="w-4 h-4" />
        </Button>
        <Button
          onClick={() => editor.chain().focus().redo().run()}
          disabled={!editor.can().redo()}
          title="Rehacer"
        >
          <Redo2 className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
};

// =============================================
// COMPONENTE PRINCIPAL
// =============================================
const EditorTexto = ({ contenido = '', onUpdate, placeholder = 'Escribe aquí el contenido...' }) => {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3],
        },
        link: false,
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          target: '_blank',
          rel: 'noopener noreferrer',
        },
      }),
      Image.configure({
        HTMLAttributes: {
          class: 'max-w-full rounded-lg',
        },
      }),
      Placeholder.configure({
        placeholder: placeholder,
      }),
    ],
    content: contenido,
    onUpdate: ({ editor }) => {
      const html = editor.getHTML();
      if (onUpdate) {
        onUpdate(html);
      }
    },
    editorProps: {
      attributes: {
        class: 'prose prose-slate max-w-none p-4 min-h-[200px] focus:outline-none text-gray-800 leading-relaxed',
      },
    },
  });

  // ✅ CORREGIDO: Estilos scoped con wrapper
  return (
    <div className="editor-texto-wrapper border border-gray-200 rounded-lg overflow-hidden bg-white">
      <MenuBar editor={editor} />
      <EditorContent editor={editor} />
      <style>{`
        .editor-texto-wrapper .ProseMirror p.is-editor-empty:first-child::before {
          content: attr(data-placeholder);
          float: left;
          color: #adb5bd;
          pointer-events: none;
          height: 0;
        }
        .editor-texto-wrapper .ProseMirror a {
          color: #4f46e5;
          text-decoration: underline;
        }
        .editor-texto-wrapper .ProseMirror img {
          max-width: 100%;
          height: auto;
          border-radius: 8px;
          margin: 8px 0;
        }
        .editor-texto-wrapper .ProseMirror blockquote {
          border-left: 4px solid #e5e7eb;
          padding-left: 16px;
          margin: 8px 0;
          color: #6b7280;
        }
        .editor-texto-wrapper .ProseMirror pre {
          background: #f1f5f9;
          padding: 12px;
          border-radius: 8px;
          overflow-x: auto;
          font-size: 14px;
        }
        .editor-texto-wrapper .ProseMirror code {
          background: #f1f5f9;
          padding: 2px 6px;
          border-radius: 4px;
          font-size: 0.9em;
        }
        .editor-texto-wrapper .ProseMirror ul,
        .editor-texto-wrapper .ProseMirror ol {
          padding-left: 24px;
        }
        .editor-texto-wrapper .ProseMirror h1 {
          font-size: 2em;
          font-weight: bold;
          margin: 12px 0;
        }
        .editor-texto-wrapper .ProseMirror h2 {
          font-size: 1.5em;
          font-weight: bold;
          margin: 10px 0;
        }
        .editor-texto-wrapper .ProseMirror h3 {
          font-size: 1.25em;
          font-weight: bold;
          margin: 8px 0;
        }
        .editor-texto-wrapper .ProseMirror p {
          margin: 4px 0;
        }
        .editor-texto-wrapper .ProseMirror:focus {
          outline: none;
        }
        .editor-texto-wrapper .ProseMirror {
          min-height: 200px;
        }
      `}</style>
    </div>
  );
};

export default EditorTexto;