'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { FaApple, FaHeadphones, FaSpotify, FaYoutube } from 'react-icons/fa'
import { FiArrowUpRight, FiChevronDown, FiClock, FiPlay } from 'react-icons/fi'
import styles from './podcast.module.css'

const INITIAL_VISIBLE = 6
const FEATURED_HOOK_PREVIEW_LENGTH = 260

function getFeaturedHookPreview(hook) {
  if (hook.length <= FEATURED_HOOK_PREVIEW_LENGTH) return hook

  const preview = hook.slice(0, FEATURED_HOOK_PREVIEW_LENGTH)
  const lastSpace = preview.lastIndexOf(' ')
  return `${preview.slice(0, lastSpace > 0 ? lastSpace : FEATURED_HOOK_PREVIEW_LENGTH).trimEnd()}…`
}

const sortOptions = [
  { id: 'latest', label: 'Latest' },
  { id: 'popular', label: 'Most popular' },
  { id: 'short', label: 'Short listens' },
  { id: 'deep', label: 'Deep dives' },
]

/* Season 1 themes are keyed to stable YouTube video IDs, not array positions.
   That keeps every episode's themes correct after sorting or filtering. */
const episodeThemeMap = {
  // Episode 1
  kdf1icMj74E: ['Politics', 'Leadership', 'Generations'],
  // Episode 2
  CwTOpZdPp1w: ['Business', 'Corporation', 'Gen Z'],
  // Episode 3
  CYq9yT0uBHs: ['Strength', 'Youth', 'Emotional intelligence'],
  // Episode 4
  o41S1iTwQqA: ['Team building', 'Leadership', 'F&B'],
  // Episode 5
  '5DMTfeDWC7Q': ['Passion', 'Music', 'Self-knowledge'],
  // Episode 6
  roPhrZsq8N4: ['Entrepreneurship', 'Drive', 'Failure'],
  // Episode 7
  hJ3XoT5br70: ['Money', 'Energy', 'Financial literacy'],
  // Episode 8
  zRkLnUertSc: ['Trauma', 'Inner talk', 'Healing'],
  // Episode 9
  'CK5Nwp-9q38': ['Gold', 'Trading', 'Investment', 'Crypto'],
  // Episode 10
  dHkIyZSL_ME: ['School', 'Vacation', 'Trauma'],
  // Episode 11
  'ZOPlNV-tkR0': ['Inner child', 'Childhood', 'Emotions'],
  // Episode 12
  AzpVo4bkKDI: ['Acting', 'Self-love', 'Self-knowledge'],
  // Episode 13
  Eh8YHTW2gSg: ['AI', 'Education', 'Values'],
}

const themeOptions = Array.from(new Set(Object.values(episodeThemeMap).flat())).sort((a, b) =>
  a.localeCompare(b)
)

function getEpisodeThemes(episodeId) {
  return episodeThemeMap[episodeId] || []
}

/* No per-episode links yet, so these read as informational chips rather than
   buttons that look clickable but do nothing. */
const listenPlatforms = [
  { id: 'apple', label: 'Apple Podcasts', Icon: FaApple },
  { id: 'spotify', label: 'Spotify', Icon: FaSpotify },
  { id: 'anghami', label: 'Anghami', Icon: FaHeadphones },
]

/**
 * Hand-picked highlights. Matched to the playlist by video id rather than by
 * title so renaming an episode on YouTube can never silently break the link
 * to its thumbnail and runtime. Copy and tags are authored here, which is why
 * these show tags while the fetched cards do not have any yet.
 */
