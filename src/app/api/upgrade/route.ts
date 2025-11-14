import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function POST(request: NextRequest) {
  try {
    console.log('🔧 [UPGRADE] Iniciando processamento...')
    
    // Verificar variáveis de ambiente
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    const asaasApiKey = process.env.ASAAS_API_KEY

    console.log('🔑 [UPGRADE] Env vars:', {
      supabaseUrl: !!supabaseUrl,
      supabaseServiceKey: !!supabaseServiceKey,
      asaasApiKey: !!asaasApiKey,
      asaasApiKeyLength: asaasApiKey?.length || 0,
      asaasApiKeyPrefix: asaasApiKey?.substring(0, 10) || 'VAZIO'
    })

    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('❌ [UPGRADE] Supabase env vars faltando')
      return NextResponse.json(
        { error: 'Configuração do servidor incompleta - Supabase' },
        { status: 500 }
      )
    }

    if (!asaasApiKey) {
      console.error('❌ [UPGRADE] ASAAS_API_KEY faltando')
      return NextResponse.json(
        { error: 'Configuração do servidor incompleta - Asaas' },
        { status: 500 }
      )
    }

    // Parse do body
    const body = await request.json()
    const { user_id, email } = body

    console.log('📥 [UPGRADE] Dados recebidos:', { user_id, email })

    if (!user_id || !email) {
      console.error('❌ [UPGRADE] Parâmetros faltando')
      return NextResponse.json(
        { error: 'user_id e email são obrigatórios' },
        { status: 400 }
      )
    }

    // Criar cliente Supabase
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)

    // Buscar perfil do usuário
    console.log('🔍 [UPGRADE] Buscando perfil...')
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .eq('id', user_id)
      .single()

    if (profileError || !profile) {
      console.error('❌ [UPGRADE] Perfil não encontrado:', profileError)
      return NextResponse.json(
        { error: 'Usuário não encontrado' },
        { status: 404 }
      )
    }

    console.log('✅ [UPGRADE] Perfil encontrado:', profile.full_name)

    // Buscar ou criar cliente no Asaas
    let customerId: string

    console.log('🔍 [UPGRADE] Buscando cliente no Asaas...')
    const searchResponse = await fetch(
      `https://www.asaas.com/api/v3/customers?email=${encodeURIComponent(email)}`,
      {
        method: 'GET',
        headers: {
          'access_token': asaasApiKey,
          'Content-Type': 'application/json',
        },
      }
    )

    if (!searchResponse.ok) {
      const errorText = await searchResponse.text()
      console.error('❌ [UPGRADE] Erro ao buscar cliente:', errorText)
      return NextResponse.json(
        { error: 'Erro ao buscar cliente no Asaas' },
        { status: 500 }
      )
    }

    const searchData = await searchResponse.json()
    console.log('📦 [UPGRADE] Busca cliente:', searchData)

    if (searchData.data && searchData.data.length > 0) {
      customerId = searchData.data[0].id
      console.log('✅ [UPGRADE] Cliente existente:', customerId)
    } else {
      console.log('➕ [UPGRADE] Criando novo cliente...')
      const createCustomerResponse = await fetch(
        'https://www.asaas.com/api/v3/customers',
        {
          method: 'POST',
          headers: {
            'access_token': asaasApiKey,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            name: profile.full_name,
            email: email,
          }),
        }
      )

      if (!createCustomerResponse.ok) {
        const errorText = await createCustomerResponse.text()
        console.error('❌ [UPGRADE] Erro ao criar cliente:', errorText)
        return NextResponse.json(
          { error: 'Erro ao criar cliente no Asaas' },
          { status: 500 }
        )
      }

      const customerData = await createCustomerResponse.json()
      console.log('📦 [UPGRADE] Cliente criado:', customerData)

      customerId = customerData.id
      console.log('✅ [UPGRADE] Novo cliente ID:', customerId)
    }

    // Criar cobrança
    console.log('💰 [UPGRADE] Criando cobrança...')
    const dueDate = new Date()
    dueDate.setDate(dueDate.getDate() + 7)
    const dueDateStr = dueDate.toISOString().split('T')[0]

    const paymentResponse = await fetch(
      'https://www.asaas.com/api/v3/payments',
      {
        method: 'POST',
        headers: {
          'access_token': asaasApiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          customer: customerId,
          billingType: 'UNDEFINED',
          value: 19.90,
          dueDate: dueDateStr,
          description: 'Upgrade para Premium - Simulado ENEM IA',
          externalReference: user_id,
          postalService: false,
        }),
      }
    )

    if (!paymentResponse.ok) {
      const errorText = await paymentResponse.text()
      console.error('❌ [UPGRADE] Erro ao criar cobrança:', errorText)
      return NextResponse.json(
        { error: 'Erro ao criar cobrança no Asaas' },
        { status: 500 }
      )
    }

    const paymentData = await paymentResponse.json()
    console.log('📦 [UPGRADE] Cobrança criada:', paymentData)

    if (!paymentData.invoiceUrl) {
      console.error('❌ [UPGRADE] invoiceUrl não retornado:', paymentData)
      return NextResponse.json(
        { error: 'Link de pagamento não gerado' },
        { status: 500 }
      )
    }

    console.log('✅ [UPGRADE] Link gerado:', paymentData.invoiceUrl)

    // Atualizar perfil no Supabase
    console.log('💾 [UPGRADE] Atualizando perfil...')
    const { error: updateError } = await supabaseAdmin
      .from('profiles')
      .update({
        asaas_customer_id: customerId,
        updated_at: new Date().toISOString(),
      })
      .eq('id', user_id)

    if (updateError) {
      console.error('❌ [UPGRADE] Erro ao atualizar perfil:', updateError)
      // Não retornar erro aqui, pois o pagamento já foi criado
    } else {
      console.log('✅ [UPGRADE] Perfil atualizado')
    }

    // Retornar sucesso
    console.log('🎉 [UPGRADE] Processo concluído com sucesso')
    return NextResponse.json({
      success: true,
      payment_link: paymentData.invoiceUrl,
      payment_id: paymentData.id,
      customer_id: customerId,
      message: 'Cobrança criada com sucesso',
    })

  } catch (error) {
    console.error('💥 [UPGRADE] Erro fatal:', error)
    return NextResponse.json(
      { 
        error: 'Erro interno do servidor', 
        details: error instanceof Error ? error.message : 'Erro desconhecido' 
      },
      { status: 500 }
    )
  }
}
