'use client'

import { useState, useMemo, useEffect, useRef } from 'react'
import { parseMarkdown } from '@/lib/markdown'

const STARTER_MARKDOWN = `# Welcome to Markdown Studio
A fast, distraction-free writing environment with real-time reading preview and GitHub Flavored Markdown (GFM) support.

---

## ⚡ Core Features
- **Instant Live Preview**: Typed words render immediately without latency.
- **GFM Compliant**: Tables, fenced code blocks, task lists, blockquotes, and formatting.
- **Reading Analytics**: Real-time word count, character count, and reading time estimation.
- **Local Persistence**: Drafts auto-save locally in your browser.

---

## 🛠️ Formatting Showcase

### Typography & Emphasis
You can write **bold text**, *italic thoughts*, ***bold italic statements***, or ~~strikethrough text~~ easily.

### Task List
- [x] Create project structure
- [x] Configure Tailwind CSS styling
- [x] Build robust Markdown parsing engine
- [ ] Write documentation for users

### Blockquotes
> "Simplicity is prerequisite for reliability."
> — *Edsger W. Dijkstra*

### Code Blocks
\`\`\`typescript
interface UserProfile {
  id: string;
  name: string;
  role: 'admin' | 'creator' | 'member';
  active: boolean;
}

const greet = (user: UserProfile): string => {
  return \`Welcome back, \${user.name}!\`;
};
\`\`\`

### Data Tables
| Feature | Supported | Performance |
| :--- | :--- | :--- |
| GFM Tables | Yes | Zero-latency |
| Task Checkboxes | Yes | Instant |
| Code Highlighting | Yes | Native |
| Local Auto-Save | Yes | 100% Offline |

---
Enjoy writing!
`

