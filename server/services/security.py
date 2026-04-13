import jwt
import os
from datetime import datetime, timedelta
from fastapi import HTTPException, Security
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

# O FastAPI usa isso para extrair o token do cabeçalho da requisição
auth_scheme = HTTPBearer()

# Pega a chave secreta do arquivo .env (que vimos no seu main.py)
SECRET_KEY = os.getenv("JWT_SECRET", "chave_super_secreta_padrao")
ALGORITHM = "HS256"


def criar_token(email: str, role: str):
    """Gera o token JWT contendo o email e a role do usuário (Task 2.1)"""
    expiracao = datetime.utcnow() + timedelta(hours=8)  # Token dura 8 horas

    payload = {
        "email": email,
        "role": role,
        "exp": expiracao
    }

    # Cria o token embaralhado com a sua chave secreta
    token = jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)
    return token


def verificar_role(roles_permitidas: list[str]):
    """Esse é o seu 'Middleware' da Task 2.2 escrito em Python"""

    def verificador(credentials: HTTPAuthorizationCredentials
                    = Security(auth_scheme)):
        token = credentials.credentials

        try:
            # Descriptografa o token para ler o que tem dentro (payload)
            payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
            role_do_usuario = payload.get("role")
            
            # Verifica se o cargo do usuário está na lista de permitidos
            if role_do_usuario not in roles_permitidas:
                raise HTTPException(status_code=403, detail="Acesso negado: Perfil sem permissão")
                
            return payload # Retorna os dados se deu tudo certo
            
        except jwt.ExpiredSignatureError:
            raise HTTPException(status_code=401, detail="Token expirado. Faça login novamente.")
        except jwt.PyJWTError:
            raise HTTPException(status_code=401, detail="Token inválido.")
            
    return verificador


# Atalhos para você usar nas suas rotas depois
apenas_admin = Security(verificar_role(["admin"]))
admin_e_financeiro = Security(verificar_role(["admin", "financeiro"]))
