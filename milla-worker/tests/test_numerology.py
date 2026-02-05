"""
Tests for numerology calculation module.
"""

import pytest
from datetime import date

from app.services.numerology import (
    reduce_to_arcano,
    get_arcano_name,
    calculate_section_number,
    get_section_reading_data,
    ARCANOS_MAIORES,
)


class TestReduceToArcano:
    """Tests for reduce_to_arcano function."""
    
    def test_single_digit_unchanged(self):
        """Numbers 1-9 should remain unchanged."""
        for i in range(1, 10):
            assert reduce_to_arcano(i) == i
    
    def test_10_to_22_unchanged(self):
        """Numbers 10-22 should remain unchanged."""
        for i in range(10, 23):
            assert reduce_to_arcano(i) == i
    
    def test_23_reduces(self):
        """23 -> 2+3 = 5"""
        assert reduce_to_arcano(23) == 5
    
    def test_38_reduces(self):
        """38 -> 3+8 = 11"""
        assert reduce_to_arcano(38) == 11
    
    def test_99_reduces(self):
        """99 -> 9+9 = 18"""
        assert reduce_to_arcano(99) == 18
    
    def test_large_number_reduces(self):
        """100 -> 1+0+0 = 1"""
        assert reduce_to_arcano(100) == 1
    
    def test_zero_returns_22(self):
        """0 should return 22 (O Louco)."""
        assert reduce_to_arcano(0) == 22
    
    def test_negative_returns_22(self):
        """Negative numbers should return 22 (O Louco)."""
        assert reduce_to_arcano(-5) == 22


class TestGetArcanoName:
    """Tests for get_arcano_name function."""
    
    def test_all_arcanos_mapped(self):
        """All 22 arcanos should have names."""
        for i in range(1, 23):
            name = get_arcano_name(i)
            assert name in ARCANOS_MAIORES.values()
    
    def test_specific_arcanos(self):
        """Test specific arcano mappings."""
        assert get_arcano_name(1) == "O Mago"
        assert get_arcano_name(5) == "O Hierofante"
        assert get_arcano_name(10) == "A Roda da Fortuna"
        assert get_arcano_name(13) == "A Morte"
        assert get_arcano_name(22) == "O Louco"
    
    def test_large_number_reduces_first(self):
        """Large numbers should be reduced before lookup."""
        # 23 -> 5 -> O Hierofante
        assert get_arcano_name(23) == "O Hierofante"


class TestCalculateSectionNumber:
    """Tests for calculate_section_number function."""
    
    @pytest.fixture
    def sample_date(self):
        """Sample birthdate: May 15, 1990"""
        return date(1990, 5, 15)
    
    def test_missao_da_alma_uses_day(self, sample_date):
        """Missão da Alma uses day of birth."""
        result = calculate_section_number(sample_date, "missao_da_alma")
        # Day 15 -> reduce -> 15 (valid as-is)
        # But need to check actual reduction: 15 stays 15
        assert result == 15
    
    def test_personalidade_uses_month(self, sample_date):
        """Personalidade uses month of birth."""
        result = calculate_section_number(sample_date, "personalidade")
        # Month 5 -> 5
        assert result == 5
    
    def test_destino_uses_full_sum(self, sample_date):
        """Destino uses sum of all date digits."""
        result = calculate_section_number(sample_date, "destino")
        # 1+9+9+0+0+5+1+5 = 30 -> 3+0 = 3
        # Actually: 15051990 -> 1+5+0+5+1+9+9+0 = 30 -> 3
        assert result == 3
    
    def test_proposito_uses_year_halves(self, sample_date):
        """Propósito uses year calculation."""
        result = calculate_section_number(sample_date, "proposito")
        # 1990 -> 19 + 90 = 109 -> 1+0+9 = 10
        assert result == 10
    
    def test_manifestacao_uses_day_plus_month(self, sample_date):
        """Manifestação Material uses day + month."""
        result = calculate_section_number(sample_date, "manifestacao_material")
        # 15 + 5 = 20
        assert result == 20
    
    def test_december_birthday(self):
        """Test with December date."""
        dec_date = date(1985, 12, 25)
        
        # Day 25 -> stays 25 -> reduces to 7 (2+5)
        assert calculate_section_number(dec_date, "missao_da_alma") == 7
        
        # Month 12 -> stays 12
        assert calculate_section_number(dec_date, "personalidade") == 12


class TestGetSectionReadingData:
    """Tests for get_section_reading_data function."""
    
    def test_returns_tuple(self):
        """Should return tuple of (number, arcano_name)."""
        result = get_section_reading_data(date(1990, 5, 15), "missao_da_alma")
        
        assert isinstance(result, tuple)
        assert len(result) == 2
        assert isinstance(result[0], int)
        assert isinstance(result[1], str)
    
    def test_number_matches_arcano(self):
        """Number should correspond to the arcano name."""
        number, arcano = get_section_reading_data(date(1990, 5, 15), "personalidade")
        
        # Month 5 -> 5 -> O Hierofante
        assert number == 5
        assert arcano == "O Hierofante"


class TestEdgeCases:
    """Edge case tests."""
    
    def test_first_day_of_year(self):
        """Test January 1st."""
        date_val = date(2000, 1, 1)
        
        assert calculate_section_number(date_val, "missao_da_alma") == 1
        assert calculate_section_number(date_val, "personalidade") == 1
    
    def test_last_day_of_year(self):
        """Test December 31st."""
        date_val = date(1999, 12, 31)
        
        # Day 31 -> 4 (3+1)
        assert calculate_section_number(date_val, "missao_da_alma") == 4
        
        # Month 12 -> 12
        assert calculate_section_number(date_val, "personalidade") == 12
    
    def test_recent_year(self):
        """Test with 2025 year."""
        date_val = date(2025, 6, 15)
        
        # Year: 20 + 25 = 45 -> 4+5 = 9
        assert calculate_section_number(date_val, "proposito") == 9
