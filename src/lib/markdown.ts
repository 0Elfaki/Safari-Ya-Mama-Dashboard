// A tiny, safe Markdown preview for website pages: escapes all HTML first, then supports
// paragraphs, **bold**, *italic*, [links](https://…), "- " lists and "## " headings. Links
// are limited to http(s) and mailto. (The website renders the real page; this is a preview.)
const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);

function inline(s: string) {
  return esc(s)
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/\[([^\]]+)\]\(((?:https?:\/\/|mailto:)[^\s)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');
}

export function markdownToHtml(md: string): string {
  const out: string[] = [];
  let list: string[] = [];
  const flush = () => { if (list.length) { out.push(`<ul>${list.map((l) => `<li>${inline(l)}</li>`).join('')}</ul>`); list = []; } };
  for (const block of md.replace(/\r/g, '').split(/\n{2,}/)) {
    for (const line of block.split('\n')) {
      if (/^\s*[-*]\s+/.test(line)) { list.push(line.replace(/^\s*[-*]\s+/, '')); continue; }
      flush();
      if (/^##\s+/.test(line)) out.push(`<h3>${inline(line.replace(/^##\s+/, ''))}</h3>`);
      else if (line.trim()) out.push(`<p>${inline(line)}</p>`);
    }
    flush();
  }
  return out.join('');
}