const featuredEpisodes = [
  {
    videoId: 'hJ3XoT5br70',
    title: "It's Not About Money: It's About You!",
    hook: `Your Relationship With Money Is Personal

Money is rarely just about numbers. It can carry fear, pressure, guilt, shame, comparison, and the beliefs you learned long before you started earning, spending, or investing.

In this conversation, Zak explores the deeper patterns behind the way we relate to money: why abundance can feel unsafe, why some people struggle to receive, and how unconscious beliefs can quietly shape financial choices. This is not about chasing wealth. It is about building a more aware, honest, and empowered relationship with money.`,
    tags: ['Money mindset', 'Financial awareness', 'Self-worth', 'Personal growth'],
    watchUrl: 'https://www.youtube.com/watch?v=hJ3XoT5br70&list=PLPFgt_ywYJEM',
  },
  {
    videoId: 'CYq9yT0uBHs',
    title: 'Your strengths aren’t missing; they’re being ignored.',
    hook: `What if your biggest weakness was actually your greatest strength; simply misunderstood, or suppressed by the wrong environment?

In this episode, we tackle one of the most pervasive flaws in workplace culture: the constant focus on fixing weaknesses rather than celebrating what’s already strong. We explore how early feedback or harsh environments can unintentionally cause people to bury their true strengths, and why many highly successful professionals still feel unfulfilled and disconnected from their work.

This episode is for anyone who’s ever felt unseen, undervalued, or stuck in a role that doesn’t truly reflect who they are. It’s also a wake-up call for leaders who want to build teams that thrive by embracing people’s authentic potential.

Tune in and rethink how we define strength, success, and human potential at work!`,
    tags: ['Work & career', 'Self-worth', 'Personal growth'],
    watchUrl: 'https://youtu.be/CYq9yT0uBHs',
  },
]

const seasons = [
  {
    id: 'season-1',
    label: 'Season 1',
    image: '/podcast-s1.jpg',
    alt: 'ZakTalks Season 1 cover with Zak Dakkach holding a microphone',
    available: true,
  },
  {
    id: 'season-2',
    label: 'Season 2',
    image: '/podcast-s2.jpg',
    alt: 'ZakTalks Season 2 cover, coming soon',
    available: false,
  },
]

function sortEpisodes(episodes, sortId) {
  const list = [...episodes]

  switch (sortId) {
    case 'popular':
      return list.sort((a, b) => b.viewCount - a.viewCount)
    case 'short':
      return list.sort((a, b) => a.durationSeconds - b.durationSeconds)
    case 'deep':
      return list.sort((a, b) => b.durationSeconds - a.durationSeconds)
    default:
      return list.sort((a, b) => new Date(b.releasedAt || 0) - new Date(a.releasedAt || 0))
  }
}

