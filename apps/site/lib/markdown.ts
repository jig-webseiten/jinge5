import { marked } from "marked";

export function renderMarkdownToHtml(md: string) {
  // Du kannst hier später Optionen setzen (z. B. sanitize, gfm etc.)
  return marked.parse(md);
}
