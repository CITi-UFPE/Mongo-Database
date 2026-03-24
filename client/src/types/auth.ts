export const CARGOS = [
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

export interface UsuarioAutenticado {
  email: string;
  name: string;
  role: Cargo;
  position: Cargo;
  department: Departamento;
  nivel_acesso: NivelAcesso;
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

  const cargo = normalizeCargo(payload.role ?? payload.position);
  const department = normalizeDepartamento(payload.department);

  if (!cargo || !department) {
    return null;
  }

  const name = typeof payload.name === "string" && payload.name.trim() ? payload.name.trim() : email;
  const picture = typeof payload.picture === "string" && payload.picture.trim() ? payload.picture : undefined;

  return {
    email,
    name,
    role: cargo,
    position: cargo,
    department,
    nivel_acesso: computeNivelAcesso(cargo),
    picture,
  };
};

export const canAccessAnalytics = (user: UsuarioAutenticado | null): boolean => {
  return user?.nivel_acesso === "admin_dados";
};