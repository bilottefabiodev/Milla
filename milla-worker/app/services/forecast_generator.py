"""
Forecast generator service - generates personalized predictions using OpenAI.
"""

import json
import structlog
from datetime import date
from typing import Optional

from app.config import get_settings
from app.services.supabase_client import get_supabase_client
from app.services.numerology import reduce_to_arcano, get_arcano_name
from app.models.forecast import (
    ForecastType, 
    ForecastContent, 
    ForecastCalculationBase,
    FORECAST_SECTION_MAP,
    MONTH_NAMES
)

logger = structlog.get_logger()


def calculate_ano_pessoal(birthdate: date, year: int) -> int:
    """
    Calcula o Ano Pessoal baseado na data de nascimento.
    
    Fórmula: Dia + Mês + Dígitos do Ano Universal
    Exemplo para nascido em 14/09 no ano 2026:
    14 + 9 + 2026 = 2049 -> 2+0+4+9 = 15 -> 1+5 = 6
    """
    day = birthdate.day
    month = birthdate.month
    
    # Soma de todos os dígitos
    total = day + month + sum(int(d) for d in str(year))
    
    return reduce_to_arcano(total)


def calculate_numero_semana(birthdate: date, week_start: date) -> int:
    """
    Calcula o número da semana baseado no Ano Pessoal.
    
    Fórmula: Ano Pessoal + Número da semana no ano
    """
    ano_pessoal = calculate_ano_pessoal(birthdate, week_start.year)
    week_number = week_start.isocalendar()[1]  # Semana ISO
    
    return reduce_to_arcano(ano_pessoal + week_number)


def calculate_ciclo_mensal(birthdate: date, month: int, year: int) -> int:
    """
    Calcula o Ciclo Mensal.
    
    Fórmula: Ano Pessoal + Mês
    """
    ano_pessoal = calculate_ano_pessoal(birthdate, year)
    return reduce_to_arcano(ano_pessoal + month)


def get_arcano_regente(ano_pessoal: int) -> str:
    """
    Retorna o Arcano Regente do ano baseado no Ano Pessoal.
    """
    return get_arcano_name(ano_pessoal)


def calculate_forecast_base(
    birthdate: date, 
    forecast_type: ForecastType,
    period_start: date
) -> ForecastCalculationBase:
    """
    Calcula base numérica conforme tipo de previsão.
    
    Returns:
        ForecastCalculationBase com campos preenchidos conforme o tipo
    """
    year = period_start.year
    ano_pessoal = calculate_ano_pessoal(birthdate, year)
    
    if forecast_type == ForecastType.WEEKLY:
        return ForecastCalculationBase(
            ano_pessoal=ano_pessoal,
            numero_semana=calculate_numero_semana(birthdate, period_start)
        )
    
    elif forecast_type == ForecastType.MONTHLY:
        month = period_start.month
        return ForecastCalculationBase(
            ano_pessoal=ano_pessoal,
            ciclo_mensal=calculate_ciclo_mensal(birthdate, month, year),
            mes_nome=MONTH_NAMES.get(month, ""),
            ano=year
        )
    
    else:  # YEARLY
        return ForecastCalculationBase(
            ano_pessoal=ano_pessoal,
            arcano_regente=get_arcano_regente(ano_pessoal),
            ano=year
        )


def get_forecast_prompt(forecast_type: ForecastType) -> Optional[dict]:
    """
    Busca o prompt ativo para o tipo de previsão.
    """
    supabase = get_supabase_client()
    section = FORECAST_SECTION_MAP.get(forecast_type)
    
    if not section:
        return None
    
    try:
        result = supabase.table("prompts").select("*").eq(
            "section", section
        ).eq(
            "is_active", True
        ).execute()
        
        if result.data and len(result.data) > 0:
            return result.data[0]
        return None
        
    except Exception as e:
        logger.error("get_forecast_prompt_failed", section=section, error=str(e))
        return None


def generate_forecast_content(
    prompt_template: str,
    nome: str,
    birthdate: date,
    forecast_type: ForecastType,
    period_start: date,
    period_end: date,
) -> ForecastContent:
    """
    Gera conteúdo de previsão via OpenAI.
    
    Valida com Pydantic e retorna ForecastContent.
    """
    from openai import OpenAI
    
    settings = get_settings()
    client = OpenAI(api_key=settings.openai_api_key)
    
    # Calcular base numérica
    calc_base = calculate_forecast_base(birthdate, forecast_type, period_start)
    
    # Preencher template usando safe_substitute para evitar problemas com {} do JSON
    from string import Template
    
    # Converter placeholders de {var} para $var (Template format)
    template_str = prompt_template.replace("{nome}", "$nome")
    template_str = template_str.replace("{period_start}", "$period_start")
    template_str = template_str.replace("{period_end}", "$period_end")
    template_str = template_str.replace("{ano_pessoal}", "$ano_pessoal")
    template_str = template_str.replace("{numero_semana}", "$numero_semana")
    template_str = template_str.replace("{ciclo_mensal}", "$ciclo_mensal")
    template_str = template_str.replace("{mes_nome}", "$mes_nome")
    template_str = template_str.replace("{ano}", "$ano")
    template_str = template_str.replace("{arcano_regente}", "$arcano_regente")
    
    template = Template(template_str)
    filled_prompt = template.safe_substitute(
        nome=nome,
        period_start=period_start.strftime("%d/%m/%Y"),
        period_end=period_end.strftime("%d/%m/%Y"),
        ano_pessoal=calc_base.ano_pessoal,
        numero_semana=calc_base.numero_semana or "",
        ciclo_mensal=calc_base.ciclo_mensal or "",
        mes_nome=calc_base.mes_nome or "",
        ano=calc_base.ano or period_start.year,
        arcano_regente=calc_base.arcano_regente or "",
    )
    
    logger.info(
        "openai_request_start",
        forecast_type=forecast_type.value,
        user_name=nome[:4] + "..."
    )
    
    # Chamar OpenAI
    response = client.chat.completions.create(
        model=settings.openai_model,
        messages=[{"role": "user", "content": filled_prompt}],
        response_format={"type": "json_object"},
        max_tokens=2500,
        temperature=0.8
    )
    
    content_str = response.choices[0].message.content
    
    # Log raw content for debugging
    logger.debug("openai_raw_response", content_preview=content_str[:200] if content_str else "None")
    
    # Parse JSON with error handling
    try:
        content_dict = json.loads(content_str)
    except json.JSONDecodeError as e:
        logger.error("json_parse_error", error=str(e), raw_content=content_str[:500])
        raise ValueError(f"Invalid JSON from OpenAI: {e}")
    
    # Debug logging - trace the exact issue
    logger.info(
        "openai_response_parsed",
        dict_type=type(content_dict).__name__,
        dict_keys=list(content_dict.keys()) if isinstance(content_dict, dict) else "not_a_dict",
        has_titulo="titulo" in content_dict if isinstance(content_dict, dict) else False,
    )
    
    logger.info(
        "openai_request_success",
        forecast_type=forecast_type.value,
        title_preview=str(content_dict.get("titulo", ""))[:30] if isinstance(content_dict, dict) else "n/a"
    )
    
    # Validar e retornar
    return ForecastContent(**content_dict)

