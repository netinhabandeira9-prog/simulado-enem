/**
 * Exemplo de uso do endpoint /api/upgrade
 * 
 * Este arquivo demonstra como integrar o botão de upgrade
 * em qualquer componente do seu app.
 */

'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Crown, Loader2 } from 'lucide-react'

interface UpgradeButtonProps {
  userId: string
  userEmail: string
  className?: string
}

export default function UpgradeButton({ userId, userEmail, className }: UpgradeButtonProps) {
  const [loading, setLoading] = useState(false)

  const handleUpgrade = async () => {
    setLoading(true)

    try {
      const response = await fetch('/api/upgrade', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_id: userId,
          email: userEmail,
        }),
      })

      const data = await response.json()

      if (data.success && data.payment_link) {
        // Redirecionar para página de pagamento do Asaas
        window.location.href = data.payment_link
      } else {
        alert('Erro ao gerar link de pagamento. Tente novamente.')
        console.error('Erro:', data)
        setLoading(false)
      }
    } catch (error) {
      console.error('Erro ao processar upgrade:', error)
      alert('Erro ao processar upgrade. Tente novamente.')
      setLoading(false)
    }
  }

  return (
    <Button
      onClick={handleUpgrade}
      disabled={loading}
      className={className}
    >
      {loading ? (
        <>
          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          Processando...
        </>
      ) : (
        <>
          <Crown className="h-4 w-4 mr-2" />
          Upgrade R$ 19,90
        </>
      )}
    </Button>
  )
}

/**
 * EXEMPLO DE USO:
 * 
 * import UpgradeButton from '@/components/UpgradeButton'
 * 
 * <UpgradeButton 
 *   userId={user.id} 
 *   userEmail={user.email}
 *   className="bg-purple-600 hover:bg-purple-700"
 * />
 */
