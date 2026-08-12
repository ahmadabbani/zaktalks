/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverActions: {
      bodySizeLimit: '4mb',
    },
  },
  images: {
    qualities: [74, 86],
    // Gallery URLs include a file-derived version query so replaced images
    // invalidate both the browser and Next.js image-optimizer caches.
    localPatterns: [
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
    ],
  },
};

export default nextConfig;
