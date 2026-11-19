export async function copyLink(value: string, field: HTMLInputElement | null) {
  try {
    await navigator.clipboard.writeText(value);
    return true;
  } catch {
    if (!field) return false;
    field.focus({ preventScroll: true });
    field.select();
    field.setSelectionRange(0, value.length);
    try {
      return document.execCommand('copy');
    } catch {
      return false;
    }
  }
}
