import { NextRequest, NextResponse } from 'next/server'

const ASAAS_API_KEY = process.env.ASAAS_API_KEY

export async function POST(request: NextRequest) {
  try {
    if (!ASAAS_API_KEY) {
      return NextResponse.json(
        { error: 'Chave API do Asaas não configurada' },
        { status: 500 }
      )
    }

    const body = await request.json()
    const { full_name, email, password, billingType } = body

    // Validações
    if (!full_name || !email || !password || !billingType) {
      return NextResponse.json(
        { error: 'Dados incompletos' },
        { status: 400 }
      )
    }

    if (!['PIX', 'CREDIT_CARD'].includes(billingType)) {
      return NextResponse.json(
        { error: 'Tipo de pagamento inválido' },
        { status: 400 }
      )
    }

    console.log('📝 Criando pagamento para:', email, 'Tipo:', billingType)

    // 1. Verificar se cliente já existe
    const searchResponse = await fetch(
      `https://www.asaas.com/api/v3/customers?email=${encodeURIComponent(email)}`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'access_token': ASAAS_API_KEY
        }
      }
    )

    const searchData = await searchResponse.json()
    let customerId: string

    if (searchData.data && searchData.data.length > 0) {
      // Cliente já existe
      customerId = searchData.data[0].id
      console.log('👤 Cliente já existe:', customerId)
    } else {
      // Criar novo cliente
      const customerResponse = await fetch('https://www.asaas.com/api/v3/customers', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'access_token': ASAAS_API_KEY
        },
        body: JSON.stringify({
          name: full_name,
          email: email,
          cpfCnpj: '00000000000' // CPF genérico
        })
      })

      const customerData = await customerResponse.json()

      if (!customerResponse.ok) {
        console.error('❌ Erro ao criar cliente:', customerData)
        return NextResponse.json(
          { error: customerData.errors?.[0]?.description || 'Erro ao criar cliente' },
          { status: 400 }
        )
      }

      customerId = customerData.id
      console.log('✅ Cliente criado:', customerId)
    }

    // 2. Criar cobrança SEM callback (removido para evitar erro de domínio)
    const paymentPayload: any = {
      customer: customerId,
      billingType: billingType,
      value: 19.90,
      description: 'Acesso Premium Simulado ENEM IA',
      dueDate: new Date().toISOString().split('T')[0],
      externalReference: JSON.stringify({
        full_name,
        email,
        password
      })
    }

    const paymentResponse = await fetch('https://www.asaas.com/api/v3/payments', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'access_token': ASAAS_API_KEY
      },
      body: JSON.stringify(paymentPayload)
    })

    const paymentData = await paymentResponse.json()

    if (!paymentResponse.ok) {
      console.error('❌ Erro ao criar cobrança:', paymentData)
      return NextResponse.json(
        { error: paymentData.errors?.[0]?.description || 'Erro ao criar cobrança' },
        { status: 400 }
      )
    }

    console.log('✅ Cobrança criada:', paymentData.id)

    // 3. Retornar dados do pagamento
    return NextResponse.json({
      success: true,
      paymentId: paymentData.id,
      invoiceUrl: paymentData.invoiceUrl,
      bankSlipUrl: paymentData.bankSlipUrl,
      pixQrCode: paymentData.pixQrCodeBase64,
      pixCopyPaste: paymentData.pixCopyPaste
    })

  } catch (error: any) {
    console.error('❌ Erro ao processar pagamento:', error)
    return NextResponse.json(
      { error: error.message || 'Erro ao processar pagamento' },
      { status: 500 }
    )
  }
}
