export const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function safeUrl(value, local = false) {
  if (typeof value !== 'string') return null;
  if (/^https:\/\//i.test(value)) { try { const url = new URL(value); return url.username || url.password ? null : url.href; } catch { return null; } }
  if (local && /^(?:\.\/)?assets\/[a-zA-Z0-9_./-]+$/.test(value) && !value.includes('..')) return value;
  return null;
}
function inline(text) {
  return escapeHtml(text).replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
}
/** Intentional small Markdown subset; raw HTML is never executed. */
export function renderMarkdown(markdown) {
  return String(markdown).split(/\n\s*\n/).map(block => {
    const lines = block.trim().split('\n');
    if (!lines[0]) return '';
    if (/^### /.test(lines[0])) return `<h3>${inline(lines[0].slice(4))}</h3>${lines.length>1?`<p>${inline(lines.slice(1).join(' '))}</p>`:''}`;
    if (lines.every(line => /^- /.test(line))) return `<ul>${lines.map(line => `<li>${inline(line.slice(2))}</li>`).join('')}</ul>`;
    if (lines.every(line => /^> /.test(line))) return `<blockquote>${inline(lines.map(line=>line.slice(2)).join(' '))}</blockquote>`;
    return `<p>${inline(lines.join(' '))}</p>`;
  }).join('');
}
export function parseLessonMarkdown(markdown) {
  const allowed = new Set(['overview','explanation','deep','observe','question']);
  const sections = {}; let current = null;
  for (const line of markdown.replace(/\r\n/g, '\n').split('\n')) {
    if (line.startsWith('## ')) { const key = line.slice(3).trim(); if (!allowed.has(key) || Object.hasOwn(sections,key)) throw new Error(`无效或重复的内容分区：${key}`); current = key; sections[current] = ''; }
    else if (current) sections[current] += line + '\n';
  }
  for (const key of allowed) { if (!sections[key]?.trim()) throw new Error(`内容缺少 ${key}`); sections[key] = sections[key].trim(); }
  return sections;
}
