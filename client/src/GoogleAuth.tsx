import { useNavigate } from "react-router-dom";
import { useState, useRef } from "react";
import axios from "axios";
import {
  Card,
  CardHeader,
  CardContent,
  CardTitle,
  CardDescription
} from "@/components/ui/card"
import Iridescence from "@/components/Iridescence"
import AnimatedLogo from "@/components/AnimatedLogo"
import { apiClient } from "@/services/api"
import { GoogleLogin, type CredentialResponse } from "@react-oauth/google"
import { useAuth } from "./context/AuthContext";
import { canAccessAnalytics, isPendingAccess } from "./types/auth";

interface GoogleLoginResponse {
  token?: string;
  access_token?: string;
  jwt?: string;
  id_token?: string;
  user?: unknown;
}

const resolveJwtToken = (payload: GoogleLoginResponse): string | null => {
  const candidate = payload.token ?? payload.access_token ?? payload.jwt ?? payload.id_token;
  if (!candidate) {
    return null;
  }

  const normalized = candidate.trim();
  return normalized.length > 0 ? normalized : null;
};

const logGoogleAuthError = (error: unknown) => {
  if (axios.isAxiosError(error)) {
    console.error("❌ [GoogleAuth] Erro no login:", {
      message: error.message,
      status: error.response?.status,
      data: error.response?.data,
    });
    return;
  }

  if (error instanceof Error) {
    console.error("❌ [GoogleAuth] Erro no login:", error.message);
    return;
  }

  console.error("❌ [GoogleAuth] Erro no login:", error);
};

