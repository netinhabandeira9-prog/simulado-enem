import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    // Validar variável de ambiente
    const apiKey = process.env.ASAAS_API_KEY;
    if (!apiKey) {
      console.error('[Asaas Checkout] ASAAS_API_KEY não configurada');
      return NextResponse.json(
        { error: 'Configuração de pagamento inválida' },
        { status: 400 }
      );
    }

    // Extrair dados do body
    const body = await request.json();
    const { nome, email, valor } = body;

    // Validar dados obrigatórios
    if (!nome || !email || !valor) {
      console.error('[Asaas Checkout] Dados incompletos:', { nome, email, valor });
      return NextResponse.json(
        { error: 'Dados incompletos. Nome, e-mail e valor são obrigatórios.' },
        { status: 400 }
      );
    }

    // Validar formato do valor
    const valorNumerico = parseFloat(valor);
    if (isNaN(valorNumerico) || valorNumerico <= 0) {
      console.error('[Asaas Checkout] Valor inválido:', valor);
      return NextResponse.json(
        { error: 'Valor inválido' },
        { status: 400 }
      );
    }

    // Criar payload para o Asaas
    const paymentLinkPayload = {
      name: `Pagamento - ${nome}`,
      description: `Pagamento de ${nome}`,
      chargeType: 'DETACHED',
      billingType: 'UNDEFINED', // Permite PIX, Cartão e Boleto
      value: valorNumerico,
      dueDateDays: 7,
      maxInstallmentCount: 1,
      notificationEnabled: true,
      callback: {
        successUrl: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/pagamento/sucesso`,
      },
    };

    console.log('[Asaas Checkout] Criando link de pagamento para:', email);

    // Fazer requisição para a API do Asaas
    const response = await fetch('https://api.asaas.com/v3/paymentLinks', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'access_token': apiKey,
      },
      body: JSON.stringify(paymentLinkPayload),
    });

    const data = await response.json();

    // Verificar se houve erro na API do Asaas
    if (!response.ok) {
      console.error('[Asaas Checkout] Erro na API do Asaas:', {
        status: response.status,
        data,
      });
      return NextResponse.json(
        { error: 'Erro ao gerar link de pagamento' },
        { status: 400 }
      );
    }

    // Verificar se o link foi gerado
    if (!data.url) {
      console.error('[Asaas Checkout] Link não retornado pela API:', data);
      return NextResponse.json(
        { error: 'Link de pagamento não foi gerado' },
        { status: 400 }
      );
    }

    console.log('[Asaas Checkout] Link gerado com sucesso:', data.id);

    // Retornar o link de pagamento
    return NextResponse.json({
      success: true,
      paymentLink: data.url,
      paymentId: data.id,
    });

  } catch (error) {
    console.error('[Asaas Checkout] Erro inesperado:', error);
    return NextResponse.json(
      { error: 'Erro ao processar pagamento' },
      { status: 400 }
    );
  }
}
