'use client'

import Link from 'next/link'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Brain, Instagram, Check, BookOpen, Trophy, Users, Sparkles } from 'lucide-react'

export default function VendasPage() {
  const [questaoAtual, setQuestaoAtual] = useState(0)
  const [respostaSelecionada, setRespostaSelecionada] = useState<string | null>(null)
  const [mostrarResposta, setMostrarResposta] = useState(false)

  // 2 questões gratuitas de exemplo
  const questoesGratuitas = [
    {
      pergunta: "Qual é a fórmula da velocidade média?",
      alternativas: {
        a: "v = d/t",
        b: "v = t/d",
        c: "v = d × t",
        d: "v = d + t",
        e: "v = d - t"
      },
      correta: "a"
    },
    {
      pergunta: "Quem escreveu 'Dom Casmurro'?",
      alternativas: {
        a: "José de Alencar",
        b: "Machado de Assis",
        c: "Clarice Lispector",
        d: "Carlos Drummond de Andrade",
        e: "Cecília Meireles"
      },
      correta: "b"
    }
  ]

  const questaoAtualData = questoesGratuitas[questaoAtual]

  const handleResposta = (alternativa: string) => {
    setRespostaSelecionada(alternativa)
    setMostrarResposta(true)
  }

  const proximaQuestao = () => {
    if (questaoAtual < questoesGratuitas.length - 1) {
      setQuestaoAtual(questaoAtual + 1)
      setRespostaSelecionada(null)
      setMostrarResposta(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#6B46C1] via-purple-600 to-[#ECC94B]">
      {/* Header - Igual à página inicial */}
      <header className="container mx-auto px-4 py-6">
        <nav className="flex justify-between items-center">
          <div className="flex items-center space-x-2">
            <Brain className="h-8 w-8 text-white" />
            <span className="text-2xl font-bold text-white">Simulado ENEM</span>
          </div>
          <div className="flex items-center space-x-4">
            <a 
              href="https://www.instagram.com/simulation_enem?utm_source=ig_web_button_share_sheet&igsh=ZDNlZDc0MzIxNw==" 
              target="_blank" 
              rel="noopener noreferrer"
              className="flex items-center justify-center h-10 w-10 rounded-full bg-white/10 border border-white/20 text-white hover:bg-white/20 transition-all duration-300 hover:scale-110"
              aria-label="Siga-nos no Instagram"
            >
              <Instagram className="h-5 w-5" />
            </a>
            <Button asChild variant="outline" className="bg-white/10 border-white/20 text-white hover:bg-white/20">
              <Link href="/login">Entrar</Link>
            </Button>
            <Button asChild className="bg-white text-[#6B46C1] hover:bg-white/90">
              <Link href="/cadastro">Criar conta</Link>
            </Button>
          </div>
        </nav>
      </header>

      {/* Hero Section */}
      <main className="container mx-auto px-4 py-12">
        <div className="text-center mb-16">
          <h1 className="text-5xl md:text-7xl font-bold text-white mb-6">
            Simulado ENEM
          </h1>
          <p className="text-xl md:text-2xl text-white/90 mb-8 max-w-3xl mx-auto">
            Treine com inteligência — Simulados, trilhas
          </p>
        </div>

        {/* Seção "Como funciona?" */}
        <div className="mb-16">
          <Card className="max-w-4xl mx-auto bg-white/95 backdrop-blur-sm">
            <CardHeader className="text-center">
              <CardTitle className="text-3xl text-[#6B46C1] mb-4">Como funciona?</CardTitle>
              <CardDescription className="text-lg">
                Experimente gratuitamente 2 questões e veja como nossa plataforma pode ajudar você a se preparar para o ENEM!
              </CardDescription>
            </CardHeader>
            <CardContent>
              {/* Material de Exemplo */}
              <div className="mb-8 p-6 bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg border-2 border-purple-200">
                <h3 className="text-xl font-bold text-[#6B46C1] mb-4 flex items-center">
                  <BookOpen className="h-6 w-6 mr-2" />
                  Material de Estudo - Exemplo
                </h3>
                <div className="prose prose-sm max-w-none">
                  <h4 className="text-lg font-semibold text-gray-800 mb-2">Velocidade Média</h4>
                  <p className="text-gray-700 leading-relaxed">
                    A velocidade média é uma grandeza física que relaciona a distância percorrida por um objeto 
                    e o tempo gasto para percorrê-la. É calculada pela fórmula:
                  </p>
                  <div className="bg-white p-4 rounded-lg my-4 text-center">
                    <p className="text-xl font-mono text-[#6B46C1]">v = d / t</p>
                  </div>
                  <p className="text-gray-700">
                    Onde <strong>v</strong> é a velocidade média, <strong>d</strong> é a distância percorrida 
                    e <strong>t</strong> é o tempo gasto.
                  </p>
                </div>
              </div>

              {/* Questões Gratuitas */}
              <div className="mb-8">
                <h3 className="text-2xl font-bold text-[#6B46C1] mb-6 text-center">
                  Questão {questaoAtual + 1} de {questoesGratuitas.length} (Gratuita)
                </h3>
                
                <div className="bg-white p-6 rounded-lg border-2 border-purple-200">
                  <p className="text-lg font-medium text-gray-800 mb-6">
                    {questaoAtualData.pergunta}
                  </p>
                  
                  <div className="space-y-3">
                    {Object.entries(questaoAtualData.alternativas).map(([letra, texto]) => {
                      const isCorreta = letra === questaoAtualData.correta
                      const isSelecionada = letra === respostaSelecionada
                      
                      let bgColor = 'bg-gray-50 hover:bg-gray-100'
                      if (mostrarResposta) {
                        if (isCorreta) {
                          bgColor = 'bg-green-100 border-green-500'
                        } else if (isSelecionada && !isCorreta) {
                          bgColor = 'bg-red-100 border-red-500'
                        }
                      } else if (isSelecionada) {
                        bgColor = 'bg-purple-100 border-purple-500'
                      }
                      
                      return (
                        <button
                          key={letra}
                          onClick={() => !mostrarResposta && handleResposta(letra)}
                          disabled={mostrarResposta}
                          className={`w-full text-left p-4 rounded-lg border-2 transition-all ${bgColor} ${
                            !mostrarResposta ? 'cursor-pointer' : 'cursor-default'
                          }`}
                        >
                          <span className="font-bold text-[#6B46C1] mr-2">{letra.toUpperCase()})</span>
                          {texto}
                          {mostrarResposta && isCorreta && (
                            <Check className="inline-block ml-2 h-5 w-5 text-green-600" />
                          )}
                        </button>
                      )
                    })}
                  </div>
                  
                  {mostrarResposta && (
                    <div className="mt-6">
                      {respostaSelecionada === questaoAtualData.correta ? (
                        <div className="p-4 bg-green-50 border-2 border-green-500 rounded-lg">
                          <p className="text-green-800 font-semibold">✅ Parabéns! Resposta correta!</p>
                        </div>
                      ) : (
                        <div className="p-4 bg-red-50 border-2 border-red-500 rounded-lg">
                          <p className="text-red-800 font-semibold">❌ Resposta incorreta. A resposta correta é a alternativa {questaoAtualData.correta.toUpperCase()}.</p>
                        </div>
                      )}
                      
                      {questaoAtual < questoesGratuitas.length - 1 && (
                        <Button 
                          onClick={proximaQuestao}
                          className="w-full mt-4 bg-[#6B46C1] hover:bg-[#6B46C1]/90"
                        >
                          Próxima Questão
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Botão de Pagamento Chamativo */}
              <div className="text-center py-8">
                <div className="mb-6">
                  <p className="text-2xl font-bold text-[#6B46C1] mb-2">
                    Gostou? Tenha acesso completo!
                  </p>
                  <p className="text-gray-600">
                    Mais de 90 questões por matéria + Materiais de estudo completos
                  </p>
                </div>
                
                <Button 
                  asChild
                  size="lg"
                  className="bg-gradient-to-r from-[#ECC94B] to-yellow-500 hover:from-[#ECC94B]/90 hover:to-yellow-500/90 text-[#6B46C1] font-bold text-xl px-12 py-6 rounded-full shadow-2xl transform hover:scale-105 transition-all duration-300 animate-pulse"
                >
                  <Link href="/pagamento">
                    <Sparkles className="h-6 w-6 mr-2" />
                    Tenha Acesso Completo por R$19,90
                    <Sparkles className="h-6 w-6 ml-2" />
                  </Link>
                </Button>
                
                <p className="text-sm text-gray-500 mt-4">
                  Pagamento único • Acesso vitalício • Sem mensalidades
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Benefícios */}
        <div className="mb-16">
          <h2 className="text-4xl font-bold text-white text-center mb-12">
            Por que escolher o Simulado ENEM IA?
          </h2>
          
          <div className="grid md:grid-cols-3 gap-8">
            <Card className="bg-white/10 backdrop-blur-sm border-white/20">
              <CardHeader>
                <BookOpen className="h-12 w-12 text-[#ECC94B] mb-4" />
                <CardTitle className="text-white">Simulados Completos</CardTitle>
                <CardDescription className="text-white/80">
                  Mais de 90 questões por matéria, organizadas por disciplina. 
                  Conteúdo atualizado e alinhado com o ENEM.
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="bg-white/10 backdrop-blur-sm border-white/20">
              <CardHeader>
                <Brain className="h-12 w-12 text-[#ECC94B] mb-4" />
                <CardTitle className="text-white">Se prepare e arrase</CardTitle>
                <CardDescription className="text-white/80">
                  Estude de forma inteligente e eficiente.
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="bg-white/10 backdrop-blur-sm border-white/20">
              <CardHeader>
                <Trophy className="h-12 w-12 text-[#ECC94B] mb-4" />
                <CardTitle className="text-white">Resultados Reais</CardTitle>
                <CardDescription className="text-white/80">
                  Acompanhe seu progresso e melhore suas notas. 
                  Relatórios detalhados de desempenho.
                </CardDescription>
              </CardHeader>
            </Card>
          </div>
        </div>

        {/* O que você terá acesso */}
        <div className="mb-16">
          <Card className="max-w-4xl mx-auto bg-white/95 backdrop-blur-sm">
            <CardHeader className="text-center">
              <CardTitle className="text-3xl text-[#6B46C1] mb-4">
                O que está incluído no acesso completo?
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 gap-6">
                <div className="flex items-start space-x-3">
                  <Check className="h-6 w-6 text-green-600 flex-shrink-0 mt-1" />
                  <div>
                    <h4 className="font-semibold text-[#6B46C1]">90+ Questões por Matéria</h4>
                    <p className="text-gray-600 text-sm">Banco completo de questões para todas as disciplinas do ENEM</p>
                  </div>
                </div>
                
                <div className="flex items-start space-x-3">
                  <Check className="h-6 w-6 text-green-600 flex-shrink-0 mt-1" />
                  <div>
                    <h4 className="font-semibold text-[#6B46C1]">Materiais de Estudo</h4>
                    <p className="text-gray-600 text-sm">Conteúdos teóricos completos para revisar antes das questões</p>
                  </div>
                </div>
                
                <div className="flex items-start space-x-3">
                  <Check className="h-6 w-6 text-green-600 flex-shrink-0 mt-1" />
                  <div>
                    <h4 className="font-semibold text-[#6B46C1]">Relatórios de Desempenho</h4>
                    <p className="text-gray-600 text-sm">Acompanhe sua evolução e identifique pontos de melhoria</p>
                  </div>
                </div>
                
                <div className="flex items-start space-x-3">
                  <Check className="h-6 w-6 text-green-600 flex-shrink-0 mt-1" />
                  <div>
                    <h4 className="font-semibold text-[#6B46C1]">Acesso Vitalício</h4>
                    <p className="text-gray-600 text-sm">Pague uma vez e tenha acesso para sempre</p>
                  </div>
                </div>
                
                <div className="flex items-start space-x-3">
                  <Check className="h-6 w-6 text-green-600 flex-shrink-0 mt-1" />
                  <div>
                    <h4 className="font-semibold text-[#6B46C1]">Atualizações Gratuitas</h4>
                    <p className="text-gray-600 text-sm">Novos conteúdos e questões adicionados regularmente</p>
                  </div>
                </div>
              </div>
              
              <div className="mt-8 text-center">
                <Button 
                  asChild
                  size="lg"
                  className="bg-[#6B46C1] hover:bg-[#6B46C1]/90 text-white font-bold text-lg px-10 py-6"
                >
                  <Link href="/pagamento">
                    Garantir Meu Acesso Agora
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* CTA Final */}
        <div className="text-center">
          <div className="space-y-4">
            <Button asChild size="lg" className="bg-[#ECC94B] text-[#6B46C1] hover:bg-[#ECC94B]/90 text-lg px-8 py-3">
              <Link href="/pagamento">Começar Agora por R$19,90</Link>
            </Button>
            <div>
              <Button asChild variant="outline" size="lg" className="bg-white/10 border-white/20 text-white hover:bg-white/20 text-lg px-8 py-3">
                <Link href="/login">Já tenho conta</Link>
              </Button>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="container mx-auto px-4 py-8 mt-16 border-t border-white/20">
        <div className="text-center text-white/70">
          <p>&copy; 2025 Simulado ENEM. Todos os direitos reservados.</p>
        </div>
      </footer>
    </div>
  )
}
