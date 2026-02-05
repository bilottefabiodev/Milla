"""
Numerology calculation module for Milla.

Maps birthdate components to the 22 Major Arcana (Arcanos Maiores).
"""

from datetime import date
from typing import Literal

# Reading sections
SectionType = Literal[
    "missao_da_alma",
    "personalidade", 
    "destino",
    "proposito",
    "manifestacao_material"
]

# 22 Major Arcana mapping
ARCANOS_MAIORES: dict[int, str] = {
    1: "O Mago",
    2: "A Sacerdotisa",
    3: "A Imperatriz",
    4: "O Imperador",
    5: "O Hierofante",
    6: "Os Enamorados",
    7: "O Carro",
    8: "A Justiça",
    9: "O Eremita",
    10: "A Roda da Fortuna",
    11: "A Força",
    12: "O Pendurado",
    13: "A Morte",
    14: "A Temperança",
    15: "O Diabo",
    16: "A Torre",
    17: "A Estrela",
    18: "A Lua",
    19: "O Sol",
    20: "O Julgamento",
    21: "O Mundo",
    22: "O Louco",
}


def reduce_to_arcano(number: int) -> int:
    """
    Reduce a number to 1-22 range (Arcanos Maiores).
    
    Keeps reducing until the number falls within 1-22.
    Special case: 22 remains 22 (not reduced to 4).
    
    Examples:
        >>> reduce_to_arcano(5)
        5
        >>> reduce_to_arcano(23)
        5  # 2+3 = 5
        >>> reduce_to_arcano(38)
        11  # 3+8 = 11
        >>> reduce_to_arcano(22)
        22
    """
    if number <= 0:
        return 22  # O Louco for edge cases
    
    while number > 22:
        # Sum digits
        number = sum(int(d) for d in str(number))
    
    return number if number > 0 else 22


def get_arcano_name(number: int) -> str:
    """
    Get the Arcano name for a number (1-22).
    
    Examples:
        >>> get_arcano_name(1)
        'O Mago'
        >>> get_arcano_name(22)
        'O Louco'
    """
    reduced = reduce_to_arcano(number)
    return ARCANOS_MAIORES.get(reduced, "O Louco")


def calculate_section_number(birthdate: date, section: SectionType) -> int:
    """
    Calculate the numerology number for a given section based on birthdate.
    
    Mapping:
    - missao_da_alma: day
    - personalidade: month
    - destino: day + month + year (full sum)
    - proposito: first 2 digits of year + last 2 digits of year
    - manifestacao_material: day + month
    
    Examples:
        For birthdate 1990-05-15:
        >>> calculate_section_number(date(1990, 5, 15), 'missao_da_alma')
        15  -> reduce_to_arcano -> 6 (Os Enamorados)
        >>> calculate_section_number(date(1990, 5, 15), 'destino')
        1+9+9+0+5+1+5 = 30 -> reduce_to_arcano -> 3 (A Imperatriz)
    """
    day = birthdate.day
    month = birthdate.month
    year = birthdate.year
    
    if section == "missao_da_alma":
        # Day of birth
        raw = day
    
    elif section == "personalidade":
        # Month of birth
        raw = month
    
    elif section == "destino":
        # Full sum: all digits of date
        raw = sum(int(d) for d in f"{day:02d}{month:02d}{year}")
    
    elif section == "proposito":
        # Year calculation: first 2 + last 2 digits
        year_str = str(year)
        first_half = int(year_str[:2])
        second_half = int(year_str[2:])
        raw = first_half + second_half
    
    elif section == "manifestacao_material":
        # Day + Month
        raw = day + month
    
    else:
        raw = 22  # Default to O Louco
    
    return reduce_to_arcano(raw)


def get_section_reading_data(
    birthdate: date, 
    section: SectionType
) -> tuple[int, str]:
    """
    Get both the number and arcano name for a section.
    
    Returns:
        Tuple of (number, arcano_name)
    
    Example:
        >>> get_section_reading_data(date(1990, 5, 15), 'missao_da_alma')
        (6, 'Os Enamorados')
    """
    number = calculate_section_number(birthdate, section)
    arcano = get_arcano_name(number)
    return number, arcano
