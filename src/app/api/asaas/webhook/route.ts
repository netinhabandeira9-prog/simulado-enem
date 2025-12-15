import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function POST(request: NextRequest) {
  try {
    // 1. Receber o payload do webhook
    const payload = await request.json()
    
    console.log('📥 [WEBHOOK] Payload recebido:', JSON.stringify(payload, null, 2))

    // Inicializar cliente Supabase
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('❌ [WEBHOOK] Variáveis de ambiente do Supabase não configuradas')
      console.error('NEXT_PUBLIC_SUPABASE_URL:', supabaseUrl ? '✅ Definida' : '❌ Não definida')
      console.error('SUPABASE_SERVICE_ROLE_KEY:', supabaseServiceKey ? '✅ Definida' : '❌ Não definida')
      return NextResponse.json(
        { success: true, message: 'Configuração incompleta' },
        { status: 200 }
      )
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })

    // 2. Verificar tipo de evento
    const eventType = payload.event
    console.log('📌 [WEBHOOK] Tipo de evento:', eventType)

    // 3. Processar apenas eventos de pagamento confirmado
    if (eventType === 'PAYMENT_CONFIRMED' || eventType === 'PAYMENT_RECEIVED') {
      const paymentData = payload.payment || payload
      
      console.log('💰 [WEBHOOK] Dados do pagamento:', {
        id: paymentData.id,
        status: paymentData.status,
        value: paymentData.value,
        customer: paymentData.customer,
        externalReference: paymentData.externalReference
      })

      // 4. Extrair dados do usuário do externalReference
      let userData: any = null
      
      try {
        if (paymentData.externalReference) {
          userData = JSON.parse(paymentData.externalReference)
          console.log('👤 [WEBHOOK] Dados do usuário extraídos:', {
            email: userData.email,
            full_name: userData.full_name
          })
        }
      } catch (e) {
        console.log('⚠️ [WEBHOOK] Não foi possível parsear externalReference:', e)
      }

      // Obter email e nome
      const customerEmail = userData?.email || paymentData.customer?.email
      const customerName = userData?.full_name || paymentData.customer?.name
      const customerPassword = userData?.password || `Temp${Math.random().toString(36).slice(-8)}!1`
      
      if (!customerEmail) {
        console.error('❌ [WEBHOOK] E-mail do cliente não encontrado no payload')
        return NextResponse.json(
          { success: true, message: 'E-mail não encontrado' },
          { status: 200 }
        )
      }

      console.log('✅ [WEBHOOK] Processando pagamento confirmado para:', customerEmail)

      // 5. Verificar se usuário já existe no Auth
      try {
        console.log('🔍 [WEBHOOK] Verificando se usuário já existe...')
        
        const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers()
        const existingUser = existingUsers?.users?.find(u => u.email === customerEmail)
        
        if (existingUser) {
          console.log('👤 [WEBHOOK] Usuário já existe no Auth:', existingUser.id)
          
          // Atualizar perfil para premium
          console.log('📝 [WEBHOOK] Atualizando perfil para premium...')
          const { error: updateError } = await supabaseAdmin
            .from('profiles')
            .update({
              plan: 'premium',
              upgrade_status: true,
              updated_at: new Date().toISOString()
            })
            .eq('id', existingUser.id)

          if (updateError) {
            console.error('❌ [WEBHOOK] Erro ao atualizar perfil:', updateError)
            throw updateError
          }

          console.log('✅ [WEBHOOK] Perfil atualizado para premium com sucesso!')
          
          return NextResponse.json(
            { 
              success: true, 
              message: 'Perfil atualizado para premium',
              email: customerEmail,
              userId: existingUser.id
            },
            { status: 200 }
          )
        }

        // 6. Criar novo usuário no Auth
        console.log('🔐 [WEBHOOK] Criando novo usuário no Supabase Auth...')
        console.log('📧 [WEBHOOK] Email:', customerEmail)
        console.log('👤 [WEBHOOK] Nome:', customerName)
        
        const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
          email: customerEmail,
          password: customerPassword,
          email_confirm: true, // Confirmar e-mail automaticamente
          user_metadata: {
            full_name: customerName || 'Aluno Premium'
          }
        })

        if (authError) {
          console.error('❌ [WEBHOOK] Erro ao criar usuário no Auth:', authError)
          throw authError
        }

        console.log('✅ [WEBHOOK] Usuário criado no Auth com sucesso:', authData.user.id)

        // 7. Criar perfil na tabela profiles
        console.log('📝 [WEBHOOK] Criando perfil na tabela profiles...')
        
        const profileData = {
          id: authData.user.id,
          email: customerEmail,
          full_name: customerName || 'Aluno Premium',
          role: 'aluno',
          plan: 'premium',
          upgrade_status: true,
          asaas_customer_id: paymentData.customer?.id || null
        }
        
        console.log('📋 [WEBHOOK] Dados do perfil a serem inseridos:', profileData)
        
        const { error: profileError } = await supabaseAdmin
          .from('profiles')
          .insert(profileData)

        if (profileError) {
          console.error('❌ [WEBHOOK] Erro ao criar perfil:', profileError)
          
          // Se erro de duplicação, tentar atualizar
          if (profileError.message.includes('duplicate key')) {
            console.log('⚠️ [WEBHOOK] Perfil já existe, tentando atualizar...')
            
            const { error: updateError } = await supabaseAdmin
              .from('profiles')
              .update({
                plan: 'premium',
                upgrade_status: true,
                updated_at: new Date().toISOString()
              })
              .eq('id', authData.user.id)
            
            if (updateError) {
              console.error('❌ [WEBHOOK] Erro ao atualizar perfil existente:', updateError)
              throw updateError
            }
            
            console.log('✅ [WEBHOOK] Perfil existente atualizado com sucesso!')
          } else {
            throw profileError
          }
        } else {
          console.log('✅ [WEBHOOK] Perfil premium criado com sucesso!')
        }

        // 8. Enviar e-mail de boas-vindas (Supabase envia automaticamente)
        console.log('📧 [WEBHOOK] E-mail de confirmação será enviado automaticamente pelo Supabase')

        // 9. Retornar sucesso
        console.log('🎉 [WEBHOOK] Processamento concluído com sucesso!')
        
        return NextResponse.json(
          { 
            success: true, 
            message: 'Pagamento processado e conta criada com sucesso',
            email: customerEmail,
            userId: authData.user.id
          },
          { status: 200 }
        )

      } catch (error: any) {
        console.error('❌ [WEBHOOK] Erro ao processar usuário:', error)
        console.error('Stack trace:', error.stack)
        
        return NextResponse.json(
          { 
            success: true, 
            message: 'Erro ao processar usuário mas webhook recebido', 
            error: error.message 
          },
          { status: 200 }
        )
      }
    }

    // 10. Outros eventos - apenas registrar
    console.log('ℹ️ [WEBHOOK] Evento recebido mas não processado:', eventType)
    
    return NextResponse.json(
      { 
        success: true, 
        message: 'Evento recebido',
        event: eventType 
      },
      { status: 200 }
    )

  } catch (error: any) {
    console.error('❌ [WEBHOOK] Erro geral ao processar webhook:', error)
    console.error('Stack trace:', error.stack)
    
    // Sempre retornar 200 para o Asaas não reenviar
    return NextResponse.json(
      { 
        success: true, 
        error: error.message || 'Erro ao processar webhook' 
      },
      { status: 200 }
    )
  }
}
