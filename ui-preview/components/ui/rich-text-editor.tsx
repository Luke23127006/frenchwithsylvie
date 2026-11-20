import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import { Button } from './button'
import { Bold, Italic, List, ListOrdered, Strikethrough } from 'lucide-react'

interface RichTextEditorProps {
  value: string
  onChange: (value: string) => void
  disabled?: boolean
}

export function RichTextEditor({ value, onChange, disabled }: RichTextEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit,
    ],
    content: value,
    editable: !disabled,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML())
    },
    editorProps: {
      attributes: {
        class: 'prose prose-sm max-w-none focus:outline-none min-h-[150px] p-4',
      },
    },
  })

  // Synchronize when value prop changes from outside (e.g., selecting a new assignee)
  // but prevent cursor jumping by only updating if the content is truly different
  if (editor && value !== editor.getHTML() && !editor.isFocused) {
    editor.commands.setContent(value)
  }

  if (!editor) {
    return null
  }

  return (
    <div className="border rounded-md overflow-hidden bg-white">
      <div className="flex items-center gap-1 border-b p-1 bg-slate-50 flex-wrap">
        <Button
          variant="ghost"
          size="sm"
          type="button"
          onClick={() => editor.chain().focus().toggleBold().run()}
          className={editor.isActive('bold') ? 'bg-slate-200' : ''}
          disabled={disabled}
        >
          <Bold className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          type="button"
          onClick={() => editor.chain().focus().toggleItalic().run()}
          className={editor.isActive('italic') ? 'bg-slate-200' : ''}
          disabled={disabled}
        >
          <Italic className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          type="button"
          onClick={() => editor.chain().focus().toggleStrike().run()}
          className={editor.isActive('strike') ? 'bg-slate-200' : ''}
          disabled={disabled}
        >
          <Strikethrough className="h-4 w-4" />
        </Button>
        <div className="w-[1px] h-4 bg-slate-300 mx-1" />
        <Button
          variant="ghost"
          size="sm"
          type="button"
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          className={editor.isActive('bulletList') ? 'bg-slate-200' : ''}
          disabled={disabled}
        >
          <List className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          type="button"
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          className={editor.isActive('orderedList') ? 'bg-slate-200' : ''}
          disabled={disabled}
        >
          <ListOrdered className="h-4 w-4" />
        </Button>
      </div>
      <EditorContent editor={editor} />
    </div>
  )
}
