import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''

// Criar cliente Supabase apenas se as variáveis estiverem configuradas
let supabaseAdmin: ReturnType<typeof createClient> | null = null

if (supabaseUrl && supabaseServiceKey) {
  supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)
}

export async function POST(request: NextRequest) {
  try {
    // Verificar se o Supabase está configurado
    if (!supabaseAdmin) {
      console.error('Supabase não configurado - variáveis de ambiente ausentes')
      return NextResponse.json({ received: true })
    }

    const body = await request.json()
    
    console.log('Webhook Asaas recebido:', body)

    // Verificar o evento do webhook
    const { event, payment } = body

    if (!event || !payment) {
      return NextResponse.json(
        { error: 'Dados do webhook inválidos' },
        { status: 400 }
      )
    }

    // Processar apenas pagamentos confirmados
    if (event === 'PAYMENT_CONFIRMED' || event === 'PAYMENT_RECEIVED') {
      const userId = payment.externalReference // user_id salvo na criação da cobrança

      if (!userId) {
        console.error('externalReference (user_id) não encontrado no webhook')
        return NextResponse.json(
          { error: 'Referência do usuário não encontrada' },
          { status: 400 }
        )
      }

      // Calcular data de expiração (1 ano a partir de agora)
      const expiresAt = new Date()
      expiresAt.setFullYear(expiresAt.getFullYear() + 1)

      // Atualizar perfil do usuário para Premium
      const { error: updateError } = await supabaseAdmin
        .from('profiles')
        .update({
          plan: 'premium',
          plan_expires_at: expiresAt.toISOString(),
          payment_status: 'confirmed',
          updated_at: new Date().toISOString(),
        })
        .eq('id', userId)

      if (updateError) {
        console.error('Erro ao atualizar perfil para Premium:', updateError)
        return NextResponse.json(
          { error: 'Erro ao atualizar perfil do usuário' },
          { status: 500 }
        )
      }

      console.log(`✅ Usuário ${userId} atualizado para Premium até ${expiresAt.toISOString()}`)

      return NextResponse.json({
        success: true,
        message: 'Usuário atualizado para Premium com sucesso',
      })
    }

    // Processar outros eventos (opcional)
    if (event === 'PAYMENT_OVERDUE') {
      const userId = payment.externalReference

      if (userId) {
        await supabaseAdmin
          .from('profiles')
          .update({
            payment_status: 'overdue',
            updated_at: new Date().toISOString(),
          })
          .eq('id', userId)
      }
    }

    if (event === 'PAYMENT_DELETED' || event === 'PAYMENT_REFUNDED') {
      const userId = payment.externalReference

      if (userId) {
        await supabaseAdmin
          .from('profiles')
          .update({
            payment_status: 'cancelled',
            updated_at: new Date().toISOString(),
          })
          .eq('id', userId)
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Webhook processado',
    })

  } catch (error) {
    console.error('Erro no webhook Asaas:', error)
    return NextResponse.json(
      { error: 'Erro ao processar webhook', details: error instanceof Error ? error.message : 'Erro desconhecido' },
      { status: 500 }
    )
  }
}
