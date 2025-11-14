'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function AlunoPage() {
  const router = useRouter()

  useEffect(() => {
    // Redirecionar para /dashboard
    router.push('/dashboard')
  }, [router])

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#6B46C1] via-purple-600 to-[#ECC94B] flex items-center justify-center">
      <div className="text-white text-xl">Redirecionando...</div>
    </div>
  )
}