// src/pages/Home/Home.tsx
import { useState } from 'react';
import { Card, CardHeader, CardContent, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Mail, Lock } from 'lucide-react';

export default function Home() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log({ email, password });
    // Aqui você integraria com seu backend depois
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-zinc-900 flex items-center justify-center p-4">
      <Card className="w-full max-w-md border border-slate-700 bg-slate-800/50 backdrop-blur-sm">
        <CardHeader className="text-center space-y-3">
          {/* Logo ou ícone */}
          <div className="mx-auto w-14 h-14 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-500 flex items-center justify-center">
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
          <CardTitle className="text-2xl font-bold text-white">Bem-vindo de volta</CardTitle>
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
                <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <Input
                  id="email"
                  type="email"
                  placeholder="seu@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-10 bg-slate-700/50 border-slate-600 text-white placeholder-slate-400 focus:ring-cyan-500 focus:border-cyan-500"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <Label htmlFor="password" className="text-slate-300">
                  Senha
                </Label>
                <a href="#" className="text-sm text-cyan-400 hover:text-cyan-300 transition-colors">
                  Esqueceu?
                </a>
              </div>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10 bg-slate-700/50 border-slate-600 text-white placeholder-slate-400 focus:ring-cyan-500 focus:border-cyan-500"
                  required
                />
              </div>
            </div>

            <Button
              type="submit"
              className="w-full bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white font-semibold py-2 rounded-md transition-all"
            >
              Entrar
            </Button>
          </form>

          <div className="mt-6 text-center text-sm text-slate-400">
            Não tem uma conta?{' '}
            <a href="#" className="text-cyan-400 hover:text-cyan-300 font-medium underline">
              Criar conta
            </a>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}