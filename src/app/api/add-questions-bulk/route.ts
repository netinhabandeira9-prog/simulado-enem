import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { questoes, materia_id, nivel } = body

    if (!questoes || !Array.isArray(questoes) || questoes.length === 0) {
      return NextResponse.json(
        { error: 'Array de questões é obrigatório' },
        { status: 400 }
      )
    }

    if (!materia_id) {
      return NextResponse.json(
        { error: 'ID da matéria é obrigatório' },
        { status: 400 }
      )
    }

    // Preparar questões para inserção na tabela simulados
    // Cada questão será salva como um registro individual
    const questoesParaInserir = questoes.map((questao: any, index: number) => {
      // Garantir que alternativas seja um array JSON válido
      let alternativasArray = []
      
      // Se alternativas é um objeto com a, b, c, d, e
      if (questao.alternativas && typeof questao.alternativas === 'object') {
        if (questao.alternativas.a) {
          // Formato objeto {a: "...", b: "...", c: "...", d: "...", e: "..."}
          alternativasArray = [
            `A) ${questao.alternativas.a}`,
            `B) ${questao.alternativas.b}`,
            `C) ${questao.alternativas.c}`,
            `D) ${questao.alternativas.d}`,
            `E) ${questao.alternativas.e}`
          ]
        } else if (Array.isArray(questao.alternativas)) {
          // Já é um array
          alternativasArray = questao.alternativas
        }
      } else if (typeof questao.alternativas === 'string') {
        try {
          alternativasArray = JSON.parse(questao.alternativas)
        } catch {
          alternativasArray = []
        }
      }

      // Se ainda não temos alternativas válidas, criar array vazio
      if (!Array.isArray(alternativasArray) || alternativasArray.length === 0) {
        alternativasArray = ['A) ', 'B) ', 'C) ', 'D) ', 'E) ']
      }

      return {
        titulo: `Questão ${index + 1}`,
        descricao: `Questão importada em lote - ${new Date().toLocaleDateString()}`,
        tipo: 'teste', // ✅ CORRIGIDO: usar valor válido do constraint
        materia_id,
        pergunta: questao.pergunta || '',
        alternativas: alternativasArray,
        correta: questao.resposta_correta || questao.correta || '',
        dificuldade: nivel || questao.dificuldade || 'Médio',
        total_questoes: 1,
        tempo_limite: 5,
        ativo: true
      }
    })

    console.log('Inserindo questões:', questoesParaInserir.length)
    console.log('Primeira questão:', JSON.stringify(questoesParaInserir[0], null, 2))

    const { data, error } = await supabase
      .from('simulados')
      .insert(questoesParaInserir)
      .select()

    if (error) {
      console.error('Erro ao inserir questões:', error)
      return NextResponse.json(
        { error: `Erro ao inserir questões no banco de dados: ${error.message}` },
        { status: 500 }
      )
    }

    return NextResponse.json({
      sucesso: true,
      total: questoesParaInserir.length,
      questoes: data,
      message: `${questoesParaInserir.length} questões importadas com sucesso na tabela simulados!`
    })

  } catch (error) {
    console.error('Erro na API:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}