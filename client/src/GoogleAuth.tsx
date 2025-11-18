import { useNavigate } from "react-router-dom";
import {
  Card,
  CardHeader,
  CardContent,
  CardTitle,
  CardDescription
} from "@/components/ui/card"
import Iridescence from "@/components/Iridescence"
import AnimatedLogo from "@/components/AnimatedLogo"
import axios from "axios"
import { GoogleLogin } from "@react-oauth/google"
import { useAuth } from "./context/AuthContext";

export default function GoogleAuth() {
  const navigate = useNavigate();
  const { login } = useAuth();

  const handleGoogleSuccess = async (credentialResponse: any) => {
    try {
      console.log("🔵 [GoogleAuth] 1. Login Google iniciado");
      console.log("🔵 [GoogleAuth] 2. Credential recebido:", credentialResponse.credential?.substring(0, 30));
      
      const res = await axios.post("http://localhost:5000/auth/google", {
        id_token: credentialResponse.credential,
      });
      
      console.log("🔵 [GoogleAuth] 3. Resposta do servidor:", res.status);
      console.log("🔵 [GoogleAuth] 4. Token recebido:", res.data.token?.substring(0, 30));
      console.log("🔵 [GoogleAuth] 5. User recebido:", res.data.user?.email);
      
      if (!res.data.token) {
        console.error("❌ [GoogleAuth] Sem token na resposta!");
        return;
      }
      
      console.log("🔵 [GoogleAuth] 6. Iniciando login no Context...");
      login(res.data.token, res.data.user);
      console.log("🔵 [GoogleAuth] 7. Login no Context completado");
      
      console.log("🔵 [GoogleAuth] 8. Redirecionando para /analytics...");
      navigate("/analytics");
      console.log("🔵 [GoogleAuth] 9. Navigate chamado");
      
    } catch (err: any) {
      console.error("❌ [GoogleAuth] Erro no login:", err.message);
      console.error("❌ [GoogleAuth] Status:", err.response?.status);
      console.error("❌ [GoogleAuth] Dados erro:", err.response?.data);
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
          {/* LOGIN COM GOOGLE 👇 */}
          <GoogleLogin
            onSuccess={handleGoogleSuccess}
            onError={() => {
              console.log("❌ [GoogleAuth] Erro no popup de Google");
            }}
          />

          <div className="mt-6 text-sm text-center text-slate-400">
            Caso não seja usuário no Data Lake, entre em contato com a área de dados.
          </div>
        </CardContent>
      </Card>
    </div>
  );
}