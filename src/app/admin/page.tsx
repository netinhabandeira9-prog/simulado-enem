'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { 
  Brain, 
  LogOut, 
  Users, 
  BookOpen, 
  Plus,
  Edit,
  Trash2,
  Crown,
  Settings,
  FileText,
  HelpCircle,
  BarChart3,
  Eye,
  Upload,
  Download,
  CheckCircle,
  AlertCircle,
  Lock,
  Unlock,
  Mail,
  Clock,
  UserX,
  Filter,
  UserCheck,
  DollarSign,
  TrendingUp
} from 'lucide-react'
import { getCurrentUser, getUserProfile, signOut } from '@/lib/auth'
import { supabase } from '@/lib/supabase'

interface UserProfile {
  id: string
  full_name: string
  email: string
  role: string
  plan: 'gratuito' | 'premium'
}

interface Student {
  id: string
  full_name: string
  email: string
  plan: 'gratuito' | 'premium'
  created_at: string
  status_aluno?: 'ativo' | 'inativo' | 'upgrade_bloqueado'
  upgrade_status?: boolean
  ultimo_acesso?: string
}

interface Materia {
  id: string
  nome: string
  descricao: string
  cor: string
  ordem: number
  ativo: boolean
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
  alternativas: {
    a: string
    b: string
    c: string
    d: string
    e: string
  }
  resposta_correta: string
  nivel: string
  criado_em: string
}

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

// Valor do acesso Premium (ajuste conforme necessário)
const VALOR_PREMIUM = 19.90

