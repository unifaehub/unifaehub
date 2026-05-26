/** Normaliza texto para busca insensível a acentos e maiúsculas. */
export function normalizeSearch(s: string) {
  return s
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
}

export function matchesSearchText(haystack: string, needle: string) {
  if (!needle.trim()) return true
  return normalizeSearch(haystack).includes(normalizeSearch(needle))
}
