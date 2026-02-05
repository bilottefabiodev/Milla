"""
OpenAI service for generating reading content.
"""

import json
import structlog
from openai import OpenAI
from openai import APITimeoutError, RateLimitError, APIError
from app.config import get_settings
from app.models.reading import ReadingContent

logger = structlog.get_logger()


def get_openai_client() -> OpenAI:
    """Get OpenAI client."""
    settings = get_settings()
    return OpenAI(
        api_key=settings.openai_api_key,
        timeout=settings.openai_timeout_seconds,
    )


def generate_reading(
    prompt_template: str,
    nome: str,
    ponto_nome: str,
    ponto_valor: int,
    arcano: str,
) -> ReadingContent:
    """
    Generate a reading using OpenAI.
    
    Args:
        prompt_template: The prompt template with placeholders
        nome: Client's name
        ponto_nome: Section display name
        ponto_valor: Calculated numerology number
        arcano: Arcano name
    
    Returns:
        Validated ReadingContent
        
    Raises:
        ValueError: If response is invalid after retries
        APITimeoutError: If request times out
        RateLimitError: If rate limited
    """
    settings = get_settings()
    client = get_openai_client()
    
    # Format prompt
    prompt = prompt_template.format(
        nome=nome,
        ponto_nome=ponto_nome,
        ponto_valor=ponto_valor,
        arcano=arcano,
    )
    
    # Note: We don't log full prompt to avoid exposing PII
    logger.info("generating_reading", section=ponto_nome, ponto_valor=ponto_valor)
    
    max_retries = 2
    last_error = None
    
    for attempt in range(max_retries):
        try:
            response = client.chat.completions.create(
                model=settings.openai_model,
                messages=[
                    {"role": "system", "content": "Você é Milla, uma mentora espiritual. Responda APENAS em JSON válido."},
                    {"role": "user", "content": prompt}
                ],
                response_format={"type": "json_object"},
                temperature=0.7,
            )
            
            content = response.choices[0].message.content
            if not content:
                raise ValueError("Empty response from OpenAI")
            
            # Parse JSON
            data = json.loads(content)
            
            # Handle 'carta' alias -> 'arcano'
            if "carta" in data and "arcano" not in data:
                data["arcano"] = data.pop("carta")
            
            # Validate with Pydantic
            reading = ReadingContent.model_validate(data)
            
            logger.info(
                "reading_generated",
                section=ponto_nome,
                arcano=reading.arcano,
                attempt=attempt + 1,
            )
            
            return reading
            
        except json.JSONDecodeError as e:
            last_error = e
            logger.warning(
                "invalid_json_response",
                attempt=attempt + 1,
                error=str(e),
            )
            
        except ValueError as e:
            last_error = e
            logger.warning(
                "validation_error",
                attempt=attempt + 1,
                error=str(e),
            )
    
    # All retries failed
    raise ValueError(f"Failed to generate valid reading after {max_retries} attempts: {last_error}")
