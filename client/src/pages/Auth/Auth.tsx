import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../components/ui/card";

const Auth = () => {
  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute inset-0 bg-[var(--gradient-glow)] pointer-events-none" />

      <Card className="w-full max-w-md relative backdrop-blur-sm border-border/50 shadow-[var(--shadow-elevated)]">
        <CardHeader className="space-y-1">
          <div className="flex items-center justify-center mb-4">
            <div className="w-16 h-16 rounded-lg bg-gradient-to-br from-primary via-secondary to-accent flex items-center justify-center">
            </div>
          </div>

          <CardTitle className="text-2xl text-center bg-gradient-to-r from-primary via-secondary to-accent bg-clip-text text-transparent font-bold">
            DataViz Analytics
          </CardTitle>

          <CardDescription className="text-center">
            Faça login para acessar suas visualizações
          </CardDescription>
        </CardHeader>

        <CardContent>
          <form className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <div className="relative">
                {/* Mail SVG inline */}
                <svg className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M4 4h16v16H4V4zm0 0l8 8 8-8" />
                </svg>
                <Input
                  id="email"
                  type="email"
                  placeholder="seu@email.com"
                  className="pl-10"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Senha</Label>
              <div className="relative">
                {/* Lock SVG inline */}
                <svg className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2a5 5 0 00-5 5v3H6a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V12a2 2 0 00-2-2h-1V7a5 5 0 00-5-5zM9 7a3 3 0 016 0v3H9V7z" />
                </svg>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  className="pl-10"
                />
              </div>
            </div>

            <Button
              type="button"
              className="w-full bg-gradient-to-r from-primary via-secondary to-accent hover:opacity-90 transition-opacity"
            >
              Entrar
            </Button>

            <div className="text-center">
              <button
                type="button"
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
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
