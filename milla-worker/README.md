# Milla Worker

Python worker para processamento de jobs de geração de readings.

## Setup

```bash
cd milla-worker
python -m venv venv
source venv/bin/activate  # Linux/Mac
pip install -r requirements.txt
```

## Environment

Copy `.env.example` to `.env` and fill in the values.

## Run

```bash
uvicorn app.main:app --reload --port 8001
```

## Tests

```bash
pytest -v
```
