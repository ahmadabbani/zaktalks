export const YOUTUBE_PLAYBACK_RATES = Object.freeze([
  0.25,
  0.5,
  0.75,
  1,
  1.25,
  1.5,
  1.75,
  2,
])

export function isSupportedPlaybackRate(value) {
  return YOUTUBE_PLAYBACK_RATES.includes(Number(value))
}

export function normalizePlaybackRate(value) {
  const rate = Number(value)
  return isSupportedPlaybackRate(rate) ? rate : 1
}

export function getAvailablePlaybackRates(values) {
  const available = Array.isArray(values)
    ? values
      .map(Number)
      .filter(isSupportedPlaybackRate)
      .filter((rate, index, rates) => rates.indexOf(rate) === index)
    : []

  return available.length ? available.sort((left, right) => left - right) : [1]
}

export function formatPlaybackRate(value) {
  return `${normalizePlaybackRate(value)}×`
}
