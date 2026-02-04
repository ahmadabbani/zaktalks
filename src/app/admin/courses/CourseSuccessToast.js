'use client'

import { useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import toast from 'react-hot-toast'

export default function CourseSuccessToast() {
  const searchParams = useSearchParams()
  
  useEffect(() => {
    if (searchParams.get('success') === 'true') {
      toast.success('Course saved successfully!')
      // Clean up URL
      window.history.replaceState({}, '', '/admin/courses')
    } else if (searchParams.get('deleted') === 'true') {
      toast.success('Course deleted successfully!')
      // Clean up URL
      window.history.replaceState({}, '', '/admin/courses')
    }
  }, [searchParams])
  
  return null
}
