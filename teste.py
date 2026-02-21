import os
import google.generativeai as genai
from dotenv import load_dotenv

# Aponta para o .env dentro da pasta server
dotenv_path = os.path.join("server", ".env")
load_dotenv(dotenv_path=dotenv_path)

def executar_teste():
    api_key = os.getenv("GEMINI_API_KEY")
    
    if not api_key:
        print("❌ ERRO: Chave não encontrada no .env")
        return

    print(f"--- Testando Chave: {api_key[:10]}... ---")

    try:
        genai.configure(api_key=api_key)

        # Listar modelos disponíveis para ver qual nome o Google quer
        print("Buscando modelos disponíveis...")
        modelos_disponiveis = []
        for m in genai.list_models():
            if 'generateContent' in m.supported_generation_methods:
                modelos_disponiveis.append(m.name)
        
        if not modelos_disponiveis:
            print("❌ Erro: Nenhum modelo disponível para esta chave.")
            return

        # Tenta usar o 1.5-flash ou o primeiro da lista
        modelo_nome = 'models/gemini-1.5-flash' if 'models/gemini-1.5-flash' in modelos_disponiveis else modelos_disponiveis[0]
        
        print(f"Usando modelo: {modelo_nome}")
        model = genai.GenerativeModel(modelo_nome)
        
        response = model.generate_content("Responda apenas: 'Conexão OK'")
        print(f"\n✅ SUCESSO! RESPOSTA: {response.text}")

    except Exception as e:
        print(f"\n❌ FALHA CRÍTICA: {e}")

if __name__ == "__main__":
    executar_teste()