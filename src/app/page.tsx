import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { BookOpen, Brain, Trophy, Users, Instagram } from 'lucide-react'
import WhatsAppButton from '@/components/WhatsAppButton'

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#6B46C1] via-purple-600 to-[#ECC94B]">
      {/* Header */}
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
              <Link href="/vendas">Criar conta</Link>
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
          
          <Card className="max-w-2xl mx-auto bg-white/95 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-2xl text-[#6B46C1]">Como funciona?</CardTitle>
            </CardHeader>
            <CardContent className="text-gray-700">
              <p className="text-lg leading-relaxed">
                Experimente <strong>2 questões gratuitas</strong> para conhecer nossa plataforma.
              </p>
              <p className="text-lg leading-relaxed mt-4">
                Para desbloquear todos os simulados (90 questões por matéria) e trilhas de estudo, 
                ative o plano Premium por apenas <span className="font-bold text-[#ECC94B]">R$19,90</span>.
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Features */}
        <div className="grid md:grid-cols-3 gap-8 mb-16">
          <Card className="bg-white/10 backdrop-blur-sm border-white/20">
            <CardHeader>
              <BookOpen className="h-12 w-12 text-[#ECC94B] mb-4" />
              <CardTitle className="text-white">Simulados Completos</CardTitle>
              <CardDescription className="text-white/80">
                Mais de 90 questões por matéria, organizadas por disciplina
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="bg-white/10 backdrop-blur-sm border-white/20">
            <CardHeader>
              <Brain className="h-12 w-12 text-[#ECC94B] mb-4" />
              <CardTitle className="text-white">Se prepare e arrase</CardTitle>
              <CardDescription className="text-white/80">
                Estude de forma inteligente e eficiente
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="bg-white/10 backdrop-blur-sm border-white/20">
            <CardHeader>
              <Trophy className="h-12 w-12 text-[#ECC94B] mb-4" />
              <CardTitle className="text-white">Resultados Reais</CardTitle>
              <CardDescription className="text-white/80">
                Acompanhe seu progresso e melhore suas notas
              </CardDescription>
            </CardHeader>
          </Card>
        </div>

        {/* CTA */}
        <div className="text-center">
          <div className="space-x-4">
            <Button asChild size="lg" className="bg-[#ECC94B] text-[#6B46C1] hover:bg-[#ECC94B]/90 text-lg px-8 py-3">
              <Link href="/vendas">Começar Gratuitamente</Link>
            </Button>
            <Button asChild variant="outline" size="lg" className="bg-white/10 border-white/20 text-white hover:bg-white/20 text-lg px-8 py-3">
              <Link href="/login">Já tenho conta</Link>
            </Button>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="container mx-auto px-4 py-8 mt-16 border-t border-white/20">
        <div className="text-center text-white/70">
          <p>&copy; 2025 Simulado ENEM. Todos os direitos reservados.</p>
        </div>
      </footer>

      {/* Botão WhatsApp fixo */}
      <WhatsAppButton />
    </div>
  )
}
