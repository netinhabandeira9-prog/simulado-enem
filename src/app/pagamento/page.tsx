'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Brain, Lock, Check, ArrowLeft, Sparkles, Loader2, CreditCard, QrCode, Mail } from 'lucide-react'
import { supabase } from '@/lib/supabase'

export default function PagamentoPage() {
  const router = useRouter()
  const [step, setStep] = useState<'form' | 'payment-method' | 'processing'>('form')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [selectedMethod, setSelectedMethod] = useState<'PIX' | 'CREDIT_CARD' | null>(null)

  // Dados do usuário
  const [userData, setUserData] = useState({
    full_name: '',
    email: '',
    password: '',
    confirmPassword: ''
  })

  const handleUserDataSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      // Validações
      if (userData.password.length < 6) {
        setError('A senha deve ter no mínimo 6 caracteres')
        setLoading(false)
        return
      }

      if (userData.password !== userData.confirmPassword) {
        setError('As senhas não coincidem')
        setLoading(false)
        return
      }

      console.log('🔐 Criando usuário no Supabase Authentication...')

      // Criar usuário no Supabase Authentication
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: userData.email,
        password: userData.password,
        options: {
          data: {
            full_name: userData.full_name
          },
          emailRedirectTo: `${window.location.origin}/login`
        }
      })

      if (authError) {
        console.error('❌ Erro ao criar usuário:', authError)
        
        // Se usuário já existe, permitir continuar
        if (authError.message.includes('already registered')) {
          console.log('⚠️ Usuário já existe, permitindo continuar...')
        } else {
          throw authError
        }
      }

      if (authData?.user) {
        console.log('✅ Usuário criado no Authentication:', authData.user.id)
        
        // Criar perfil inicial na tabela profiles (gratuito por padrão)
        const { error: profileError } = await supabase
          .from('profiles')
          .insert({
            id: authData.user.id,
            email: userData.email,
            full_name: userData.full_name,
            role: 'aluno',
            plan: 'gratuito',
            upgrade_status: false
          })

        if (profileError) {
          // Se perfil já existe, não é erro crítico
          if (!profileError.message.includes('duplicate key')) {
            console.error('⚠️ Erro ao criar perfil:', profileError)
          } else {
            console.log('⚠️ Perfil já existe, continuando...')
          }
        } else {
          console.log('✅ Perfil criado na tabela profiles')
        }
      }

      // Salvar dados no localStorage para uso posterior
      localStorage.setItem('pendingUserData', JSON.stringify({
        full_name: userData.full_name,
        email: userData.email,
        password: userData.password
      }))

      console.log('✅ Cadastro concluído, indo para escolha de pagamento')

      // Ir para escolha de método de pagamento
      setStep('payment-method')
      setLoading(false)

    } catch (err: any) {
      console.error('❌ Erro no cadastro:', err)
      setError(err.message || 'Erro ao criar conta. Tente novamente.')
      setLoading(false)
    }
  }

  const handlePaymentMethodSelect = async (method: 'PIX' | 'CREDIT_CARD') => {
    setSelectedMethod(method)
    setLoading(true)
    setError('')

    try {
      // Criar pagamento via API
      const response = await fetch('/api/asaas/create-payment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          full_name: userData.full_name,
          email: userData.email,
          password: userData.password,
          billingType: method
        })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Erro ao criar pagamento')
      }

      // Salvar ID do pagamento para rastreamento
      if (data.paymentId) {
        localStorage.setItem('pendingPaymentId', data.paymentId)
      }

      console.log('✅ Pagamento criado, redirecionando para Asaas:', data.invoiceUrl)

      // Redirecionar para a página de pagamento do Asaas
      if (data.invoiceUrl) {
        window.location.href = data.invoiceUrl
      } else {
        throw new Error('URL de pagamento não disponível')
      }

    } catch (err: any) {
      console.error('Erro ao processar pagamento:', err)
      setError(err.message || 'Erro ao processar pagamento. Tente novamente.')
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#6B46C1] via-purple-600 to-[#ECC94B] flex items-center justify-center p-4">
      <div className="w-full max-w-4xl">
        {/* Header */}
        <div className="text-center mb-8">
          <Link href="/vendas" className="inline-flex items-center text-white hover:text-white/80 mb-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar
          </Link>
          <div className="flex items-center justify-center space-x-2 mb-4">
            <Brain className="h-10 w-10 text-white" />
            <span className="text-3xl font-bold text-white">Simulado ENEM</span>
          </div>
          <p className="text-white/90 text-lg">
            {step === 'form' && 'Complete seu cadastro'}
            {step === 'payment-method' && 'Escolha a forma de pagamento'}
            {step === 'processing' && 'Processando pagamento...'}
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {/* Resumo do Pedido */}
          <Card className="bg-white/95 backdrop-blur-sm md:col-span-1">
            <CardHeader>
              <CardTitle className="text-[#6B46C1]">Resumo do Pedido</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-4 bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg">
                <h3 className="font-bold text-[#6B46C1] mb-2 flex items-center">
                  <Sparkles className="h-5 w-5 mr-2" />
                  Acesso Premium
                </h3>
                <p className="text-sm text-gray-600 mb-4">Acesso completo e vitalício</p>
                
                <div className="space-y-2 text-sm">
                  <div className="flex items-start space-x-2">
                    <Check className="h-4 w-4 text-green-600 flex-shrink-0 mt-0.5" />
                    <span>90+ questões por matéria</span>
                  </div>
                  <div className="flex items-start space-x-2">
                    <Check className="h-4 w-4 text-green-600 flex-shrink-0 mt-0.5" />
                    <span>Materiais de estudo completos</span>
                  </div>
                  <div className="flex items-start space-x-2">
                    <Check className="h-4 w-4 text-green-600 flex-shrink-0 mt-0.5" />
                    <span>Relatórios de desempenho</span>
                  </div>
                  <div className="flex items-start space-x-2">
                    <Check className="h-4 w-4 text-green-600 flex-shrink-0 mt-0.5" />
                    <span>Atualizações gratuitas</span>
                  </div>
                </div>
              </div>

              <div className="border-t pt-4">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-gray-600">Subtotal</span>
                  <span className="font-semibold">R$ 19,90</span>
                </div>
                <div className="flex justify-between items-center mb-4">
                  <span className="text-gray-600">Desconto</span>
                  <span className="font-semibold text-green-600">R$ 0,00</span>
                </div>
                <div className="flex justify-between items-center text-xl font-bold text-[#6B46C1] border-t pt-4">
                  <span>Total</span>
                  <span>R$ 19,90</span>
                </div>
              </div>

              <div className="flex items-center space-x-2 text-sm text-gray-600 bg-green-50 p-3 rounded-lg">
                <Lock className="h-4 w-4 text-green-600" />
                <span>Pagamento 100% seguro</span>
              </div>
            </CardContent>
          </Card>

          {/* Formulário / Escolha de Pagamento */}
          <Card className="bg-white/95 backdrop-blur-sm md:col-span-2">
            {step === 'form' && (
              <>
                <CardHeader>
                  <CardTitle className="text-[#6B46C1]">Seus Dados</CardTitle>
                  <CardDescription>
                    Preencha seus dados para criar sua conta
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {error && (
                    <Alert variant="destructive" className="mb-4">
                      <AlertDescription>{error}</AlertDescription>
                    </Alert>
                  )}

                  <form onSubmit={handleUserDataSubmit} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="full_name">Nome Completo *</Label>
                      <Input
                        id="full_name"
                        type="text"
                        value={userData.full_name}
                        onChange={(e) => setUserData({...userData, full_name: e.target.value})}
                        placeholder="Seu nome completo"
                        required
                        disabled={loading}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="email">E-mail *</Label>
                      <Input
                        id="email"
                        type="email"
                        value={userData.email}
                        onChange={(e) => setUserData({...userData, email: e.target.value})}
                        placeholder="seu@email.com"
                        required
                        disabled={loading}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="password">Senha *</Label>
                      <Input
                        id="password"
                        type="password"
                        value={userData.password}
                        onChange={(e) => setUserData({...userData, password: e.target.value})}
                        placeholder="Mínimo 6 caracteres"
                        required
                        minLength={6}
                        disabled={loading}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="confirmPassword">Confirmar Senha *</Label>
                      <Input
                        id="confirmPassword"
                        type="password"
                        value={userData.confirmPassword}
                        onChange={(e) => setUserData({...userData, confirmPassword: e.target.value})}
                        placeholder="Digite a senha novamente"
                        required
                        minLength={6}
                        disabled={loading}
                      />
                    </div>

                    <Button 
                      type="submit" 
                      className="w-full bg-gradient-to-r from-[#ECC94B] to-yellow-500 hover:from-[#ECC94B]/90 hover:to-yellow-500/90 text-[#6B46C1] font-bold text-lg py-6"
                      disabled={loading}
                    >
                      {loading ? (
                        <>
                          <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                          Criando conta...
                        </>
                      ) : (
                        'Continuar para Pagamento'
                      )}
                    </Button>
                  </form>
                </CardContent>
              </>
            )}

            {step === 'payment-method' && (
              <>
                <CardHeader>
                  <CardTitle className="text-[#6B46C1]">Escolha a Forma de Pagamento</CardTitle>
                  <CardDescription>
                    Selecione como deseja pagar
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {error && (
                    <Alert variant="destructive" className="mb-4">
                      <AlertDescription>{error}</AlertDescription>
                    </Alert>
                  )}

                  {/* Mensagem informativa */}
                  <Alert className="bg-blue-50 border-blue-200">
                    <Mail className="h-4 w-4 text-blue-600" />
                    <AlertDescription className="text-blue-800">
                      <strong>Importante:</strong> Após realizar o pagamento, acesse seu e-mail e confirme seu cadastro. Em seguida, entre na tela de login e acesse a plataforma.
                    </AlertDescription>
                  </Alert>

                  <div className="grid gap-4">
                    {/* PIX */}
                    <button
                      onClick={() => handlePaymentMethodSelect('PIX')}
                      disabled={loading}
                      className="w-full p-6 border-2 border-gray-200 rounded-lg hover:border-[#6B46C1] hover:bg-purple-50 transition-all text-left disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <div className="flex items-center space-x-4">
                        <div className="p-3 bg-gradient-to-br from-[#6B46C1] to-purple-600 rounded-lg">
                          <QrCode className="h-8 w-8 text-white" />
                        </div>
                        <div className="flex-1">
                          <h3 className="font-bold text-lg text-[#6B46C1]">PIX</h3>
                          <p className="text-sm text-gray-600">Aprovação instantânea</p>
                        </div>
                        <div className="text-right">
                          <p className="text-2xl font-bold text-[#6B46C1]">R$19,90</p>
                          <p className="text-xs text-green-600">Pagamento imediato</p>
                        </div>
                      </div>
                    </button>

                    {/* Cartão de Crédito */}
                    <button
                      onClick={() => handlePaymentMethodSelect('CREDIT_CARD')}
                      disabled={loading}
                      className="w-full p-6 border-2 border-gray-200 rounded-lg hover:border-[#6B46C1] hover:bg-purple-50 transition-all text-left disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <div className="flex items-center space-x-4">
                        <div className="p-3 bg-gradient-to-br from-[#ECC94B] to-yellow-500 rounded-lg">
                          <CreditCard className="h-8 w-8 text-[#6B46C1]" />
                        </div>
                        <div className="flex-1">
                          <h3 className="font-bold text-lg text-[#6B46C1]">Cartão de Crédito</h3>
                          <p className="text-sm text-gray-600">Todas as bandeiras</p>
                        </div>
                        <div className="text-right">
                          <p className="text-2xl font-bold text-[#6B46C1]">R$19,90</p>
                          <p className="text-xs text-gray-600">À vista</p>
                        </div>
                      </div>
                    </button>
                  </div>

                  {loading && (
                    <div className="flex items-center justify-center py-4">
                      <Loader2 className="h-8 w-8 text-[#6B46C1] animate-spin mr-2" />
                      <span className="text-gray-600">Gerando pagamento...</span>
                    </div>
                  )}

                  <Button
                    onClick={() => setStep('form')}
                    variant="outline"
                    className="w-full"
                    disabled={loading}
                  >
                    Voltar
                  </Button>
                </CardContent>
              </>
            )}
          </Card>
        </div>
      </div>
    </div>
  )
}