export default function MarkdownStudioPage() {
  const [content, setContent] = useState<string>(STARTER_MARKDOWN)
  const [viewMode, setViewMode] = useState<'editor' | 'split' | 'preview'>('split')
  const [toastMessage, setToastMessage] = useState<string | null>(null)

  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Load from LocalStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem('markdown_studio_content')
      if (saved) setContent(saved)
    } catch {
      // ignore
    }
  }, [])

  // Auto-save to LocalStorage
  useEffect(() => {
    try {
      localStorage.setItem('markdown_studio_content', content)
    } catch {
      // ignore
    }
  }, [content])

  // Parse HTML
  const renderedHtml = useMemo(() => {
    return parseMarkdown(content)
  }, [content])

  // Calculate statistics
  const stats = useMemo(() => {
    const trimmed = content.trim()
    const words = trimmed ? trimmed.split(/\s+/).length : 0
    const chars = content.length
    const readMinutes = Math.max(1, Math.ceil(words / 200))
    return { words, chars, readMinutes }
  }, [content])

  // Toast feedback
  const showToast = (msg: string) => {
    setToastMessage(msg)
    setTimeout(() => setToastMessage(null), 2000)
  }

  // Insert formatting snippet at cursor
  const insertText = (before: string, after = '') => {
    const textarea = textareaRef.current
    if (!textarea) return
    const start = textarea.selectionStart
    const end = textarea.selectionEnd
    const selected = content.substring(start, end)
    const replacement = `${before}${selected || 'text'}${after}`
    const updated = content.substring(0, start) + replacement + content.substring(end)
    setContent(updated)

    setTimeout(() => {
      textarea.focus()
      textarea.setSelectionRange(start + before.length, start + before.length + (selected ? selected.length : 4))
    }, 0)
  }

  // Copy raw MD
  const copyMarkdown = () => {
    navigator.clipboard.writeText(content)
    showToast('Markdown copied to clipboard!')
  }

  // Copy HTML
  const copyHtml = () => {
    navigator.clipboard.writeText(renderedHtml)
    showToast('HTML copied to clipboard!')
  }

  // Download .md file
  const downloadFile = () => {
    const blob = new Blob([content], { type: 'text/markdown' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `document-${Date.now()}.md`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#0B0F19] text-slate-100 selection:bg-indigo-500 selection:text-white">
      {/* Top Header */}
      <header className="border-b border-slate-800 bg-[#0F1422]/80 backdrop-blur-md sticky top-0 z-30 px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-linear-to-tr from-indigo-600 via-indigo-500 to-purple-600 p-0.5 shadow-lg shadow-indigo-500/25 flex items-center justify-center">
            <svg className="w-full h-full p-1" viewBox="0 0 32 32" fill="none">
              <path d="M7 23V9L12 15L17 9V23" stroke="#FFFFFF" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M22 13V21M22 21L19.5 18.5M22 21L24.5 18.5" stroke="#38BDF8" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <div>
            <h1 className="text-base font-semibold leading-none flex items-center gap-2">
              Markdown Studio
              <span className="text-[11px] px-2 py-0.5 rounded-full bg-indigo-500/15 text-indigo-300 border border-indigo-500/30 font-medium">
                GFM
              </span>
            </h1>
            <p className="text-xs text-slate-400 mt-0.5">Distraction-Free Markdown Writing &amp; Live Preview</p>
          </div>
        </div>

        {/* View Mode Switcher */}
        <div className="flex items-center gap-1 bg-neutral-900 border border-neutral-800 p-1 rounded-xl">
          {[
            { id: 'editor', label: 'Editor' },
            { id: 'split', label: 'Split' },
            { id: 'preview', label: 'Preview' },
          ].map((m) => (
            <button
              key={m.id}
              onClick={() => setViewMode(m.id as typeof viewMode)}
              className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${
                viewMode === m.id ? 'bg-neutral-800 text-white shadow' : 'text-neutral-400 hover:text-neutral-200'
              }`}
            >
              {m.label}
            </button>
          ))}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          <button
            onClick={copyMarkdown}
            className="px-3 py-1.5 rounded-lg border border-neutral-800 hover:border-neutral-700 bg-neutral-900 hover:bg-neutral-850 text-xs font-medium text-neutral-300 transition-colors"
          >
            Copy MD
          </button>
          <button
            onClick={copyHtml}
            className="px-3 py-1.5 rounded-lg border border-neutral-800 hover:border-neutral-700 bg-neutral-900 hover:bg-neutral-850 text-xs font-medium text-neutral-300 transition-colors"
          >
            Copy HTML
          </button>
          <button
            onClick={downloadFile}
            className="px-3.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md shadow-indigo-600/20 transition-all active:scale-98"
          >
            Download .md
          </button>
        </div>
      </header>

      {/* Toast */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-indigo-600 text-white font-semibold px-4 py-2 rounded-xl shadow-xl text-xs animate-bounce">
          {toastMessage}
        </div>
      )}

      {/* Toolbar */}
      <div className="border-b border-neutral-800/80 bg-neutral-900/40 px-6 py-2 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-1 text-xs">
          <button
            onClick={() => insertText('# ', '')}
            className="px-2 py-1 rounded hover:bg-neutral-800 text-neutral-300 font-bold"
            title="Heading 1"
          >
            H1
          </button>
          <button
            onClick={() => insertText('## ', '')}
            className="px-2 py-1 rounded hover:bg-neutral-800 text-neutral-300 font-bold"
            title="Heading 2"
          >
            H2
          </button>
          <div className="w-px h-4 bg-neutral-800 mx-1" />
          <button
            onClick={() => insertText('**', '**')}
            className="px-2 py-1 rounded hover:bg-neutral-800 text-neutral-300 font-bold"
            title="Bold"
          >
            B
          </button>
          <button
            onClick={() => insertText('*', '*')}
            className="px-2 py-1 rounded hover:bg-neutral-800 text-neutral-300 italic"
            title="Italic"
          >
            I
          </button>
          <button
            onClick={() => insertText('~~', '~~')}
            className="px-2 py-1 rounded hover:bg-neutral-800 text-neutral-300 line-through"
            title="Strikethrough"
          >
            S
          </button>
          <div className="w-px h-4 bg-neutral-800 mx-1" />
          <button
            onClick={() => insertText('`', '`')}
            className="px-2 py-1 rounded hover:bg-neutral-800 text-neutral-300 font-mono text-[11px]"
            title="Inline Code"
          >
            &lt;/&gt;
          </button>
          <button
            onClick={() => insertText('```typescript\n', '\n```')}
            className="px-2 py-1 rounded hover:bg-neutral-800 text-neutral-300 font-mono text-[11px]"
            title="Code Block"
          >
            Code Block
          </button>
          <button
            onClick={() => insertText('> ', '')}
            className="px-2 py-1 rounded hover:bg-neutral-800 text-neutral-300"
            title="Quote"
          >
            Quote
          </button>
          <button
            onClick={() => insertText('- [ ] ', '')}
            className="px-2 py-1 rounded hover:bg-neutral-800 text-neutral-300"
            title="Task List"
          >
            Task
          </button>
          <button
            onClick={() =>
              insertText(
                '| Header 1 | Header 2 |\n| :--- | :--- |\n| Cell 1 | Cell 2 |\n'
              )
            }
            className="px-2 py-1 rounded hover:bg-neutral-800 text-neutral-300"
            title="Table"
          >
            Table
          </button>
          <button
            onClick={() => insertText('[Link Title](', 'https://example.com)')}
            className="px-2 py-1 rounded hover:bg-neutral-800 text-neutral-300"
            title="Link"
          >
            Link
          </button>
        </div>

        {/* Analytics stats */}
        <div className="flex items-center gap-4 text-xs font-mono text-neutral-400">
          <span>
            Words: <strong className="text-neutral-200">{stats.words}</strong>
          </span>
          <span>
            Chars: <strong className="text-neutral-200">{stats.chars}</strong>
          </span>
          <span>
            Read Time: <strong className="text-neutral-200">~{stats.readMinutes} min</strong>
          </span>
        </div>
      </div>

      {/* Main Split / Editor / Preview Workspace */}
      <div className="flex-1 flex overflow-hidden">
        {/* Editor Pane */}
        {(viewMode === 'editor' || viewMode === 'split') && (
          <div
            className={`flex-1 flex flex-col bg-neutral-950 ${
              viewMode === 'split' ? 'border-r border-neutral-800' : ''
            }`}
          >
            <textarea
              ref={textareaRef}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Write your Markdown document here..."
              spellCheck={false}
              className="flex-1 w-full bg-transparent p-6 font-mono text-xs text-neutral-200 outline-none resize-none leading-relaxed selection:bg-indigo-500/30"
            />
          </div>
        )}

        {/* Preview Pane */}
        {(viewMode === 'preview' || viewMode === 'split') && (
          <div className="flex-1 flex flex-col bg-neutral-900/20 overflow-y-auto p-8 md:p-12">
            <div className="max-w-3xl w-full mx-auto">
              <div
                dangerouslySetInnerHTML={{ __html: renderedHtml }}
                className="prose prose-invert max-w-none text-neutral-200"
              />
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
