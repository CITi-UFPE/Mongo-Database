export const CARGOS = [
  "Dados",
  "Especialista em Dados",
  "Gerente de Comercial",
  "Gerente de Contas",
  "Diretor de Comercial (CRO)",
  "Líder de Dados",
  "Gerente de Dados",
  "Analista de Dados",
  "Pessoa Desenvolvedora",
  "Analista de Marketing",
] as const;

export const DEPARTAMENTOS = ["Dados", "Comercial", "Negócios", "Desenvolvimento", "Marketing"] as const;

export type Cargo = (typeof CARGOS)[number];
export type Departamento = (typeof DEPARTAMENTOS)[number];
export type NivelAcesso = "admin_dados" | "consultor" | "diretoria";
export type StatusAcesso = "Nao Cadastrado" | "Pendente" | "Aprovado";
export type PermissaoNivel = "Comercial" | "Financeiro" | "Ambos";

export interface UsuarioAutenticado {
  email: string;
  name: string;
  role: Cargo;
  position: Cargo;
  department: Departamento;
  nivel_acesso: NivelAcesso;
  status: StatusAcesso;
  acesso_aprovado: boolean;
  onboarding_required: boolean;
  permissao_nivel?: PermissaoNivel;
  is_admin?: boolean;
  picture?: string;
}

const CARGOS_SET = new Set<string>(CARGOS);
const DEPARTAMENTOS_SET = new Set<string>(DEPARTAMENTOS);

const CARGOS_ALIAS: Record<string, Cargo> = {
  "Lider de Dados": "Líder de Dados",
  "Lider de dados": "Líder de Dados",
};

const DEPARTAMENTOS_ALIAS: Record<string, Departamento> = {
  Negocios: "Negócios",
};

const PERMISSOES_NIVEL_SET = new Set<PermissaoNivel>(["Comercial", "Financeiro", "Ambos"]);

const normalizeStatusAcesso = (value: unknown): StatusAcesso => {
  if (typeof value !== "string") {
    return "Nao Cadastrado";
  }

  const normalized = toCanonicalKey(value);
  if (normalized === "pendente") {
    return "Pendente";
  }
  if (normalized === "aprovado") {
    return "Aprovado";
  }
  return "Nao Cadastrado";
};

const normalizePermissaoNivel = (value: unknown): PermissaoNivel | undefined => {
  if (typeof value !== "string") {
    return undefined;
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return undefined;
  }

  const title = `${trimmed.charAt(0).toUpperCase()}${trimmed.slice(1).toLowerCase()}`;
  return PERMISSOES_NIVEL_SET.has(title as PermissaoNivel) ? (title as PermissaoNivel) : undefined;
};

const toCanonicalKey = (value: string): string => {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
};

const CARGOS_BY_CANONICAL = new Map<string, Cargo>(
  CARGOS.map((cargo) => [toCanonicalKey(cargo), cargo])
);

const DEPARTAMENTOS_BY_CANONICAL = new Map<string, Departamento>(
  DEPARTAMENTOS.map((departamento) => [toCanonicalKey(departamento), departamento])
);

const normalizeCargo = (value: unknown): Cargo | null => {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  const normalized = CARGOS_ALIAS[trimmed] ?? trimmed;
  if (CARGOS_SET.has(normalized)) {
    return normalized as Cargo;
  }

  return CARGOS_BY_CANONICAL.get(toCanonicalKey(normalized)) ?? null;
};

const normalizeDepartamento = (value: unknown): Departamento | null => {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  const normalized = DEPARTAMENTOS_ALIAS[trimmed] ?? trimmed;
  if (DEPARTAMENTOS_SET.has(normalized)) {
    return normalized as Departamento;
  }

  return DEPARTAMENTOS_BY_CANONICAL.get(toCanonicalKey(normalized)) ?? null;
};

const computeNivelAcesso = (cargo: Cargo): NivelAcesso => {
  if (cargo === "Diretor de Comercial (CRO)") {
    return "diretoria";
  }

  if (
    cargo === "Especialista em Dados" ||
    cargo === "Líder de Dados" ||
    cargo === "Gerente de Dados" ||
    cargo === "Analista de Dados"
  ) {
    return "admin_dados";
  }

  return "consultor";
};

const isRecord = (value: unknown): value is Record<string, unknown> => {
  return typeof value === "object" && value !== null;
};

export const normalizeUsuarioAutenticado = (payload: unknown): UsuarioAutenticado | null => {
  if (!isRecord(payload)) {
    return null;
  }

  const email = typeof payload.email === "string" ? payload.email.trim().toLowerCase() : "";
  if (!email) {
    return null;
  }

  const cargo = normalizeCargo(payload.role ?? payload.position) ?? "Pessoa Desenvolvedora";
  const department = normalizeDepartamento(payload.department) ?? "Desenvolvimento";

  const name = typeof payload.name === "string" && payload.name.trim() ? payload.name.trim() : email;
  const picture = typeof payload.picture === "string" && payload.picture.trim() ? payload.picture : undefined;
  const status = normalizeStatusAcesso(payload.status);
  const acessoAprovadoFromPayload =
    typeof payload.acesso_aprovado === "boolean" ? payload.acesso_aprovado : undefined;
  const acessoAprovado = acessoAprovadoFromPayload ?? status === "Aprovado";
  const onboardingRequired =
    typeof payload.onboarding_required === "boolean"
      ? payload.onboarding_required
      : status === "Nao Cadastrado";
  const permissaoNivel = normalizePermissaoNivel(payload.permissao_nivel);
  const isAdmin = typeof payload.is_admin === "boolean" ? payload.is_admin : undefined;

  return {
    email,
    name,
    role: cargo,
    position: cargo,
    department,
    nivel_acesso: computeNivelAcesso(cargo),
    status,
    acesso_aprovado: acessoAprovado,
    onboarding_required: onboardingRequired,
    permissao_nivel: permissaoNivel,
    is_admin: isAdmin,
    picture,
  };
};

const isApprovedAccess = (user: UsuarioAutenticado | null): boolean => {
  return Boolean(user && user.acesso_aprovado && user.status === "Aprovado");
};

export const canAccessAnalytics = (user: UsuarioAutenticado | null): boolean => {
  return isApprovedAccess(user);
};

export const canAccessCommercialAnalytics = (user: UsuarioAutenticado | null): boolean => {
  if (!isApprovedAccess(user)) {
    return false;
  }

  return Boolean(
    user?.is_admin ||
      user?.permissao_nivel === "Comercial" ||
      user?.permissao_nivel === "Ambos" ||
      !user?.permissao_nivel
  );
};

export const canAccessFinancialAnalytics = (user: UsuarioAutenticado | null): boolean => {
  if (!isApprovedAccess(user)) {
    return false;
  }

  return Boolean(
    user?.is_admin || user?.permissao_nivel === "Financeiro" || user?.permissao_nivel === "Ambos"
  );
};

export const isPendingAccess = (user: UsuarioAutenticado | null): boolean => {
  return Boolean(user && user.status === "Pendente" && !user.acesso_aprovado);
};