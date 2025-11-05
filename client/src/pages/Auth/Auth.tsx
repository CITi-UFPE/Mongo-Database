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
import { Mail, Lock } from "lucide-react"
import Iridescence from "@/components/Iridescence"
import AnimatedLogo from "@/components/AnimatedLogo"
import axios from "axios"
import { GoogleLogin } from "@react-oauth/google"

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
          <AnimatedLogo className="w-20 mx-auto" />
          <CardTitle className="text-2xl font-bold text-white">Data Lake</CardTitle>
          <CardDescription className="text-slate-400">
            Faça login para acessar sua conta
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* LOGIN COM GOOGLE 👇 */}
          <GoogleLogin
            onSuccess={async (credentialResponse) => {
              try {
                const res = await axios.post("https://localhost:5000/auth/google", {
                  id_token: credentialResponse.credential,
                });
                console.log("Usuário autenticado:", res.data);
              } catch (err) {
                console.error("Erro no login:", err);
              }
            }}
            onError={() => {
              console.log("Erro ao logar com Google");
            }}
          />

          <div className="mt-6 text-sm text-center text-slate-400">
            Caso não seja usuário no Data Lake, entre em contato com a área de dados.
          </div>
        </CardContent>
      </Card>
        
  
  

</div>

  )
}
