/**
 * Orders a command block's input fields so the primary value (whatever's
 * declared first — the target/domain/keyword the tool acts on) stays first,
 * and `filename` (when present) always comes right after it, ahead of any
 * other field.
 */
export function orderFields(names: string[]): string[] {
  const filenameIndex = names.indexOf("filename");
  if (filenameIndex <= 1) return names;

  const ordered = [...names];
  ordered.splice(filenameIndex, 1);
  ordered.splice(1, 0, "filename");
  return ordered;
}
