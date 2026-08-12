import { readdir, stat } from 'node:fs/promises'
import path from 'node:path'
import sharp from 'sharp'
import EventsPageContent from './EventsPageContent'

export const metadata = {
  title: 'Events | ZakTalks',
  description:
    'Bring ZakTalks to your keynote, workshop, training, panel, organization, company, NGO, institution, or community event.',
}

// The gallery is managed directly from public/events-gallery. Always rescan it
// so added, removed, renamed, and replaced files are reflected after refresh.
export const dynamic = 'force-dynamic'
export const revalidate = 0

const imagePattern = /\.(avif|jpe?g|png|webp)$/i

const naturalSort = new Intl.Collator('en', { numeric: true, sensitivity: 'base' })

async function getEventGalleryImages() {
  const galleryDirectory = path.join(process.cwd(), 'public', 'events-gallery')

  try {
    const fileNames = (await readdir(galleryDirectory))
      .filter((fileName) => imagePattern.test(fileName))
      .sort(naturalSort.compare)

    return Promise.all(
      fileNames.map(async (fileName, index) => {
        const filePath = path.join(galleryDirectory, fileName)
        const [metadata, fileStats] = await Promise.all([
          sharp(filePath).metadata(),
          stat(filePath),
        ])
        const width = metadata.width || 1
        const height = metadata.height || 1
        const ratio = width / height
        const version = `${Math.trunc(fileStats.mtimeMs)}-${fileStats.size}`

        return {
          id: `${fileName}-${version}`,
          src: `/events-gallery/${encodeURIComponent(fileName)}?v=${version}`,
          width,
          height,
          orientation: ratio > 1.18 ? 'landscape' : ratio < 0.84 ? 'portrait' : 'square',
          alt: `ZakTalks workshop moment ${index + 1}`,
        }
      })
    )
  } catch {
    return []
  }
}

export default async function EventsPage() {
  const galleryImages = await getEventGalleryImages()

  return <EventsPageContent galleryImages={galleryImages} />
}
