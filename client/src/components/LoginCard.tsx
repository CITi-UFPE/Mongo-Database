// src/components/LoginCard.tsx
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { Logo } from "./Logo";

interface LoginFormValues {
  email: string;
  password: string;
}

export const LoginCard: React.FC = () => {
  const [formData, setFormData] = useState<LoginFormValues>({
    email: "",
    password: "",
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log("Login attempt:", formData);
    // Aqui você faria a chamada à API de login
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  return (
    <Card className="w-full max-w-md mx-auto mt-20 p-6 bg-gray-900 border border-gray-800 shadow-xl">
      <CardHeader className="text-center">
        <Logo />
        <CardTitle className="mt-4 text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-green-400 to-purple-500">
          DataViz Analytics
        </CardTitle>
        <p className="text-sm text-gray-400 mt-1">
          Faça login para acessar suas visualizações
        </p>
      </CardHeader>

      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="email" className="text-white">
              Email
            </Label>
            <div className="relative">
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="seu@email.com"
                value={formData.email}
                onChange={handleInputChange}
                className="pl-10 bg-gray-800 text-white border-gray-700 focus:border-green-500"
              />
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M16 12l-4-4-4 4M12 16v-4M12 16l4 4 4-4M12 16l-4 4-4-4"
                />
              </svg>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="password" className="text-white">
              Senha
            </Label>
            <div className="relative">
              <Input
                id="password"
                name="password"
                type="password"
                placeholder="********"
                value={formData.password}
                onChange={handleInputChange}
                className="pl-10 bg-gray-800 text-white border-gray-700 focus:border-green-500"
              />
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v6h8z"
                />
              </svg>
            </div>
          </div>

          <Button
            type="submit"
            className="w-full bg-gradient-to-r from-green-400 to-purple-500 hover:from-green-500 hover:to-purple-600 text-white font-medium py-2 px-4 rounded-lg transition-all"
          >
            Entrar
          </Button>
        </form>

        <div className="mt-4 text-center">
          <p className="text-sm text-gray-400">
            Não tem uma conta?{" "}
            <a href="#" className="text-green-400 hover:underline">
              Cadastre-se
            </a>
          </p>
        </div>
      </CardContent>
    </Card>
  );
};