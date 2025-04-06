export function isExpensiveTags(expensive: string[], tags?: string[]) {
  if (!tags?.length) return false;
  if (tags.length > 3) return true;
  if (tags.some((t) => t.startsWith('-'))) return true;

  const eqTags = tags.filter((t) => !t.startsWith('-'));
  return eqTags.some((t) => expensive.includes(t));
}
