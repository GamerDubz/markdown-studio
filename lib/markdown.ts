// Compact GFM-flavoured Markdown parser with HTML escaping.
// Output is unstyled semantic HTML (classes only where the tag itself
// can't carry the hook) — visual styling lives in the ".manuscript"
// rules in app/globals.css so this module stays a pure parser.

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

function parseInline(text: string): string {
  let result = escapeHtml(text)

  // Images: ![alt](url)
  result = result.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1" />')

  // Links: [text](url)
  result = result.replace(
    /\[([^\]]+)\]\(([^)]+)\)/g,
    '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>'
  )

  // Inline Code: `code`
  result = result.replace(/`([^`]+)`/g, '<code>$1</code>')

  // Bold & Italic: ***text***
  result = result.replace(/\*\*\*([^*]+)\*\*\*/g, '<strong><em>$1</em></strong>')

  // Bold: **text**
  result = result.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')

  // Italic: *text* or _text_
  result = result.replace(/\*([^*]+)\*/g, '<em>$1</em>')
  result = result.replace(/_([^_]+)_/g, '<em>$1</em>')

  // Strikethrough: ~~text~~
  result = result.replace(/~~([^~]+)~~/g, '<del>$1</del>')

  return result
}

export function parseMarkdown(md: string): string {
  const lines = md.split('\n')
  const htmlParts: string[] = []

  let inCodeBlock = false
  let codeLang = ''
  let codeBuffer: string[] = []

  let inList = false
  let listType: 'ul' | 'ol' = 'ul'

  let inTable = false
  let tableBuffer: string[] = []

  const closeList = () => {
    if (inList) {
      htmlParts.push(listType === 'ul' ? '</ul>' : '</ol>')
      inList = false
    }
  }

  const flushTable = () => {
    if (tableBuffer.length < 2) {
      tableBuffer = []
      inTable = false
      return
    }

    const rows = tableBuffer.map((line) =>
      line
        .trim()
        .replace(/^\|/, '')
        .replace(/\|$/, '')
        .split('|')
        .map((c) => c.trim())
    )

    let tableHtml = '<div class="md-table-wrap"><table>'

    // Header
    const headers = rows[0]
    tableHtml += '<thead><tr>'
    headers.forEach((h) => {
      tableHtml += `<th>${parseInline(h)}</th>`
    })
    tableHtml += '</tr></thead>'

    // Body (skip row 1, which is the separator)
    tableHtml += '<tbody>'
    for (let i = 2; i < rows.length; i++) {
      tableHtml += '<tr>'
      rows[i].forEach((cell) => {
        tableHtml += `<td>${parseInline(cell)}</td>`
      })
      tableHtml += '</tr>'
    }
    tableHtml += '</tbody></table></div>'

    htmlParts.push(tableHtml)
    tableBuffer = []
    inTable = false
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]

    // Code blocks
    if (line.trim().startsWith('```')) {
      closeList()
      if (inTable) flushTable()

      if (!inCodeBlock) {
        inCodeBlock = true
        codeLang = line.trim().slice(3).trim()
        codeBuffer = []
      } else {
        inCodeBlock = false
        const rawCode = escapeHtml(codeBuffer.join('\n'))
        htmlParts.push(
          `<div class="code-block"><div class="code-block__lang">${escapeHtml(
            codeLang || 'plaintext'
          )}</div><pre><code>${rawCode}</code></pre></div>`
        )
      }
      continue
    }

    if (inCodeBlock) {
      codeBuffer.push(line)
      continue
    }

    // Tables check
    if (line.trim().startsWith('|') && line.trim().endsWith('|')) {
      closeList()
      inTable = true
      tableBuffer.push(line)
      continue
    } else if (inTable) {
      flushTable()
    }

    // Empty line
    if (!line.trim()) {
      closeList()
      continue
    }

    // Horizontal rule
    if (/^(\*\*\*|---|___)$/.test(line.trim())) {
      closeList()
      htmlParts.push('<hr />')
      continue
    }

    // Headings
    const headingMatch = line.match(/^(#{1,6})\s+(.*)$/)
    if (headingMatch) {
      closeList()
      const level = headingMatch[1].length
      const title = parseInline(headingMatch[2])
      htmlParts.push(`<h${level}>${title}</h${level}>`)
      continue
    }

    // Blockquotes
    if (line.startsWith('>')) {
      closeList()
      const quoteContent = parseInline(line.replace(/^>\s?/, ''))
      htmlParts.push(`<blockquote>${quoteContent}</blockquote>`)
      continue
    }

    // Task lists: - [ ] or - [x]
    const taskMatch = line.match(/^[-*]\s+\[([ xX])\]\s+(.*)$/)
    if (taskMatch) {
      if (!inList || listType !== 'ul') {
        closeList()
        inList = true
        listType = 'ul'
        htmlParts.push('<ul>')
      }
      const checked = taskMatch[1].toLowerCase() === 'x'
      const label = parseInline(taskMatch[2])
      htmlParts.push(
        `<li class="task-item"><input type="checkbox" class="task-checkbox" ${
          checked ? 'checked' : ''
        } disabled aria-hidden="true" /><span${checked ? ' style="text-decoration:line-through;color:var(--color-ink-faint)"' : ''}>${label}</span></li>`
      )
      continue
    }

    // Unordered list
    const ulMatch = line.match(/^[-*]\s+(.*)$/)
    if (ulMatch) {
      if (!inList || listType !== 'ul') {
        closeList()
        inList = true
        listType = 'ul'
        htmlParts.push('<ul>')
      }
      htmlParts.push(`<li>${parseInline(ulMatch[1])}</li>`)
      continue
    }

    // Ordered list
    const olMatch = line.match(/^\d+\.\s+(.*)$/)
    if (olMatch) {
      if (!inList || listType !== 'ol') {
        closeList()
        inList = true
        listType = 'ol'
        htmlParts.push('<ol>')
      }
      htmlParts.push(`<li>${parseInline(olMatch[1])}</li>`)
      continue
    }

    // Regular paragraph
    closeList()
    htmlParts.push(`<p>${parseInline(line)}</p>`)
  }

  closeList()
  if (inTable) flushTable()

  return htmlParts.join('\n')
}
