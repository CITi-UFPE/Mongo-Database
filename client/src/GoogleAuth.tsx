import { GoogleLogin } from "@react-oauth/google";
import axios from "axios";
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

declare global {
  interface Window {
    google?: {
      accounts?: {
        id?: {
          initialize: (opts: {
            client_id: string;
            callback: (response: { credential?: string; [k: string]: any }) => void;
            // other optional options can be added here
          }) => void;
          renderButton?: (element: HTMLElement, options?: Record<string, any>) => void;
          prompt?: () => void;
        };
      };
    };
  }
}

export default function GoogleAuth() {
  const navigate = useNavigate();

  const handleSuccess = async (response: any) => {
    try {
      // Enviar o token para o servidor
      const { data } = await axios.post("/api/auth/google", {
        token: response.credential, // Google token
      });

      // Armazenar o token JWT no localStorage ou em cookies
      localStorage.setItem("authToken", data.token);

      // Redireciona para a página analytics
      navigate("/analytics");
    } catch (error) {
      console.error("Erro na autenticação com o Google", error);
    }
  };

  useEffect(() => {
    // Certifique-se de inicializar o cliente Google antes de usá-lo
    window.google?.accounts?.id?.initialize({
      client_id: "YOUR_GOOGLE_CLIENT_ID",
      callback: handleSuccess,
    });
  }, []);

  return (
    <div>
      <GoogleLogin onSuccess={handleSuccess} />
    </div>
  );
}