export default function AdminPage() {
  const [user, setUser] = useState<UserProfile | null>(null)
  const [students, setStudents] = useState<Student[]>([])
  const [materias, setMaterias] = useState<Materia[]>([])
  const [materiaisHTML, setMateriaisHTML] = useState<MaterialHTML[]>([])
  const [questoes, setQuestoes] = useState<Questao[]>([])
  const [loading, setLoading] = useState(true)
  
  // Estados para filtros de alunos
  const [studentFilter, setStudentFilter] = useState<'todos' | 'inativos'>('todos')
  const [filteredStudents, setFilteredStudents] = useState<Student[]>([])
  
  // Estados para formulários
  const [newMateria, setNewMateria] = useState({
    nome: '',
    descricao: '',
    cor: '#6B46C1'
  })
  
  const [newMaterial, setNewMaterial] = useState({
    materia_id: '',
    titulo: '',
    conteudo: ''
  })
  
  const [newQuestao, setNewQuestao] = useState({
    materia_id: '',
    pergunta: '',
    alternativa_a: '',
    alternativa_b: '',
    alternativa_c: '',
    alternativa_d: '',
    alternativa_e: '',
    resposta_correta: 'a',
    nivel: 'medio'
  })

  // Estados para importação em bloco
  const [bulkImport, setBulkImport] = useState({
    materia_id: '',
    html_content: '',
    nivel: 'medio'
  })
  const [questoesParsed, setQuestoesParsed] = useState<QuestaoParseada[]>([])
  const [showParsedQuestions, setShowParsedQuestions] = useState(false)
  const [importLoading, setImportLoading] = useState(false)
  const [importMessage, setImportMessage] = useState('')

  // Estados para pré-visualização
  const [previewMaterial, setPreviewMaterial] = useState('')
  const [showPreviewQuestao, setShowPreviewQuestao] = useState(false)
  
  const router = useRouter()

  useEffect(() => {
    loadData()
    setupRealtimeListeners()
  }, [])

  // Filtrar alunos quando o filtro ou lista de alunos mudar
  useEffect(() => {
    filterStudents()
  }, [students, studentFilter])

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

    // Listener para questoes (quando a tabela existir)
    const questoesChannel = supabase
      .channel('questoes_changes')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'questoes' },
        () => {
          loadQuestoes()
        }
      )
      .subscribe()

    return () => {
      materiaisChannel.unsubscribe()
      questoesChannel.unsubscribe()
    }
  }

  const loadData = async () => {
    try {
      const currentUser = await getCurrentUser()
      if (currentUser) {
        const profile = await getUserProfile(currentUser.id)
        
        // Verificar se é admin
        if (profile?.role !== 'admin') {
          router.push('/dashboard')
          return
        }
        
        setUser(profile)
        
        await Promise.all([
          loadStudents(),
          loadMaterias(),
          loadMateriaisHTML(),
          loadQuestoes()
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

  const loadStudents = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('role', 'aluno')
        .order('created_at', { ascending: false })
      
      if (error) throw error
      if (data) {
        // Simular dados de status e último acesso para demonstração
        const studentsWithStatus = data.map(student => ({
          ...student,
          status_aluno: student.status_aluno || 'ativo',
          upgrade_status: student.upgrade_status !== false,
          ultimo_acesso: student.ultimo_acesso || student.created_at
        }))
        setStudents(studentsWithStatus)
      }
    } catch (error) {
      console.error('Erro ao carregar alunos:', error)
    }
  }

  const filterStudents = () => {
    if (studentFilter === 'inativos') {
      // Filtrar alunos inativos (mais de 15 dias sem acesso)
      const quinzeDiasAtras = new Date()
      quinzeDiasAtras.setDate(quinzeDiasAtras.getDate() - 15)
      
      const inativos = students.filter(student => {
        const ultimoAcesso = new Date(student.ultimo_acesso || student.created_at)
        return ultimoAcesso < quinzeDiasAtras
      })
      setFilteredStudents(inativos)
    } else {
      setFilteredStudents(students)
    }
  }

  const getStatusBadge = (student: Student) => {
    const quinzeDiasAtras = new Date()
    quinzeDiasAtras.setDate(quinzeDiasAtras.getDate() - 15)
    const ultimoAcesso = new Date(student.ultimo_acesso || student.created_at)
    
    if (student.status_aluno === 'upgrade_bloqueado') {
      return <Badge variant="destructive">Upgrade Bloqueado</Badge>
    } else if (ultimoAcesso < quinzeDiasAtras) {
      return <Badge variant="secondary">Inativo</Badge>
    } else {
      return <Badge variant="default" className="bg-green-500">Ativo</Badge>
    }
  }

  const handleToggleUpgrade = async (studentId: string, currentStatus: boolean) => {
    try {
      const newStatus = !currentStatus
      const statusAluno = newStatus ? 'ativo' : 'upgrade_bloqueado'
      
      const { error } = await supabase
        .from('profiles')
        .update({ 
          upgrade_status: newStatus,
          status_aluno: statusAluno
        })
        .eq('id', studentId)

      if (error) throw error

      // Atualizar estado local
      setStudents(prev => prev.map(student => 
        student.id === studentId 
          ? { ...student, upgrade_status: newStatus, status_aluno: statusAluno }
          : student
      ))

      alert(`Upgrade ${newStatus ? 'liberado' : 'bloqueado'} com sucesso!`)
    } catch (error) {
      console.error('Erro ao alterar status de upgrade:', error)
      alert('Erro ao alterar status de upgrade')
    }
  }

  // FUNÇÃO ATUALIZADA: Liberação/Bloqueio Manual de Acesso Premium
  const handleLiberarAcessoManual = async (student: Student) => {
    // Verificar status atual e definir ação
    const isPremium = student.plan === 'premium' && student.upgrade_status
    const acao = isPremium ? 'bloquear' : 'liberar'
    const mensagemConfirmacao = isPremium 
      ? `Deseja realmente BLOQUEAR o acesso Premium de ${student.full_name}?`
      : `Deseja realmente LIBERAR o acesso Premium para ${student.full_name}?`

    // Pedir confirmação
    const confirmacao = confirm(mensagemConfirmacao)
    if (!confirmacao) return

    try {
      const novosDados = isPremium 
        ? { 
            upgrade_status: false,
            status_aluno: 'upgrade_bloqueado',
            plan: 'gratuito'
          }
        : { 
            upgrade_status: true,
            status_aluno: 'ativo',
            plan: 'premium'
          }

      const { error } = await supabase
        .from('profiles')
        .update(novosDados)
        .eq('id', student.id)

      if (error) throw error

      // Atualizar estado local
      setStudents(prev => prev.map(s => 
        s.id === student.id 
          ? { ...s, ...novosDados }
          : s
      ))

      alert(`Acesso Premium ${acao === 'liberar' ? 'liberado' : 'bloqueado'} manualmente com sucesso!`)
    } catch (error) {
      console.error('Erro ao alterar acesso manual:', error)
      alert('Erro ao alterar acesso manual')
    }
  }

  const handleSendMessage = async (student: Student) => {
    try {
      // Simular envio de email
      const emailData = {
        to: student.email,
        subject: "Sentimos sua falta 🕊️",
        message: `Olá ${student.full_name}, notamos que faz um tempo que você não acessa o app.\nVolte hoje mesmo e continue seus estudos — estamos com você nessa jornada!`
      }

      // Aqui você integraria com um serviço de email real
      console.log('Enviando email:', emailData)
      
      // Simular delay de envio
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      alert(`Mensagem enviada para ${student.full_name} (${student.email})`)
    } catch (error) {
      console.error('Erro ao enviar mensagem:', error)
      alert('Erro ao enviar mensagem')
    }
  }

  const loadMaterias = async () => {
    try {
      const { data, error } = await supabase
        .from('materias')
        .select('*')
        .order('ordem', { ascending: true })
      
      if (error) throw error
      if (data) setMaterias(data)
    } catch (error) {
      console.error('Erro ao carregar matérias:', error)
    }
  }

  const loadMateriaisHTML = async () => {
    try {
      const { data, error } = await supabase
        .from('materiais_html')
        .select('*')
        .order('id', { ascending: false })
      
      if (error) throw error
      if (data) setMateriaisHTML(data)
    } catch (error) {
      console.error('Erro ao carregar materiais:', error)
    }
  }

  const loadQuestoes = async () => {
    try {
      // Primeiro tentar carregar da tabela questoes
      const { data: questoesData, error: questoesError } = await supabase
        .from('questoes')
        .select('*')
        .order('created_at', { ascending: false })
      
      if (!questoesError && questoesData) {
        setQuestoes(questoesData)
        return
      }

      // Se questoes não existir, carregar simulados do tipo questao_individual
      const { data: simuladosData, error: simuladosError } = await supabase
        .from('simulados')
        .select('*')
        .eq('tipo', 'questao_individual')
        .order('created_at', { ascending: false })
      
      if (!simuladosError && simuladosData) {
        // Converter simulados para formato de questoes
        const questoesConvertidas = simuladosData.map(simulado => {
          const dadosQuestao = JSON.parse(simulado.descricao || '{}')
          return {
            id: simulado.id,
            materia_id: simulado.materia_id,
            pergunta: dadosQuestao.pergunta || simulado.titulo,
            alternativas: dadosQuestao.alternativas || {},
            resposta_correta: dadosQuestao.correta || 'a',
            nivel: dadosQuestao.dificuldade || 'medio',
            criado_em: simulado.created_at
          }
        })
        setQuestoes(questoesConvertidas)
      }
    } catch (error) {
      console.log('Erro ao carregar questões:', error)
    }
  }

  const handleSignOut = async () => {
    try {
      await signOut()
      router.push('/')
    } catch (error) {
      console.error('Erro ao sair:', error)
    }
  }

  const handleCreateMateria = async (e: React.FormEvent) => {
    e.preventDefault()
    
    try {
      const { error } = await supabase
        .from('materias')
        .insert({
          nome: newMateria.nome,
          descricao: newMateria.descricao,
          cor: newMateria.cor,
          ordem: materias.length,
          ativo: true
        })

      if (error) throw error

      setNewMateria({ nome: '', descricao: '', cor: '#6B46C1' })
      loadMaterias()
      alert('Matéria criada com sucesso!')
    } catch (error) {
      console.error('Erro ao criar matéria:', error)
      alert('Erro ao criar matéria')
    }
  }

  const handleCreateMaterial = async (e: React.FormEvent) => {
    e.preventDefault()
    
    console.log("📘 DEBUG → Iniciando criação de material...")
    console.log("📘 selectedMateriaId:", newMaterial.materia_id)
    console.log("📘 titulo:", newMaterial.titulo)
    console.log("📘 conteudo:", newMaterial.conteudo)
    
    if (!newMaterial.materia_id) {
      alert('❌ Por favor, selecione uma matéria')
      return
    }
    
    try {
      // Encontrar a matéria selecionada
      const materia = materias.find(m => m.id === newMaterial.materia_id)
      if (!materia) {
        alert('Matéria não encontrada')
        return
      }

      // Usar o mapeamento de IDs baseado no nome da matéria
      const materiaIdCorreto = MATERIAS_MAPPING[materia.nome as keyof typeof MATERIAS_MAPPING] || (materia.ordem + 1)

      const payload = {
        titulo: newMaterial.titulo,
        conteudo: newMaterial.conteudo,
        materia_id: materiaIdCorreto
      }

      console.log("📦 Payload enviado ao Supabase:", payload)

      const { data, error } = await supabase
        .from('materiais_html')
        .insert([payload])
        .select()

      if (error) {
        console.error('❌ Erro detalhado ao criar material:', error)
        alert(`Erro ao criar material: ${error.message || 'Erro desconhecido'}`)
      } else {
        console.log('✅ Material salvo com sucesso:', data)
        alert('✅ Material criado com sucesso!')
        
        setNewMaterial({ materia_id: '', titulo: '', conteudo: '' })
        setPreviewMaterial('')
        loadMateriaisHTML()
      }
    } catch (error: any) {
      console.error('🔥 Erro inesperado:', error)
      alert(`Erro inesperado: ${error.message || error}`)
    }
  }

  const handleCreateQuestao = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!newQuestao.materia_id) {
      alert('Por favor, selecione uma matéria')
      return
    }
    
    try {
      // Criar objeto alternativas no formato JSONB
      const alternativas = {
        a: newQuestao.alternativa_a,
        b: newQuestao.alternativa_b,
        c: newQuestao.alternativa_c,
        d: newQuestao.alternativa_d,
        e: newQuestao.alternativa_e
      }

      // Primeiro tentar inserir na tabela questoes
      const { data: questaoData, error: questaoError } = await supabase
        .from('questoes')
        .insert({
          materia_id: newQuestao.materia_id,
          pergunta: newQuestao.pergunta,
          alternativas: alternativas,
          resposta_correta: newQuestao.resposta_correta,
          nivel: newQuestao.nivel
        })
        .select()

      // Se questoes não existir, usar simulados
      if (questaoError && questaoError.code === '42P01') {
        const { error: simuladoError } = await supabase
          .from('simulados')
          .insert({
            titulo: `Questão: ${newQuestao.pergunta.slice(0, 50)}...`,
            descricao: JSON.stringify({
              pergunta: newQuestao.pergunta,
              alternativas: alternativas,
              correta: newQuestao.resposta_correta,
              dificuldade: newQuestao.nivel
            }),
            tipo: 'questao_individual',
            materia_id: newQuestao.materia_id,
            total_questoes: 1,
            tempo_limite: 5,
            ativo: true
          })

        if (simuladoError) throw simuladoError
        alert('Questão criada com sucesso (salva como simulado individual)!')
      } else if (questaoError) {
        throw questaoError
      } else {
        alert('Questão criada com sucesso!')
      }

      setNewQuestao({
        materia_id: '',
        pergunta: '',
        alternativa_a: '',
        alternativa_b: '',
        alternativa_c: '',
        alternativa_d: '',
        alternativa_e: '',
        resposta_correta: 'a',
        nivel: 'medio'
      })
      setShowPreviewQuestao(false)
      loadQuestoes()
    } catch (error) {
      console.error('Erro ao criar questão:', error)
      alert('Erro ao criar questão')
    }
  }

  // Função para parsear HTML e extrair questões
  const parseQuestionsFromHTML = (htmlContent: string): QuestaoParseada[] => {
    const questoes: QuestaoParseada[] = []
    
    try {
      console.log('🔍 Iniciando parse do HTML...')
      console.log('📄 Conteúdo recebido (primeiros 500 chars):', htmlContent.substring(0, 500))
      
      // Criar um parser DOM temporário
      const parser = new DOMParser()
      const doc = parser.parseFromString(htmlContent, 'text/html')
      
      // Tentar múltiplas estratégias de busca
      let questoesElements = doc.querySelectorAll('.questao')
      console.log('📦 Elementos com classe .questao:', questoesElements.length)
      
      if (questoesElements.length === 0) {
        questoesElements = doc.querySelectorAll('.question')
        console.log('📦 Elementos com classe .question:', questoesElements.length)
      }
      
      if (questoesElements.length === 0) {
        // Buscar por divs que contenham padrão de questão
        const allDivs = doc.querySelectorAll('div')
        const divsComQuestao: Element[] = []
        allDivs.forEach(div => {
          const text = div.textContent || ''
          // Procurar por padrão: número seguido de ) e texto
          if (/^\s*\d+\)/.test(text) && text.includes('Resposta:')) {
            divsComQuestao.push(div)
          }
        })
        questoesElements = divsComQuestao as any
        console.log('📦 Divs com padrão de questão:', questoesElements.length)
      }
      
      // Se ainda não encontrou, tentar parsear o HTML inteiro como uma única questão
      if (questoesElements.length === 0) {
        console.log('⚠️ Nenhum elemento encontrado, tentando parsear HTML completo...')
        questoesElements = [doc.body] as any
      }
      
      questoesElements.forEach((element, index) => {
        console.log(`\n🔎 Analisando elemento ${index + 1}...`)
        const htmlText = element.innerHTML
        console.log('📝 HTML do elemento:', htmlText.substring(0, 200))
        
        // ESTRATÉGIA 1: Buscar pergunta com múltiplos padrões
        let pergunta = ''
        
        // Padrão 1: <strong>1)</strong> Texto da pergunta
        let perguntaMatch = htmlText.match(/<(?:strong|b)>\s*\d+\)\s*<\/(?:strong|b)>\s*(.+?)(?=<ul|<li|<p>|<em>)/s)
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
          perguntaMatch = htmlText.match(/^\s*\d+\)\s*(.+?)(?=\n|<|A\)|B\))/s)
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
        let match
        while ((match = alternativasRegex.exec(htmlText)) !== null) {
          const letra = match[1].toLowerCase()
          const texto = match[2].replace(/<[^>]*>/g, '').trim()
          alternativas[letra] = texto
          console.log(`✅ Alternativa ${letra.toUpperCase()} encontrada (padrão 1)`)
        }
        
        // Padrão 2: <p>A) Texto</p>
        if (Object.keys(alternativas).length < 5) {
          alternativasRegex = /<p[^>]*>\s*([A-E])\)\s*(.+?)<\/p>/gs
          while ((match = alternativasRegex.exec(htmlText)) !== null) {
            const letra = match[1].toLowerCase()
            if (!alternativas[letra]) {
              const texto = match[2].replace(/<[^>]*>/g, '').trim()
              alternativas[letra] = texto
              console.log(`✅ Alternativa ${letra.toUpperCase()} encontrada (padrão 2)`)
            }
          }
        }
        
        // Padrão 3: Texto direto A) ... B) ... C) ...
        if (Object.keys(alternativas).length < 5) {
          const textoLimpo = htmlText.replace(/<[^>]*>/g, ' ')
          const altRegex = /([A-E])\)\s*([^A-E]+?)(?=[A-E]\)|Resposta:|Gabarito:|$)/gs
          while ((match = altRegex.exec(textoLimpo)) !== null) {
            const letra = match[1].toLowerCase()
            if (!alternativas[letra]) {
              const texto = match[2].trim()
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
        const questaoParseada = {
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

  const handleParseHTML = async () => {
    console.log('🔍 Iniciando análise do HTML...')
    
    if (!bulkImport.html_content.trim()) {
      alert('Por favor, cole o conteúdo HTML')
      return
    }
    
    if (!bulkImport.materia_id) {
      alert('Por favor, selecione uma matéria primeiro')
      return
    }
    
    setImportLoading(true)
    setImportMessage('🔍 Analisando HTML...')
    
    try {
      console.log('📄 Enviando HTML para análise...')
      
      // Chamar a API para analisar o HTML
      const response = await fetch('/api/admin/questoes/analisar-html', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          html_content: bulkImport.html_content,
          materia_id: bulkImport.materia_id
        })
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Erro ao analisar HTML')
      }

      console.log('✅ Questões parseadas:', result.questoes.length)
      console.log('📋 Detalhes das questões:', result.questoes)
      
      setQuestoesParsed(result.questoes)
      setShowParsedQuestions(true)
      
      if (result.questoes.length === 0) {
        setImportMessage('❌ Nenhuma questão encontrada. Verifique o formato do HTML.')
        alert('Nenhuma questão foi encontrada no HTML. Verifique o formato.')
      } else {
        const mensagem = `✅ ${result.questoes.length} questões encontradas e prontas para importar!`
        setImportMessage(mensagem)
        alert(mensagem)
      }
    } catch (error) {
      console.error('❌ Erro ao analisar HTML:', error)
      setImportMessage(`❌ Erro ao analisar HTML: ${error}`)
      alert(`Erro ao analisar HTML: ${error}`)
    } finally {
      setImportLoading(false)
    }
  }

  const handleBulkImport = async () => {
    if (!bulkImport.materia_id) {
      alert('Por favor, selecione uma matéria')
      return
    }
    
    if (questoesParsed.length === 0) {
      alert('Nenhuma questão para importar')
      return
    }
    
    setImportLoading(true)
    setImportMessage('Importando questões...')
    
    try {
      // Usar o endpoint API para importação em bloco
      const response = await fetch('/api/add-questions-bulk', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          questoes: questoesParsed,
          materia_id: bulkImport.materia_id,
          nivel: bulkImport.nivel
        })
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Erro ao importar questões')
      }

      // Limpar formulário
      setBulkImport({ materia_id: '', html_content: '', nivel: 'medio' })
      setQuestoesParsed([])
      setShowParsedQuestions(false)
      
      loadQuestoes()
      
      // Mensagem de sucesso mais detalhada
      const mensagem = result.message 
        ? `✅ ${result.total} questões importadas com sucesso! (${result.message})`
        : `✅ ${result.total} questões importadas com sucesso!`
      
      setImportMessage(mensagem)
      
      // Limpar mensagem após 5 segundos
      setTimeout(() => {
        setImportMessage('')
      }, 5000)
      
    } catch (error) {
      console.error('Erro ao importar questões:', error)
      setImportMessage(`❌ Erro ao importar questões: ${error}`)
    } finally {
      setImportLoading(false)
    }
  }

  const handleDeleteMateria = async (id: string) => {
    if (!confirm('Tem certeza que deseja desativar esta matéria?')) return

    try {
      const { error } = await supabase
        .from('materias')
        .update({ ativo: false })
        .eq('id', id)

      if (error) throw error

      loadMaterias()
      alert('Matéria desativada com sucesso!')
    } catch (error) {
      console.error('Erro ao desativar matéria:', error)
      alert('Erro ao desativar matéria')
    }
  }

  // Atualizar preview do material em tempo real
  useEffect(() => {
    setPreviewMaterial(newMaterial.conteudo)
  }, [newMaterial.conteudo])

  // Calcular estatísticas de relatórios
  const calcularEstatisticas = () => {
    const totalAlunos = students.length
    const alunosGratuitos = students.filter(s => s.plan === 'gratuito').length
    const alunosPremium = students.filter(s => s.plan === 'premium').length
    const valorTotalVendas = alunosPremium * VALOR_PREMIUM

    return {
      totalAlunos,
      alunosGratuitos,
      alunosPremium,
      valorTotalVendas
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#6B46C1] via-purple-600 to-[#ECC94B] flex items-center justify-center">
        <div className="text-white text-xl">Carregando...</div>
      </div>
    )
  }

  const stats = calcularEstatisticas()

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#6B46C1] via-purple-600 to-[#ECC94B]">
      {/* Header */}
      <header className="bg-white/10 backdrop-blur-sm border-b border-white/20">
        <div className="container mx-auto px-4 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-3">
              <Brain className="h-8 w-8 text-white" />
              <div>
                <h1 className="text-xl font-bold text-white">Painel Administrativo</h1>
                <p className="text-white/80 text-sm">Simulado ENEM IA</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <Badge className="bg-red-500 text-white">
                <Settings className="h-3 w-3 mr-1" />
                Admin
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
            Bem-vindo, {user?.full_name || 'Admin'}
          </h2>
          <p className="text-white/90">Gerencie matérias, materiais, questões e alunos da plataforma</p>
        </div>

        {/* Stats Cards */}
        <div className="grid md:grid-cols-4 gap-6 mb-8">
          <Card className="bg-white/95 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-[#6B46C1] flex items-center">
                <Users className="h-5 w-5 mr-2" />
                Total de Alunos
              </CardTitle>
              <CardDescription className="text-2xl font-bold text-[#6B46C1]">
                {students.length}
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="bg-white/95 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-[#6B46C1] flex items-center">
                <Crown className="h-5 w-5 mr-2" />
                Alunos Premium
              </CardTitle>
              <CardDescription className="text-2xl font-bold text-[#ECC94B]">
                {students.filter(s => s.plan === 'premium').length}
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="bg-white/95 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-[#6B46C1] flex items-center">
                <BookOpen className="h-5 w-5 mr-2" />
                Matérias Ativas
              </CardTitle>
              <CardDescription className="text-2xl font-bold text-[#6B46C1]">
                {materias.filter(m => m.ativo).length}
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="bg-white/95 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-[#6B46C1] flex items-center">
                <HelpCircle className="h-5 w-5 mr-2" />
                Total Questões
              </CardTitle>
              <CardDescription className="text-2xl font-bold text-[#6B46C1]">
                {questoes.length}
              </CardDescription>
            </CardHeader>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="materias" className="w-full">
          <TabsList className="grid w-full grid-cols-5 bg-white/10 backdrop-blur-sm">
            <TabsTrigger value="materias" className="text-white data-[state=active]:bg-white data-[state=active]:text-[#6B46C1]">
              📚 Matérias
            </TabsTrigger>
            <TabsTrigger value="materiais" className="text-white data-[state=active]:bg-white data-[state=active]:text-[#6B46C1]">
              📝 Materiais HTML
            </TabsTrigger>
            <TabsTrigger value="questoes" className="text-white data-[state=active]:bg-white data-[state=active]:text-[#6B46C1]">
              ❓ Questões
            </TabsTrigger>
            <TabsTrigger value="students" className="text-white data-[state=active]:bg-white data-[state=active]:text-[#6B46C1]">
              👥 Alunos
            </TabsTrigger>
            <TabsTrigger value="relatorios" className="text-white data-[state=active]:bg-white data-[state=active]:text-[#6B46C1]">
              📊 Relatórios
            </TabsTrigger>
          </TabsList>

          {/* Matérias Tab */}
          <TabsContent value="materias" className="mt-6">
            <div className="grid md:grid-cols-2 gap-6">
              {/* Lista de Matérias */}
              <Card className="bg-white/95 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle className="text-[#6B46C1]">Matérias Cadastradas</CardTitle>
                  <CardDescription>Gerencie as matérias da plataforma</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4 max-h-96 overflow-y-auto">
                    {materias.map((materia) => (
                      <div key={materia.id} className="flex items-center justify-between p-4 border rounded-lg">
                        <div className="flex items-center space-x-3">
                          <div 
                            className="w-4 h-4 rounded-full" 
                            style={{ backgroundColor: materia.cor }}
                          />
                          <div>
                            <h4 className="font-medium text-[#6B46C1]">{materia.nome}</h4>
                            <p className="text-sm text-gray-600">{materia.descricao}</p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Badge variant={materia.ativo ? 'default' : 'secondary'}>
                            {materia.ativo ? 'Ativa' : 'Inativa'}
                          </Badge>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => handleDeleteMateria(materia.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Criar Nova Matéria */}
              <Card className="bg-white/95 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle className="text-[#6B46C1]">Criar Nova Matéria</CardTitle>
                  <CardDescription>Adicione uma nova matéria à plataforma</CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleCreateMateria} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="nome">Nome da Matéria</Label>
                      <Input
                        id="nome"
                        value={newMateria.nome}
                        onChange={(e) => setNewMateria({...newMateria, nome: e.target.value})}
                        placeholder="Ex: Matemática"
                        required
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="descricao">Descrição</Label>
                      <Textarea
                        id="descricao"
                        value={newMateria.descricao}
                        onChange={(e) => setNewMateria({...newMateria, descricao: e.target.value})}
                        placeholder="Descrição da matéria"
                        rows={3}
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="cor">Cor</Label>
                      <Input
                        id="cor"
                        type="color"
                        value={newMateria.cor}
                        onChange={(e) => setNewMateria({...newMateria, cor: e.target.value})}
                      />
                    </div>
                    
                    <Button type="submit" className="w-full bg-[#6B46C1] hover:bg-[#6B46C1]/90">
                      <Plus className="h-4 w-4 mr-2" />
                      Criar Matéria
                    </Button>
                  </form>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Materiais HTML Tab */}
          <TabsContent value="materiais" className="mt-6">
            <div className="grid md:grid-cols-2 gap-6">
              {/* Lista de Materiais */}
              <Card className="bg-white/95 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle className="text-[#6B46C1]">Materiais HTML</CardTitle>
                  <CardDescription>Conteúdos de estudo por matéria</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4 max-h-96 overflow-y-auto">
                    {materiaisHTML.map((material) => {
                      // Buscar matéria pelo materia_id usando o mapeamento reverso
                      const materiaEncontrada = materias.find(m => {
                        const materiaIdMapeado = MATERIAS_MAPPING[m.nome as keyof typeof MATERIAS_MAPPING] || (m.ordem + 1)
                        return materiaIdMapeado === material.materia_id
                      })
                      return (
                        <div key={material.id} className="p-4 border rounded-lg">
                          <h4 className="font-medium text-[#6B46C1]">{material.titulo}</h4>
                          <p className="text-sm text-gray-600">
                            Matéria: {materiaEncontrada?.nome || `ID: ${material.materia_id}`}
                          </p>
                          <p className="text-xs text-gray-500 mt-2">
                            {material.conteudo.substring(0, 100)}...
                          </p>
                        </div>
                      )
                    })}
                  </div>
                </CardContent>
              </Card>

              {/* Criar Novo Material */}
              <Card className="bg-white/95 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle className="text-[#6B46C1]">Criar Material HTML</CardTitle>
                  <CardDescription>Adicione conteúdo de estudo com pré-visualização</CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleCreateMaterial} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="materia_select">Matéria *</Label>
                      <Select 
                        value={newMaterial.materia_id} 
                        onValueChange={(value) => setNewMaterial({...newMaterial, materia_id: value})}
                        required
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione uma matéria" />
                        </SelectTrigger>
                        <SelectContent>
                          {materias.filter(m => m.ativo).map((materia) => (
                            <SelectItem key={materia.id} value={materia.id}>
                              {materia.nome}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="titulo">Título</Label>
                      <Input
                        id="titulo"
                        value={newMaterial.titulo}
                        onChange={(e) => setNewMaterial({...newMaterial, titulo: e.target.value})}
                        placeholder="Título do material"
                        required
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="conteudo">Conteúdo HTML</Label>
                      <Textarea
                        id="conteudo"
                        value={newMaterial.conteudo}
                        onChange={(e) => setNewMaterial({...newMaterial, conteudo: e.target.value})}
                        placeholder="<h1>Título</h1><p>Conteúdo...</p>"
                        rows={6}
                        required
                      />
                    </div>

                    {/* Pré-visualização */}
                    {previewMaterial && (
                      <div className="space-y-2">
                        <Label className="flex items-center">
                          <Eye className="h-4 w-4 mr-2" />
                          Pré-visualização
                        </Label>
                        <div 
                          className="p-4 border rounded-lg bg-gray-50 max-h-48 overflow-y-auto"
                          dangerouslySetInnerHTML={{ __html: previewMaterial }}
                        />
                      </div>
                    )}
                    
                    <Button type="submit" className="w-full bg-[#6B46C1] hover:bg-[#6B46C1]/90">
                      <Plus className="h-4 w-4 mr-2" />
                      Criar Material
                    </Button>
                  </form>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Questões Tab */}
          <TabsContent value="questoes" className="mt-6">
            {/* Sub-tabs para questões */}
            <Tabs defaultValue="individual" className="w-full">
              <TabsList className="grid w-full grid-cols-2 bg-white/10 backdrop-blur-sm mb-6">
                <TabsTrigger value="individual" className="text-white data-[state=active]:bg-white data-[state=active]:text-[#6B46C1]">
                  ➕ Questão Individual
                </TabsTrigger>
                <TabsTrigger value="bulk" className="text-white data-[state=active]:bg-white data-[state=active]:text-[#6B46C1]">
                  📥 Importar em Bloco
                </TabsTrigger>
              </TabsList>

              {/* Questão Individual */}
              <TabsContent value="individual">
                <div className="grid md:grid-cols-2 gap-6">
                  {/* Lista de Questões */}
                  <Card className="bg-white/95 backdrop-blur-sm">
                    <CardHeader>
                      <CardTitle className="text-[#6B46C1]">Questões Cadastradas</CardTitle>
                      <CardDescription>Banco de questões por matéria</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4 max-h-96 overflow-y-auto">
                        {questoes.map((questao) => {
                          const materia = materias.find(m => m.id === questao.materia_id)
                          return (
                            <div key={questao.id} className="p-4 border rounded-lg">
                              <h4 className="font-medium text-[#6B46C1] mb-2">
                                {questao.pergunta.substring(0, 80)}...
                              </h4>
                              <div className="flex justify-between items-center text-sm text-gray-600">
                                <span>Matéria: {materia?.nome || 'N/A'}</span>
                                <Badge variant="outline">
                                  Resposta: {questao.resposta_correta.toUpperCase()}
                                </Badge>
                              </div>
                              <Badge variant="secondary" className="mt-2">
                                {questao.nivel}
                              </Badge>
                            </div>
                          )
                        })}
                        {questoes.length === 0 && (
                          <p className="text-center text-gray-500 py-8">
                            Nenhuma questão cadastrada ainda
                          </p>
                        )}
                      </div>
                    </CardContent>
                  </Card>

                  {/* Criar Nova Questão */}
                  <Card className="bg-white/95 backdrop-blur-sm">
                    <CardHeader>
                      <CardTitle className="text-[#6B46C1]">Criar Nova Questão</CardTitle>
                      <CardDescription>Adicione questões ao banco de dados</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <form onSubmit={handleCreateQuestao} className="space-y-4">
                        <div className="space-y-2">
                          <Label>Matéria *</Label>
                          <Select 
                            value={newQuestao.materia_id} 
                            onValueChange={(value) => setNewQuestao({...newQuestao, materia_id: value})}
                            required
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Selecione uma matéria" />
                            </SelectTrigger>
                            <SelectContent>
                              {materias.filter(m => m.ativo).map((materia) => (
                                <SelectItem key={materia.id} value={materia.id}>
                                  {materia.nome}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        
                        <div className="space-y-2">
                          <Label>Pergunta</Label>
                          <Textarea
                            value={newQuestao.pergunta}
                            onChange={(e) => setNewQuestao({...newQuestao, pergunta: e.target.value})}
                            placeholder="Digite a pergunta..."
                            rows={3}
                            required
                          />
                        </div>

                        {/* Alternativas */}
                        <div className="grid grid-cols-1 gap-3">
                          <div className="space-y-2">
                            <Label>A)</Label>
                            <Input
                              value={newQuestao.alternativa_a}
                              onChange={(e) => setNewQuestao({...newQuestao, alternativa_a: e.target.value})}
                              placeholder="Alternativa A"
                              required
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>B)</Label>
                            <Input
                              value={newQuestao.alternativa_b}
                              onChange={(e) => setNewQuestao({...newQuestao, alternativa_b: e.target.value})}
                              placeholder="Alternativa B"
                              required
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>C)</Label>
                            <Input
                              value={newQuestao.alternativa_c}
                              onChange={(e) => setNewQuestao({...newQuestao, alternativa_c: e.target.value})}
                              placeholder="Alternativa C"
                              required
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>D)</Label>
                            <Input
                              value={newQuestao.alternativa_d}
                              onChange={(e) => setNewQuestao({...newQuestao, alternativa_d: e.target.value})}
                              placeholder="Alternativa D"
                              required
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>E)</Label>
                            <Input
                              value={newQuestao.alternativa_e}
                              onChange={(e) => setNewQuestao({...newQuestao, alternativa_e: e.target.value})}
                              placeholder="Alternativa E"
                              required
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label>Resposta Correta</Label>
                            <Select 
                              value={newQuestao.resposta_correta} 
                              onValueChange={(value) => setNewQuestao({...newQuestao, resposta_correta: value})}
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="a">A</SelectItem>
                                <SelectItem value="b">B</SelectItem>
                                <SelectItem value="c">C</SelectItem>
                                <SelectItem value="d">D</SelectItem>
                                <SelectItem value="e">E</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>

                          <div className="space-y-2">
                            <Label>Nível</Label>
                            <Select 
                              value={newQuestao.nivel} 
                              onValueChange={(value) => setNewQuestao({...newQuestao, nivel: value})}
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="facil">Fácil</SelectItem>
                                <SelectItem value="medio">Médio</SelectItem>
                                <SelectItem value="dificil">Difícil</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>

                        {/* Botão para mostrar/ocultar pré-visualização */}
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => setShowPreviewQuestao(!showPreviewQuestao)}
                          className="w-full"
                        >
                          <Eye className="h-4 w-4 mr-2" />
                          {showPreviewQuestao ? 'Ocultar' : 'Mostrar'} Pré-visualização
                        </Button>

                        {/* Pré-visualização da Questão */}
                        {showPreviewQuestao && (
                          <div className="p-4 border rounded-lg bg-gray-50">
                            <h4 className="font-medium mb-3">{newQuestao.pergunta || 'Digite a pergunta...'}</h4>
                            <div className="space-y-2">
                              <div className={`p-2 rounded ${newQuestao.resposta_correta === 'a' ? 'bg-green-100' : 'bg-white'}`}>
                                A) {newQuestao.alternativa_a || 'Alternativa A'}
                              </div>
                              <div className={`p-2 rounded ${newQuestao.resposta_correta === 'b' ? 'bg-green-100' : 'bg-white'}`}>
                                B) {newQuestao.alternativa_b || 'Alternativa B'}
                              </div>
                              <div className={`p-2 rounded ${newQuestao.resposta_correta === 'c' ? 'bg-green-100' : 'bg-white'}`}>
                                C) {newQuestao.alternativa_c || 'Alternativa C'}
                              </div>
                              <div className={`p-2 rounded ${newQuestao.resposta_correta === 'd' ? 'bg-green-100' : 'bg-white'}`}>
                                D) {newQuestao.alternativa_d || 'Alternativa D'}
                              </div>
                              <div className={`p-2 rounded ${newQuestao.resposta_correta === 'e' ? 'bg-green-100' : 'bg-white'}`}>
                                E) {newQuestao.alternativa_e || 'Alternativa E'}
                              </div>
                            </div>
                            <p className="text-sm text-gray-600 mt-2">
                              Resposta correta destacada em verde: {newQuestao.resposta_correta.toUpperCase()}
                            </p>
                          </div>
                        )}
                        
                        <Button type="submit" className="w-full bg-[#6B46C1] hover:bg-[#6B46C1]/90">
                          <Plus className="h-4 w-4 mr-2" />
                          Criar Questão
                        </Button>
                      </form>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              {/* Importação em Bloco */}
              <TabsContent value="bulk">
                <div className="grid md:grid-cols-2 gap-6">
                  {/* Formulário de Importação */}
                  <Card className="bg-white/95 backdrop-blur-sm">
                    <CardHeader>
                      <CardTitle className="text-[#6B46C1] flex items-center">
                        <Upload className="h-5 w-5 mr-2" />
                        Importar Questões em Bloco
                      </CardTitle>
                      <CardDescription>
                        Cole o HTML com múltiplas questões para importação automática
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="space-y-2">
                        <Label>Matéria *</Label>
                        <Select 
                          value={bulkImport.materia_id} 
                          onValueChange={(value) => setBulkImport({...bulkImport, materia_id: value})}
                          required
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione uma matéria" />
                          </SelectTrigger>
                          <SelectContent>
                            {materias.filter(m => m.ativo).map((materia) => (
                              <SelectItem key={materia.id} value={materia.id}>
                                {materia.nome}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label>Nível das Questões</Label>
                        <Select 
                          value={bulkImport.nivel} 
                          onValueChange={(value) => setBulkImport({...bulkImport, nivel: value})}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="facil">Fácil</SelectItem>
                            <SelectItem value="medio">Médio</SelectItem>
                            <SelectItem value="dificil">Difícil</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label>Conteúdo HTML</Label>
                        <Textarea
                          value={bulkImport.html_content}
                          onChange={(e) => setBulkImport({...bulkImport, html_content: e.target.value})}
                          placeholder={`Cole aqui o HTML com as questões no formato:

<div class="questao">
  <p><strong>1)</strong> Uma bola é lançada...</p>
  <ul>
    <li>A) A velocidade é constante.</li>
    <li>B) A aceleração é zero...</li>
    <li>C) A velocidade aumenta...</li>
    <li>D) A aceleração é constante...</li>
    <li>E) O movimento é uniforme.</li>
  </ul>
  <p><em>Resposta: D</em></p>
</div>`}
                          rows={12}
                          className="font-mono text-sm"
                        />
                      </div>

                      <div className="flex gap-2">
                        <Button
                          type="button"
                          onClick={handleParseHTML}
                          className="flex-1 bg-blue-600 hover:bg-blue-700"
                          disabled={!bulkImport.html_content.trim()}
                        >
                          <Eye className="h-4 w-4 mr-2" />
                          Analisar HTML
                        </Button>
                        
                        {questoesParsed.length > 0 && (
                          <Button
                            type="button"
                            onClick={handleBulkImport}
                            className="flex-1 bg-[#6B46C1] hover:bg-[#6B46C1]/90"
                            disabled={importLoading || !bulkImport.materia_id}
                          >
                            {importLoading ? (
                              <>Importando...</>
                            ) : (
                              <>
                                <Download className="h-4 w-4 mr-2" />
                                Importar {questoesParsed.length} Questões
                              </>
                            )}
                          </Button>
                        )}
                      </div>

                      {/* Mensagem de Status */}
                      {importMessage && (
                        <div className={`p-3 rounded-lg flex items-center space-x-2 ${
                          importMessage.includes('✅') 
                            ? 'bg-green-100 text-green-800' 
                            : importMessage.includes('❌')
                            ? 'bg-red-100 text-red-800'
                            : 'bg-blue-100 text-blue-800'
                        }`}>
                          {importMessage.includes('✅') && <CheckCircle className="h-4 w-4" />}
                          {importMessage.includes('❌') && <AlertCircle className="h-4 w-4" />}
                          <span>{importMessage}</span>
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  {/* Pré-visualização das Questões Parseadas */}
                  <Card className="bg-white/95 backdrop-blur-sm">
                    <CardHeader>
                      <CardTitle className="text-[#6B46C1]">
                        Questões Encontradas ({questoesParsed.length})
                      </CardTitle>
                      <CardDescription>
                        Pré-visualização das questões que serão importadas
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      {questoesParsed.length === 0 ? (
                        <div className="text-center py-8 text-gray-500">
                          <Upload className="h-12 w-12 mx-auto mb-4 opacity-50" />
                          <p>Cole o HTML e clique em "Analisar HTML" para ver as questões</p>
                        </div>
                      ) : (
                        <div className="space-y-4 max-h-96 overflow-y-auto">
                          {questoesParsed.map((questao, index) => (
                            <div key={index} className="p-4 border rounded-lg bg-gray-50">
                              <h4 className="font-medium text-[#6B46C1] mb-2">
                                {index + 1}. {questao.pergunta.substring(0, 60)}...
                              </h4>
                              <div className="space-y-1 text-sm">
                                <div className={`p-1 rounded ${questao.resposta_correta === 'a' ? 'bg-green-100' : ''}`}>
                                  A) {questao.alternativas.a.substring(0, 40)}...
                                </div>
                                <div className={`p-1 rounded ${questao.resposta_correta === 'b' ? 'bg-green-100' : ''}`}>
                                  B) {questao.alternativas.b.substring(0, 40)}...
                                </div>
                                <div className={`p-1 rounded ${questao.resposta_correta === 'c' ? 'bg-green-100' : ''}`}>
                                  C) {questao.alternativas.c.substring(0, 40)}...
                                </div>
                                <div className={`p-1 rounded ${questao.resposta_correta === 'd' ? 'bg-green-100' : ''}`}>
                                  D) {questao.alternativas.d.substring(0, 40)}...
                                </div>
                                <div className={`p-1 rounded ${questao.resposta_correta === 'e' ? 'bg-green-100' : ''}`}>
                                  E) {questao.alternativas.e.substring(0, 40)}...
                                </div>
                              </div>
                              <Badge variant="outline" className="mt-2">
                                Resposta: {questao.resposta_correta.toUpperCase()}
                              </Badge>
                            </div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>
            </Tabs>
          </TabsContent>

          {/* Students Tab - FUNCIONALIDADE ATUALIZADA COM LIBERAÇÃO MANUAL */}
          <TabsContent value="students" className="mt-6">
            <Card className="bg-white/95 backdrop-blur-sm">
              <CardHeader>
                <div className="flex justify-between items-center">
                  <div>
                    <CardTitle className="text-[#6B46C1]">Alunos Cadastrados</CardTitle>
                    <CardDescription>Lista de todos os alunos da plataforma com controles avançados</CardDescription>
                  </div>
                  
                  {/* Filtros */}
                  <div className="flex items-center space-x-2">
                    <Filter className="h-4 w-4 text-gray-500" />
                    <Select value={studentFilter} onValueChange={(value: 'todos' | 'inativos') => setStudentFilter(value)}>
                      <SelectTrigger className="w-48">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="todos">Todos os Alunos</SelectItem>
                        <SelectItem value="inativos">
                          <div className="flex items-center">
                            <UserX className="h-4 w-4 mr-2" />
                            Inativos (15 dias+)
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {filteredStudents.map((student) => {
                    const quinzeDiasAtras = new Date()
                    quinzeDiasAtras.setDate(quinzeDiasAtras.getDate() - 15)
                    const ultimoAcesso = new Date(student.ultimo_acesso || student.created_at)
                    const isInativo = ultimoAcesso < quinzeDiasAtras
                    const isPremium = student.plan === 'premium' && student.upgrade_status
                    
                    return (
                      <div key={student.id} className="flex items-center justify-between p-4 border rounded-lg">
                        <div className="flex-1">
                          <div className="flex items-center space-x-3 mb-2">
                            <h4 className="font-medium text-[#6B46C1]">{student.full_name}</h4>
                            {getStatusBadge(student)}
                          </div>
                          <p className="text-sm text-gray-600">{student.email}</p>
                          <div className="flex items-center space-x-4 text-xs text-gray-500 mt-1">
                            <span>Cadastrado: {new Date(student.created_at).toLocaleDateString('pt-BR')}</span>
                            <span className="flex items-center">
                              <Clock className="h-3 w-3 mr-1" />
                              Último acesso: {new Date(student.ultimo_acesso || student.created_at).toLocaleDateString('pt-BR')}
                            </span>
                          </div>
                        </div>
                        
                        <div className="flex items-center space-x-2">
                          {/* Badge do Plano */}
                          <Badge 
                            variant={student.plan === 'premium' ? 'default' : 'secondary'}
                            className={student.plan === 'premium' ? 'bg-[#ECC94B] text-[#6B46C1]' : ''}
                          >
                            {student.plan === 'premium' ? (
                              <>
                                <Crown className="h-3 w-3 mr-1" />
                                Premium
                              </>
                            ) : (
                              'Gratuito'
                            )}
                          </Badge>
                          
                          {/* Botões de Controle */}
                          <div className="flex space-x-1">
                            {/* BOTÃO ATUALIZADO: Liberação/Bloqueio Manual de Acesso */}
                            <Button
                              size="sm"
                              variant={isPremium ? "destructive" : "default"}
                              className={isPremium ? "" : "bg-[#ECC94B] hover:bg-[#ECC94B]/90 text-[#6B46C1]"}
                              onClick={() => handleLiberarAcessoManual(student)}
                              title={isPremium ? "Bloquear Acesso Manualmente" : "Liberar Acesso Manualmente"}
                            >
                              {isPremium ? (
                                <>
                                  <Lock className="h-3 w-3 mr-1" />
                                  Bloquear Acesso
                                </>
                              ) : (
                                <>
                                  <UserCheck className="h-3 w-3 mr-1" />
                                  Liberar Acesso
                                </>
                              )}
                            </Button>
                            
                            {/* Botão de Enviar Mensagem (apenas para inativos) */}
                            {isInativo && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleSendMessage(student)}
                                title="Enviar mensagem de reativação"
                                className="text-blue-600 border-blue-600 hover:bg-blue-50"
                              >
                                <Mail className="h-3 w-3" />
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                  
                  {filteredStudents.length === 0 && (
                    <div className="text-center py-8 text-gray-500">
                      {studentFilter === 'inativos' ? (
                        <div>
                          <UserX className="h-12 w-12 mx-auto mb-4 opacity-50" />
                          <p>Nenhum aluno inativo encontrado</p>
                          <p className="text-sm">Todos os alunos acessaram recentemente!</p>
                        </div>
                      ) : (
                        <div>
                          <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                          <p>Nenhum aluno cadastrado ainda</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
                
                {/* Estatísticas dos Filtros */}
                {students.length > 0 && (
                  <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                      <div>
                        <div className="text-2xl font-bold text-[#6B46C1]">{students.length}</div>
                        <div className="text-sm text-gray-600">Total</div>
                      </div>
                      <div>
                        <div className="text-2xl font-bold text-green-600">
                          {students.filter(s => {
                            const quinzeDiasAtras = new Date()
                            quinzeDiasAtras.setDate(quinzeDiasAtras.getDate() - 15)
                            const ultimoAcesso = new Date(s.ultimo_acesso || s.created_at)
                            return ultimoAcesso >= quinzeDiasAtras
                          }).length}
                        </div>
                        <div className="text-sm text-gray-600">Ativos</div>
                      </div>
                      <div>
                        <div className="text-2xl font-bold text-red-600">
                          {students.filter(s => {
                            const quinzeDiasAtras = new Date()
                            quinzeDiasAtras.setDate(quinzeDiasAtras.getDate() - 15)
                            const ultimoAcesso = new Date(s.ultimo_acesso || s.created_at)
                            return ultimoAcesso < quinzeDiasAtras
                          }).length}
                        </div>
                        <div className="text-sm text-gray-600">Inativos</div>
                      </div>
                      <div>
                        <div className="text-2xl font-bold text-orange-600">
                          {students.filter(s => s.status_aluno === 'upgrade_bloqueado').length}
                        </div>
                        <div className="text-sm text-gray-600">Bloqueados</div>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Relatórios Tab - ATUALIZADO COM ESTATÍSTICAS */}
          <TabsContent value="relatorios" className="mt-6">
            <div className="grid md:grid-cols-2 gap-6">
              {/* Card de Estatísticas de Alunos */}
              <Card className="bg-white/95 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle className="text-[#6B46C1] flex items-center">
                    <Users className="h-5 w-5 mr-2" />
                    Estatísticas de Alunos
                  </CardTitle>
                  <CardDescription>Distribuição de alunos por tipo de plano</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-6">
                    {/* Total de Alunos */}
                    <div className="flex items-center justify-between p-4 bg-gradient-to-r from-purple-50 to-purple-100 rounded-lg">
                      <div>
                        <p className="text-sm text-gray-600">Total de Alunos</p>
                        <p className="text-3xl font-bold text-[#6B46C1]">{stats.totalAlunos}</p>
                      </div>
                      <Users className="h-12 w-12 text-[#6B46C1] opacity-50" />
                    </div>

                    {/* Alunos Gratuitos */}
                    <div className="flex items-center justify-between p-4 bg-gradient-to-r from-gray-50 to-gray-100 rounded-lg">
                      <div>
                        <p className="text-sm text-gray-600">Alunos Gratuitos</p>
                        <p className="text-3xl font-bold text-gray-700">{stats.alunosGratuitos}</p>
                        <p className="text-xs text-gray-500 mt-1">
                          {stats.totalAlunos > 0 
                            ? `${((stats.alunosGratuitos / stats.totalAlunos) * 100).toFixed(1)}% do total`
                            : '0% do total'
                          }
                        </p>
                      </div>
                      <div className="h-12 w-12 rounded-full bg-gray-300 flex items-center justify-center">
                        <Users className="h-6 w-6 text-gray-600" />
                      </div>
                    </div>

                    {/* Alunos Premium */}
                    <div className="flex items-center justify-between p-4 bg-gradient-to-r from-yellow-50 to-yellow-100 rounded-lg">
                      <div>
                        <p className="text-sm text-gray-600">Alunos Premium</p>
                        <p className="text-3xl font-bold text-[#ECC94B]">{stats.alunosPremium}</p>
                        <p className="text-xs text-gray-500 mt-1">
                          {stats.totalAlunos > 0 
                            ? `${((stats.alunosPremium / stats.totalAlunos) * 100).toFixed(1)}% do total`
                            : '0% do total'
                          }
                        </p>
                      </div>
                      <Crown className="h-12 w-12 text-[#ECC94B] opacity-70" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Card de Receita */}
              <Card className="bg-white/95 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle className="text-[#6B46C1] flex items-center">
                    <DollarSign className="h-5 w-5 mr-2" />
                    Receita de Acessos Premium
                  </CardTitle>
                  <CardDescription>Valor total gerado com vendas de acessos premium</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-6">
                    {/* Valor Total em Vendas */}
                    <div className="p-6 bg-gradient-to-br from-green-50 to-emerald-100 rounded-lg border-2 border-green-200">
                      <div className="flex items-center justify-between mb-4">
                        <p className="text-sm font-medium text-gray-600">Valor Total em Vendas</p>
                        <TrendingUp className="h-5 w-5 text-green-600" />
                      </div>
                      <p className="text-4xl font-bold text-green-700 mb-2">
                        R$ {stats.valorTotalVendas.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </p>
                      <p className="text-xs text-gray-600">
                        Baseado em {stats.alunosPremium} acessos premium vendidos
                      </p>
                    </div>

                    {/* Detalhamento */}
                    <div className="space-y-3">
                      <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <span className="text-sm text-gray-600">Valor por Acesso Premium</span>
                        <span className="font-semibold text-[#6B46C1]">
                          R$ {VALOR_PREMIUM.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                      </div>

                      <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <span className="text-sm text-gray-600">Total de Acessos Vendidos</span>
                        <span className="font-semibold text-[#6B46C1]">{stats.alunosPremium}</span>
                      </div>

                      <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <span className="text-sm text-gray-600">Ticket Médio</span>
                        <span className="font-semibold text-[#6B46C1]">
                          R$ {stats.totalAlunos > 0 
                            ? (stats.valorTotalVendas / stats.totalAlunos).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                            : '0,00'
                          }
                        </span>
                      </div>

                      <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <span className="text-sm text-gray-600">Taxa de Conversão</span>
                        <span className="font-semibold text-[#6B46C1]">
                          {stats.totalAlunos > 0 
                            ? `${((stats.alunosPremium / stats.totalAlunos) * 100).toFixed(1)}%`
                            : '0%'
                          }
                        </span>
                      </div>
                    </div>

                    {/* Observação */}
                    <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                      <p className="text-xs text-blue-800">
                        <strong>Nota:</strong> Os valores são calculados com base no plano atual dos alunos. 
                        O valor por acesso premium é de R$ {VALOR_PREMIUM.toFixed(2)}.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  )
}
