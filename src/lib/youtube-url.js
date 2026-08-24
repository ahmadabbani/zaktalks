const YOUTUBE_VIDEO_ID_PATTERN = /^[a-zA-Z0-9_-]{11}$/
const YOUTUBE_HOSTS = new Set([
  'youtube.com',
  'm.youtube.com',
  'music.youtube.com',
  'youtube-nocookie.com',
  'youtu.be'
])

export function normalizeYouTubeVideoUrl(value) {
  const candidate = String(value || '').trim()
  if (!candidate) return null

  try {
    const url = new URL(candidate)
    const hostname = url.hostname.toLowerCase().replace(/^www\./, '')

    if (url.protocol !== 'https:' || !YOUTUBE_HOSTS.has(hostname)) return null

    const pathParts = url.pathname.split('/').filter(Boolean)
    let videoId = null

    if (hostname === 'youtu.be') {
      videoId = pathParts[0]
    } else if (url.pathname === '/watch') {
      videoId = url.searchParams.get('v')
    } else if (['embed', 'shorts', 'live'].includes(pathParts[0])) {
      videoId = pathParts[1]
    }

    if (!YOUTUBE_VIDEO_ID_PATTERN.test(videoId || '')) return null
    return `https://www.youtube.com/watch?v=${videoId}`
  } catch {
    return null
  }
}
