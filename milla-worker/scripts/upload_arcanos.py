"""
Script to upload Arcano images to Supabase Storage.
Run from milla-worker directory with venv activated.
"""

import os
from pathlib import Path
from typing import Optional
from supabase import create_client

# Configuration
SUPABASE_URL = os.getenv("SUPABASE_URL", "https://juwgugljvryvhcdnmwdh.supabase.co")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
BUCKET_NAME = "cards"
IMAGES_DIR = Path(__file__).parent.parent.parent / "milla" / "public" / "assets" / "arcanos"

# Arcano name mapping (filename -> clean name)
ARCANO_NAMES = {
    "arcano_o_mago": "o_mago",
    "arcano_a_sacerdotisa": "a_sacerdotisa",
    "arcano_a_imperatriz": "a_imperatriz",
    "arcano_o_imperador": "o_imperador",
    "arcano_o_carro": "o_carro",
    "arcano_a_roda_da_fortuna": "a_roda_da_fortuna",
    "arcano_o_diabo": "o_diabo",
    "arcano_a_estrela": "a_estrela",
    "arcano_o_sol": "o_sol",
    "arcano_o_hierofante": "o_hierofante",
    "arcano_os_enamorados": "os_enamorados",
    "arcano_a_justica": "a_justica",
    "arcano_o_eremita": "o_eremita",
    "arcano_a_forca": "a_forca",
}



def get_arcano_name(filename: str) -> Optional[str]:

    """Extract clean arcano name from filename."""
    for prefix, clean_name in ARCANO_NAMES.items():
        if filename.startswith(prefix):
            return clean_name
    return None


def upload_images():
    """Upload all arcano images to Supabase Storage."""
    if not SUPABASE_KEY:
        print("Error: SUPABASE_SERVICE_ROLE_KEY not set")
        return

    supabase = create_client(SUPABASE_URL, SUPABASE_KEY)
    
    if not IMAGES_DIR.exists():
        print(f"Error: Images directory not found: {IMAGES_DIR}")
        return

    uploaded = 0
    for image_path in IMAGES_DIR.glob("*.png"):
        arcano_name = get_arcano_name(image_path.stem)
        if not arcano_name:
            print(f"Skipping unknown file: {image_path.name}")
            continue
        
        storage_path = f"{arcano_name}.png"
        
        try:
            with open(image_path, "rb") as f:
                file_content = f.read()
            
            # Upload to Supabase Storage
            result = supabase.storage.from_(BUCKET_NAME).upload(
                storage_path,
                file_content,
                file_options={"content-type": "image/png", "upsert": "true"}
            )
            
            # Get public URL
            public_url = supabase.storage.from_(BUCKET_NAME).get_public_url(storage_path)
            print(f"✅ Uploaded: {arcano_name} -> {public_url}")
            uploaded += 1
            
        except Exception as e:
            print(f"❌ Failed to upload {arcano_name}: {e}")
    
    print(f"\n✨ Done! Uploaded {uploaded} images to bucket '{BUCKET_NAME}'")


if __name__ == "__main__":
    upload_images()
