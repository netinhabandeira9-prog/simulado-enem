import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''

// Validar se as variáveis estão configuradas
if (!supabaseUrl || !supabaseAnonKey) {
  console.error('⚠️ SUPABASE NÃO CONFIGURADO - Variáveis de ambiente faltando')
  console.error('Configure NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY')
}

export const supabase = supabaseUrl && supabaseAnonKey 
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null as any // Fallback para evitar erro de inicialização

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          email: string
          full_name: string
          role: 'admin' | 'aluno'
          plan: 'gratuito' | 'premium'
          plan_expires_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          email: string
          full_name: string
          role?: 'admin' | 'aluno'
          plan?: 'gratuito' | 'premium'
          plan_expires_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          full_name?: string
          role?: 'admin' | 'aluno'
          plan?: 'gratuito' | 'premium'
          plan_expires_at?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      materias: {
        Row: {
          id: number
          nome: string
          descricao: string
          created_at: string
        }
        Insert: {
          id?: number
          nome: string
          descricao: string
          created_at?: string
        }
        Update: {
          id?: number
          nome?: string
          descricao?: string
          created_at?: string
        }
      }
      questoes: {
        Row: {
          id: number
          materia_id: number
          pergunta: string
          alternativa_a: string
          alternativa_b: string
          alternativa_c: string
          alternativa_d: string
          correta: string
          dificuldade: string
          created_at: string
        }
        Insert: {
          id?: number
          materia_id: number
          pergunta: string
          alternativa_a: string
          alternativa_b: string
          alternativa_c: string
          alternativa_d: string
          correta: string
          dificuldade: string
          created_at?: string
        }
        Update: {
          id?: number
          materia_id?: number
          pergunta?: string
          alternativa_a?: string
          alternativa_b?: string
          alternativa_c?: string
          alternativa_d?: string
          correta?: string
          dificuldade?: string
          created_at?: string
        }
      }
      resultados: {
        Row: {
          id: number
          aluno_id: string
          materia_id: number
          pontuacao: number
          data: string
        }
        Insert: {
          id?: number
          aluno_id: string
          materia_id: number
          pontuacao: number
          data?: string
        }
        Update: {
          id?: number
          aluno_id?: string
          materia_id?: number
          pontuacao?: number
          data?: string
        }
      }
      assinaturas: {
        Row: {
          id: number
          aluno_id: string
          status: 'ativo' | 'inativo'
          data_inicio: string
          data_fim: string
          created_at: string
        }
        Insert: {
          id?: number
          aluno_id: string
          status: 'ativo' | 'inativo'
          data_inicio: string
          data_fim: string
          created_at?: string
        }
        Update: {
          id?: number
          aluno_id?: string
          status?: 'ativo' | 'inativo'
          data_inicio?: string
          data_fim?: string
          created_at?: string
        }
      }
    }
  }
}
