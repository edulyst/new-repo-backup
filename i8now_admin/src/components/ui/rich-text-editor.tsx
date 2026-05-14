"use client"

import ReactQuill from "react-quill-new"
import "react-quill-new/dist/quill.snow.css"

type RichTextEditorProps = {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  className?: string
}

const TOOLBAR = [
  [{ header: [2, 3, false] }],
  ["bold", "italic", "underline"],
  [{ list: "ordered" }, { list: "bullet" }],
  ["blockquote", "link"],
  ["clean"],
]

const FORMATS = ["header", "bold", "italic", "underline", "list", "bullet", "blockquote", "link"]

export function RichTextEditor({ value, onChange, placeholder, className }: RichTextEditorProps) {
  return (
    <div className={className}>
      <div className="overflow-hidden rounded-md border bg-background">
        <ReactQuill
          theme="snow"
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          modules={{ toolbar: TOOLBAR }}
          formats={FORMATS}
        />
      </div>
    </div>
  )
}
