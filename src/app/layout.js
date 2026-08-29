import './globals.css'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'
import { Toaster } from 'react-hot-toast'

export const metadata = {
  metadataBase: new URL('https://zaktalks.com'),
  title: 'ZakTalks - Online Learning Platform',
  description: 'Learn from expert tutors with interactive courses and assessments',
  manifest: '/site.webmanifest',
  openGraph: {
    title: 'ZakTalks - Online Learning Platform',
    description: 'Learn from expert tutors with interactive courses and assessments',
    url: '/',
    siteName: 'ZakTalks',
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'ZakTalks - Online Learning Platform',
    description: 'Learn from expert tutors with interactive courses and assessments',
  },
}

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning={true}>
      <body style={{ backgroundColor: 'var(--color-background)', color: 'var(--color-text-primary)' }}>
        <Toaster position="top-right" />
        <Navbar />
        {children}
        <Footer />
      </body>
    </html>
  )
}
