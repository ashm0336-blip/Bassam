/**
 * Check if user is currently interacting with a form element (typing, selecting, etc.)
 * Used to skip auto-refresh while user is actively editing to avoid losing focus/input.
 */
export function isUserInteracting() {
  const el = document.activeElement;
  if (!el) return false;
  const tag = el.tagName.toLowerCase();
  return tag === 'input' || tag === 'textarea' || tag === 'select' || el.isContentEditable;
}
