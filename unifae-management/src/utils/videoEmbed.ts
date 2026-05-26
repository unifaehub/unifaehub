/**
 * Converte um link público do YouTube em URL de embed (iframe).
 * Retorna null se não for um formato de YouTube reconhecido.
 */
export function youtubeEmbedUrlFromLink(url: string | null | undefined): string | null {
  if (!url?.trim()) return null
  const u = url.trim()

  const short = u.match(/youtu\.be\/([a-zA-Z0-9_-]{11})(?:\?|#|$)/)
  if (short) return `https://www.youtube.com/embed/${short[1]}`

  const watch = u.match(/[?&]v=([a-zA-Z0-9_-]{11})/)
  if (watch) return `https://www.youtube.com/embed/${watch[1]}`

  const embed = u.match(/youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/)
  if (embed) return `https://www.youtube.com/embed/${embed[1]}`

  const shorts = u.match(/youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})/)
  if (shorts) return `https://www.youtube.com/embed/${shorts[1]}`

  return null
}
