'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { 
  Brain, 
  LogOut, 
  BookOpen, 
  Play,
  Crown,
  Trophy,
  Clock,
  Target,
  FileText,
  ArrowLeft,
  CheckCircle,
  Circle,
  XCircle,
  RotateCcw
} from 'lucide-react'
import { getCurrentUser, getUserProfile, signOut } from '@/lib/auth'
import { supabase } from '@/lib/supabase'
import WhatsAppButton from '@/components/WhatsAppButton'

interface UserProfile {
  id: string
  full_name: string
  email: string
  role: string
  plan: 'gratuito' | 'premium'
}

interface Materia {
  id: string
  nome: string
  descricao: string
  cor: string
  ordem: number
}

interface MaterialHTML {
  id: number
  materia_id: number
  titulo: string
  conteudo: string
}

interface Questao {
  id: string
  materia_id: string
  pergunta: string
  alternativas: string[]
  correta: string
  dificuldade: string
  titulo?: string
}

interface Resultado {
  id: number
  materia_id: string
  pontuacao: number
  data: string
}

// Mapeamento de matérias conforme especificado pelo usuário
const MATERIAS_MAPPING = {
  'Matemática': 1,
  'Física': 2,
  'Química': 3,
  'Biologia': 4,
  'História Geral': 5,
  'História do Brasil': 6,
  'História da Arte': 7,
  'Geografia': 8,
  'Filosofia': 9,
  'Sociologia': 10,
  'Gramática': 11,
  'Interpretação de Texto': 12,
  'Literatura': 13,
  'Atualidades': 14,
  'Inglês': 15,
  'Espanhol': 16,
  'Foco (Produtividade, Foco e Disciplina)': 17
}

