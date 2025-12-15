'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Brain, Loader2, CheckCircle, Mail } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function ProcessandoPagamentoPage() {
  const router = useRouter()
  const [showMessage, setShowMessage] = useState(false)

  useEffect(() => {
    // Após 3 segundos, mostrar mensagem de confirmação
    const timer = setTimeout(() => {
      setShowMessage(true)
    }, 3000)

    return () => clearTimeout(timer)
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
          <CardHeader>
            <CardTitle className="text-[#6B46C1] text-center">
              {!showMessage ? 'Processando Pagamento' : 'Pagamento Confirmado!'}
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col items-center justify-center py-12">
            {!showMessage ? (
              <>
                <Loader2 className="h-20 w-20 text-[#6B46C1] animate-spin mb-6" />
                <p className="text-gray-600 text-center text-lg mb-2">
                  Aguarde enquanto processamos seu pagamento...
                </p>
                <p className="text-sm text-gray-500 text-center">
                  Isso pode levar alguns segundos
                </p>
              </>
            ) : (
              <>
                <div className="mb-6 relative">
                  <div className="absolute inset-0 bg-green-100 rounded-full animate-ping opacity-75"></div>
                  <CheckCircle className="h-20 w-20 text-green-600 relative" />
                </div>
                
                <h2 className="text-2xl font-bold text-[#6B46C1] mb-4 text-center">
                  Pagamento Confirmado com Sucesso!
                </h2>
                
                <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-6 mb-6 w-full">
                  <div className="flex items-start space-x-3 mb-4">
                    <Mail className="h-6 w-6 text-blue-600 flex-shrink-0 mt-1" />
                    <div>
                      <h3 className="font-bold text-blue-900 mb-2">
                        Verifique seu e-mail!
                      </h3>
                      <p className="text-sm text-blue-800 mb-2">
                        Enviamos um e-mail de confirmação para você. 
                      </p>
                      <p className="text-sm text-blue-800">
                        <strong>Próximos passos:</strong>
                      </p>
                      <ol className="text-sm text-blue-800 list-decimal list-inside mt-2 space-y-1">
                        <li>Acesse seu e-mail</li>
                        <li>Confirme seu cadastro clicando no link</li>
                        <li>Faça login com seu e-mail e senha</li>
                        <li>Aproveite seu acesso Premium!</li>
                      </ol>
                    </div>
                  </div>
                </div>

                <Button
                  onClick={handleGoToLogin}
                  className="w-full bg-gradient-to-r from-[#6B46C1] to-purple-600 hover:from-[#6B46C1]/90 hover:to-purple-600/90 text-white font-bold text-lg py-6"
                >
                  Ir para Área de Login
                </Button>

                <p className="text-xs text-gray-500 text-center mt-4">
                  Não recebeu o e-mail? Verifique sua caixa de spam ou lixo eletrônico
                </p>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