export default function GoogleAuth() {
  const navigate = useNavigate();
  const { login, isAuthenticated, isLoading, user } = useAuth();
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const googleButtonRef = useRef<HTMLDivElement>(null);

  // Redireciona usuários já autenticados
  if (!isLoading && isAuthenticated) {
    if (user?.onboarding_required || user?.status === "Nao Cadastrado") {
      navigate("/onboarding", { replace: true });
      return null;
    }

    if (isPendingAccess(user)) {
      navigate("/analytics", { replace: true }); // ✅ Manda pro Dashboard
      return null;
    }

    navigate(canAccessAnalytics(user) ? "/analytics" : "/home", { replace: true });
    return null;
  }

  const handleGoogleSuccess = async (credentialResponse: CredentialResponse) => {
    try {
      setIsLoggingIn(true);
      console.log("🔵 [GoogleAuth] 1. Login Google iniciado");
      console.log("🔵 [GoogleAuth] 2. Credential recebido:", credentialResponse.credential?.substring(0, 30));

      const res = await apiClient.post<GoogleLoginResponse>("/auth/google", {
        idToken: credentialResponse.credential,
      });

      const jwtToken = resolveJwtToken(res.data);
      const responseUser = res.data.user as { email?: string } | null;

      console.log("🔵 [GoogleAuth] 3. Resposta do servidor:", res.status);
      console.log("🔵 [GoogleAuth] 4. Token recebido:", jwtToken?.substring(0, 30));
      console.log("🔵 [GoogleAuth] 5. User recebido:", responseUser?.email);

      if (!jwtToken) {
        console.error("❌ [GoogleAuth] Sem token na resposta!");
        throw new Error("Sem token na resposta do backend");
      }

      console.log("🔵 [GoogleAuth] 6. Iniciando login no Context...");
      const authenticatedUser = await login(jwtToken, res.data.user);
      console.log("🔵 [GoogleAuth] 7. Login no Context completado");
      console.log("🔵 [GoogleAuth] User após normalização:", {
        email: authenticatedUser.email,
        role: authenticatedUser.role,
        department: authenticatedUser.department,
        nivel_acesso: authenticatedUser.nivel_acesso,
      });

      let destination = "/home";

      if (authenticatedUser.onboarding_required || authenticatedUser.status === "Nao Cadastrado") {
        destination = "/onboarding";
      } else if (isPendingAccess(authenticatedUser)) {
        destination = "/analytics"; // ✅ Vai direto ver os gráficos!
      } else if (canAccessAnalytics(authenticatedUser)) {
        destination = "/analytics";
      }

      console.log(`🔵 [GoogleAuth] 8. Redirecionando para ${destination}...`);
      navigate(destination);
      console.log("🔵 [GoogleAuth] 9. Navigate chamado");

    } catch (err: unknown) {
      logGoogleAuthError(err);
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleCustomButtonClick = () => {
    // Trigger the hidden Google Login button
    const googleBtn = googleButtonRef.current?.querySelector('div[role="button"]') as HTMLElement;
    if (googleBtn) {
      googleBtn.click();
    }
  };

  return (
    <div className="relative w-full h-screen">
      <Iridescence color={[0.5, 0.7, 0.6]} speed={1.2} amplitude={0.15} mouseReact={false} />
      <Card className="absolute w-full max-w-md -translate-x-1/2 -translate-y-1/2 border opacity-100 border-slate-700 bg-slate-800/80 backdrop-blur-sm top-1/2 left-1/2">
        <CardHeader className="space-y-3 text-center">
          <AnimatedLogo className="w-20 mx-auto" />
          <CardTitle className="text-2xl font-bold text-white">Data Lake</CardTitle>
          <CardDescription className="text-slate-400">
            Faça login para acessar sua conta
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* CUSTOM GOOGLE LOGIN BUTTON 👇 */}
          <button
            onClick={handleCustomButtonClick}
            disabled={isLoggingIn}
            className="group relative flex items-center justify-center w-full gap-3 px-6 py-3.5 text-base font-medium text-white transition-all duration-300 bg-slate-700/50 border border-slate-600 rounded-lg shadow-lg hover:bg-slate-700/70 hover:border-slate-500 hover:shadow-xl focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-cyan-500 disabled:opacity-50 disabled:cursor-not-allowed backdrop-blur-sm overflow-hidden"
          >
            {/* Gradient overlay on hover */}
            <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/10 via-blue-500/10 to-purple-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            
            {/* Custom Google Logo with Gradient */}
            <svg className="relative w-5 h-5" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <linearGradient id="googleGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#5eead4" />
                  <stop offset="50%" stopColor="#60a5fa" />
                  <stop offset="100%" stopColor="#a78bfa" />
                </linearGradient>
              </defs>
              <g transform="matrix(1, 0, 0, 1, 27.009001, -39.238998)">
                <path fill="url(#googleGradient)" d="M -3.264 51.509 C -3.264 50.719 -3.334 49.969 -3.454 49.239 L -14.754 49.239 L -14.754 53.749 L -8.284 53.749 C -8.574 55.229 -9.424 56.479 -10.684 57.329 L -10.684 60.329 L -6.824 60.329 C -4.564 58.239 -3.264 55.159 -3.264 51.509 Z"/>
                <path fill="url(#googleGradient)" opacity="0.8" d="M -14.754 63.239 C -11.514 63.239 -8.804 62.159 -6.824 60.329 L -10.684 57.329 C -11.764 58.049 -13.134 58.489 -14.754 58.489 C -17.884 58.489 -20.534 56.379 -21.484 53.529 L -25.464 53.529 L -25.464 56.619 C -23.494 60.539 -19.444 63.239 -14.754 63.239 Z"/>
                <path fill="url(#googleGradient)" opacity="0.9" d="M -21.484 53.529 C -21.734 52.809 -21.864 52.039 -21.864 51.239 C -21.864 50.439 -21.724 49.669 -21.484 48.949 L -21.484 45.859 L -25.464 45.859 C -26.284 47.479 -26.754 49.299 -26.754 51.239 C -26.754 53.179 -26.284 54.999 -25.464 56.619 L -21.484 53.529 Z"/>
                <path fill="url(#googleGradient)" opacity="0.7" d="M -14.754 43.989 C -12.984 43.989 -11.404 44.599 -10.154 45.789 L -6.734 42.369 C -8.804 40.429 -11.514 39.239 -14.754 39.239 C -19.444 39.239 -23.494 41.939 -25.464 45.859 L -21.484 48.949 C -20.534 46.099 -17.884 43.989 -14.754 43.989 Z"/>
              </g>
            </svg>
            
            <span className="relative font-semibold">
              {isLoggingIn ? "Fazendo login..." : "Fazer Login com o Google"}
            </span>
          </button>

          {/* HIDDEN GOOGLE LOGIN - Triggered by custom button */}
          <div ref={googleButtonRef} className="hidden">
            <GoogleLogin
              onSuccess={handleGoogleSuccess}
              onError={() => {
                console.log("❌ [GoogleAuth] Erro no popup de Google");
                setIsLoggingIn(false);
              }}
            />
          </div>

          <div className="mt-6 text-sm text-center text-slate-400">
            Caso não seja usuário no Data Lake, entre em contato com a área de dados.
          </div>
        </CardContent>
      </Card>
    </div>
  );
}