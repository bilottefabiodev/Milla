"""
Tests for minimax_service TTS service.
"""
import pytest
from unittest.mock import patch, MagicMock
import httpx

from app.services.minimax_service import (
    synthesize_speech,
    upload_audio_to_storage,
    estimate_audio_duration,
)


class TestSynthesizeSpeech:
    """Tests for synthesize_speech function."""
    
    @patch("app.services.minimax_service.get_settings")
    def test_synthesize_speech_not_configured(self, mock_settings):
        """Test error when Minimax is not configured."""
        mock_settings.return_value.minimax_api_key = ""
        mock_settings.return_value.minimax_voice_id = ""
        mock_settings.return_value.minimax_group_id = ""
        
        with pytest.raises(ValueError, match="Minimax not configured"):
            synthesize_speech("Test text")
    
    @patch("app.services.minimax_service.httpx.Client")
    @patch("app.services.minimax_service.get_settings")
    def test_synthesize_speech_success(self, mock_settings, mock_client_class):
        """Test successful speech synthesis."""
        # Setup settings mock
        settings = MagicMock()
        settings.minimax_api_key = "test-api-key"
        settings.minimax_voice_id = "test-voice-id"
        settings.minimax_group_id = "test-group-id"
        settings.minimax_timeout_seconds = 60
        mock_settings.return_value = settings
        
        # Setup HTTP client mock
        mock_client = MagicMock()
        mock_client_class.return_value.__enter__.return_value = mock_client
        
        # Create hex-encoded MP3 header (fake audio data)
        fake_audio_hex = "494433" + "00" * 100  # ID3 tag + padding
        mock_response = MagicMock()
        mock_response.json.return_value = {
            "base_resp": {"status_code": 0, "status_msg": "success"},
            "data": {"audio": fake_audio_hex}
        }
        mock_response.raise_for_status = MagicMock()
        mock_client.post.return_value = mock_response
        
        # Execute
        result = synthesize_speech("Olá, esta é uma previsão teste.")
        
        # Verify
        assert isinstance(result, bytes)
        assert len(result) > 0
        mock_client.post.assert_called_once()
        
    @patch("app.services.minimax_service.httpx.Client")
    @patch("app.services.minimax_service.get_settings")
    def test_synthesize_speech_api_error(self, mock_settings, mock_client_class):
        """Test handling of API error response."""
        # Setup settings
        settings = MagicMock()
        settings.minimax_api_key = "test-api-key"
        settings.minimax_voice_id = "test-voice-id"
        settings.minimax_group_id = "test-group-id"
        settings.minimax_timeout_seconds = 60
        mock_settings.return_value = settings
        
        # Setup error response
        mock_client = MagicMock()
        mock_client_class.return_value.__enter__.return_value = mock_client
        mock_response = MagicMock()
        mock_response.json.return_value = {
            "base_resp": {"status_code": 2049, "status_msg": "invalid api key"}
        }
        mock_response.raise_for_status = MagicMock()
        mock_client.post.return_value = mock_response
        
        # Execute & Verify
        with pytest.raises(ValueError, match="invalid api key"):
            synthesize_speech("Test text")
    
    @patch("app.services.minimax_service.get_settings")
    def test_synthesize_speech_truncates_long_text(self, mock_settings):
        """Test that long text is truncated."""
        settings = MagicMock()
        settings.minimax_api_key = "test-key"
        settings.minimax_voice_id = "test-voice"
        settings.minimax_group_id = "test-group"
        settings.minimax_timeout_seconds = 60
        mock_settings.return_value = settings
        
        long_text = "A" * 3000  # Longer than 2000 char limit
        
        with patch("app.services.minimax_service.httpx.Client") as mock_client_class:
            mock_client = MagicMock()
            mock_client_class.return_value.__enter__.return_value = mock_client
            mock_response = MagicMock()
            mock_response.json.return_value = {
                "base_resp": {"status_code": 0},
                "data": {"audio": "494433" + "00" * 50}
            }
            mock_response.raise_for_status = MagicMock()
            mock_client.post.return_value = mock_response
            
            synthesize_speech(long_text)
            
            # Check that the text was truncated in the payload
            call_args = mock_client.post.call_args
            payload = call_args.kwargs.get("json", call_args[1].get("json", {}))
            assert len(payload.get("text", "")) <= 2000


class TestUploadAudioToStorage:
    """Tests for upload_audio_to_storage function."""
    
    @patch("app.services.minimax_service.get_supabase_client")
    def test_upload_audio_success(self, mock_supabase):
        """Test successful audio upload."""
        mock_client = MagicMock()
        mock_supabase.return_value = mock_client
        mock_client.storage.from_.return_value.upload.return_value = {"Key": "test-path"}
        mock_client.storage.from_.return_value.get_public_url.return_value = "https://example.com/audio.mp3"
        
        result = upload_audio_to_storage(
            audio_bytes=b"fake-audio-data",
            user_id="user-123",
            forecast_id="forecast-456"
        )
        
        assert result == "https://example.com/audio.mp3"
        mock_client.storage.from_.assert_called_with("forecasts-audio")
    
    @patch("app.services.minimax_service.get_supabase_client")
    def test_upload_audio_failure(self, mock_supabase):
        """Test handling of upload failure."""
        mock_client = MagicMock()
        mock_supabase.return_value = mock_client
        mock_client.storage.from_.return_value.upload.side_effect = Exception("Upload failed")
        
        result = upload_audio_to_storage(
            audio_bytes=b"fake-audio-data",
            user_id="user-123",
            forecast_id="forecast-456"
        )
        
        assert result is None


class TestEstimateAudioDuration:
    """Tests for estimate_audio_duration function."""
    
    def test_estimate_short_text(self):
        """Test duration estimate for short text."""
        text = "Olá, bom dia!"  # ~13 chars = ~2.6 words = ~1 second
        result = estimate_audio_duration(text)
        assert result >= 0
        assert result < 60  # Should be less than a minute
    
    def test_estimate_long_text(self):
        """Test duration estimate for long text."""
        text = "Lorem ipsum " * 100  # ~1200 chars = ~240 words = ~96 seconds
        result = estimate_audio_duration(text)
        assert result > 60  # Should be more than a minute
        assert result < 300  # But less than 5 minutes
    
    def test_estimate_empty_text(self):
        """Test duration estimate for empty text."""
        result = estimate_audio_duration("")
        assert result == 0