function EpisodeCard({ episode, index, themes }) {
  const [showNotes, setShowNotes] = useState(false)

  return (
    <article className={styles.episodeCard} style={{ '--episode-delay': `${index * 70}ms` }}>
      <a
        href={episode.watchUrl}
        target="_blank"
        rel="noreferrer"
        className={styles.episodeThumb}
        aria-label={`Watch ${episode.title} on YouTube`}
      >
        {episode.thumbnail && (
          <Image
            src={episode.thumbnail}
            alt=""
            width={1280}
            height={720}
            sizes="(max-width: 700px) 100vw, (max-width: 1200px) 50vw, 33vw"
            unoptimized
            className={styles.episodeImage}
          />
        )}

        <span className={styles.episodePlay} aria-hidden="true">
          <FiPlay />
        </span>

        {episode.durationLabel && (
          <span className={styles.episodeDuration}>
            <FiClock aria-hidden="true" />
            <span>{episode.durationLabel}</span>
          </span>
        )}
      </a>

      <div className={styles.episodeBody}>
        {episode.releasedLabel && (
          <p className={styles.episodeMeta}>
            {episode.isPremiere ? 'Premiered' : 'Published'} {episode.releasedLabel}
          </p>
        )}

        <h3 className={styles.episodeTitle}>
          <a href={episode.watchUrl} target="_blank" rel="noreferrer">
            {episode.title}
          </a>
        </h3>

        {episode.hook && <p className={styles.episodeHook}>{episode.hook}</p>}

        {episode.tags.length > 0 && (
          <ul className={styles.episodeTags}>
            {episode.tags.slice(0, 3).map((tag) => (
              <li key={tag} className={styles.episodeTag}>
                {tag}
              </li>
            ))}
          </ul>
        )}

        {/* 0fr → 1fr animates the panel open without measuring heights. */}
        <div
          id={`episode-notes-${episode.id}`}
          role="region"
          className={`${styles.episodeNotes} ${showNotes ? styles.episodeNotesOpen : ''}`}
        >
          <div className={styles.episodeNotesInner}>
            <p>{episode.description || 'Show notes for this episode are coming soon.'}</p>
          </div>
        </div>

        <div className={styles.episodeActions}>
          <a
            href={episode.watchUrl}
            target="_blank"
            rel="noreferrer"
            className={styles.episodeWatch}
          >
            <FaYoutube aria-hidden="true" />
            <span>Watch</span>
            <FiArrowUpRight aria-hidden="true" />
          </a>

          <button
            type="button"
            className={styles.episodeNotesToggle}
            aria-expanded={showNotes}
            aria-controls={`episode-notes-${episode.id}`}
            onClick={() => setShowNotes((open) => !open)}
          >
            <span>{showNotes ? 'Hide show notes' : 'Show notes'}</span>
            <FiChevronDown aria-hidden="true" />
          </button>
        </div>

        {themes.length > 0 && (
          <ul className={styles.episodeThemes} aria-label="Episode themes">
            {themes.map((theme) => (
              <li key={theme} className={styles.episodeTheme}>
                {theme}
              </li>
            ))}
          </ul>
        )}

        <div className={styles.episodeListen}>
          <span className={styles.episodeListenLabel}>Listen on</span>
          <ul className={styles.episodeListenList}>
            {listenPlatforms.map((platform) => (
              <li key={platform.id} className={styles.episodeListenChip} title={platform.label}>
                <platform.Icon aria-hidden="true" />
                <span className={styles.srOnly}>{platform.label}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </article>
  )
}

function FeaturedEpisodeCard({ item, details, index, register, cx }) {
  // Falls back to YouTube's own thumbnail host so the card still renders if the
  // playlist request failed or the video was removed from the playlist.
  const thumbnail = details?.thumbnail || `https://i.ytimg.com/vi/${item.videoId}/maxresdefault.jpg`
  const revealId = `featured-${item.videoId}`
  const [isHookExpanded, setIsHookExpanded] = useState(false)
  const canExpandHook = item.hook.length > FEATURED_HOOK_PREVIEW_LENGTH

  return (
    <article
      ref={register(revealId)}
      className={`${cx(styles.featuredCard, revealId)} ${isHookExpanded ? styles.featuredCardExpanded : ''}`}
      style={{ '--featured-delay': `${index * 120}ms` }}
    >
      <a
        href={item.watchUrl}
        target="_blank"
        rel="noreferrer"
        className={styles.featuredThumb}
        aria-label={`Watch ${item.title} on YouTube`}
      >
        <Image
          src={thumbnail}
          alt=""
          width={1280}
          height={720}
          sizes="(max-width: 900px) 100vw, 45vw"
          unoptimized
          className={styles.featuredImage}
        />

        {details?.durationLabel && (
          <span className={styles.featuredDuration}>
            <FiClock aria-hidden="true" />
            <span>{details.durationLabel}</span>
          </span>
        )}
      </a>

      <div className={styles.featuredBody}>
        {details?.releasedLabel && (
          <p className={styles.featuredMeta}>
            {details.isPremiere ? 'Premiered' : 'Published'} {details.releasedLabel}
          </p>
        )}

        <h4 className={styles.featuredCardTitle}>
          <a href={item.watchUrl} target="_blank" rel="noreferrer">
            {item.title}
          </a>
        </h4>

        <p className={styles.featuredHook}>
          {isHookExpanded ? item.hook : getFeaturedHookPreview(item.hook)}
        </p>

        {canExpandHook && (
          <button
            type="button"
            className={styles.featuredHookToggle}
            onClick={() => setIsHookExpanded((current) => !current)}
            aria-expanded={isHookExpanded}
          >
            {isHookExpanded ? 'Show less' : 'Learn more'}
          </button>
        )}

        <ul className={styles.featuredTags}>
          {item.tags.map((tag) => (
            <li key={tag} className={styles.featuredTag}>
              {tag}
            </li>
          ))}
        </ul>

        <a
          href={item.watchUrl}
          target="_blank"
          rel="noreferrer"
          className={styles.featuredWatch}
        >
          <FaYoutube aria-hidden="true" />
          <span>Watch on YouTube</span>
          <FiArrowUpRight aria-hidden="true" />
        </a>
      </div>
    </article>
  )
}

export default function PodcastArchiveSection({ episodes = [] }) {
  const [openSeason, setOpenSeason] = useState(null)
  const [sortId, setSortId] = useState('latest')
  const [selectedTheme, setSelectedTheme] = useState('all')
  const [isThemeMenuOpen, setIsThemeMenuOpen] = useState(false)
  const [visibleCount, setVisibleCount] = useState(INITIAL_VISIBLE)
  const [revealed, setRevealed] = useState(() => new Set())

  const nodes = useRef(new Map())
  const archiveRef = useRef(null)
  const themeMenuRef = useRef(null)

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const seen = []

        entries.forEach((entry) => {
          if (!entry.isIntersecting) return
          seen.push(entry.target.dataset.revealId)
          observer.unobserve(entry.target)
        })

        if (!seen.length) return

        setRevealed((current) => {
          const next = new Set(current)
          seen.forEach((id) => next.add(id))
          return next
        })
      },
      { threshold: 0.18, rootMargin: '0px 0px -7% 0px' }
    )

    nodes.current.forEach((node) => observer.observe(node))
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    if (!isThemeMenuOpen) return undefined

    const handlePointerDown = (event) => {
      if (!themeMenuRef.current?.contains(event.target)) setIsThemeMenuOpen(false)
    }
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') setIsThemeMenuOpen(false)
    }

    document.addEventListener('pointerdown', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown)

    return () => {
      document.removeEventListener('pointerdown', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [isThemeMenuOpen])

  const register = useCallback((id) => (node) => {
    if (!node) {
      nodes.current.delete(id)
      return
    }

    node.dataset.revealId = id
    nodes.current.set(id, node)
  }, [])

  const cx = useCallback(
    (base, id) => [base, revealed.has(id) ? styles.isVisible : ''].filter(Boolean).join(' '),
    [revealed]
  )

  const filteredEpisodes = useMemo(
    () =>
      selectedTheme === 'all'
        ? episodes
        : episodes.filter((episode) => getEpisodeThemes(episode.id).includes(selectedTheme)),
    [episodes, selectedTheme]
  )
  const sortedEpisodes = useMemo(
    () => sortEpisodes(filteredEpisodes, sortId),
    [filteredEpisodes, sortId]
  )
  const visibleEpisodes = sortedEpisodes.slice(0, visibleCount)
  const remaining = sortedEpisodes.length - visibleEpisodes.length
  const isArchiveOpen = openSeason === 'season-1'

  useEffect(() => {
    if (!isArchiveOpen || !archiveRef.current) return undefined

    const frame = window.requestAnimationFrame(() => {
      archiveRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    })

    return () => window.cancelAnimationFrame(frame)
  }, [isArchiveOpen])

  const toggleSeason = (season) => {
    if (!season.available) return

    setOpenSeason((current) => (current === season.id ? null : season.id))
    setVisibleCount(INITIAL_VISIBLE)
  }

  const changeSort = (nextSortId) => {
    setSortId(nextSortId)
    setVisibleCount(INITIAL_VISIBLE)
  }

  const changeTheme = (theme) => {
    setSelectedTheme(theme)
    setIsThemeMenuOpen(false)
    setVisibleCount(INITIAL_VISIBLE)
  }

  return (
    <section className={styles.archiveSection} aria-labelledby="archive-heading">
      <div className={styles.contentWidth}>
        <div
          ref={register('archive-header')}
          className={cx(styles.archiveHeader, 'archive-header')}
        >
          <h2 id="archive-heading" className={styles.archiveTitle}>
            Explore every conversation.
          </h2>

          <p className={styles.archiveCopy}>
            Season 1 is already live with {episodes.length || 13} episodes, each one
            digging into a different &ldquo;elephant in the room&rdquo; in your inner
            world, relationships, and daily life. Season 2 launches at the end of August,
            adding deeper, bolder conversations to the archive.
          </p>
        </div>
      </div>

      {/* Full-bleed: the two covers meet in the middle and run to both edges. */}
      <div
        ref={register('archive-seasons')}
        className={cx(styles.seasonSplit, 'archive-seasons')}
      >
        {seasons.map((season) => {
          const isOpen = openSeason === season.id

          return season.available ? (
            <button
              key={season.id}
              type="button"
              className={`${styles.seasonTile} ${isOpen ? styles.seasonTileOpen : ''}`}
              aria-expanded={isOpen}
              aria-controls="season-archive"
              onClick={() => toggleSeason(season)}
            >
              <Image
                src={season.image}
                alt={season.alt}
                width={1100}
                height={1100}
                sizes="50vw"
                quality={86}
                className={styles.seasonImage}
              />

              <span className={styles.seasonCenterLabel}><span>Season 1</span></span>

              <span className={styles.seasonHint}>
                <span>{isOpen ? 'Hide Season 1' : 'Watch Season 1'}</span>
                <FiChevronDown aria-hidden="true" />
              </span>
            </button>
          ) : (
            <div key={season.id} className={`${styles.seasonTile} ${styles.seasonTileLocked}`}>
              <Image
                src={season.image}
                alt={season.alt}
                width={1100}
                height={1100}
                sizes="50vw"
                quality={86}
                className={styles.seasonImage}
              />

              <span className={styles.seasonComingSoon}>
                <span className={styles.seasonComingSoonText}>
                  <strong className={styles.seasonComingSoonHeadline}>Season 2 is now on air.</strong>
                  <span>
                    New episodes every <strong>Friday</strong> on <strong>Shift TV/Cablevision+</strong>{' '}
                    and every <strong>Sunday</strong> on <strong>ZakTalks YouTube channel</strong>.
                  </span>
                </span>
              </span>

              <span className={`${styles.seasonHint} ${styles.seasonHintStatic}`}>
                <span>Watch Season 2</span>
                <FiChevronDown aria-hidden="true" />
              </span>
            </div>
          )
        })}
      </div>

      <div
        id="season-archive"
        ref={archiveRef}
        className={`${styles.archivePanel} ${isArchiveOpen ? styles.archivePanelOpen : ''}`}
        aria-hidden={!isArchiveOpen}
      >
        <div className={styles.archivePanelInner}>
          <div className={styles.contentWidth}>
            <div className={styles.archiveControls}>
              <div className={styles.sortGroup} role="group" aria-label="Sort episodes">
                <span className={styles.sortLabel}>Sort by</span>

                <div className={styles.sortOptions}>
                  {sortOptions.map((option) => (
                    <button
                      key={option.id}
                      type="button"
                      className={`${styles.sortButton} ${
                        sortId === option.id ? styles.sortButtonActive : ''
                      }`}
                      aria-pressed={sortId === option.id}
                      onClick={() => changeSort(option.id)}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className={styles.themeFilter} ref={themeMenuRef}>
                <span id="episode-theme-filter-label" className={styles.sortLabel}>
                  Theme
                </span>
                <div className={styles.themeDropdown}>
                  <button
                    type="button"
                    className={styles.themeTrigger}
                    aria-haspopup="listbox"
                    aria-expanded={isThemeMenuOpen}
                    aria-labelledby="episode-theme-filter-label episode-theme-filter-value"
                    onClick={() => setIsThemeMenuOpen((open) => !open)}
                  >
                    <span id="episode-theme-filter-value">
                      {selectedTheme === 'all' ? 'All themes' : selectedTheme}
                    </span>
                    <FiChevronDown aria-hidden="true" />
                  </button>

                  <div
                    className={`${styles.themeMenu} ${
                      isThemeMenuOpen ? styles.themeMenuOpen : ''
                    }`}
                    role="listbox"
                    aria-label="Filter episodes by theme"
                  >
                    <button
                      type="button"
                      role="option"
                      aria-selected={selectedTheme === 'all'}
                      className={`${styles.themeOption} ${
                        selectedTheme === 'all' ? styles.themeOptionActive : ''
                      }`}
                      onClick={() => changeTheme('all')}
                    >
                      All themes
                    </button>
                    {themeOptions.map((theme) => (
                      <button
                        key={theme}
                        type="button"
                        role="option"
                        aria-selected={selectedTheme === theme}
                        className={`${styles.themeOption} ${
                          selectedTheme === theme ? styles.themeOptionActive : ''
                        }`}
                        onClick={() => changeTheme(theme)}
                      >
                        {theme}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {sortedEpisodes.length === 0 ? (
              <p className={styles.archiveEmpty}>
                {selectedTheme === 'all'
                  ? 'Episodes are loading from YouTube. Please check back shortly.'
                  : 'No Season 1 episodes match this theme.'}
              </p>
            ) : (
              <>
                <div className={styles.episodeGrid}>
                  {visibleEpisodes.map((episode, index) => (
                    <EpisodeCard
                      key={episode.id}
                      episode={episode}
                      index={index % INITIAL_VISIBLE}
                      themes={getEpisodeThemes(episode.id)}
                    />
                  ))}
                </div>

                {remaining > 0 && (
                  <div className={styles.archiveMoreRow}>
                    <button
                      type="button"
                      className={styles.archiveMore}
                      onClick={() => setVisibleCount(sortedEpisodes.length)}
                    >
                      <span>
                        Show {remaining} more {remaining === 1 ? 'episode' : 'episodes'}
                      </span>
                      <FiChevronDown aria-hidden="true" />
                    </button>
                  </div>
                )}
              </>
            )}

          </div>
        </div>
      </div>

      <div className={styles.contentWidth}>
        <div className={styles.featuredBlock}>
          <div
            ref={register('featured-header')}
            className={cx(styles.featuredHeader, 'featured-header')}
          >
            <p className={styles.eyebrow}>Featured</p>
            <h3 className={styles.featuredTitle}>MOST POPULAR EPISODES</h3>
          </div>

          <div className={styles.featuredList}>
            {featuredEpisodes.map((item, index) => (
              <FeaturedEpisodeCard
                key={item.videoId}
                item={item}
                details={episodes.find((episode) => episode.id === item.videoId)}
                index={index}
                register={register}
                cx={cx}
              />
            ))}
          </div>

          {/* Course promotion is intentionally hidden for now. Keep this block
              available so it can be restored beneath the featured episodes. */}
          {/* <div
            ref={register('featured-course')}
            className={cx(styles.featuredCourse, 'featured-course')}
          >
            <div className={styles.featuredCourseCopy}>
              <p className={styles.featuredCourseTitle}>
                Interpersonal Communication Dynamics
              </p>
              <p className={styles.featuredCourseText}>
                Understand how communication patterns form, repeat, and shape the way we
                relate to one another.
              </p>
            </div>

            <Link
              href="/courses/interpersonal-communication-dynamics"
              className={styles.featuredCourseCta}
            >
              <span>Explore the course</span>
              <FiArrowUpRight aria-hidden="true" />
            </Link>
          </div> */}
        </div>
      </div>
    </section>
  )
}
