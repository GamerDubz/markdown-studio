'use client'

import { useState, useMemo, useEffect, useRef, useCallback } from 'react'
import {
  Bold,
  Italic,
  Strikethrough,
  Heading1,
  Heading2,
  Code2,
  FileCode2,
  Quote,
  ListTodo,
  Table2,
  Link2,
  ClipboardCopy,
  Download,
  GripVertical,
} from 'lucide-react'
import { parseMarkdown } from '@/lib/markdown'
import { QuillMark } from '@/components/quill-mark'

const STORAGE_KEY = 'markdown_studio_content'
const LINE_HEIGHT = 29 // px — must match the inline lineHeight set on the textarea
const EDITOR_PADDING_TOP = 24 // px — must match the editor's top padding (p-6)
const MIN_SPLIT = 0.25
const MAX_SPLIT = 0.75

const STARTER_MARKDOWN = `# Welcome to Markdown Studio
A distraction-light writing desk with a manuscript-style live preview and GitHub Flavored Markdown (GFM) support.

---

## Core Features
- **Instant Live Preview**: typed words render immediately, set like a printed page.
- **GFM Compliant**: tables, fenced code blocks, task lists, blockquotes, and formatting.
- **Reading Statistics**: word count, character count, and estimated reading time.
- **Local Persistence**: drafts auto-save to this browser, nowhere else.

---

## Formatting Showcase

### Typography & Emphasis
You can write **bold text**, *italic thoughts*, ***bold italic statements***, or ~~strikethrough text~~ easily.

### Task List
- [x] Create project structure
- [x] Configure the manuscript preview
- [x] Build a robust Markdown parsing engine
- [ ] Write documentation for users

### Blockquotes
> "Simplicity is a prerequisite for reliability."
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
Enjoy writing.
`

type ViewMode = 'editor' | 'split' | 'preview'

function lineFromPosition(text: string, pos: number): number {
  let line = 0
  for (let i = 0; i < pos; i++) {
    if (text.charCodeAt(i) === 10) line++
  }
  return line
}

// Read any saved draft synchronously during the initial render. Runs once,
// via useState's lazy initializer, so there is no effect-driven setState
// cascading in on mount.
function loadInitialContent(): string {
  if (typeof window === 'undefined') return STARTER_MARKDOWN
  try {
    const saved = window.localStorage.getItem(STORAGE_KEY)
    return saved && saved.length > 0 ? saved : STARTER_MARKDOWN
  } catch {
    return STARTER_MARKDOWN
  }
}

