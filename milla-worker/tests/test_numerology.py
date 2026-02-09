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
    
    def test_10_reduces_to_1(self):
        """10 -> 1+0 = 1"""
        assert reduce_to_arcano(10) == 1
    
    def test_11_unchanged(self):
        """11 is a Master Number"""
        assert reduce_to_arcano(11) == 11
        
    def test_12_reduces_to_3(self):
        """12 -> 1+2 = 3"""
        assert reduce_to_arcano(12) == 3
        
    def test_20_reduces_to_2(self):
        """20 -> 2+0 = 2"""
        assert reduce_to_arcano(20) == 2
        
    def test_22_unchanged(self):
        """22 is a Master Number"""
        assert reduce_to_arcano(22) == 22
        
    def test_large_number_reduces(self):
        """1982 -> 20 -> 2"""
        assert reduce_to_arcano(1982) == 2


class TestGetArcanoName:
    """Tests for get_arcano_name function."""
    
    def test_reduced_mapping(self):
        """Should map reduced numbers correctly."""
        assert get_arcano_name(1) == "O Mago"
        assert get_arcano_name(10) == "O Mago"  # 10 -> 1
        assert get_arcano_name(5) == "O Hierofante"
        assert get_arcano_name(22) == "O Louco"


class TestCalculateSectionNumber:
    """Tests for calculate_section_number function."""
    
    @pytest.fixture
    def user_date(self):
        """User's birthdate from MapaMilla.md: 14/09/1982"""
        return date(1982, 9, 14)
    
    def test_full_user_matrix(self, user_date):
        """Verify the exact values from the User's example."""
        # A (Missão) = 14 -> 5
        assert calculate_section_number(user_date, "missao_da_alma") == 5
        
        # B (Personalidade) = 09 -> 9
        assert calculate_section_number(user_date, "personalidade") == 9
        
        # C (Destino) = 1982 -> 1+9+8+2 = 20 -> 2
        assert calculate_section_number(user_date, "destino") == 2
        
        # D (Propósito) = A+B+C = 5+9+2 = 16 -> 7
        assert calculate_section_number(user_date, "proposito") == 7
        
        # E (Material) = A+D = 5+7 = 12 -> 3
        assert calculate_section_number(user_date, "manifestacao_material") == 3
    
    def test_master_numbers_preserved(self):
        """Ensure 11 and 22 are preserved if they appear."""
        # Date creating an 11: 29th -> 2+9=11
        date_11 = date(1980, 1, 29)
        assert calculate_section_number(date_11, "missao_da_alma") == 11
        
        # Date creating 22: 22nd
        date_22 = date(1980, 1, 22)
        assert calculate_section_number(date_22, "missao_da_alma") == 22
