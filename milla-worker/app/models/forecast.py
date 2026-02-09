"""
Pydantic models for forecasts.
"""

from enum import Enum
from datetime import date, datetime
from typing import Optional
from pydantic import BaseModel, Field, field_validator


class ForecastType(str, Enum):
    """Tipos de previsão disponíveis."""
    WEEKLY = "weekly"
    MONTHLY = "monthly"
    YEARLY = "yearly"


# Mapeamento para nomes de seção no banco de dados
FORECAST_SECTION_MAP = {
    ForecastType.WEEKLY: "forecast_weekly",
    ForecastType.MONTHLY: "forecast_monthly",
    ForecastType.YEARLY: "forecast_yearly",
}

# Nomes dos meses em português
MONTH_NAMES = {
    1: "Janeiro", 2: "Fevereiro", 3: "Março", 4: "Abril",
    5: "Maio", 6: "Junho", 7: "Julho", 8: "Agosto",
    9: "Setembro", 10: "Outubro", 11: "Novembro", 12: "Dezembro"
}


class ForecastContent(BaseModel):
    """Conteúdo validado da previsão gerada pela IA."""
    
    titulo: str = Field(..., max_length=80)
    resumo: str = Field(..., max_length=200)
    conteudo: str = Field(..., min_length=200, max_length=10000)
    
    @field_validator('conteudo')
    @classmethod
    def no_deterministic_language(cls, v: str) -> str:
        """Valida que não há linguagem determinística inadequada."""
        forbidden = ['vai acontecer', 'certamente', 'definitivamente', 'sem dúvida']
        v_lower = v.lower()
        for term in forbidden:
            if term in v_lower:
                raise ValueError(f"Linguagem determinística: '{term}'")
        return v


class ForecastJobPayload(BaseModel):
    """Payload para job de geração de previsão."""
    
    forecast_type: ForecastType
    period_start: date
    period_end: date


class ForecastCalculationBase(BaseModel):
    """Base de cálculo numerológico por tipo."""
    
    # Comum a todos
    ano_pessoal: int
    
    # Weekly
    numero_semana: Optional[int] = None
    
    # Monthly
    ciclo_mensal: Optional[int] = None
    mes_nome: Optional[str] = None
    
    # Yearly
    arcano_regente: Optional[str] = None
    ano: Optional[int] = None


class ForecastCreate(BaseModel):
    """Dados para criar uma previsão."""
    
    user_id: str
    type: ForecastType
    period_start: date
    period_end: date
    title: str
    content: str
    summary: Optional[str] = None
    audio_url: Optional[str] = None
    audio_duration_seconds: Optional[int] = None
    prompt_version: str
    model_used: str
    calculation_base: dict
    expires_at: Optional[datetime] = None
