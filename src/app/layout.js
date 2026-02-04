import './globals.css'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'
import { Toaster } from 'react-hot-toast'

export const metadata = {
  title: 'ZakTalks - Online Learning Platform',
  description: 'Learn from expert tutors with interactive courses and assessments',
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
