import { supabase } from './supabase'

export async function signUp(email: string, password: string, fullName: string) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: fullName,
      }
    }
  })

  if (error) throw error

  // Create profile
  if (data.user) {
    // Verificar se é o email do admin
    const isAdmin = email === 'netinhabandeira9@gmail.com'
    
    const { error: profileError } = await supabase
      .from('profiles')
      .insert({
        id: data.user.id,
        email: data.user.email!,
        full_name: fullName,
        role: isAdmin ? 'admin' : 'aluno',
        plan: isAdmin ? 'premium' : 'gratuito'
      })

    if (profileError) throw profileError
  }

  return data
}

export async function signIn(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  if (error) throw error
  return data
}

export async function signOut() {
  const { error } = await supabase.auth.signOut()
  if (error) throw error
}

export async function getCurrentUser() {
  const { data: { user } } = await supabase.auth.getUser()
  return user
}

export async function getUserProfile(userId: string) {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single()

    if (error) {
      console.error('Erro ao carregar perfil:', error)
      throw error
    }
    
    return data
  } catch (error) {
    console.error('Erro ao carregar usuário:', error)
    throw error
  }
}

// Função para verificar se o usuário tem acesso
export async function checkUserAccess() {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return null
    }

    const { data: profile, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single()

    if (error) {
      console.error('Erro ao verificar acesso:', error)
      return null
    }

    return { user, profile }
  } catch (error) {
    console.error('Erro ao verificar acesso:', error)
    return null
  }
}

// Função para criar usuário admin inicial
export async function createAdminUser() {
  const adminEmail = 'admin@simuladoenem.com'
  const adminPassword = 'admin123456'
  const adminName = 'Administrador'

  try {
    // Criar usuário no Supabase Auth
    const { data, error } = await supabase.auth.signUp({
      email: adminEmail,
      password: adminPassword,
      options: {
        data: {
          full_name: adminName,
        }
      }
    })

    if (error) throw error

    // Criar perfil admin
    if (data.user) {
      const { error: profileError } = await supabase
        .from('profiles')
        .insert({
          id: data.user.id,
          email: data.user.email!,
          full_name: adminName,
          role: 'admin',
          plan: 'premium'
        })

      if (profileError) throw profileError
    }

    return data
  } catch (error: any) {
    // Se o usuário já existe, não é erro
    if (error.message?.includes('already registered')) {
      throw new Error('Usuário admin já existe')
    }
    throw error
  }
}
