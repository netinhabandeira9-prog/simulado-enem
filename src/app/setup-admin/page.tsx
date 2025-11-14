'use client'

import { useState } from 'react'
import { createAdminUser } from '@/lib/auth'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { CheckCircle, AlertCircle } from 'lucide-react'

export default function SetupAdminPage() {
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [message, setMessage] = useState('')

  const handleCreateAdmin = async () => {
    setStatus('loading')
    try {
      await createAdminUser()
      setStatus('success')
      setMessage('Usuário admin criado com sucesso!')
    } catch (error: any) {
      setStatus('error')
      setMessage(error.message || 'Erro ao criar usuário admin')
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold">Setup Inicial</CardTitle>
          <CardDescription>
            Criar usuário administrador do sistema
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {status === 'idle' && (
            <>
              <div className="text-sm text-gray-600 space-y-2">
                <p><strong>Email:</strong> admin@simuladoenem.com</p>
                <p><strong>Senha:</strong> admin123456</p>
              </div>
              <Button 
                onClick={handleCreateAdmin}
                className="w-full bg-purple-600 hover:bg-purple-700"
              >
                Criar Usuário Admin
              </Button>
            </>
          )}

          {status === 'loading' && (
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto mb-2"></div>
              <p>Criando usuário admin...</p>
            </div>
          )}

          {status === 'success' && (
            <div className="text-center space-y-4">
              <CheckCircle className="h-12 w-12 text-green-500 mx-auto" />
              <p className="text-green-600 font-medium">{message}</p>
              <div className="text-sm text-gray-600 space-y-1">
                <p><strong>Email:</strong> admin@simuladoenem.com</p>
                <p><strong>Senha:</strong> admin123456</p>
              </div>
              <Button 
                onClick={() => window.location.href = '/login'}
                className="w-full bg-green-600 hover:bg-green-700"
              >
                Ir para Login
              </Button>
            </div>
          )}

          {status === 'error' && (
            <div className="text-center space-y-4">
              <AlertCircle className="h-12 w-12 text-red-500 mx-auto" />
              <p className="text-red-600 font-medium">{message}</p>
              <Button 
                onClick={() => setStatus('idle')}
                variant="outline"
                className="w-full"
              >
                Tentar Novamente
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}