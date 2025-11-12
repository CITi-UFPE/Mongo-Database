import { GoogleLogin } from "@react-oauth/google";
import axios from "axios";
import { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";

export default function GoogleAuth() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const handleSuccess = async (response: any) => {
    try {
      console.log("✅ 1. handleSuccess chamado");
      console.log("✅ 2. Credential:", response.credential?.substring(0, 50));
      
      const { data } = await axios.post("http://localhost:5000/auth/google", {
        id_token: response.credential,
      });

      console.log("✅ 3. Resposta:", data);
      localStorage.setItem("authToken", data.token);
      console.log("✅ 4. Redirecionando...");
      navigate("/analytics");
    } catch (error: any) {
      console.error("❌ Erro:", error.message);
    }
  };

  useEffect(() => {
    const token = searchParams.get("token");
    if (token) {
      localStorage.setItem("authToken", token);
      navigate("/analytics");
    }
  }, [searchParams, navigate]);

  return (
    <div>
      <GoogleLogin onSuccess={handleSuccess} />
    </div>
  );
}