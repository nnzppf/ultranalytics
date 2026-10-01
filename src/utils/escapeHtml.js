/**
 * Escape text before it is turned into HTML. AI answers repeat names typed by
 * anyone on the registration portal, so they must never reach the DOM as markup.
 */
export function escapeHtml(text) {
  return String(text ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