export default function DashboardPage() {
  const [user, setUser] = useState<UserProfile | null>(null)
  const [materias, setMaterias] = useState<Materia[]>([])
  const [materiaisHTML, setMateriaisHTML] = useState<MaterialHTML[]>([])
  const [questoes, setQuestoes] = useState<Questao[]>([])
  const [resultados, setResultados] = useState<Resultado[]>([])
  const [selectedMateria, setSelectedMateria] = useState<Materia | null>(null)
  const [selectedAnswers, setSelectedAnswers] = useState<{[key: string]: string}>({})
  const [showingQuestions, setShowingQuestions] = useState(false)
  const [showProgressDialog, setShowProgressDialog] = useState(false)
  const [showFinalResults, setShowFinalResults] = useState(false)
  const [progressStats, setProgressStats] = useState({ acertos: 0, erros: 0, total: 0 })
  const [questoesErradas, setQuestoesErradas] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    loadData()
    setupRealtimeListeners()
  }, [])

  // Verificar progresso a cada resposta (para usuários premium)
  useEffect(() => {
    if (user?.plan === 'premium' && showingQuestions && selectedMateria) {
      const questoesMateria = getQuestoesMateria(selectedMateria.id)
      const totalRespondidas = Object.keys(selectedAnswers).length
      
      // A cada 20 questões respondidas, mostrar progresso
      if (totalRespondidas > 0 && totalRespondidas % 20 === 0 && totalRespondidas < questoesMateria.length) {
        calcularProgresso()
        setShowProgressDialog(true)
      }
    }
  }, [selectedAnswers])

  const setupRealtimeListeners = () => {
    // Listener para materiais_html
    const materiaisChannel = supabase
      .channel('materiais_html_changes')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'materiais_html' },
        () => {
          loadMateriaisHTML()
        }
      )
      .subscribe()

    // Listener para simulados (questões)
    const simuladosChannel = supabase
      .channel('simulados_changes')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'simulados' },
        () => {
          loadQuestoes()
        }
      )
      .subscribe()

    // Listener para materias
    const materiasChannel = supabase
      .channel('materias_changes')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'materias' },
        () => {
          loadMaterias()
        }
      )
      .subscribe()

    return () => {
      materiaisChannel.unsubscribe()
      simuladosChannel.unsubscribe()
      materiasChannel.unsubscribe()
    }
  }

  const loadData = async () => {
    try {
      const currentUser = await getCurrentUser()
      if (currentUser) {
        const profile = await getUserProfile(currentUser.id)
        
        // Verificar se é admin tentando acessar dashboard
        if (profile.role === 'admin') {
          router.push('/admin')
          return
        }
        
        setUser(profile)
        
        await Promise.all([
          loadMaterias(),
          loadMateriaisHTML(),
          loadQuestoes(),
          loadResultados(currentUser.id)
        ])
      } else {
        router.push('/login')
      }
    } catch (error) {
      console.error('Erro ao carregar dados:', error)
      router.push('/login')
    } finally {
      setLoading(false)
    }
  }

  const loadMaterias = async () => {
    const { data } = await supabase
      .from('materias')
      .select('*')
      .eq('ativo', true)
      .order('ordem', { ascending: true })
    
    if (data) setMaterias(data)
  }

  const loadMateriaisHTML = async () => {
    console.log('🧠 Carregando materiais HTML...')
    const { data, error } = await supabase
      .from('materiais_html')
      .select('*')
      .order('id', { ascending: false })
    
    if (error) console.error('❌ Erro ao carregar materiais:', error)
    else console.log('📚 Materiais carregados:', data)
    
    if (data) setMateriaisHTML(data)
  }

  const loadQuestoes = async () => {
    try {
      const { data } = await supabase
        .from('simulados')
        .select('id, materia_id, pergunta, alternativas, correta, dificuldade, titulo')
        .not('pergunta', 'is', null)
        .eq('ativo', true)
        .order('created_at', { ascending: false })
      
      if (data) {
        // Transformar os dados para o formato esperado
        const questoesFormatadas = data.map(item => ({
          id: item.id,
          materia_id: item.materia_id,
          pergunta: item.pergunta,
          alternativas: Array.isArray(item.alternativas) ? item.alternativas : [],
          correta: item.correta?.toLowerCase() || '',
          dificuldade: item.dificuldade || 'Médio',
          titulo: item.titulo
        }))
        setQuestoes(questoesFormatadas)
      }
    } catch (error) {
      console.error('Erro ao carregar questões:', error)
    }
  }

  const loadResultados = async (userId: string) => {
    const { data } = await supabase
      .from('resultados')
      .select('*')
      .eq('aluno_id', userId)
      .order('data', { ascending: false })
    
    if (data) setResultados(data)
  }

  const handleSignOut = async () => {
    try {
      await signOut()
      router.push('/')
    } catch (error) {
      console.error('Erro ao sair:', error)
    }
  }

  const handleStartSimulado = (materia: Materia) => {
    setShowingQuestions(true)
    setSelectedAnswers({})
    setShowProgressDialog(false)
    setShowFinalResults(false)
    setQuestoesErradas([])
  }

  const handleAnswerSelect = (questaoId: string, alternativa: string) => {
    setSelectedAnswers(prev => ({
      ...prev,
      [questaoId]: alternativa
    }))
  }

  const calcularProgresso = () => {
    if (!selectedMateria) return

    const questoesMateria = getQuestoesMateria(selectedMateria.id)
    const questoesDisponiveis = user?.plan === 'premium' ? questoesMateria : questoesMateria.slice(0, 2)
    
    let acertos = 0
    let erros = 0
    const erradas: string[] = []

    questoesDisponiveis.forEach(questao => {
      const respostaUsuario = selectedAnswers[questao.id]
      if (respostaUsuario) {
        if (respostaUsuario === questao.correta) {
          acertos++
        } else {
          erros++
          erradas.push(questao.id)
        }
      }
    })

    setProgressStats({ acertos, erros, total: Object.keys(selectedAnswers).length })
    setQuestoesErradas(erradas)
  }

  const handleFinalizarSimulado = async () => {
    calcularProgresso()
    setShowFinalResults(true)

    // Salvar resultado no banco
    if (user && selectedMateria) {
      const questoesMateria = getQuestoesMateria(selectedMateria.id)
      const questoesDisponiveis = user?.plan === 'premium' ? questoesMateria : questoesMateria.slice(0, 2)
      
      let acertos = 0
      questoesDisponiveis.forEach(questao => {
        const respostaUsuario = selectedAnswers[questao.id]
        if (respostaUsuario === questao.correta) {
          acertos++
        }
      })

      const pontuacao = Math.round((acertos / questoesDisponiveis.length) * 100)

      await supabase.from('resultados').insert({
        aluno_id: user.id,
        materia_id: selectedMateria.id,
        pontuacao: pontuacao,
        data: new Date().toISOString()
      })

      // Recarregar resultados
      loadResultados(user.id)
    }
  }

  const handleContinuarSimulado = () => {
    setShowProgressDialog(false)
  }

  const handleRefazerErradas = () => {
    // Manter apenas as respostas das questões erradas e limpar as respostas
    const novasRespostas: {[key: string]: string} = {}
    questoesErradas.forEach(id => {
      // Remove a resposta para permitir refazer
      delete novasRespostas[id]
    })
    setSelectedAnswers(novasRespostas)
    setShowProgressDialog(false)
    
    // Scroll para a primeira questão errada
    if (questoesErradas.length > 0) {
      setTimeout(() => {
        const elemento = document.getElementById(`questao-${questoesErradas[0]}`)
        elemento?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      }, 100)
    }
  }

  const handleUpgrade = async () => {
    if (!user) return

    try {
      console.log('🚀 Iniciando upgrade para usuário:', user.id)
      
      const response = await fetch('/api/upgrade', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_id: user.id,
          email: user.email,
        }),
      })

      console.log('📡 Status da resposta:', response.status, response.statusText)

      // Verificar se a resposta é válida antes de tentar parsear JSON
      if (!response.ok) {
        const errorText = await response.text()
        console.error('❌ Erro na resposta:', errorText)
        alert(`Erro ao processar upgrade: ${response.statusText}`)
        return
      }

      const data = await response.json()
      console.log('📦 Dados recebidos:', data)

      if (data.success && data.payment_link) {
        console.log('✅ Redirecionando para:', data.payment_link)
        // Redirecionar para página de pagamento do Asaas
        window.location.href = data.payment_link
      } else {
        const errorMessage = data.error || 'Erro ao gerar link de pagamento. Tente novamente.'
        console.error('❌ Erro nos dados:', data)
        alert(errorMessage)
      }
    } catch (error) {
      console.error('❌ Erro ao processar upgrade:', error)
      alert('Erro ao processar upgrade. Verifique sua conexão e tente novamente.')
    }
  }

  const getResultadoMateria = (materiaId: string) => {
    const resultado = resultados.find(r => r.materia_id === materiaId)
    return resultado ? resultado.pontuacao : 0
  }

  const getMateriaisMateria = (materiaId: string) => {
    const materia = materias.find(m => m.id === materiaId)
    if (!materia) return []
    
    // Usar o mapeamento de IDs baseado no nome da matéria
    const materiaIdCorreto = MATERIAS_MAPPING[materia.nome as keyof typeof MATERIAS_MAPPING] || (materia.ordem + 1)
    
    console.log(`🧠 Carregando materiais para materia: ${materia.nome} (ID: ${materiaIdCorreto})`)
    const materiaisFiltrados = materiaisHTML.filter(m => m.materia_id === materiaIdCorreto)
    console.log('📚 Materiais encontrados:', materiaisFiltrados)
    
    return materiaisFiltrados
  }

  const getQuestoesMateria = (materiaId: string) => {
    return questoes.filter(q => q.materia_id === materiaId)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#6B46C1] via-purple-600 to-[#ECC94B] flex items-center justify-center">
        <div className="text-white text-xl">Carregando...</div>
      </div>
    )
  }

  // Se uma matéria está selecionada, mostrar detalhes
  if (selectedMateria) {
    const materiaisMateria = getMateriaisMateria(selectedMateria.id)
    const questoesMateria = getQuestoesMateria(selectedMateria.id)
    const questoesDisponiveis = user?.plan === 'premium' ? questoesMateria : questoesMateria.slice(0, 2)

    // Se está mostrando as questões do simulado
    if (showingQuestions) {
      return (
        <div className="min-h-screen bg-gradient-to-br from-[#6B46C1] via-purple-600 to-[#ECC94B]">
          {/* Header */}
          <header className="bg-white/10 backdrop-blur-sm border-b border-white/20">
            <div className="container mx-auto px-4 py-4">
              <div className="flex justify-between items-center">
                <div className="flex items-center space-x-3">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowingQuestions(false)}
                    className="text-white hover:bg-white/20"
                  >
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Voltar
                  </Button>
                  <div>
                    <h1 className="text-xl font-bold text-white">Simulado - {selectedMateria.nome}</h1>
                    <p className="text-white/80 text-sm">{questoesDisponiveis.length} questões</p>
                  </div>
                </div>
                <div className="flex items-center space-x-4">
                  <Badge className={user?.plan === 'premium' ? 'bg-[#ECC94B] text-[#6B46C1]' : 'bg-gray-500 text-white'}>
                    {user?.plan === 'premium' ? (
                      <>
                        <Crown className="h-3 w-3 mr-1" />
                        Premium
                      </>
                    ) : (
                      'Gratuito'
                    )}
                  </Badge>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={handleSignOut}
                    className="text-white hover:bg-white/20"
                  >
                    <LogOut className="h-4 w-4 mr-2" />
                    Sair
                  </Button>
                </div>
              </div>
            </div>
          </header>

          {/* Questões */}
          <main className="container mx-auto px-4 py-8">
            <div className="max-w-4xl mx-auto space-y-6">
              {questoesDisponiveis.map((questao, index) => {
                const isErrada = questoesErradas.includes(questao.id)
                
                return (
                  <Card 
                    key={questao.id} 
                    id={`questao-${questao.id}`}
                    className={`bg-white/95 backdrop-blur-sm ${isErrada ? 'border-2 border-red-400' : ''}`}
                  >
                    <CardHeader>
                      <CardTitle className="text-[#6B46C1] flex items-center">
                        <span className="bg-[#6B46C1] text-white rounded-full w-8 h-8 flex items-center justify-center text-sm mr-3">
                          {index + 1}
                        </span>
                        Questão {index + 1}
                        <Badge variant="outline" className="ml-auto">
                          {questao.dificuldade}
                        </Badge>
                        {isErrada && (
                          <Badge className="ml-2 bg-red-100 text-red-700">
                            <XCircle className="h-3 w-3 mr-1" />
                            Refazer
                          </Badge>
                        )}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <p className="text-gray-800 leading-relaxed">
                          {questao.pergunta}
                        </p>
                        
                        <div className="space-y-2">
                          {questao.alternativas.map((alternativa, altIndex) => {
                            const letra = String.fromCharCode(65 + altIndex).toLowerCase() // a, b, c, d, e
                            const isSelected = selectedAnswers[questao.id] === letra
                            
                            return (
                              <button
                                key={altIndex}
                                onClick={() => handleAnswerSelect(questao.id, letra)}
                                className={`w-full text-left p-4 rounded-lg border-2 transition-all ${
                                  isSelected 
                                    ? 'border-[#6B46C1] bg-[#6B46C1]/10' 
                                    : 'border-gray-200 hover:border-[#6B46C1]/50 hover:bg-gray-50'
                                }`}
                              >
                                <div className="flex items-center">
                                  {isSelected ? (
                                    <CheckCircle className="h-5 w-5 text-[#6B46C1] mr-3" />
                                  ) : (
                                    <Circle className="h-5 w-5 text-gray-400 mr-3" />
                                  )}
                                  <span className="text-gray-800">
                                    {alternativa}
                                  </span>
                                </div>
                              </button>
                            )
                          })}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}

              {/* Botão de finalizar */}
              <Card className="bg-white/95 backdrop-blur-sm">
                <CardContent className="p-6 text-center">
                  <p className="text-gray-600 mb-4">
                    Questões respondidas: {Object.keys(selectedAnswers).length} de {questoesDisponiveis.length}
                  </p>
                  <Button 
                    onClick={handleFinalizarSimulado}
                    className="bg-[#6B46C1] hover:bg-[#6B46C1]/90"
                    disabled={Object.keys(selectedAnswers).length === 0}
                  >
                    <Target className="h-4 w-4 mr-2" />
                    Finalizar Simulado
                  </Button>
                </CardContent>
              </Card>
            </div>
          </main>

          {/* Dialog de Progresso (a cada 20 questões) */}
          <Dialog open={showProgressDialog} onOpenChange={setShowProgressDialog}>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle className="text-2xl text-center text-[#6B46C1]">
                  📊 Progresso do Simulado
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-6 py-4">
                <div className="text-center">
                  <p className="text-gray-600 mb-4">
                    Você respondeu <span className="font-bold text-[#6B46C1]">{progressStats.total}</span> questões
                  </p>
                  
                  <div className="grid grid-cols-2 gap-4 mb-6">
                    <div className="bg-green-50 p-4 rounded-lg border-2 border-green-200">
                      <CheckCircle className="h-8 w-8 text-green-600 mx-auto mb-2" />
                      <div className="text-3xl font-bold text-green-600">{progressStats.acertos}</div>
                      <div className="text-sm text-gray-600">Acertos</div>
                    </div>
                    
                    <div className="bg-red-50 p-4 rounded-lg border-2 border-red-200">
                      <XCircle className="h-8 w-8 text-red-600 mx-auto mb-2" />
                      <div className="text-3xl font-bold text-red-600">{progressStats.erros}</div>
                      <div className="text-sm text-gray-600">Erros</div>
                    </div>
                  </div>

                  <div className="mb-4">
                    <Progress 
                      value={(progressStats.acertos / progressStats.total) * 100} 
                      className="h-3"
                    />
                    <p className="text-sm text-gray-600 mt-2">
                      Taxa de acerto: {Math.round((progressStats.acertos / progressStats.total) * 100)}%
                    </p>
                  </div>
                </div>

                <div className="space-y-3">
                  <Button 
                    onClick={handleContinuarSimulado}
                    className="w-full bg-[#6B46C1] hover:bg-[#6B46C1]/90"
                  >
                    <Play className="h-4 w-4 mr-2" />
                    Continuar Simulado
                  </Button>
                  
                  {progressStats.erros > 0 && (
                    <Button 
                      onClick={handleRefazerErradas}
                      variant="outline"
                      className="w-full border-[#6B46C1] text-[#6B46C1] hover:bg-[#6B46C1]/10"
                    >
                      <RotateCcw className="h-4 w-4 mr-2" />
                      Refazer Questões Erradas ({progressStats.erros})
                    </Button>
                  )}
                </div>
              </div>
            </DialogContent>
          </Dialog>

          {/* Dialog de Resultados Finais */}
          <Dialog open={showFinalResults} onOpenChange={setShowFinalResults}>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle className="text-2xl text-center text-[#6B46C1]">
                  🎉 Simulado Finalizado!
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-6 py-4">
                <div className="text-center">
                  <div className="grid grid-cols-2 gap-4 mb-6">
                    <div className="bg-green-50 p-4 rounded-lg border-2 border-green-200">
                      <CheckCircle className="h-8 w-8 text-green-600 mx-auto mb-2" />
                      <div className="text-3xl font-bold text-green-600">{progressStats.acertos}</div>
                      <div className="text-sm text-gray-600">Acertos</div>
                    </div>
                    
                    <div className="bg-red-50 p-4 rounded-lg border-2 border-red-200">
                      <XCircle className="h-8 w-8 text-red-600 mx-auto mb-2" />
                      <div className="text-3xl font-bold text-red-600">{progressStats.erros}</div>
                      <div className="text-sm text-gray-600">Erros</div>
                    </div>
                  </div>

                  <div className="mb-4">
                    <div className="text-5xl font-bold text-[#6B46C1] mb-2">
                      {Math.round((progressStats.acertos / progressStats.total) * 100)}%
                    </div>
                    <p className="text-gray-600">Taxa de acerto final</p>
                  </div>

                  <Progress 
                    value={(progressStats.acertos / progressStats.total) * 100} 
                    className="h-3 mb-6"
                  />
                </div>

                <div className="space-y-3">
                  <Button 
                    onClick={() => {
                      setShowFinalResults(false)
                      setShowingQuestions(false)
                      setSelectedAnswers({})
                    }}
                    className="w-full bg-[#6B46C1] hover:bg-[#6B46C1]/90"
                  >
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Voltar ao Dashboard
                  </Button>
                  
                  {progressStats.erros > 0 && (
                    <Button 
                      onClick={() => {
                        setShowFinalResults(false)
                        handleRefazerErradas()
                      }}
                      variant="outline"
                      className="w-full border-[#6B46C1] text-[#6B46C1] hover:bg-[#6B46C1]/10"
                    >
                      <RotateCcw className="h-4 w-4 mr-2" />
                      Refazer Questões Erradas ({progressStats.erros})
                    </Button>
                  )}
                  
                  <Button 
                    onClick={() => {
                      setShowFinalResults(false)
                      handleStartSimulado(selectedMateria)
                    }}
                    variant="outline"
                    className="w-full"
                  >
                    <Play className="h-4 w-4 mr-2" />
                    Fazer Novamente
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>

          {/* Botão WhatsApp fixo */}
          <WhatsAppButton />
        </div>
      )
    }

    return (
      <div className="min-h-screen bg-gradient-to-br from-[#6B46C1] via-purple-600 to-[#ECC94B]">
        {/* Header */}
        <header className="bg-white/10 backdrop-blur-sm border-b border-white/20">
          <div className="container mx-auto px-4 py-4">
            <div className="flex justify-between items-center">
              <div className="flex items-center space-x-3">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedMateria(null)}
                  className="text-white hover:bg-white/20"
                >
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Voltar
                </Button>
                <div>
                  <h1 className="text-xl font-bold text-white">{selectedMateria.nome}</h1>
                  <p className="text-white/80 text-sm">{selectedMateria.descricao}</p>
                </div>
              </div>
              <div className="flex items-center space-x-4">
                <Badge className={user?.plan === 'premium' ? 'bg-[#ECC94B] text-[#6B46C1]' : 'bg-gray-500 text-white'}>
                  {user?.plan === 'premium' ? (
                    <>
                      <Crown className="h-3 w-3 mr-1" />
                      Premium
                    </>
                  ) : (
                    'Gratuito'
                  )}
                </Badge>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={handleSignOut}
                  className="text-white hover:bg-white/20"
                >
                  <LogOut className="h-4 w-4 mr-2" />
                  Sair
                </Button>
              </div>
            </div>
          </div>
        </header>

        {/* Content */}
        <main className="container mx-auto px-4 py-8">
          <div className="grid md:grid-cols-2 gap-8">
            {/* Materiais HTML */}
            <Card className="bg-white/95 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-[#6B46C1] flex items-center">
                  <FileText className="h-5 w-5 mr-2" />
                  Materiais de Estudo
                </CardTitle>
                <CardDescription>
                  Conteúdos teóricos para {selectedMateria.nome}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {materiaisMateria.map((material) => (
                    <Dialog key={material.id}>
                      <DialogTrigger asChild>
                        <Card className="cursor-pointer hover:shadow-md transition-shadow">
                          <CardContent className="p-4">
                            <h4 className="font-medium text-[#6B46C1] mb-2">{material.titulo}</h4>
                            <p className="text-sm text-gray-600">
                              {material.conteudo.replace(/<[^>]*>/g, '').substring(0, 100)}...
                            </p>
                          </CardContent>
                        </Card>
                      </DialogTrigger>
                      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
                        <DialogHeader>
                          <DialogTitle>{material.titulo}</DialogTitle>
                        </DialogHeader>
                        <div 
                          className="prose max-w-none"
                          dangerouslySetInnerHTML={{ __html: material.conteudo }}
                        />
                      </DialogContent>
                    </Dialog>
                  ))}
                  {materiaisMateria.length === 0 && (
                    <p className="text-center text-gray-500 py-8">
                      Nenhum material disponível ainda
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Simulados/Questões */}
            <Card className="bg-white/95 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-[#6B46C1] flex items-center">
                  <Play className="h-5 w-5 mr-2" />
                  Simulados
                </CardTitle>
                <CardDescription>
                  Questões para praticar {selectedMateria.nome}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {/* Informações do simulado */}
                  <div className="p-4 bg-blue-50 rounded-lg">
                    <div className="flex justify-between items-center mb-2">
                      <span className="font-medium">Total de questões:</span>
                      <span>{questoesMateria.length}</span>
                    </div>
                    <div className="flex justify-between items-center mb-2">
                      <span className="font-medium">Disponíveis para você:</span>
                      <span>{questoesDisponiveis.length}</span>
                    </div>
                    {user?.plan === 'gratuito' && questoesMateria.length > 2 && (
                      <div className="mt-3 p-3 bg-yellow-100 rounded border-l-4 border-yellow-400">
                        <p className="text-sm text-yellow-800">
                          <Crown className="h-4 w-4 inline mr-1" />
                          {questoesMateria.length - 2} questões bloqueadas. Faça upgrade para acessar todas!
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Botão para iniciar simulado */}
                  {questoesDisponiveis.length > 0 && (
                    <Button 
                      onClick={() => handleStartSimulado(selectedMateria)}
                      className="w-full bg-[#6B46C1] hover:bg-[#6B46C1]/90"
                    >
                      <Play className="h-4 w-4 mr-2" />
                      Iniciar Simulado ({questoesDisponiveis.length} questões)
                    </Button>
                  )}

                  {/* Preview das questões (primeiras 2) */}
                  <div className="space-y-3">
                    <h4 className="font-medium text-gray-700">Preview das questões:</h4>
                    {questoesDisponiveis.slice(0, 2).map((questao, index) => (
                      <div key={questao.id} className="p-3 border rounded-lg">
                        <p className="font-medium text-sm mb-2">
                          {index + 1}. {questao.pergunta.substring(0, 80)}...
                        </p>
                        <div className="text-xs text-gray-500 space-y-1">
                          {questao.alternativas.slice(0, 3).map((alt, altIndex) => (
                            <div key={altIndex}>{alt.substring(0, 40)}...</div>
                          ))}
                        </div>
                        <Badge variant="outline" className="mt-2">
                          {questao.dificuldade}
                        </Badge>
                      </div>
                    ))}
                  </div>

                  {questoesMateria.length === 0 && (
                    <p className="text-center text-gray-500 py-8">
                      Nenhuma questão disponível ainda
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Upgrade Banner para usuários gratuitos */}
          {user?.plan === 'gratuito' && questoesMateria.length > 2 && (
            <Card className="mt-8 bg-gradient-to-r from-[#ECC94B] to-yellow-400 border-0">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-xl font-bold text-[#6B46C1] mb-2">
                      🚀 Desbloqueie todas as {questoesMateria.length} questões!
                    </h3>
                    <p className="text-[#6B46C1]/80">
                      Acesse o simulado completo e trilhas personalizadas
                    </p>
                  </div>
                  <Button 
                    onClick={handleUpgrade}
                    className="bg-[#6B46C1] hover:bg-[#6B46C1]/90 text-white"
                  >
                    <Crown className="h-4 w-4 mr-2" />
                    Upgrade R$ 19,90
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </main>
      </div>
    )
  }

  // Vista principal do dashboard
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#6B46C1] via-purple-600 to-[#ECC94B]">
      {/* Header */}
      <header className="bg-white/10 backdrop-blur-sm border-b border-white/20">
        <div className="container mx-auto px-4 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-3">
              <Brain className="h-8 w-8 text-white" />
              <div>
                <h1 className="text-xl font-bold text-white">Dashboard do Aluno</h1>
                <p className="text-white/80 text-sm">Simulado ENEM</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <Badge className={user?.plan === 'premium' ? 'bg-[#ECC94B] text-[#6B46C1]' : 'bg-gray-500 text-white'}>
                {user?.plan === 'premium' ? (
                  <>
                    <Crown className="h-3 w-3 mr-1" />
                    Premium
                  </>
                ) : (
                  'Gratuito'
                )}
              </Badge>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={handleSignOut}
                className="text-white hover:bg-white/20"
              >
                <LogOut className="h-4 w-4 mr-2" />
                Sair
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold text-white mb-2">
            Bem-vindo, {user?.full_name}
          </h2>
          <p className="text-white/90">Escolha uma matéria para começar seus estudos</p>
        </div>

        {/* Upgrade Banner para usuários gratuitos */}
        {user?.plan === 'gratuito' && (
          <Card className="mb-8 bg-gradient-to-r from-[#ECC94B] to-yellow-400 border-0">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-bold text-[#6B46C1] mb-2">
                    🚀 Desbloqueie todo o potencial!
                  </h3>
                  <p className="text-[#6B46C1]/80">
                    Acesse todas as questões por matéria e trilhas personalizadas
                  </p>
                </div>
                <Button 
                  onClick={handleUpgrade}
                  className="bg-[#6B46C1] hover:bg-[#6B46C1]/90 text-white"
                >
                  <Crown className="h-4 w-4 mr-2" />
                  Upgrade R$ 19,90
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Stats Cards */}
        <div className="grid md:grid-cols-3 gap-6 mb-8">
          <Card className="bg-white/95 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-[#6B46C1] flex items-center">
                <Trophy className="h-5 w-5 mr-2" />
                Simulados Feitos
              </CardTitle>
              <CardDescription className="text-2xl font-bold text-[#6B46C1]">
                {resultados.length}
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="bg-white/95 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-[#6B46C1] flex items-center">
                <Target className="h-5 w-5 mr-2" />
                Média Geral
              </CardTitle>
              <CardDescription className="text-2xl font-bold text-[#6B46C1]">
                {resultados.length > 0 
                  ? Math.round(resultados.reduce((acc, r) => acc + r.pontuacao, 0) / resultados.length)
                  : 0
                }%
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="bg-white/95 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-[#6B46C1] flex items-center">
                <BookOpen className="h-5 w-5 mr-2" />
                Matérias Disponíveis
              </CardTitle>
              <CardDescription className="text-2xl font-bold text-[#6B46C1]">
                {materias.length}
              </CardDescription>
            </CardHeader>
          </Card>
        </div>

        {/* Matérias Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {materias.map((materia, index) => {
            const pontuacao = getResultadoMateria(materia.id)
            const materiaisCount = getMateriaisMateria(materia.id).length
            const questoesCount = getQuestoesMateria(materia.id).length
            const isLocked = user?.plan === 'gratuito' && index >= 2
            
            return (
              <Card 
                key={materia.id} 
                className="bg-white/95 backdrop-blur-sm hover:shadow-lg transition-shadow cursor-pointer"
                onClick={() => !isLocked && setSelectedMateria(materia)}
              >
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-[#6B46C1] text-lg">
                      {materia.nome}
                    </CardTitle>
                    {isLocked && (
                      <Crown className="h-5 w-5 text-[#ECC94B]" />
                    )}
                  </div>
                  <CardDescription className="text-sm">
                    {materia.descricao}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {/* Estatísticas da matéria */}
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div className="text-center">
                        <div className="font-bold text-[#6B46C1]">{materiaisCount}</div>
                        <div className="text-gray-600">Materiais</div>
                      </div>
                      <div className="text-center">
                        <div className="font-bold text-[#6B46C1]">{questoesCount}</div>
                        <div className="text-gray-600">Questões</div>
                      </div>
                    </div>

                    {pontuacao > 0 && (
                      <div>
                        <div className="flex justify-between text-sm mb-2">
                          <span>Melhor resultado</span>
                          <span className="font-medium">{pontuacao}%</span>
                        </div>
                        <Progress value={pontuacao} className="h-2" />
                      </div>
                    )}
                    
                    <Button 
                      onClick={(e) => {
                        e.stopPropagation()
                        if (!isLocked) {
                          setSelectedMateria(materia)
                        }
                      }}
                      disabled={isLocked}
                      className={`w-full ${isLocked 
                        ? 'bg-gray-300 text-gray-500 cursor-not-allowed' 
                        : 'bg-[#6B46C1] hover:bg-[#6B46C1]/90'
                      }`}
                    >
                      <BookOpen className="h-4 w-4 mr-2" />
                      {isLocked ? 'Premium Necessário' : 'Estudar Matéria'}
                    </Button>
                    
                    {isLocked && (
                      <p className="text-xs text-center text-gray-500">
                        Acesso limitado • Upgrade para acesso completo
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>

        {materias.length === 0 && (
          <Card className="bg-white/95 backdrop-blur-sm">
            <CardContent className="p-8 text-center">
              <BookOpen className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">Nenhuma matéria disponível ainda</p>
            </CardContent>
          </Card>
        )}
      </main>

      {/* Botão WhatsApp fixo */}
      <WhatsAppButton />
    </div>
  )
}