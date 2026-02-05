"""
Pydantic models for reading content validation.
"""

from pydantic import BaseModel, Field, field_validator


# Forbidden deterministic terms
FORBIDDEN_TERMS = [
    "você vai",
    "certamente", 
    "com certeza",
    "sempre",
    "nunca",
    "definitivamente",
    "garanto",
    "sem dúvida",
]


class ReadingContent(BaseModel):
    """
    Validated reading content from OpenAI response.
    
    Accepts 'carta' as alias for 'arcano' for backward compatibility.
    """
    
    arcano: str = Field(
        ..., 
        max_length=50,
        alias="arcano",
        description="Nome do Arcano (ex: O Hierofante)"
    )
    titulo: str = Field(
        ..., 
        max_length=100,
        description="Título impactante da interpretação"
    )
    interpretacao: str = Field(
        ..., 
        min_length=200, 
        max_length=2000,
        description="Texto profundo sobre a essência da carta"
    )
    sombra: str = Field(
        ..., 
        min_length=50, 
        max_length=600,
        description="O que trava o cliente"
    )
    conselho: str = Field(
        ..., 
        min_length=50, 
        max_length=600,
        description="Ação contínua"
    )
    
    class Config:
        # Allow 'carta' as alternative field name for 'arcano'
        populate_by_name = True
    
    @field_validator('interpretacao', 'sombra', 'conselho')
    @classmethod
    def no_deterministic_language(cls, v: str) -> str:
        """Validate that no deterministic language is used."""
        v_lower = v.lower()
        for term in FORBIDDEN_TERMS:
            if term in v_lower:
                raise ValueError(f"Linguagem determinística detectada: '{term}'")
        return v
    
    def model_dump_for_db(self) -> dict:
        """Export as dict for database storage."""
        return {
            "arcano": self.arcano,
            "titulo": self.titulo,
            "interpretacao": self.interpretacao,
            "sombra": self.sombra,
            "conselho": self.conselho,
        }
