import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function POST(request: NextRequest) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const asaasApiKey = process.env.ASAAS_API_KEY;

    if (!supabaseUrl || !supabaseServiceKey || !asaasApiKey) {
      console.error("Erro: variáveis de ambiente faltando.");
      return NextResponse.json(
        { error: "Configuração do servidor incompleta" },
        { status: 500 }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { user_id, customerId } = await request.json();

    if (!user_id || !customerId) {
      return NextResponse.json(
        { error: "Parâmetros inválidos" },
        { status: 400 }
      );
    }

    // Criar pagamento no Asaas
    const response = await fetch("https://www.asaas.com/api/v3/payments", {
      method: "POST",
      headers: {
        accept: "application/json",
        "content-type": "application/json",
        access_token: asaasApiKey,
      },
      body: JSON.stringify({
        customer: customerId,
        billingType: "PIX",
        value: 19.9,
        description: "Assinatura Premium – Foco ENEM",
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("Erro ao criar pagamento:", data);
      return NextResponse.json(
        { error: "Falha ao criar pagamento no Asaas", details: data },
        { status: 500 }
      );
    }

    // Atualiza o status pendente no Supabase
    await supabase
      .from("usuarios")
      .update({
        asaas_payment_id: data.id,
        payment_status: "pending",
        updated_at: new Date().toISOString(),
      })
      .eq("id", user_id);

    return NextResponse.json({
      success: true,
      payment_link: data.invoiceUrl,
      payment_id: data.id,
    });
  } catch (error: any) {
    console.error("Erro no /api/upgrade:", error);
    return NextResponse.json(
      { error: "Erro interno do servidor", details: error.message },
      { status: 500 }
    );
  }
}
