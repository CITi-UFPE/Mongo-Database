# 🐛 GUIA DE DEBUG - Frontend Auth

## 📍 Onde o Erro Acontece

**Arquivo:** `client/src/context/AuthContext.tsx` (linha ~125)

```typescript
const login = async (token: string, userData: unknown): Promise<UsuarioAutenticado> => {
  const initialUser = normalizeUsuarioAutenticado(userData);  // ❌ Aqui retorna null
  
  if (!initialUser) {  // ← Entra aqui
    console.error("❌ [AuthContext] Usuário rejeitado!");
    throw new Error("Dados de usuario invalidos para o contrato de autenticacao");  // ❌ ESSE ERRO
  }
  // ...
}
```

---

## 🔍 O que a Normalização Exige

**Arquivo:** `client/src/types/auth.ts`

A função `normalizeUsuarioAutenticado()` rejeita se:

| Campo | Validação | Exemplo Válido | Exemplo Inválido |
|-------|-----------|-----------------|------------------|
| `email` | String não-vazia | `maria@gmail.com` | `""` ou `undefined` |
| `role` OR `position` | Deve estar em `CARGOS` | `"Gerente de Comercial"` | `"user"` ou `"Função especial"` |
| `department` | Deve estar em `DEPARTAMENTOS` | `"Comercial"` | `"Sales"` ou `""` |

**Valores válidos:**
```typescript
CARGOS = [
  "Especialista em Dados",
  "Gerente de Comercial",
  "Gerente de Contas",
  "Diretor de Comercial (CRO)",
  "Líder de Dados",
  "Gerente de Dados",
  "Analista de Dados",
  "Pessoa Desenvolvedora",
  "Analista de Marketing",
]

DEPARTAMENTOS = ["Dados", "Comercial", "Negócios", "Desenvolvimento", "Marketing"]
```

---

## 🔧 Como Debugar no Frontend

### Passo 1: Abra o DevTools (F12)

### Passo 2: Vá para Console

Você vai ver logs azuis e vermelhos:

```
🔵 [AuthContext] Login - userData recebido: {
  email: "meduardasoaresmch@gmail.com",
  name: "Maria Eduarda",
  role: "???",           // ← Veja qual é o valor exato
  department: "???",     // ← Veja qual é o valor exato
  picture: "..."
}

🔵 [AuthContext] Login - initialUser após normalização: null  // ❌ Problema aqui!

❌ [AuthContext] Usuário rejeitado! Campos obrigatórios faltando: {
  email: "meduardasoaresmch@gmail.com",
  role: "???",        // ← Se for "user", é INVÁLIDO
  position: undefined,
  department: "???",  // ← Se for vazio ou undefined, é INVÁLIDO
}
```

### Passo 3: Identifique o Problema

Procure pela linha:
```
❌ [AuthContext] Usuário rejeitado! Campos obrigatórios faltando:
```

E veja quais campos faltam. Compare com a tabela acima.

---

## 📊 Exemplos de Debug

### ✅ SUCESSO (Dados Corretos)
```javascript
🔵 [GoogleAuth] 5. User recebido: meduardasoaresmch@gmail.com

🔵 [AuthContext] Login - userData recebido: {
  email: "meduardasoaresmch@gmail.com",
  name: "Maria Eduarda",
  role: "Gerente de Comercial",      // ✅ Válido!
  position: "Gerente de Comercial",  // ✅ Válido!
  department: "Comercial",           // ✅ Válido!
  picture: "https://..."
}

🔵 [AuthContext] Login - initialUser após normalização: {
  email: "meduardasoaresmch@gmail.com",
  name: "Maria Eduarda",
  role: "Gerente de Comercial",
  position: "Gerente de Comercial",
  department: "Comercial",
  nivel_acesso: "consultor",
  picture: "..."
}

🔵 [GoogleAuth] 7. Login no Context completado
🔵 [GoogleAuth] 8. Redirecionando para /home...
```

### ❌ ERRO 1: Role/Position Inválido
```javascript
❌ [AuthContext] Usuário rejeitado! Campos obrigatórios faltando: {
  email: "meduardasoaresmch@gmail.com",
  role: "user",              // ❌ NÃO ESTÁ NA LISTA!
  position: "user",          // ❌ NÃO ESTÁ NA LISTA!
  department: "Comercial"    // ✅ Esse está ok
}
```

