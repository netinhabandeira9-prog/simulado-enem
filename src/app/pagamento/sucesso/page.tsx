'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Brain, CheckCircle, Loader2, Mail, ArrowRight } from 'lucide-react'

export default function PagamentoSucessoPage() {
  const router = useRouter()
  const [status, setStatus] = useState<'checking' | 'success' | 'pending'>('checking')
  const [email, setEmail] = useState('')

  useEffect(() => {
    // Recuperar dados do localStorage
    const pendingData = localStorage.getItem('pendingUserData')
    
    if (pendingData) {
      try {
        const userData = JSON.parse(pendingData)
        setEmail(userData.email)
        
        // Simular verificação de pagamento (em produção, você faria uma chamada à API)
        setTimeout(() => {
          setStatus('success')
          // Limpar dados pendentes
          localStorage.removeItem('pendingUserData')
        }, 2000)
      } catch (e) {
        console.error('Erro ao processar dados:', e)
        setStatus('pending')
      }
    } else {
      setStatus('pending')
    }
  }, [])

  const handleGoToLogin = () => {
    router.push('/login')
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#6B46C1] via-purple-600 to-[#ECC94B] flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center space-x-2 mb-4">
            <Brain className="h-10 w-10 text-white" />
            <span className="text-3xl font-bold text-white">Simulado ENEM</span>
          </div>
        </div>

        <Card className="bg-white/95 backdrop-blur-sm">
          <CardHeader className="text-center">
            {status === 'checking' && (
              <>
                <div className="flex justify-center mb-4">
                  <Loader2 className="h-16 w-16 text-[#6B46C1] animate-spin" />
                </div>
                <CardTitle className="text-[#6B46C1] text-2xl">
                  Verificando Pagamento
                </CardTitle>
                <CardDescription>
                  Aguarde enquanto confirmamos seu pagamento...
                </CardDescription>
              </>
            )}

            {status === 'success' && (
              <>
                <div className="flex justify-center mb-4">
                  <div className="p-4 bg-green-100 rounded-full">
                    <CheckCircle className="h-16 w-16 text-green-600" />
                  </div>
                </div>
                <CardTitle className="text-[#6B46C1] text-2xl">
                  Pagamento Confirmado!
                </CardTitle>
                <CardDescription>
                  Sua conta premium foi ativada com sucesso
                </CardDescription>
              </>
            )}

            {status === 'pending' && (
              <>
                <div className="flex justify-center mb-4">
                  <div className="p-4 bg-yellow-100 rounded-full">
                    <Mail className="h-16 w-16 text-yellow-600" />
                  </div>
                </div>
                <CardTitle className="text-[#6B46C1] text-2xl">
                  Pagamento em Processamento
                </CardTitle>
                <CardDescription>
                  Aguardando confirmação do pagamento
                </CardDescription>
              </>
            )}
          </CardHeader>

          <CardContent className="space-y-6">
            {status === 'success' && (
              <>
                <Alert className="bg-green-50 border-green-200">
                  <Mail className="h-4 w-4 text-green-600" />
                  <AlertDescription className="text-green-800">
                    Um e-mail de confirmação foi enviado para <strong>{email}</strong>
                  </AlertDescription>
                </Alert>

                <div className="space-y-4 p-6 bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg">
                  <h3 className="font-bold text-[#6B46C1] text-lg">
                    Próximos Passos:
                  </h3>
                  <ol className="space-y-3 text-sm text-gray-700">
                    <li className="flex items-start space-x-2">
                      <span className="flex-shrink-0 w-6 h-6 bg-[#6B46C1] text-white rounded-full flex items-center justify-center text-xs font-bold">
                        1
                      </span>
                      <span>Verifique seu e-mail para confirmar sua conta</span>
                    </li>
                    <li className="flex items-start space-x-2">
                      <span className="flex-shrink-0 w-6 h-6 bg-[#6B46C1] text-white rounded-full flex items-center justify-center text-xs font-bold">
                        2
                      </span>
                      <span>Faça login com seu e-mail e senha cadastrados</span>
                    </li>
                    <li className="flex items-start space-x-2">
                      <span className="flex-shrink-0 w-6 h-6 bg-[#6B46C1] text-white rounded-full flex items-center justify-center text-xs font-bold">
                        3
                      </span>
                      <span>Comece a estudar com acesso completo à plataforma!</span>
                    </li>
                  </ol>
                </div>

                <Button
                  onClick={handleGoToLogin}
                  className="w-full bg-gradient-to-r from-[#6B46C1] to-purple-600 hover:from-[#6B46C1]/90 hover:to-purple-600/90 text-white font-bold text-lg py-6"
                >
                  Ir para Login
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </>
            )}

            {status === 'pending' && (
              <>
                <Alert className="bg-yellow-50 border-yellow-200">
                  <AlertDescription className="text-yellow-800">
                    Seu pagamento está sendo processado. Você receberá um e-mail de confirmação assim que for aprovado.
                  </AlertDescription>
                </Alert>

                <div className="space-y-4 p-6 bg-gray-50 rounded-lg">
                  <h3 className="font-bold text-[#6B46C1] text-lg">
                    O que fazer agora?
                  </h3>
                  <ul className="space-y-2 text-sm text-gray-700">
                    <li className="flex items-start space-x-2">
                      <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                      <span>Aguarde a confirmação do pagamento (pode levar alguns minutos)</span>
                    </li>
                    <li className="flex items-start space-x-2">
                      <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                      <span>Verifique sua caixa de entrada e spam</span>
                    </li>
                    <li className="flex items-start space-x-2">
                      <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                      <span>Após a confirmação, faça login na plataforma</span>
                    </li>
                  </ul>
                </div>

                <Button
                  onClick={handleGoToLogin}
                  variant="outline"
                  className="w-full"
                >
                  Ir para Login
                </Button>
              </>
            )}

            {status === 'checking' && (
              <div className="text-center text-gray-600">
                <p>Isso pode levar alguns segundos...</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
