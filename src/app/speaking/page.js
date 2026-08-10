import PodcastPageContent from './PodcastPageContent'
import { getPodcastEpisodes } from '@/lib/youtube'

export const metadata = {
  title: 'ZakTalks Podcast | Season 2 Launch',
  description:
    'ZakTalks is where the elephant in the room finally speaks. Season 2 arrives end of August; subscribe on YouTube, Apple Podcasts, Spotify, Anghami or Instagram.',
}

/* Matches the fetch cache in lib/youtube so the page and its data expire
   together instead of serving a stale shell around fresh episodes. */
export const revalidate = 3600

export default async function PodcastPage() {
  // Server-side on purpose: YOUTUBE_API_KEY must never reach the browser.
  const episodes = await getPodcastEpisodes()

  return <PodcastPageContent episodes={episodes} />
}