**Solução:** Backend deve enviar um cargo válido. COM A CORREÇÃO, o backend agora envia `"Pessoa Desenvolvedora"` como fallback.

### ❌ ERRO 2: Department Vazio
```javascript
❌ [AuthContext] Usuário rejeitado! Campos obrigatórios faltando: {
  email: "meduardasoaresmch@gmail.com",
  role: "Gerente de Comercial",    // ✅ Válido
  position: "Gerente de Comercial", // ✅ Válido
  department: ""                     // ❌ VAZIO! Não está na lista!
}
```

**Solução:** Backend deve enviar um department válido. COM A CORREÇÃO, o backend agora envia `"Desenvolvimento"` como fallback.

### ❌ ERRO 3: Email Vazio
```javascript
❌ [AuthContext] Usuário rejeitado! Campos obrigatórios faltando: {
  email: "",                         // ❌ VAZIO!
  role: "Gerente de Comercial",
  position: "Gerente de Comercial",
  department: "Comercial"
}
```

**Solução:** Verifique se o Google está retornando o email corretamente. Isso seria um problema com o token Google, não com nosso código.

---

## 📡 Fluxo Completo de Requisições

```
1️⃣ Frontend -> Google OAuth Button
   └─> Retorna: credentialResponse.credential (JWT do Google)

2️⃣ Frontend -> POST /auth/google
   Payload: { idToken: "..." }
   └─> Backend: Valida com Google, procura no DB membros
   └─> Retorna: {
         token: "JWT_NOSSO",
         user: {
           email: "...",
           role: "...",          ← AQUI Pode vir inválido (ANTES da correção)
           position: "...",
           department: "...",
           picture: "..."
         }
       }

3️⃣ Frontend AuthContext.login() tenta normalizar
   └─> Se role/department inválidos → null → ERRO
   └─> Se válidos → salva em localStorage → sucesso!

4️⃣ Frontend -> GET /auth/me (em background)
   Header: Authorization: Bearer JWT_NOSSO
   └─> Backend: Consulta DB/JWT, retorna dados atualizados
   └─> Frontend: Atualiza user no context

5️⃣ Frontend -> Redireciona para /analytics ou /home
```

---

## 🔐 Checklist de Debug em Produção

**Se vir o erro:**
```
❌ Dados de usuario invalidos para o contrato de autenticacao
```

1. [ ] Abra DevTools → Console
2. [ ] Procure por `❌ [AuthContext] Usuário rejeitado!`
3. [ ] Veja qual campo falta ou está inválido
4. [ ] Se o campo é do backend (role, department):
   - [ ] Conte aos donos que o backend enviou dados inválidos
   - [ ] COM A CORREÇÃO, isso não deve mais acontecer
5. [ ] Se o campo é do frontend (email validation):
   - [ ] Verifique sua configuração de Google OAuth
   - [ ] Teste com outro email

---

## 🧪 Teste Local Vs Produção

### ✅ No Localhost (Funciona)
```bash
VITE_API_URL=http://localhost:5000
```
- Backend local + Frontend local
- Sem CORS issues
- Banco local pode ter dados diferentes

### ⚠️ Em Produção (Falha)
```bash
VITE_API_URL=https://seu-backend-render.onrender.com
```
- Backend em Render
- Frontend em Render
- Banco em MongoDB Atlas
- **Maria Eduarda pode não estar no banco de produção!**

**Por isso o script `validate_maria_eduarda.py` é importante** ← Execute para confirmar!

---

## 📝 Próximas Etapas de Debug

Se ainda der erro após a correção do backend:

1. [ ] Execute `python validate_maria_eduarda.py`
2. [ ] Se Maria Eduarda não existir, adicione ao banco
3. [ ] Se role/department estiverem errados, corrija no banco
4. [ ] Faça login novamente e verifique os logs do DevTools
5. [ ] Se AINDA der erro, compartilhe os logs completos do console

---

**Última atualização:** 2026-03-27
