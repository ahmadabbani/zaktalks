/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverActions: {
      bodySizeLimit: '4mb',
    },
  },
  images: {
    qualities: [64, 74, 86, 100],
    // Gallery URLs include a file-derived version query so replaced images
    // invalidate both the browser and Next.js image-optimizer caches.
    localPatterns: [
      {
        // Keeps the original filename while allowing a one-off cache version
        // when the source photo is replaced in place.
        pathname: '/1on1-hero.jpg',
        search: '?v=20260826',
      },
      {
        pathname: '/events-gallery/**',
      },
      {
        // Allow every existing local asset, but without arbitrary queries.
        pathname: '/**',
        search: '',
      },
    ],
    // YouTube episode thumbnails are served from these hosts.
    remotePatterns: [
      { protocol: 'https', hostname: 'i.ytimg.com' },
      { protocol: 'https', hostname: 'img.youtube.com' },
      { protocol: 'https', hostname: 'skhypygfbvzfkjkfjlej.supabase.co' },
    ],
  },
};

export default nextConfig;
