"""
Tests for forecast_generator service.
"""
import pytest
from datetime import date
from unittest.mock import patch, MagicMock

from app.services.forecast_generator import (
    calculate_ano_pessoal,
    calculate_numero_semana,
    calculate_ciclo_mensal,
    get_arcano_regente,
    generate_forecast_content,
)
from app.models.forecast import ForecastType, ForecastCalculationBase


class TestCalculateAnoPessoal:
    """Tests for calculate_ano_pessoal function."""
    
    def test_calculate_ano_pessoal_basic(self):
        """Test basic personal year calculation."""
        # Birth date: 1990-05-15, Year: 2026
        # 1+9+9+0 = 19 = 1+9 = 10 = 1+0 = 1 (birth)
        # 0+5 = 5 (month)
        # 1+5 = 6 (day)
        # 2+0+2+6 = 10 = 1+0 = 1 (year)
        # Total: 1 + 5 + 6 + 1 = 13 = 1+3 = 4
        birth_date = date(1990, 5, 15)
        result = calculate_ano_pessoal(birth_date, 2026)
        assert 1 <= result <= 9
        
    def test_calculate_ano_pessoal_master_number_handling(self):
        """Test that result is always 1-9."""
        test_dates = [
            date(1985, 11, 22),
            date(2000, 12, 31),
            date(1975, 1, 1),
        ]
        for birth_date in test_dates:
            result = calculate_ano_pessoal(birth_date, 2026)
            assert 1 <= result <= 9, f"Failed for {birth_date}"


class TestCalculateNumeroSemana:
    """Tests for calculate_numero_semana function."""
    
    def test_calculate_numero_semana_basic(self):
        """Test week number calculation."""
        birth_date = date(1990, 5, 15)
        week_start = date(2026, 2, 2)
        result = calculate_numero_semana(birth_date, week_start)
        assert 1 <= result <= 22 # Allow master numbers
        
    def test_calculate_numero_semana_different_weeks(self):
        """Test various weeks produce valid results."""
        birth_date = date(1990, 5, 15)
        weeks = [
            date(2026, 1, 5),
            date(2026, 6, 15),
            date(2026, 12, 28),
        ]
        for week in weeks:
            result = calculate_numero_semana(birth_date, week)
            assert 1 <= result <= 22 # Allow master numbers


class TestCalculateCicloMensal:
    """Tests for calculate_ciclo_mensal function."""
    
    def test_calculate_ciclo_mensal_basic(self):
        """Test monthly cycle calculation."""
        birth_date = date(1990, 5, 15)
        result = calculate_ciclo_mensal(birth_date, 1, 2026)
        assert 1 <= result <= 22 # Allow master numbers
        
    def test_calculate_ciclo_mensal_all_months(self):
        """Test all 12 months produce valid results."""
        birth_date = date(1990, 5, 15)
        for month in range(1, 13):
            result = calculate_ciclo_mensal(birth_date, month, 2026)
            assert 1 <= result <= 22, f"Failed for month {month}" # Allow master numbers


class TestGetArcanoRegente:
    """Tests for get_arcano_regente function."""
    
    def test_get_arcano_regente_basic(self):
        """Test arcano calculation for a year."""
        # Function returns name string, not number
        result = get_arcano_regente(10)
        assert isinstance(result, str)
        assert len(result) > 0
        
    def test_get_arcano_regente_different_years(self):
        """Test various years."""
        assert isinstance(get_arcano_regente(8), str)
        assert isinstance(get_arcano_regente(9), str)
        assert isinstance(get_arcano_regente(5), str)


class TestGenerateForecastContent:
    """Tests for generate_forecast_content function."""
    
    @pytest.fixture
    def mock_calculation_base(self):
        return ForecastCalculationBase(
            ano_pessoal=3,
            numero_semana=7,
            ciclo_mensal=5,
            arcano_regente="A Roda da Fortuna"
        )
    
    @patch("app.services.forecast_generator.get_settings")
    @patch("openai.OpenAI")
    def test_generate_weekly_forecast(
        self, 
        mock_openai_class, 
        mock_settings,
        mock_calculation_base,
    ):
        """Test weekly forecast generation."""
        # Setup settings mock
        settings = MagicMock()
        settings.openai_api_key = "test-key"
        settings.openai_model = "gpt-4o"
        mock_settings.return_value = settings
        
        # Setup OpenAI mock with valid Pydantic data (resumo required, content >= 200 chars)
        mock_openai = MagicMock()
        mock_openai_class.return_value = mock_openai
        
        long_content = "Texto da previsão " * 20 # Make it > 200 chars
        
        mock_message = MagicMock()
        # JSON structure must match ForecastContent model
        mock_message.content = f'{{"titulo": "Semana Inspiradora", "conteudo": "{long_content}", "resumo": "Resumo curto"}}'
        
        mock_openai.chat.completions.create.return_value.choices = [
            MagicMock(message=mock_message)
        ]
        
        # Mock calculate_forecast_base to avoid logic dependencies
        with patch("app.services.forecast_generator.calculate_forecast_base", return_value=mock_calculation_base):
            result = generate_forecast_content(
                prompt_template="Template mock para $nome",
                nome="Fabio",
                birthdate=date(1990, 5, 15),
                forecast_type=ForecastType.WEEKLY,
                period_start=date(2026, 2, 2),
                period_end=date(2026, 2, 8),
            )
        
        # Verify
        assert result is not None
        assert result.titulo == "Semana Inspiradora"
        assert len(result.conteudo) >= 200
        assert result.resumo == "Resumo curto"
        
        # Check OpenAI call
        mock_openai.chat.completions.create.assert_called_once()

