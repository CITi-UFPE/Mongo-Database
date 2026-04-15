"""
CITi UFPE — Subárea: Financeiro
Arquivo: server/schemas/financeiro.py

Schemas Pydantic para validação de dados do módulo financeiro.
O FastAPI usa Pydantic nativamente — é o equivalente Python do Mongoose Schema.

Padronizações obrigatórias (task 1.1):
  - tipo: apenas "entrada" ou "saida"
  - valor: float (nunca str)
  - data: datetime (formato ISO)
  - categoria: str padronizada
"""

from __future__ import annotations

from datetime import datetime
from enum import Enum
from typing import Optional

from pydantic import BaseModel, Field, field_validator, model_validator


# ── Enums ─────────────────────────────────────────────────────────────────────

class TipoTransacao(str, Enum):
    entrada = "entrada"
    saida   = "saida"


# ── Mapeamentos de normalização (task 1.3) ────────────────────────────────────

_TIPO_MAP: dict[str, str] = {
    "entrada":  "entrada",
    "receita":  "entrada",
    "ingresso": "entrada",
    "saida":    "saida",
    "saída":    "saida",
    "despesa":  "saida",
    "gasto":    "saida",
}

_CATEGORIA_MAP: dict[str, str] = {
    "infra":              "Infraestrutura",
    "infraestrutura":     "Infraestrutura",
    "infra-estrutura":    "Infraestrutura",
    "evento":             "Eventos",
    "eventos":            "Eventos",
    "consultoria":        "Consultoria",
    "marketing":          "Marketing",
    "rh":                 "Recursos Humanos",
    "recursos humanos":   "Recursos Humanos",
    "financeiro":         "Financeiro",
    "administrativo":     "Administrativo",
    "ti":                 "TI",
    "tecnologia":         "TI",
}


def _normalizar_tipo(valor: str) -> str:
    """Converte variações de tipo para o valor padronizado."""
    import unicodedata
    chave = unicodedata.normalize("NFD", valor.strip().lower())
    chave = "".join(c for c in chave if unicodedata.category(c) != "Mn")
    resultado = _TIPO_MAP.get(chave)
    if resultado is None:
        raise ValueError(f"Tipo inválido: '{valor}'. Use 'entrada' ou 'saida'.")
    return resultado


def _normalizar_categoria(valor: str) -> str:
    """Converte variações de categoria para o valor padronizado."""
    import unicodedata
    chave = unicodedata.normalize("NFD", valor.strip().lower())
    chave = "".join(c for c in chave if unicodedata.category(c) != "Mn")
    return _CATEGORIA_MAP.get(chave, valor.strip())


# ── Schemas ───────────────────────────────────────────────────────────────────

class TransacaoBase(BaseModel):
    projeto:   str   = Field(..., min_length=1, description="Nome do projeto")
    subarea:   str   = Field(default="Não informado", description="Subárea responsável")
    tipo:      str   = Field(..., description="'entrada' ou 'saida'")
    valor:     float = Field(..., ge=0, description="Valor numérico positivo")
    categoria: str   = Field(..., min_length=1, description="Categoria padronizada")
    data:      datetime = Field(..., description="Data no formato ISO")

    @field_validator("projeto", "subarea", "categoria", mode="before")
    @classmethod
    def trim_strings(cls, v: str) -> str:
        return v.strip() if isinstance(v, str) else v

    @field_validator("tipo", mode="before")
    @classmethod
    def normalizar_tipo(cls, v: str) -> str:
        return _normalizar_tipo(v)

    @field_validator("categoria", mode="before")
    @classmethod
    def normalizar_categoria(cls, v: str) -> str:
        return _normalizar_categoria(v)

    @field_validator("valor", mode="before")
    @classmethod
    def normalizar_valor(cls, v) -> float:
        """Aceita número ou string formatada (ex: '1.200,50')."""
        if isinstance(v, (int, float)):
            return float(v)
        if isinstance(v, str):
            limpo = (
                v.replace("R$", "")
                 .replace(" ", "")
                 .replace(".", "")   # ponto de milhar
                 .replace(",", ".")  # vírgula decimal → ponto
            )
            try:
                return float(limpo)
            except ValueError:
                raise ValueError(f"Valor inválido: '{v}'")
        raise ValueError(f"Tipo inesperado para valor: {type(v)}")

    model_config = {"populate_by_name": True}


class TransacaoCreate(TransacaoBase):
    """Schema para criação de uma nova transação (entrada da API)."""
    pass


class TransacaoInDB(TransacaoBase):
    """Schema que representa um documento do banco (com _id como string)."""
    id: Optional[str] = Field(default=None, alias="_id")


# ── Histórico Financeiro ──────────────────────────────────────────────────────

class HistoricoFinanceiroBase(BaseModel):
    data:    datetime = Field(..., description="Data do registro")
    valor:   float    = Field(..., ge=0, description="Valor numérico positivo")
    tipo:    str      = Field(..., description="'entrada' ou 'saida'")
    projeto: str      = Field(..., min_length=1, description="Nome do projeto")

    @field_validator("tipo", mode="before")
    @classmethod
    def normalizar_tipo(cls, v: str) -> str:
        return _normalizar_tipo(v)

    @field_validator("projeto", mode="before")
    @classmethod
    def trim_projeto(cls, v: str) -> str:
        return v.strip() if isinstance(v, str) else v


class HistoricoFinanceiroCreate(HistoricoFinanceiroBase):
    pass


# ── Projeto ───────────────────────────────────────────────────────────────────

class ProjetoCreate(BaseModel):
    nome:      str            = Field(..., min_length=1)
    subarea:   Optional[str]  = None
    descricao: Optional[str]  = None
    ativo:     bool           = True

    @field_validator("nome", "subarea", "descricao", mode="before")
    @classmethod
    def trim_strings(cls, v):
        return v.strip() if isinstance(v, str) else v


# ── Usuário Financeiro ────────────────────────────────────────────────────────

class UsuarioFinanceiroCreate(BaseModel):
    nome:    str           = Field(..., min_length=1)
    email:   str           = Field(..., min_length=5)
    subarea: Optional[str] = None
    cargo:   Optional[str] = None
    ativo:   bool          = True

    @field_validator("email", mode="before")
    @classmethod
    def normalizar_email(cls, v: str) -> str:
        return v.strip().lower()

    @field_validator("nome", "subarea", "cargo", mode="before")
    @classmethod
    def trim_strings(cls, v):
        return v.strip() if isinstance(v, str) else v