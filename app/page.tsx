'use client'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

export default function RedirectPage() {
  const router = useRouter()

  useEffect(() => {
    // Redirect to the desired page
    router.push('/start')
  }, [router])

  return null
}