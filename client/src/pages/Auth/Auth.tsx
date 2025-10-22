import { useState } from "react"
import {
  Card,
  CardHeader,
  CardContent,
  CardTitle,
  CardDescription
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Mail, Lock, Car } from "lucide-react"
import PixelBlast from "@/components/PixelBlast"
import Iridescence from "@/components/Iridescence"

export default function Home() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    console.log({ email, password })
  }

  return (
    <div className="relative w-full h-screen">
        <Iridescence color={[0.5, 0.7, 0.6]} speed={1.2} amplitude={0.15} mouseReact={false} />
        <Card className="absolute w-full max-w-md -translate-x-1/2 -translate-y-1/2 border opacity-100 border-slate-700 bg-slate-800/80 backdrop-blur-sm top-1/2 left-1/2">
        <CardHeader className="space-y-3 text-center">
          {/* Logo ou ícone */}
          <div className="flex items-center justify-center mx-auto w-14 h-14 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-500">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="white"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M12 2v20h8a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2z" />
              <path d="M4 4h8v16H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z" />
            </svg>
          </div>
          <CardTitle className="text-2xl font-bold text-white">Data Lake CITi</CardTitle>
          <CardDescription className="text-slate-400">
            Faça login para acessar sua conta
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-slate-300">
                Email
              </Label>
              <div className="relative">
                <Mail className="absolute w-4 h-4 -translate-y-1/2 left-3 top-1/2 text-slate-400" />
                <Input
                  id="email"
                  type="email"
                  placeholder="seu@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-10 text-white bg-slate-700/50 border-slate-600 placeholder-slate-400 focus:ring-cyan-500 focus:border-cyan-500"
                  required
                />
              </div>
            </div>
                    <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password" className="text-slate-300">
                  Senha
                </Label>
                <a href="#" className="text-sm transition-colors text-cyan-400 hover:text-cyan-300">
                  Esqueceu?
                </a>
              </div>
              <div className="relative">
                <Lock className="absolute w-4 h-4 -translate-y-1/2 left-3 top-1/2 text-slate-400" />
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10 text-white bg-slate-700/50 border-slate-600 placeholder-slate-400 focus:ring-cyan-500 focus:border-cyan-500"
                  required
                />
              </div>
            </div>

            <Button
              type="submit"
              className="w-full py-2 font-semibold text-white transition-all rounded-md bg-gradient-to-r from-green-400 via-blue-500 to-purple-600 hover:from-green-500 hover:via-blue-600 hover:to-purple-700">
              Entrar
            </Button>
          </form>

          <div className="mt-6 text-sm text-center text-slate-400">
            Não tem uma conta?{' '}
            <a href="#" className="font-medium underline text-cyan-400 hover:text-cyan-300">
              Criar conta
            </a>
          </div>
        </CardContent>
      </Card>
        
  
  

</div>

  )
}