export default function MarkdownStudioPage() {
  const [content, setContent] = useState<string>(loadInitialContent)
  const [viewMode, setViewMode] = useState<ViewMode>('split')
  const [toastMessage, setToastMessage] = useState<string | null>(null)
  const [splitRatio, setSplitRatio] = useState(0.48)
  const [cursorLine, setCursorLine] = useState(0)
  const [editorScrollTop, setEditorScrollTop] = useState(0)

  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const draggingRef = useRef(false)
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Auto-save every edit locally. Reads and writes never leave this browser.
  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, content)
    } catch {
      // Ignore quota / privacy-mode failures; the draft still lives in memory.
    }
  }, [content])

  const renderedHtml = useMemo(() => parseMarkdown(content), [content])

  const stats = useMemo(() => {
    const trimmed = content.trim()
    const words = trimmed ? trimmed.split(/\s+/).length : 0
    const chars = content.length
    const readMinutes = Math.max(1, Math.ceil(words / 200))
    return { words, chars, readMinutes }
  }, [content])

  const showToast = useCallback((message: string) => {
    setToastMessage(message)
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current)
    toastTimerRef.current = setTimeout(() => setToastMessage(null), 2200)
  }, [])

  useEffect(() => {
    return () => {
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current)
    }
  }, [])

  const syncCursor = useCallback(() => {
    const textarea = textareaRef.current
    if (!textarea) return
    setCursorLine(lineFromPosition(textarea.value, textarea.selectionStart))
    setEditorScrollTop(textarea.scrollTop)
  }, [])

  // Insert a formatting snippet at the caret, wrapping the current selection.
  const insertText = useCallback(
    (before: string, after = '') => {
      const textarea = textareaRef.current
      if (!textarea) return
      const start = textarea.selectionStart
      const end = textarea.selectionEnd
      const selected = content.substring(start, end)
      const replacement = `${before}${selected || 'text'}${after}`
      const updated = content.substring(0, start) + replacement + content.substring(end)
      setContent(updated)

      requestAnimationFrame(() => {
        textarea.focus()
        const caretStart = start + before.length
        const caretEnd = caretStart + (selected ? selected.length : 4)
        textarea.setSelectionRange(caretStart, caretEnd)
        syncCursor()
      })
    },
    [content, syncCursor]
  )

  const copyMarkdown = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(content)
      showToast('Markdown copied to clipboard')
    } catch {
      showToast('Could not access the clipboard')
    }
  }, [content, showToast])

  const copyHtml = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(renderedHtml)
      showToast('HTML copied to clipboard')
    } catch {
      showToast('Could not access the clipboard')
    }
  }, [renderedHtml, showToast])

  const downloadFile = useCallback(() => {
    const blob = new Blob([content], { type: 'text/markdown' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `document-${Date.now()}.md`
    a.click()
    URL.revokeObjectURL(url)
    showToast('Download started')
  }, [content, showToast])

  // Resizable split divider — pointer events cover mouse + touch uniformly.
  const handleResizerPointerDown = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    draggingRef.current = true
    event.currentTarget.setPointerCapture(event.pointerId)
  }, [])

  const handleResizerPointerMove = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    if (!draggingRef.current || !containerRef.current) return
    const rect = containerRef.current.getBoundingClientRect()
    const ratio = (event.clientX - rect.left) / rect.width
    setSplitRatio(Math.min(MAX_SPLIT, Math.max(MIN_SPLIT, ratio)))
  }, [])

  const handleResizerPointerUp = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    draggingRef.current = false
    event.currentTarget.releasePointerCapture(event.pointerId)
  }, [])

  const handleResizerKeyDown = useCallback((event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'ArrowLeft') {
      event.preventDefault()
      setSplitRatio((r) => Math.max(MIN_SPLIT, r - 0.02))
    } else if (event.key === 'ArrowRight') {
      event.preventDefault()
      setSplitRatio((r) => Math.min(MAX_SPLIT, r + 0.02))
    } else if (event.key === 'Home') {
      event.preventDefault()
      setSplitRatio(MIN_SPLIT)
    } else if (event.key === 'End') {
      event.preventDefault()
      setSplitRatio(MAX_SPLIT)
    }
  }, [])

  const showEditor = viewMode === 'editor' || viewMode === 'split'
  const showPreview = viewMode === 'preview' || viewMode === 'split'
  const isSplit = viewMode === 'split'
  const activeLineTop = EDITOR_PADDING_TOP + cursorLine * LINE_HEIGHT - editorScrollTop

  return (
    <div className="flex h-screen flex-col bg-[var(--color-paper)] text-[var(--color-ink)]">
      {/* Header */}
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--color-rule)] bg-[var(--color-paper)] px-5 py-3">
        <div className="flex items-center gap-3">
          <QuillMark size={26} className="shrink-0 text-[var(--color-ink)]" />
          <div className="leading-tight">
            <h1 className="font-[family-name:var(--font-ui)] text-[15px] font-bold tracking-tight text-[var(--color-ink)]">
              Markdown Studio
            </h1>
            <p className="hidden font-[family-name:var(--font-body)] text-[13px] italic text-[var(--color-ink-faint)] sm:block">
              a quiet desk for writing Markdown
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <nav aria-label="View mode" className="flex items-center gap-1">
            {(
              [
                { id: 'editor', label: 'Editor' },
                { id: 'split', label: 'Split' },
                { id: 'preview', label: 'Preview' },
              ] as const
            ).map((m) => (
              <button
                key={m.id}
                type="button"
                aria-pressed={viewMode === m.id}
                onClick={() => setViewMode(m.id)}
                className={`min-h-11 rounded-sm px-3 text-[13px] font-semibold uppercase tracking-wide transition-colors ${
                  viewMode === m.id
                    ? 'border-b-2 border-[var(--color-accent)] text-[var(--color-ink)]'
                    : 'border-b-2 border-transparent text-[var(--color-ink-faint)] hover:text-[var(--color-ink-soft)]'
                }`}
              >
                {m.label}
              </button>
            ))}
          </nav>

          <div className="hidden h-6 w-px bg-[var(--color-rule)] sm:block" />

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={copyMarkdown}
              className="flex min-h-11 items-center gap-2 rounded-sm border border-[var(--color-rule)] px-3 text-[13px] font-medium text-[var(--color-ink-soft)] transition-colors hover:border-[var(--color-ink-faint)] hover:text-[var(--color-ink)]"
            >
              <ClipboardCopy size={16} aria-hidden="true" />
              <span className="hidden md:inline">Copy MD</span>
            </button>
            <button
              type="button"
              onClick={copyHtml}
              className="flex min-h-11 items-center gap-2 rounded-sm border border-[var(--color-rule)] px-3 text-[13px] font-medium text-[var(--color-ink-soft)] transition-colors hover:border-[var(--color-ink-faint)] hover:text-[var(--color-ink)]"
            >
              <FileCode2 size={16} aria-hidden="true" />
              <span className="hidden md:inline">Copy HTML</span>
            </button>
            <button
              type="button"
              onClick={downloadFile}
              className="flex min-h-11 items-center gap-2 rounded-sm bg-[var(--color-accent)] px-3.5 text-[13px] font-semibold text-[var(--color-paper)] transition-colors hover:bg-[var(--color-accent-ink)]"
            >
              <Download size={16} aria-hidden="true" />
              <span>Download</span>
            </button>
          </div>
        </div>
      </header>

      {/* Toast */}
      {toastMessage && (
        <div
          role="status"
          aria-live="polite"
          className="toast-rise fixed bottom-14 right-5 z-50 flex items-center gap-2 rounded-sm border-l-[3px] border-[var(--color-accent)] bg-[var(--color-ink)] px-4 py-2.5 text-[13px] font-medium text-[var(--color-paper)] shadow-lg"
        >
          {toastMessage}
        </div>
      )}

      {/* Formatting toolbar */}
      <div className="flex flex-wrap items-center gap-0.5 border-b border-[var(--color-rule-soft)] bg-[var(--color-paper-raised)] px-3 py-1.5">
        <ToolbarButton label="Heading 1" onClick={() => insertText('# ', '')} icon={<Heading1 size={17} />} />
        <ToolbarButton label="Heading 2" onClick={() => insertText('## ', '')} icon={<Heading2 size={17} />} />
        <Divider />
        <ToolbarButton label="Bold" onClick={() => insertText('**', '**')} icon={<Bold size={17} />} />
        <ToolbarButton label="Italic" onClick={() => insertText('*', '*')} icon={<Italic size={17} />} />
        <ToolbarButton
          label="Strikethrough"
          onClick={() => insertText('~~', '~~')}
          icon={<Strikethrough size={17} />}
        />
        <Divider />
        <ToolbarButton label="Inline code" onClick={() => insertText('`', '`')} icon={<Code2 size={17} />} />
        <ToolbarButton
          label="Code block"
          onClick={() => insertText('```typescript\n', '\n```')}
          icon={<FileCode2 size={17} />}
        />
        <ToolbarButton label="Quote" onClick={() => insertText('> ', '')} icon={<Quote size={17} />} />
        <ToolbarButton label="Task list" onClick={() => insertText('- [ ] ', '')} icon={<ListTodo size={17} />} />
        <ToolbarButton
          label="Table"
          onClick={() => insertText('| Header 1 | Header 2 |\n| :--- | :--- |\n| Cell 1 | Cell 2 |\n')}
          icon={<Table2 size={17} />}
        />
        <ToolbarButton
          label="Link"
          onClick={() => insertText('[Link Title](', 'https://example.com)')}
          icon={<Link2 size={17} />}
        />
      </div>

      {/* Workspace */}
      <div ref={containerRef} className="flex flex-1 overflow-hidden">
        {showEditor && (
          <div
            className="relative flex flex-col overflow-hidden bg-[var(--color-paper)]"
            style={{ width: isSplit ? `${splitRatio * 100}%` : '100%' }}
          >
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-x-0"
              style={{
                top: activeLineTop,
                height: LINE_HEIGHT,
                background: 'var(--color-accent-soft)',
                borderLeft: '3px solid var(--color-accent)',
              }}
            />
            <label htmlFor="markdown-editor" className="sr-only">
              Markdown source
            </label>
            <textarea
              id="markdown-editor"
              ref={textareaRef}
              value={content}
              onChange={(e) => {
                setContent(e.target.value)
                syncCursor()
              }}
              onSelect={syncCursor}
              onKeyUp={syncCursor}
              onClick={syncCursor}
              onScroll={syncCursor}
              placeholder="Write your Markdown here…"
              spellCheck={false}
              className="warm-scroll relative z-10 h-full w-full flex-1 resize-none bg-transparent p-6 text-[15px] text-[var(--color-ink)] outline-none"
              style={{ fontFamily: 'var(--font-editor)', lineHeight: `${LINE_HEIGHT}px` }}
            />
          </div>
        )}

        {isSplit && (
          <div
            role="separator"
            aria-orientation="vertical"
            aria-label="Resize editor and preview panes"
            aria-valuemin={MIN_SPLIT * 100}
            aria-valuemax={MAX_SPLIT * 100}
            aria-valuenow={Math.round(splitRatio * 100)}
            tabIndex={0}
            onPointerDown={handleResizerPointerDown}
            onPointerMove={handleResizerPointerMove}
            onPointerUp={handleResizerPointerUp}
            onDoubleClick={() => setSplitRatio(0.5)}
            onKeyDown={handleResizerKeyDown}
            className="group flex w-3 shrink-0 cursor-col-resize items-center justify-center border-x border-[var(--color-rule-soft)] bg-[var(--color-paper-raised)] focus-visible:outline-none"
          >
            <GripVertical
              size={14}
              aria-hidden="true"
              className="text-[var(--color-ink-faint)] group-hover:text-[var(--color-ink-soft)] group-focus-visible:text-[var(--color-accent)]"
            />
          </div>
        )}

        {showPreview && (
          <div
            className="warm-scroll flex-1 overflow-y-auto bg-[var(--color-paper-raised)] px-6 py-10 sm:px-12"
            style={isSplit ? undefined : { width: '100%' }}
          >
            <div className="mx-auto w-full max-w-[680px] rounded-md border border-[var(--color-rule)] bg-[var(--color-paper)] px-8 py-10 shadow-[0_1px_2px_rgba(32,27,20,0.06),0_10px_30px_-12px_rgba(32,27,20,0.18)] sm:px-14 sm:py-14">
              <div className="manuscript" dangerouslySetInnerHTML={{ __html: renderedHtml }} />
            </div>
          </div>
        )}
      </div>

      {/* Status bar */}
      <footer className="flex h-9 items-center justify-between border-t border-[var(--color-rule)] bg-[var(--color-paper-raised)] px-4 text-[12px]" style={{ fontFamily: 'var(--font-editor)' }}>
        <div className="flex items-center gap-4 text-[var(--color-ink-soft)]">
          <span>
            {stats.words} word{stats.words === 1 ? '' : 's'}
          </span>
          <span>{stats.chars} chars</span>
          <span>~{stats.readMinutes} min read</span>
        </div>
        {showEditor && <div className="text-[var(--color-ink-faint)]">Ln {cursorLine + 1}</div>}
      </footer>
    </div>
  )
}

function Divider() {
  return <div className="mx-1 h-5 w-px shrink-0 bg-[var(--color-rule)]" aria-hidden="true" />
}

function ToolbarButton({
  label,
  icon,
  onClick,
}: {
  label: string
  icon: React.ReactNode
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className="flex h-11 w-11 items-center justify-center rounded-sm text-[var(--color-ink-soft)] transition-colors hover:bg-[var(--color-paper-deep)] hover:text-[var(--color-ink)]"
    >
      {icon}
    </button>
  )
}
