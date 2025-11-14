import { NextRequest, NextResponse } from 'next/server'

interface QuestaoParseada {
  pergunta: string
  alternativas: {
    a: string
    b: string
    c: string
    d: string
    e: string
  }
  resposta_correta: string
}

// Função para parsear HTML e extrair questões
function parseQuestionsFromHTML(htmlContent: string): QuestaoParseada[] {
  const questoes: QuestaoParseada[] = []
  
  try {
    console.log('🔍 Iniciando parse do HTML...')
    console.log('📄 Conteúdo recebido (primeiros 500 chars):', htmlContent.substring(0, 500))
    
    // Criar um parser DOM temporário usando JSDOM ou regex
    // Como estamos no servidor, vamos usar regex para parse
    
    // Dividir por questões usando múltiplos padrões
    const questoesRegex = /<div[^>]*class=["']questao["'][^>]*>(.*?)<\/div>/gs
    let questoesMatches = Array.from(htmlContent.matchAll(questoesRegex))
    
    console.log('📦 Questões encontradas com .questao:', questoesMatches.length)
    
    // Se não encontrou com .questao, tentar outros padrões
    if (questoesMatches.length === 0) {
      // Tentar dividir por números seguidos de )
      const blocos = htmlContent.split(/(?=\d+\))/g).filter(b => b.trim().length > 50)
      questoesMatches = blocos.map(b => ({ 0: b, 1: b, index: 0, input: htmlContent, groups: undefined }))
      console.log('📦 Blocos encontrados por número:', questoesMatches.length)
    }
    
    questoesMatches.forEach((match, index) => {
      console.log(`\n🔎 Analisando elemento ${index + 1}...`)
      const htmlText = match[1] || match[0]
      console.log('📝 HTML do elemento:', htmlText.substring(0, 200))
      
      // ESTRATÉGIA 1: Buscar pergunta com múltiplos padrões
      let pergunta = ''
      
      // Padrão 1: <strong>1)</strong> Texto da pergunta
      let perguntaMatch = htmlText.match(/<(?:strong|b)>\s*\d+\)\s*<\/(?:strong|b)>\s*(.+?)(?=<ul|<li|<p>|<em>|A\)|Resposta:)/s)
      if (perguntaMatch) {
        pergunta = perguntaMatch[1].replace(/<[^>]*>/g, '').trim()
        console.log('✅ Pergunta encontrada (padrão 1):', pergunta.substring(0, 50))
      }
      
      // Padrão 2: <p>1) Texto da pergunta</p>
      if (!pergunta) {
        perguntaMatch = htmlText.match(/<p[^>]*>\s*\d+\)\s*(.+?)<\/p>/s)
        if (perguntaMatch) {
          pergunta = perguntaMatch[1].replace(/<[^>]*>/g, '').trim()
          console.log('✅ Pergunta encontrada (padrão 2):', pergunta.substring(0, 50))
        }
      }
      
      // Padrão 3: Texto direto começando com número
      if (!pergunta) {
        perguntaMatch = htmlText.match(/^\s*\d+\)\s*(.+?)(?=\n|<|A\)|B\)|Resposta:)/s)
        if (perguntaMatch) {
          pergunta = perguntaMatch[1].replace(/<[^>]*>/g, '').trim()
          console.log('✅ Pergunta encontrada (padrão 3):', pergunta.substring(0, 50))
        }
      }
      
      if (!pergunta) {
        console.log('❌ Pergunta não encontrada, pulando elemento')
        return
      }
      
      // ESTRATÉGIA 2: Extrair alternativas com múltiplos padrões
      const alternativas: { [key: string]: string } = {}
      
      // Padrão 1: <li>A) Texto</li>
      let alternativasRegex = /<li[^>]*>\s*([A-E])\)\s*(.+?)<\/li>/gs
      let altMatch
      while ((altMatch = alternativasRegex.exec(htmlText)) !== null) {
        const letra = altMatch[1].toLowerCase()
        const texto = altMatch[2].replace(/<[^>]*>/g, '').trim()
        alternativas[letra] = texto
        console.log(`✅ Alternativa ${letra.toUpperCase()} encontrada (padrão 1)`)
      }
      
      // Padrão 2: <p>A) Texto</p>
      if (Object.keys(alternativas).length < 5) {
        alternativasRegex = /<p[^>]*>\s*([A-E])\)\s*(.+?)<\/p>/gs
        while ((altMatch = alternativasRegex.exec(htmlText)) !== null) {
          const letra = altMatch[1].toLowerCase()
          if (!alternativas[letra]) {
            const texto = altMatch[2].replace(/<[^>]*>/g, '').trim()
            alternativas[letra] = texto
            console.log(`✅ Alternativa ${letra.toUpperCase()} encontrada (padrão 2)`)
          }
        }
      }
      
      // Padrão 3: Texto direto A) ... B) ... C) ...
      if (Object.keys(alternativas).length < 5) {
        const textoLimpo = htmlText.replace(/<[^>]*>/g, ' ')
        const altRegex = /([A-E])\)\s*([^A-E]+?)(?=[A-E]\)|Resposta:|Gabarito:|$)/gs
        while ((altMatch = altRegex.exec(textoLimpo)) !== null) {
          const letra = altMatch[1].toLowerCase()
          if (!alternativas[letra]) {
            const texto = altMatch[2].trim()
            if (texto.length > 5) { // Evitar capturas vazias
              alternativas[letra] = texto
              console.log(`✅ Alternativa ${letra.toUpperCase()} encontrada (padrão 3)`)
            }
          }
        }
      }
      
      console.log('📊 Total de alternativas encontradas:', Object.keys(alternativas).length)
      
      // Verificar se temos todas as 5 alternativas
      if (Object.keys(alternativas).length !== 5) {
        console.log('❌ Não foram encontradas 5 alternativas, pulando elemento')
        return
      }
      
      // ESTRATÉGIA 3: Extrair resposta correta
      let respostaCorreta = ''
      
      // Padrão 1: <em>Resposta: A</em>
      let respostaMatch = htmlText.match(/<(?:p|em)[^>]*>\s*(?:<em>)?\s*(?:Resposta|Gabarito):\s*([A-E])\s*(?:<\/em>)?/i)
      if (respostaMatch) {
        respostaCorreta = respostaMatch[1].toLowerCase()
        console.log('✅ Resposta encontrada (padrão 1):', respostaCorreta.toUpperCase())
      }
      
      // Padrão 2: Resposta: A (texto direto)
      if (!respostaCorreta) {
        respostaMatch = htmlText.match(/(?:Resposta|Gabarito):\s*([A-E])/i)
        if (respostaMatch) {
          respostaCorreta = respostaMatch[1].toLowerCase()
          console.log('✅ Resposta encontrada (padrão 2):', respostaCorreta.toUpperCase())
        }
      }
      
      if (!respostaCorreta) {
        console.log('❌ Resposta não encontrada, pulando elemento')
        return
      }
      
      // Adicionar questão parseada
      const questaoParseada: QuestaoParseada = {
        pergunta,
        alternativas: {
          a: alternativas.a || '',
          b: alternativas.b || '',
          c: alternativas.c || '',
          d: alternativas.d || '',
          e: alternativas.e || ''
        },
        resposta_correta: respostaCorreta
      }
      
      console.log('✅ Questão parseada com sucesso!')
      questoes.push(questaoParseada)
    })
    
    console.log(`\n🎉 Total de questões parseadas: ${questoes.length}`)
    
  } catch (error) {
    console.error('❌ Erro ao parsear HTML:', error)
  }
  
  return questoes
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { html_content, materia_id } = body

    if (!html_content || !materia_id) {
      return NextResponse.json(
        { error: 'HTML content e materia_id são obrigatórios' },
        { status: 400 }
      )
    }

    console.log('📥 Recebendo HTML para análise...')
    console.log('📄 Tamanho do conteúdo:', html_content.length)
    console.log('🎯 Matéria ID:', materia_id)

    // Parsear questões do HTML
    const questoes = parseQuestionsFromHTML(html_content)

    console.log(`✅ ${questoes.length} questões parseadas com sucesso`)

    return NextResponse.json({
      success: true,
      questoes,
      total: questoes.length
    })

  } catch (error) {
    console.error('❌ Erro ao analisar HTML:', error)
    return NextResponse.json(
      { error: 'Erro ao analisar HTML: ' + (error instanceof Error ? error.message : 'Erro desconhecido') },
      { status: 500 }
    )
  }
}
