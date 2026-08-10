/**
 * Server-only YouTube playlist fetching.
 *
 * YOUTUBE_API_KEY has no NEXT_PUBLIC_ prefix on purpose: prefixed vars are
 * inlined into the client bundle, which would expose the key and let anyone
 * drain the daily quota. Everything here must therefore run on the server
 * (a Server Component or route handler), never in the browser.
 */

const API_BASE = 'https://www.googleapis.com/youtube/v3'

/** Season 1 playlist ("Season 1" on the ZakTalks channel). */
export const SEASON_ONE_PLAYLIST_ID = 'PLPFgt_ywYJEM'

/** Podcast ships biweekly, so an hour is plenty fresh and keeps quota near zero. */
const REVALIDATE_SECONDS = 3600

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

/** ISO 8601 duration (PT1H1M29S) to seconds. */
function parseIsoDuration(value) {
  const match = /^P(?:\d+D)?T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/.exec(value || '')
  if (!match) return 0

  const [, hours, minutes, seconds] = match
  return Number(hours || 0) * 3600 + Number(minutes || 0) * 60 + Number(seconds || 0)
}

function formatDuration(totalSeconds) {
  if (!totalSeconds) return ''

  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60
  const pad = (n) => String(n).padStart(2, '0')

  return hours > 0
    ? `${hours}:${pad(minutes)}:${pad(seconds)}`
    : `${minutes}:${pad(seconds)}`
}

/**
 * Formatted explicitly rather than via toLocaleDateString: the server and the
 * browser can resolve locales differently, which would trip a hydration
 * mismatch on a string rendered in both places.
 */
function formatDate(isoString) {
  if (!isoString) return ''

  const date = new Date(isoString)
  if (Number.isNaN(date.getTime())) return ''

  return `${MONTHS[date.getUTCMonth()]} ${date.getUTCDate()}, ${date.getUTCFullYear()}`
}

/** Site-wide convention: the brand is one word. */
function normalizeBrand(text) {
  return (text || '').replace(/Zak\s+Talks/g, 'ZakTalks')
}

/**
 * First paragraph of the description, trimmed to a short hook on a word
 * boundary so cards stay to one or two lines.
 */
function buildHook(description, maxLength = 165) {
  const firstParagraph = normalizeBrand(description).split(/\n\s*\n/)[0]?.replace(/\s+/g, ' ').trim()
  if (!firstParagraph) return ''
  if (firstParagraph.length <= maxLength) return firstParagraph

  const clipped = firstParagraph.slice(0, maxLength)
  const lastSpace = clipped.lastIndexOf(' ')

  return `${(lastSpace > 60 ? clipped.slice(0, lastSpace) : clipped).replace(/[,;:.\s]+$/, '')}…`
}

function pickThumbnail(thumbnails = {}) {
  const best = thumbnails.maxres || thumbnails.standard || thumbnails.high || thumbnails.medium || thumbnails.default
  return best?.url || ''
}

async function fetchJson(url) {
  const response = await fetch(url, { next: { revalidate: REVALIDATE_SECONDS } })

  if (!response.ok) {
    throw new Error(`YouTube API ${response.status}: ${await response.text()}`)
  }

  return response.json()
}

/** Every playlist item, following nextPageToken so the list is never capped at 50. */
async function fetchPlaylistItems(playlistId, key) {
  const items = []
  let pageToken = ''

  do {
    const url =
      `${API_BASE}/playlistItems?part=snippet,contentDetails&maxResults=50` +
      `&playlistId=${playlistId}&key=${key}${pageToken ? `&pageToken=${pageToken}` : ''}`

    const page = await fetchJson(url)
    items.push(...(page.items || []))
    pageToken = page.nextPageToken || ''
  } while (pageToken)

  return items
}

/** videos.list caps at 50 ids per call, so ids are chunked. */
async function fetchVideoDetails(videoIds, key) {
  const details = new Map()

  for (let index = 0; index < videoIds.length; index += 50) {
    const chunk = videoIds.slice(index, index + 50).join(',')
    const url =
      `${API_BASE}/videos?part=snippet,contentDetails,statistics,liveStreamingDetails` +
      `&id=${chunk}&key=${key}`

    const page = await fetchJson(url)
    ;(page.items || []).forEach((video) => details.set(video.id, video))
  }

  return details
}

/**
 * Returns the playlist as view-ready episode objects, newest first.
 * Resolves to an empty array on any failure so the page still renders.
 */
export async function getPodcastEpisodes(playlistId = SEASON_ONE_PLAYLIST_ID) {
  const key = process.env.YOUTUBE_API_KEY

  if (!key) {
    console.warn('[youtube] YOUTUBE_API_KEY is not set; skipping playlist fetch.')
    return []
  }

  try {
    const playlistItems = await fetchPlaylistItems(playlistId, key)
    const videoIds = playlistItems
      .map((item) => item.contentDetails?.videoId)
      .filter(Boolean)

    if (!videoIds.length) return []

    const details = await fetchVideoDetails(videoIds, key)

    const episodes = videoIds.map((videoId) => {
      const video = details.get(videoId)
      const snippet = video?.snippet || {}
      const liveDetails = video?.liveStreamingDetails

      // A premiere exposes an actual start time; a plain upload does not, so
      // the label can stay honest instead of calling every video a premiere.
      const premieredAt = liveDetails?.actualStartTime || null
      const releasedAt = premieredAt || snippet.publishedAt || null
      const durationSeconds = parseIsoDuration(video?.contentDetails?.duration)

      return {
        id: videoId,
        title: normalizeBrand(snippet.title || ''),
        hook: buildHook(snippet.description),
        // Full text backs the inline "show notes" disclosure.
        description: normalizeBrand(snippet.description || '').trim(),
        thumbnail: pickThumbnail(snippet.thumbnails),
        isPremiere: Boolean(premieredAt),
        releasedAt,
        releasedLabel: formatDate(releasedAt),
        durationSeconds,
        durationLabel: formatDuration(durationSeconds),
        // Fetched for the "Most popular" sort only; never displayed.
        viewCount: Number(video?.statistics?.viewCount || 0),
        tags: snippet.tags || [],
        watchUrl: `https://www.youtube.com/watch?v=${videoId}&list=${playlistId}`,
      }
    })

    return episodes.sort(
      (a, b) => new Date(b.releasedAt || 0) - new Date(a.releasedAt || 0)
    )
  } catch (error) {
    console.error('[youtube] Failed to load playlist:', error.message)
    return []
  }
}
