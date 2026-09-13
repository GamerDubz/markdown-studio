// Robust GFM Markdown Parser with HTML sanitization

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
  result = result.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1" class="rounded-lg max-w-full my-3 border border-neutral-800" />')

  // Links: [text](url)
  result = result.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer" class="text-indigo-400 hover:text-indigo-300 underline font-medium">$1</a>')

  // Inline Code: `code`
  result = result.replace(/`([^`]+)`/g, '<code class="px-1.5 py-0.5 rounded bg-neutral-800 text-indigo-300 font-mono text-[0.9em] border border-neutral-700/60">$1</code>')

  // Bold & Italic: ***text***
  result = result.replace(/\*\*\*([^*]+)\*\*\*/g, '<strong><em>$1</em></strong>')

  // Bold: **text**
  result = result.replace(/\*\*([^*]+)\*\*/g, '<strong class="font-bold text-neutral-100">$1</strong>')

  // Italic: *text* or _text_
  result = result.replace(/\*([^*]+)\*/g, '<em class="italic text-neutral-300">$1</em>')
  result = result.replace(/_([^_]+)_/g, '<em class="italic text-neutral-300">$1</em>')

  // Strikethrough: ~~text~~
  result = result.replace(/~~([^~]+)~~/g, '<del class="line-through text-neutral-500">$1</del>')

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

    let tableHtml = '<div class="overflow-x-auto my-4 border border-neutral-800 rounded-xl"><table class="w-full text-left text-xs border-collapse">'

    // Header
    const headers = rows[0]
    tableHtml += '<thead class="bg-neutral-900 text-neutral-300 border-b border-neutral-800"><tr>'
    headers.forEach((h) => {
      tableHtml += `<th class="p-3 font-semibold">${parseInline(h)}</th>`
    })
    tableHtml += '</tr></thead>'

    // Body (skip row 1 which is separator)
    tableHtml += '<tbody class="divide-y divide-neutral-850">'
    for (let i = 2; i < rows.length; i++) {
      tableHtml += '<tr class="hover:bg-neutral-900/40">'
      rows[i].forEach((cell) => {
        tableHtml += `<td class="p-3 text-neutral-400">${parseInline(cell)}</td>`
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
          `<div class="my-4 rounded-xl border border-neutral-800 bg-neutral-950 overflow-hidden"><div class="px-4 py-1.5 border-b border-neutral-850 bg-neutral-900/80 text-[10px] font-mono text-neutral-500 uppercase">${escapeHtml(
            codeLang || 'plaintext'
          )}</div><pre class="p-4 text-xs font-mono text-indigo-300 overflow-x-auto"><code>${rawCode}</code></pre></div>`
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
      htmlParts.push('<hr class="my-6 border-neutral-800" />')
      continue
    }

    // Headings
    const headingMatch = line.match(/^(#{1,6})\s+(.*)$/)
    if (headingMatch) {
      closeList()
      const level = headingMatch[1].length
      const title = parseInline(headingMatch[2])
      const classes = {
        1: 'text-2xl font-bold text-white mt-6 mb-3 pb-2 border-b border-neutral-800',
        2: 'text-xl font-bold text-neutral-100 mt-5 mb-2.5',
        3: 'text-lg font-semibold text-neutral-200 mt-4 mb-2',
        4: 'text-base font-semibold text-neutral-200 mt-3 mb-1.5',
        5: 'text-sm font-semibold text-neutral-300 mt-2 mb-1',
        6: 'text-xs font-semibold text-neutral-400 mt-2 mb-1',
      }[level] || 'text-base'

      htmlParts.push(`<h${level} class="${classes}">${title}</h${level}>`)
      continue
    }

    // Blockquotes
    if (line.startsWith('>')) {
      closeList()
      const quoteContent = parseInline(line.replace(/^>\s?/, ''))
      htmlParts.push(
        `<blockquote class="border-l-4 border-indigo-500 pl-4 py-1 my-3 text-neutral-400 italic bg-neutral-900/30 rounded-r-lg">${quoteContent}</blockquote>`
      )
      continue
    }

    // Task lists: - [ ] or - [x]
    const taskMatch = line.match(/^[-*]\s+\[([ xX])\]\s+(.*)$/)
    if (taskMatch) {
      if (!inList || listType !== 'ul') {
        closeList()
        inList = true
        listType = 'ul'
        htmlParts.push('<ul class="space-y-1.5 my-3 pl-2">')
      }
      const checked = taskMatch[1].toLowerCase() === 'x'
      const label = parseInline(taskMatch[2])
      htmlParts.push(
        `<li class="flex items-center gap-2 text-xs text-neutral-300"><input type="checkbox" ${
          checked ? 'checked' : ''
        } disabled class="accent-indigo-500 rounded cursor-not-allowed" /><span class="${
          checked ? 'line-through text-neutral-500' : ''
        }">${label}</span></li>`
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
        htmlParts.push('<ul class="list-disc list-inside space-y-1 my-3 text-xs text-neutral-300">')
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
        htmlParts.push('<ol class="list-decimal list-inside space-y-1 my-3 text-xs text-neutral-300">')
      }
      htmlParts.push(`<li>${parseInline(olMatch[1])}</li>`)
      continue
    }

    // Regular paragraph
    closeList()
    htmlParts.push(`<p class="text-xs leading-relaxed text-neutral-300 my-2">${parseInline(line)}</p>`)
  }

  closeList()
  if (inTable) flushTable()

  return htmlParts.join('\n')
}
