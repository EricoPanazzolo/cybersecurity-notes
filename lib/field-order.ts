/**
 * Orders a command block's input fields so the primary value (whatever's
 * declared first — the target/domain/keyword the tool acts on) stays
 * first, followed by `input` (the file this step reads, when present) and
 * then `output` (the file this step writes, when present) — in that
 * read-then-write order — ahead of any other field.
 */
export function orderFields(names: string[]): string[] {
  if (names.length === 0) return names;

  const [primary, ...rest] = names;
  const priority = ["input", "output"].filter((name) => rest.includes(name));
  const remaining = rest.filter((name) => !priority.includes(name));
  return [primary, ...priority, ...remaining];
}
