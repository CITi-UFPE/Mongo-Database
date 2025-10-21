// src/pages/Auth.tsx ou src/components/Auth.tsx
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const Auth = () => {
  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background">
      <Card className="w-full max-w-md border border-border/50 shadow-lg bg-card">
        <CardHeader className="space-y-4 text-center">
          {/* Ícone com gradiente */}
          <div className="flex justify-center">
            <div className="w-16 h-16 rounded-lg bg-gradient-to-br from-green-400 to-purple-500 flex items-center justify-center">
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
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
                <line x1="16" y1="13" x2="8" y2="13" />
                <line x1="16" y1="17" x2="8" y2="17" />
                <polyline points="10 9 9 9 8 9" />
              </svg>
            </div>
          </div>

          <CardTitle className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-green-400 to-purple-500">
            DataViz Analytics
          </CardTitle>

          <CardDescription className="text-muted-foreground">
            Faça login para acessar suas visualizações
          </CardDescription>
        </CardHeader>

        <CardContent>
          <form className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-foreground">
                Email
              </Label>
              <div className="relative">
                <svg
                  className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                  />
                </svg>
                <Input
                  id="email"
                  type="email"
                  placeholder="seu@email.com"
                  className="pl-10 bg-background"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-foreground">
                Senha
              </Label>
              <div className="relative">
                <svg
                  className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4"
                  />
                </svg>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  className="pl-10 bg-background"
                />
              </div>
            </div>

            <Button
              type="submit"
              className="w-full bg-gradient-to-r from-green-400 to-purple-500 hover:from-green-500 hover:to-purple-600 text-white font-medium"
            >
              Entrar
            </Button>

            <div className="text-center pt-2">
              <button
                type="button"
                className="text-sm text-muted-foreground hover:text-foreground transition-colors underline-offset-4 hover:underline"
              >
                Não tem uma conta? Cadastre-se
              </button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default Auth;