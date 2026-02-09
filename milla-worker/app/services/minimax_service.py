"""
Minimax TTS service - Text-to-Speech with cloned voice.
"""

import structlog
import httpx
from typing import Optional

from tenacity import retry, stop_after_attempt, wait_exponential, retry_if_exception_type

from app.config import get_settings
from app.services.supabase_client import get_supabase_client

logger = structlog.get_logger()

# Minimax API endpoint
MINIMAX_TTS_URL = "https://api.minimax.chat/v1/t2a_v2"


@retry(
    stop=stop_after_attempt(3),
    wait=wait_exponential(multiplier=1, min=4, max=60),
    retry=retry_if_exception_type((httpx.HTTPStatusError, httpx.TimeoutException))
)
def synthesize_speech(text: str) -> bytes:
    """
    Sintetiza texto em áudio usando a API Minimax T2A v2.
    
    Args:
        text: Texto para sintetizar (máx ~2000 caracteres recomendado)
        
    Returns:
        Bytes do áudio MP3
        
    Raises:
        httpx.HTTPStatusError: Se a API retornar erro
        httpx.TimeoutException: Se a requisição exceder o timeout
        ValueError: Se a resposta não contiver áudio válido
    """
    settings = get_settings()
    
    if not settings.minimax_api_key or not settings.minimax_voice_id or not settings.minimax_group_id:
        logger.warning("minimax_not_configured", message="Minimax API key, voice ID, or group ID not set")
        raise ValueError("Minimax not configured - check MINIMAX_API_KEY, MINIMAX_VOICE_ID, and MINIMAX_GROUP_ID")
    
    # Truncar texto se muito longo (recomendação da API)
    truncated_text = text[:2000] if len(text) > 2000 else text
    
    # API URL includes group_id - using minimax.io domain
    api_url = f"https://api.minimax.io/v1/t2a_v2?GroupId={settings.minimax_group_id}"
    
    headers = {
        "Authorization": f"Bearer {settings.minimax_api_key}",
        "Content-Type": "application/json"
    }
    
    # Payload format matching working N8N flow
    payload = {
        "model": "speech-2.5-hd-preview",
        "text": truncated_text,
        "stream": False,
        "voice_setting": {
            "voice_id": settings.minimax_voice_id,
            "speed": 1,
            "vol": 1,
            "pitch": 0
        },
        "audio_setting": {
            "sample_rate": 32000,
            "bitrate": 128000,
            "format": "mp3",
            "channel": 1
        }
    }
    
    timeout = httpx.Timeout(settings.minimax_timeout_seconds)
    
    # Use synchronous client instead of async
    with httpx.Client(timeout=timeout) as client:
        logger.info("minimax_request_start", text_length=len(truncated_text))
        
        response = client.post(
            api_url,
            headers=headers,
            json=payload
        )
        response.raise_for_status()
        
        # Parse JSON response
        try:
            json_response = response.json()
        except Exception as e:
            logger.error("minimax_json_parse_failed", error=str(e))
            raise ValueError(f"Failed to parse Minimax response as JSON: {e}")
        
        # Check for API errors
        if "base_resp" in json_response:
            base_resp = json_response["base_resp"]
            if base_resp.get("status_code") != 0:
                error_msg = base_resp.get("status_msg", "Unknown error")
                logger.error("minimax_api_error", 
                    status_code=base_resp.get("status_code"), 
                    message=error_msg
                )
                raise ValueError(f"Minimax API error: {error_msg}")
        
        # Extract hex audio from response
        data = json_response.get("data", {})
        hex_audio = data.get("audio")
        
        if not hex_audio:
            logger.error("minimax_no_audio_in_response", 
                response_keys=list(json_response.keys()),
                data_keys=list(data.keys()) if data else []
            )
            raise ValueError("No audio data in Minimax response")
        
        # Convert hex string to bytes
        try:
            audio_bytes = bytes.fromhex(hex_audio)
        except ValueError as e:
            logger.error("minimax_hex_decode_failed", error=str(e), hex_preview=hex_audio[:50])
            raise ValueError(f"Failed to decode hex audio: {e}")
        
        logger.info("minimax_request_success", audio_size=len(audio_bytes))
        
        return audio_bytes



def upload_audio_to_storage(
    audio_bytes: bytes, 
    user_id: str, 
    forecast_id: str
) -> Optional[str]:
    """
    Upload do áudio para Supabase Storage.
    
    Args:
        audio_bytes: Conteúdo do áudio em MP3
        user_id: ID do usuário
        forecast_id: ID do forecast
        
    Returns:
        URL pública do áudio ou None se falhar
    """
    supabase = get_supabase_client()
    
    # Path no bucket: {user_id}/{forecast_id}.mp3
    storage_path = f"{user_id}/{forecast_id}.mp3"
    bucket_name = "forecasts-audio"
    
    try:
        # Upload para o bucket
        result = supabase.storage.from_(bucket_name).upload(
            path=storage_path,
            file=audio_bytes,
            file_options={"content-type": "audio/mpeg"}
        )
        
        # Gerar URL pública
        public_url = supabase.storage.from_(bucket_name).get_public_url(storage_path)
        
        logger.info(
            "audio_uploaded",
            user_id=user_id[:8],
            forecast_id=forecast_id[:8],
            size_bytes=len(audio_bytes)
        )
        
        return public_url
        
    except Exception as e:
        logger.error(
            "audio_upload_failed",
            user_id=user_id[:8],
            error=str(e)
        )
        return None


def estimate_audio_duration(text: str) -> int:
    """
    Estima duração do áudio baseado no tamanho do texto.
    
    Aproximação: ~150 palavras por minuto, ~5 caracteres por palavra.
    
    Args:
        text: Texto a ser convertido
        
    Returns:
        Duração estimada em segundos
    """
    words = len(text) / 5  # Aproximação de palavras
    minutes = words / 150  # ~150 palavras por minuto
    return int(minutes * 60)
