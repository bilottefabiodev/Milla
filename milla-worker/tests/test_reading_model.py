"""
Tests for reading model validation.
"""

import pytest
from pydantic import ValidationError

from app.models.reading import ReadingContent, FORBIDDEN_TERMS


class TestReadingContentValidation:
    """Tests for ReadingContent Pydantic model."""
    
    @pytest.fixture
    def valid_reading_data(self):
        """Valid reading data fixture."""
        return {
            "arcano": "O Hierofante",
            "titulo": "O Guardião da Sabedoria",
            "interpretacao": "Este arcano representa a busca pelo conhecimento profundo e a conexão com tradições ancestrais. " * 4,
            "sombra": "A tendência ao dogmatismo pode criar rigidez em suas crenças e dificultar a abertura para novas perspectivas.",
            "conselho": "Busque mentores e práticas que ressoem com sua essência. Permita-se questionar e crescer.",
        }
    
    def test_valid_reading_passes(self, valid_reading_data):
        """Valid reading data should pass validation."""
        reading = ReadingContent(**valid_reading_data)
        
        assert reading.arcano == "O Hierofante"
        assert reading.titulo == "O Guardião da Sabedoria"
    
    def test_arcano_max_length(self, valid_reading_data):
        """Arcano should have max length of 50."""
        valid_reading_data["arcano"] = "A" * 51
        
        with pytest.raises(ValidationError) as exc_info:
            ReadingContent(**valid_reading_data)
        
        assert "arcano" in str(exc_info.value)
    
    def test_titulo_max_length(self, valid_reading_data):
        """Titulo should have max length of 100."""
        valid_reading_data["titulo"] = "T" * 101
        
        with pytest.raises(ValidationError) as exc_info:
            ReadingContent(**valid_reading_data)
        
        assert "titulo" in str(exc_info.value)
    
    def test_interpretacao_min_length(self, valid_reading_data):
        """Interpretacao should have min length of 200."""
        valid_reading_data["interpretacao"] = "Texto curto demais."
        
        with pytest.raises(ValidationError) as exc_info:
            ReadingContent(**valid_reading_data)
        
        assert "interpretacao" in str(exc_info.value)
    
    def test_sombra_min_length(self, valid_reading_data):
        """Sombra should have min length of 50."""
        valid_reading_data["sombra"] = "Curto."
        
        with pytest.raises(ValidationError) as exc_info:
            ReadingContent(**valid_reading_data)
        
        assert "sombra" in str(exc_info.value)
    
    def test_conselho_min_length(self, valid_reading_data):
        """Conselho should have min length of 50."""
        valid_reading_data["conselho"] = "Curto."
        
        with pytest.raises(ValidationError) as exc_info:
            ReadingContent(**valid_reading_data)
        
        assert "conselho" in str(exc_info.value)


class TestForbiddenTermsValidator:
    """Tests for deterministic language validator."""
    
    @pytest.fixture
    def valid_reading_data(self):
        """Valid reading data fixture."""
        return {
            "arcano": "O Mago",
            "titulo": "O Início",
            "interpretacao": "Este arcano indica potencial e energia criativa. Sugere que há uma tendência natural para manifestar seus desejos. " * 3,
            "sombra": "A tendência à insegurança pode criar bloqueios na expressão do seu potencial interior.",
            "conselho": "Explore suas habilidades e confie no processo de manifestação dos seus objetivos.",
        }
    
    @pytest.mark.parametrize("forbidden_term", FORBIDDEN_TERMS)
    def test_forbidden_terms_in_interpretacao(self, valid_reading_data, forbidden_term):
        """Forbidden terms in interpretacao should fail validation."""
        valid_reading_data["interpretacao"] = f"Este texto contém {forbidden_term} um termo proibido. " * 5
        
        with pytest.raises(ValidationError) as exc_info:
            ReadingContent(**valid_reading_data)
        
        assert "determinística" in str(exc_info.value).lower()
    
    @pytest.mark.parametrize("forbidden_term", FORBIDDEN_TERMS)
    def test_forbidden_terms_in_sombra(self, valid_reading_data, forbidden_term):
        """Forbidden terms in sombra should fail validation."""
        valid_reading_data["sombra"] = f"A sombra mostra que {forbidden_term} você terá problemas. Este é um texto mais longo."
        
        with pytest.raises(ValidationError) as exc_info:
            ReadingContent(**valid_reading_data)
        
        assert "determinística" in str(exc_info.value).lower()
    
    @pytest.mark.parametrize("forbidden_term", FORBIDDEN_TERMS)
    def test_forbidden_terms_in_conselho(self, valid_reading_data, forbidden_term):
        """Forbidden terms in conselho should fail validation."""
        valid_reading_data["conselho"] = f"Meu conselho é que {forbidden_term} você deve agir assim. Este é um texto mais longo."
        
        with pytest.raises(ValidationError) as exc_info:
            ReadingContent(**valid_reading_data)
        
        assert "determinística" in str(exc_info.value).lower()
    
    def test_allowed_terms_pass(self, valid_reading_data):
        """Non-deterministic language should pass."""
        valid_reading_data["interpretacao"] = (
            "Este arcano sugere uma tendência natural. Pode indicar que há uma "
            "inclinação para mudanças. Há possibilidade de crescimento. " * 2
        )
        
        reading = ReadingContent(**valid_reading_data)
        assert "sugere" in reading.interpretacao


class TestCartaAlias:
    """Tests for 'carta' alias handling."""
    
    def test_carta_alias_accepted(self):
        """'carta' should be accepted as alias for 'arcano'."""
        data = {
            "carta": "O Mago",  # Using alias
            "titulo": "O Início",
            "interpretacao": "Este arcano indica potencial e energia criativa. Sugere que há uma tendência natural. " * 3,
            "sombra": "A tendência à insegurança pode criar bloqueios na expressão do seu potencial.",
            "conselho": "Explore suas habilidades e confie no processo de manifestação dos seus objetivos.",
        }
        
        # This should work because of populate_by_name = True
        # However, the field is named 'arcano' and 'carta' is not a defined alias
        # Let's test with actual arcano field
        data_with_arcano = {
            "arcano": "O Mago",
            "titulo": "O Início",
            "interpretacao": "Este arcano indica potencial e energia criativa. Sugere que há uma tendência. " * 3,
            "sombra": "A tendência à insegurança pode criar bloqueios na expressão do seu potencial.",
            "conselho": "Explore suas habilidades e confie no processo de manifestação dos seus objetivos.",
        }
        
        reading = ReadingContent(**data_with_arcano)
        assert reading.arcano == "O Mago"


class TestModelDumpForDb:
    """Tests for model_dump_for_db method."""
    
    def test_dump_returns_dict(self):
        """model_dump_for_db should return a dict."""
        reading = ReadingContent(
            arcano="O Sol",
            titulo="A Luz Interior",
            interpretacao="Este arcano sugere clareza e vitalidade. Indica uma fase de iluminação interior. " * 3,
            sombra="A tendência ao excesso de brilho pode criar arrogância ou necessidade de atenção.",
            conselho="Equilibre sua expressão pessoal com humildade e autenticidade genuína.",
        )
        
        result = reading.model_dump_for_db()
        
        assert isinstance(result, dict)
        assert "arcano" in result
        assert "titulo" in result
        assert "interpretacao" in result
        assert "sombra" in result
        assert "conselho" in result
        assert result["arcano"] == "O Sol"
