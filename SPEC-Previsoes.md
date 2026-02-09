# SPEC: Página Previsões - Milla

> **Versão:** 1.0 | **Data:** 2026-02-06 | **Status:** Aguardando Aprovação | **Base:** PRD-Previsoes.md

---

## 1. Arquitetura Textual (ASCII)

```
┌─────────────────────────────────────────────────────────────────────┐
│                           VERCEL                                    │
│  ┌───────────────────────────────────────────────────────────────┐  │
│  │   Frontend (Vite + React + TS + Tailwind)                     │  │
│  │   - /previsoes (Previsoes.tsx)                                │  │
│  │   - ForecastCard, ForecastCarousel, AudioPlayer               │  │
│  │   - useForecasts hook (supabase-js + anon key)                │  │
│  └───────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────┘
                              │ supabase-js (anon key)
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│                         SUPABASE                                    │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────────┐ │
│  │    Auth     │  │  Postgres   │  │   Storage                   │ │
│  │             │  │  + RLS      │  │   Bucket: forecasts-audio   │ │
│  └─────────────┘  └─────────────┘  └─────────────────────────────┘ │
│  Tabelas: forecasts, prompts (atualizada), jobs                    │
└─────────────────────────────────────────────────────────────────────┘
                              │ service_role (secreto)
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    VPS / EASYPANEL                                  │
│  ┌───────────────────────────────────────────────────────────────┐  │
│  │   Python Worker (FastAPI + APScheduler)                       │  │
│  │                                                               │  │
│  │   CRONS:                                                      │  │
│  │   📅 Domingo 20h      → enqueue_forecast_jobs (weekly)        │  │
│  │   📅 Dia 1º 8h        → enqueue_forecast_jobs (monthly)       │  │
│  │   📅 1º Janeiro 8h    → enqueue_forecast_jobs (yearly)        │  │
│  │   🗑️ Diário 3h        → cleanup_expired_forecasts             │  │
│  │                                                               │  │
│  │   SERVIÇOS:                                                   │  │
│  │   - forecast_generator.py (OpenAI + prompts específicos)      │  │
│  │   - minimax_service.py (TTS com voz clonada)                  │  │
│  │   - job_processor.py (atualizado para 'generate_forecast')   │  │
│  └───────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────┘
                              │
              ┌───────────────┴───────────────┐
              ▼                               ▼
┌─────────────────────────┐     ┌─────────────────────────┐
│        OPENAI           │     │       MINIMAX           │
│ POST /v1/chat/completions│     │  POST /v1/t2a_v2        │
│   (geração de texto)    │     │   (text-to-speech)      │
└─────────────────────────┘     └─────────────────────────┘
```

### 1.1 Responsabilidades por Camada

| Camada | Responsabilidade |
|--------|------------------|
| **Frontend** | Exibir feed de previsões, player de áudio, carrossel de navegação |
| **Supabase** | Persistência (forecasts, prompts), armazenamento de áudio (Storage), RLS |
| **Worker** | Geração de previsões (cron), processamento de jobs, TTS, cleanup |
| **OpenAI** | Geração de texto personalizado por tipo de previsão |
| **Minimax** | Síntese de voz com voz clonada da Milla |

---

## 2. Módulos e Arquivos

### 2.1 Frontend (`milla/`)

#### [NEW] `src/pages/Previsoes.tsx`
- **Responsabilidade:** Página principal com feed de previsões
- **Estado:** 
  - `selectedType: 'all' | 'weekly' | 'monthly' | 'yearly'`
  - `expandedCard: string | null`
- **Queries:** `useForecasts()` → busca forecasts do usuário

#### [NEW] `src/components/forecasts/ForecastCard.tsx`
- **Responsabilidade:** Card individual de previsão com player de áudio
- **Props:**
```typescript
interface ForecastCardProps {
  forecast: Forecast;
  isExpanded: boolean;
  onToggleExpand: () => void;
}
```
- **Componentes internos:** Avatar Milla, título, preview/conteúdo, AudioPlayer

#### [NEW] `src/components/forecasts/ForecastCarousel.tsx`
- **Responsabilidade:** Carrossel horizontal de navegação por mês/tipo
- **Props:**
```typescript
interface ForecastCarouselProps {
  forecasts: Forecast[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}
```
- **Ícones:** 🔮 (forecast texto), 🎤 (podcast/áudio)

#### [NEW] `src/components/forecasts/AudioPlayer.tsx`
- **Responsabilidade:** Player de áudio customizado (design Mystic Luxury)
- **Props:**
```typescript
interface AudioPlayerProps {
  audioUrl: string;
  duration: number;
}
```
- **Estado local:** `isPlaying`, `currentTime`, `progress`
- **Features:** Play/Pause, barra de progresso, tempo decorrido/total

#### [NEW] `src/hooks/useForecasts.ts`
- **Responsabilidade:** Buscar previsões do usuário
- **Return:**
```typescript
interface UseForecastsReturn {
  forecasts: Forecast[];
  isLoading: boolean;
  error: Error | null;
  refetch: () => void;
}
```

#### [MODIFY] `src/App.tsx`
- **Alteração:** Adicionar rota `/previsoes` apontando para `<Previsoes />`

#### [NEW] `src/types/forecast.ts`
- **Responsabilidade:** Tipos TypeScript para previsões
- **Exports:** `Forecast`, `ForecastType`, `ForecastFilter`

---

### 2.2 Backend (`milla-worker/`)

#### [NEW] `app/services/minimax_service.py`
- **Responsabilidade:** Integração com Minimax TTS API
- **Funções:**
```python
async def synthesize_speech(text: str, voice_id: str) -> bytes:
    """
    Sintetiza texto em áudio usando a API Minimax T2A v2.
    Retorna bytes do áudio MP3.
    """
    
async def upload_audio_to_storage(
    audio_bytes: bytes, 
    user_id: str, 
    forecast_id: str
) -> str:
    """
    Upload do áudio para Supabase Storage.
    Retorna URL pública do áudio.
    """
```

#### [NEW] `app/services/forecast_generator.py`
- **Responsabilidade:** Geração de previsões personalizadas
- **Funções:**
```python
def calculate_forecast_base(
    birthdate: date, 
    forecast_type: ForecastType
) -> dict:
    """
    Calcula base numérica conforme tipo de previsão.
    Retorna: {ponto_valor, ano_pessoal, ciclo, regente, ...}
    """

async def generate_forecast_content(
    prompt_template: str,
    nome: str,
    birthdate: date,
    forecast_type: ForecastType,
    period_start: date,
    period_end: date,
) -> ForecastContent:
    """
    Gera conteúdo de previsão via OpenAI.
    Valida com Pydantic e retorna ForecastContent.
    """
```

#### [MODIFY] `app/services/job_processor.py`
- **Alteração:** Adicionar handler para tipo `generate_forecast`
- **Novas funções:**
```python
def process_forecast_job(job: dict) -> None:
    """
    Processa job de geração de previsão.
    1. Busca profile
    2. Busca prompt ativo (forecast_weekly/monthly/yearly)
    3. Gera texto via OpenAI
    4. Gera áudio via Minimax
    5. Upload para Storage
    6. Insert em forecasts
    """
    
def enqueue_forecast_jobs_for_all_users(
    forecast_type: ForecastType,
    period_start: date,
    period_end: date
) -> int:
    """
    Enfileira jobs de previsão para todos os usuários com assinatura ativa.
    """
```

#### [MODIFY] `app/main.py`
- **Alteração:** Adicionar 4 novos cron jobs
```python
# Cron semanal (Domingo 20h Brasília)
scheduler.add_job(
    trigger_weekly_forecasts,
    CronTrigger(day_of_week='sun', hour=20, minute=0, timezone='America/Sao_Paulo'),
    id='weekly_forecasts'
)

# Cron mensal (Dia 1 às 8h Brasília)
scheduler.add_job(
    trigger_monthly_forecasts,
    CronTrigger(day=1, hour=8, minute=0, timezone='America/Sao_Paulo'),
    id='monthly_forecasts'
)

# Cron anual (1º Janeiro às 8h Brasília)
scheduler.add_job(
    trigger_yearly_forecasts,
    CronTrigger(month=1, day=1, hour=8, minute=0, timezone='America/Sao_Paulo'),
    id='yearly_forecasts'
)

# Cron cleanup (diário às 3h Brasília)
scheduler.add_job(
    cleanup_expired_forecasts,
    CronTrigger(hour=3, minute=0, timezone='America/Sao_Paulo'),
    id='forecast_cleanup'
)
```

#### [MODIFY] `app/config.py`
- **Alteração:** Adicionar configurações Minimax
```python
# Minimax TTS
minimax_api_key: str
minimax_voice_id: str
minimax_timeout_seconds: int = 60
```

#### [NEW] `app/models/forecast.py`
- **Responsabilidade:** Modelos Pydantic para previsões

---

### 2.3 Database (Migrations)

#### [NEW] `supabase/migrations/011_create_forecasts.sql`

```sql
-- Migration: 011_create_forecasts
-- Description: Create forecasts table with audio support

-- Enum para tipo de previsão
CREATE TYPE forecast_type AS ENUM ('weekly', 'monthly', 'yearly');

CREATE TABLE forecasts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Tipo e período
    type forecast_type NOT NULL,
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    
    -- Conteúdo
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    summary TEXT,
    
    -- Áudio
    audio_url TEXT,
    audio_duration_seconds INT,
    
    -- Metadata IA
    prompt_version TEXT NOT NULL,
    model_used TEXT NOT NULL,
    calculation_base JSONB,
    
    -- Timestamps
    delivered_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    expires_at TIMESTAMPTZ,
    
    -- Constraint: um forecast por tipo por período por usuário
    CONSTRAINT forecasts_unique_user_type_period UNIQUE(user_id, type, period_start)
);

-- Índices
CREATE INDEX idx_forecasts_user_id ON forecasts(user_id);
CREATE INDEX idx_forecasts_user_delivered ON forecasts(user_id, delivered_at DESC);
CREATE INDEX idx_forecasts_expires ON forecasts(expires_at) WHERE expires_at IS NOT NULL;
CREATE INDEX idx_forecasts_type ON forecasts(type);

-- RLS
ALTER TABLE forecasts ENABLE ROW LEVEL SECURITY;

-- Policy: usuários só veem próprias previsões entregues
CREATE POLICY "Users can view own delivered forecasts"
    ON forecasts FOR SELECT
    USING (auth.uid() = user_id AND delivered_at IS NOT NULL);

-- INSERT/UPDATE/DELETE: apenas service_role
```

#### [NEW] `supabase/migrations/012_add_forecast_prompts.sql`

```sql
-- Migration: 012_add_forecast_prompts
-- Description: Add forecast sections to reading_section enum

-- Adicionar novos valores ao enum
ALTER TYPE reading_section ADD VALUE 'forecast_weekly';
ALTER TYPE reading_section ADD VALUE 'forecast_monthly';
ALTER TYPE reading_section ADD VALUE 'forecast_yearly';
```

#### [NEW] `supabase/migrations/013_seed_forecast_prompts.sql`

```sql
-- Migration: 013_seed_forecast_prompts
-- Description: Seed prompts for forecast generation

INSERT INTO prompts (section, version, template, schema, is_active) VALUES

-- Prompt semanal
('forecast_weekly', '1.0.0', 
'Você é a Milla, mentora espiritual e numeróloga. Gere uma previsão SEMANAL personalizada.

Cliente: {nome}
Semana: {period_start} a {period_end}
Ano Pessoal: {ano_pessoal}
Número da Semana: {numero_semana}

Baseado na numerologia, crie uma previsão semanal que:
1. Identifique a energia dominante da semana
2. Destaque oportunidades e desafios
3. Ofereça conselho prático para os próximos 7 dias

Formato JSON obrigatório:
{
  "titulo": "Título impactante (máx 80 caracteres)",
  "resumo": "Prévia em 1-2 frases (máx 200 caracteres)",
  "conteudo": "Texto completo da previsão (500-800 palavras)"
}',
'{"type": "object", "properties": {"titulo": {"type": "string"}, "resumo": {"type": "string"}, "conteudo": {"type": "string"}}, "required": ["titulo", "resumo", "conteudo"]}',
true),

-- Prompt mensal
('forecast_monthly', '1.0.0',
'Você é a Milla, mentora espiritual e numeróloga. Gere uma previsão MENSAL personalizada.

Cliente: {nome}
Mês: {mes_nome} {ano}
Ano Pessoal: {ano_pessoal}
Ciclo Mensal: {ciclo_mensal}

Baseado na numerologia, crie uma previsão mensal que:
1. Revele o tema central do mês
2. Identifique fases importantes (início, meio, fim do mês)
3. Destaque áreas da vida afetadas (amor, trabalho, saúde, finanças)
4. Ofereça orientação estratégica para o período

Formato JSON obrigatório:
{
  "titulo": "Título impactante (máx 80 caracteres)",
  "resumo": "Prévia em 1-2 frases (máx 200 caracteres)",
  "conteudo": "Texto completo da previsão (800-1200 palavras)"
}',
'{"type": "object", "properties": {"titulo": {"type": "string"}, "resumo": {"type": "string"}, "conteudo": {"type": "string"}}, "required": ["titulo", "resumo", "conteudo"]}',
true),

-- Prompt anual
('forecast_yearly', '1.0.0',
'Você é a Milla, mentora espiritual e numeróloga. Gere uma previsão ANUAL personalizada.

Cliente: {nome}
Ano: {ano}
Ano Pessoal: {ano_pessoal}
Arcano Regente: {arcano_regente}

Baseado na numerologia e nos Arcanos Maiores, crie uma previsão anual profunda que:
1. Revele o grande tema do ano (baseado no Arcano Regente)
2. Divida o ano em ciclos trimestrais com energias específicas
3. Identifique meses de oportunidade e meses de cautela
4. Ofereça visão estratégica para cada área da vida
5. Inclua conselho de abertura e encerramento

Formato JSON obrigatório:
{
  "titulo": "Título impactante (máx 80 caracteres)",
  "resumo": "Prévia em 1-2 frases (máx 200 caracteres)",
  "conteudo": "Texto completo da previsão (1500-2000 palavras)"
}',
'{"type": "object", "properties": {"titulo": {"type": "string"}, "resumo": {"type": "string"}, "conteudo": {"type": "string"}}, "required": ["titulo", "resumo", "conteudo"]}',
true);
```

---

## 3. Contratos de API

### 3.1 Frontend → Supabase (via supabase-js)

```typescript
// Buscar previsões do usuário
const { data: forecasts } = await supabase
  .from('forecasts')
  .select('*')
  .eq('user_id', userId)
  .not('delivered_at', 'is', null)
  .order('delivered_at', { ascending: false });

// Buscar previsão específica
const { data: forecast } = await supabase
  .from('forecasts')
  .select('*')
  .eq('id', forecastId)
  .single();
```

### 3.2 Worker → External APIs

#### OpenAI - Geração de Texto
```python
# Endpoint: POST https://api.openai.com/v1/chat/completions
# Request:
{
    "model": "gpt-4o",
    "messages": [{"role": "user", "content": prompt_final}],
    "response_format": {"type": "json_object"},
    "max_tokens": 2000,
    "temperature": 0.8
}

# Response:
{
    "choices": [{
        "message": {
            "content": "{\"titulo\": \"...\", \"resumo\": \"...\", \"conteudo\": \"...\"}"
        }
    }]
}
```

#### Minimax - Text-to-Speech
```python
# Endpoint: POST https://api.minimax.chat/v1/t2a_v2
# Headers:
{
    "Authorization": "Bearer {api_key}",
    "Content-Type": "application/json"
}

# Request:
{
    "voice_id": "{voice_id}",
    "text": "Texto da previsão...",
    "model": "speech-01",
    "output_format": "mp3",
    "speed": 1.0
}

# Response: Binary MP3 audio
```

---

## 4. Modelos Pydantic (Backend)

```python
# app/models/forecast.py

from enum import Enum
from datetime import date, datetime
from typing import Optional
from pydantic import BaseModel, Field, field_validator

class ForecastType(str, Enum):
    WEEKLY = "weekly"
    MONTHLY = "monthly"
    YEARLY = "yearly"

class ForecastContent(BaseModel):
    """Conteúdo validado da previsão gerada pela IA."""
    
    titulo: str = Field(..., max_length=80)
    resumo: str = Field(..., max_length=200)
    conteudo: str = Field(..., min_length=500, max_length=5000)
    
    @field_validator('conteudo')
    @classmethod
    def no_deterministic_language(cls, v: str) -> str:
        forbidden = ['vai acontecer', 'certamente', 'definitivamente', 'sem dúvida']
        v_lower = v.lower()
        for term in forbidden:
            if term in v_lower:
                raise ValueError(f"Linguagem determinística: '{term}'")
        return v

class ForecastJobPayload(BaseModel):
    """Payload para job de geração de previsão."""
    
    forecast_type: ForecastType
    period_start: date
    period_end: date

class ForecastCalculationBase(BaseModel):
    """Base de cálculo numerológico por tipo."""
    
    # Comum a todos
    ano_pessoal: int
    
    # Weekly
    numero_semana: Optional[int] = None
    
    # Monthly
    ciclo_mensal: Optional[int] = None
    mes_nome: Optional[str] = None
    
    # Yearly
    arcano_regente: Optional[str] = None

class ForecastCreate(BaseModel):
    """Dados para criar uma previsão."""
    
    user_id: str
    type: ForecastType
    period_start: date
    period_end: date
    title: str
    content: str
    summary: Optional[str] = None
    audio_url: Optional[str] = None
    audio_duration_seconds: Optional[int] = None
    prompt_version: str
    model_used: str
    calculation_base: dict
    expires_at: Optional[datetime] = None
```

---

## 5. Tipos TypeScript (Frontend)

```typescript
// src/types/forecast.ts

export type ForecastType = 'weekly' | 'monthly' | 'yearly';

export interface Forecast {
  id: string;
  user_id: string;
  type: ForecastType;
  period_start: string; // ISO date
  period_end: string;   // ISO date
  title: string;
  content: string;
  summary: string | null;
  audio_url: string | null;
  audio_duration_seconds: number | null;
  prompt_version: string;
  model_used: string;
  calculation_base: Record<string, unknown>;
  delivered_at: string; // ISO datetime
  created_at: string;
  expires_at: string | null;
}

export interface ForecastFilter {
  type?: ForecastType;
  startDate?: string;
  endDate?: string;
}

// Para o carrossel
export interface ForecastCarouselItem {
  id: string;
  type: ForecastType;
  label: string; // "S1 Fev", "Fevereiro", "2026"
  hasAudio: boolean;
  date: string;
}
```

---

## 6. Dependências e Scripts

### 6.1 Frontend (`milla/package.json`)

**Novas dependências:**
```json
{
  "dependencies": {
    // Existentes...
    "date-fns": "^3.0.0"
  }
}
```

> Nota: Não há novas dependências significativas. O player de áudio será implementado com HTML5 Audio API nativa.

**Scripts:**
```bash
cd milla
npm install
npm run dev        # Desenvolvimento
npm run build      # Build produção
npm run lint       # Linting
```

### 6.2 Backend (`milla-worker/requirements.txt`)

**Adições:**
```
httpx>=0.27.0      # Para chamadas à Minimax API (async)
pytz>=2024.1       # Para timezone America/Sao_Paulo nos crons
```

**Scripts:**
```bash
cd milla-worker
pip install -r requirements.txt
pytest tests/                      # Testes unitários
uvicorn app.main:app --reload      # Desenvolvimento
```

---

## 7. Plano de Testes

### 7.1 Unit Tests

#### Backend (`milla-worker/tests/`)

```python
# tests/test_forecast_generator.py
def test_calculate_forecast_base_weekly():
    """Testa cálculo de base numérica para previsão semanal."""
    
def test_calculate_forecast_base_monthly():
    """Testa cálculo de base numérica para previsão mensal."""
    
def test_calculate_forecast_base_yearly():
    """Testa cálculo de base numérica para previsão anual."""

# tests/test_minimax_service.py
def test_synthesize_speech_success():
    """Testa síntese de voz com mock da API."""
    
def test_synthesize_speech_api_error():
    """Testa handling de erro da API."""

# tests/test_job_processor_forecast.py
def test_process_forecast_job_complete_flow():
    """Testa fluxo completo de processamento de job de previsão."""
```

**Execução:**
```bash
cd milla-worker && pytest tests/ -v
```

### 7.2 Integration Tests

#### Database
```python
# tests/integration/test_forecasts_table.py
def test_forecast_insert_and_select():
    """Testa insert e select na tabela forecasts."""
    
def test_forecast_unique_constraint():
    """Testa que não permite duplicatas por user+type+period."""
    
def test_forecast_rls_isolation():
    """Testa que RLS isola previsões por usuário."""
```

### 7.3 Manual Verification (E2E)

#### Teste 1: Trigger Manual de Previsão
1. Acessar VPS via SSH
2. Chamar `curl -X POST http://localhost:8000/trigger`
3. Verificar no Supabase se `forecasts` foi populado
4. Verificar se áudio existe no Storage bucket `forecasts-audio`

#### Teste 2: Visualização no Frontend
1. Fazer login no app
2. Navegar para `/previsoes`
3. Verificar se cards de previsão aparecem
4. Clicar no botão play do áudio
5. Verificar se áudio reproduz corretamente

#### Teste 3: Cron Execution (Staging)
1. Ajustar cron para próximo minuto em ambiente de teste
2. Aguardar execução
3. Verificar logs do worker (`docker logs milla-worker`)
4. Confirmar criação de jobs e forecasts

---

## 8. Segurança e Resiliência

### 8.1 Validação

| Camada | Método |
|--------|--------|
| **Frontend** | Tipos TypeScript + verificação de `audioUrl` antes de render |
| **Backend** | Pydantic models + validação de linguagem determinística |
| **Database** | Constraints SQL + RLS policies |

### 8.2 Secrets

```env
# .env (milla-worker)
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJ...  # NUNCA expor
OPENAI_API_KEY=sk-...
MINIMAX_API_KEY=...
MINIMAX_VOICE_ID=...
```

> [!CAUTION]
> `MINIMAX_API_KEY` e `SUPABASE_SERVICE_ROLE_KEY` são secretos críticos. Nunca commitar no repositório.

### 8.3 Error Handling

```python
from tenacity import retry, stop_after_attempt, wait_exponential

@retry(
    stop=stop_after_attempt(3),
    wait=wait_exponential(multiplier=1, min=4, max=60)
)
async def call_minimax_api(text: str) -> bytes:
    """Chamada com retry exponencial."""
    response = await httpx.post(...)
    response.raise_for_status()
    return response.content
```

### 8.4 Logging

```python
# Logs estruturados, sem dados sensíveis
logger.info("forecast_generated", 
    user_id=user_id[:8],  # Truncar
    forecast_type=forecast_type,
    audio_duration=audio_duration
)
# NUNCA logar: conteúdo completo, birthdate, full_name
```

---

## 9. Métricas e Growth

### 9.1 Eventos a Instrumentar

| Evento | Quando | Propriedades |
|--------|--------|--------------|
| `forecast_page_viewed` | Usuário abre /previsoes | - |
| `forecast_card_expanded` | Clica em "Ver mais" | `forecast_id`, `type` |
| `forecast_audio_played` | Clica play no áudio | `forecast_id`, `duration` |
| `forecast_audio_completed` | Áudio termina | `forecast_id`, `listened_percent` |
| `carousel_scrolled` | Navega no carrossel | `direction` |

### 9.2 KPIs

| KPI | Descrição | Meta |
|-----|-----------|------|
| **Abertura de previsão** | % usuários que abrem /previsoes por semana | >60% |
| **Consumo de áudio** | % previsões com áudio reproduzido | >40% |
| **Retenção semanal** | Usuários que ouvem previsão 3+ semanas seguidas | >50% |

---

## 10. Critérios de Aceite

- [ ] Build passa sem erros/warnings (`npm run build`, `pytest`)
- [ ] Migrations aplicadas sem erros no Supabase
- [ ] RLS testado: usuário só vê próprias previsões
- [ ] Previsão semanal gerada e visível no frontend
- [ ] Player de áudio funciona (play, pause, progresso)
- [ ] Crons configurados com timezone `America/Sao_Paulo`
- [ ] Cleanup automático remove previsões expiradas
- [ ] Logs estruturados sem dados sensíveis

---

## 11. Riscos e Rollback

| Risco | Impacto | Mitigação | Rollback |
|-------|---------|-----------|----------|
| **Minimax API fora do ar** | Alto | Retry com backoff; salvar forecast sem áudio | Entregar texto, gerar áudio depois |
| **Custo Minimax alto** | Médio | Limitar tamanho do texto (~2000 chars) | Reduzir para resumo apenas |
| **Cron duplicado** | Médio | Idempotency key: `{user_id}:{type}:{period_start}` | Delete duplicatas manualmente |
| **Migration quebra prod** | Alto | Testar em branch Supabase antes | `git revert` + restaurar backup |
| **Storage cheio** | Baixo | Cleanup de áudios antigos no cron | Expandir quota Supabase |

---

## 12. Pseudocódigo - Fluxos Principais

### 12.1 Geração de Previsão

```python
# Pseudocódigo: generate_forecast
def generate_forecast(user_id, forecast_type, period_start, period_end):
    # 1. Buscar profile
    profile = get_profile(user_id)
    
    # 2. Calcular base numérica conforme tipo
    if forecast_type == 'weekly':
        base = calculate_weekly_base(profile.birthdate, period_start)
    elif forecast_type == 'monthly':
        base = calculate_monthly_base(profile.birthdate, period_start)
    else:  # yearly
        base = calculate_yearly_base(profile.birthdate, period_start.year)
    
    # 3. Buscar prompt ativo
    prompt = get_active_prompt(f'forecast_{forecast_type}')
    
    # 4. Gerar texto via OpenAI
    content = call_openai(prompt.template, nome=profile.full_name, **base)
    
    # 5. Gerar áudio via Minimax
    audio_bytes = call_minimax(content.conteudo)
    audio_url = upload_to_storage(audio_bytes, user_id, forecast_id)
    
    # 6. Calcular expires_at
    if forecast_type in ['weekly', 'monthly']:
        expires_at = now() + timedelta(days=90)
    else:
        expires_at = None  # Yearly não expira, é substituída
    
    # 7. Insert em forecasts
    insert_forecast(
        user_id=user_id,
        type=forecast_type,
        content=content,
        audio_url=audio_url,
        delivered_at=now(),
        expires_at=expires_at
    )
```

### 12.2 Cleanup de Previsões Expiradas

```python
# Pseudocódigo: cleanup_expired_forecasts
def cleanup_expired_forecasts():
    # 1. Buscar forecasts expirados
    expired = select forecasts where expires_at < now()
    
    for forecast in expired:
        # 2. Deletar áudio do Storage
        if forecast.audio_url:
            delete_from_storage(forecast.audio_url)
        
        # 3. Deletar forecast
        delete forecast
    
    log(f"Cleanup: {len(expired)} forecasts removidos")
```

---

## 13. Storage Bucket Configuration

```sql
-- Criar bucket via Supabase Dashboard ou CLI
-- Bucket: forecasts-audio
-- Public: false (acessível via signed URLs ou RLS)

-- Estrutura de paths:
-- forecasts-audio/{user_id}/{forecast_id}.mp3
```

**RLS para Storage:**
```sql
-- Policy: usuários só acessam próprios áudios
CREATE POLICY "Users can access own forecast audio"
ON storage.objects FOR SELECT
USING (
    bucket_id = 'forecasts-audio' 
    AND auth.uid()::text = (storage.foldername(name))[1]
);
```

---

## 14. Checklist de Validação

Antes de aprovar este SPEC:

- [x] **Arquitetura clara e modular** - Diagrama ASCII + tabela de responsabilidades
- [x] **Todos os arquivos mapeados** - Frontend (7 arquivos), Backend (5 arquivos), Migrations (3 arquivos)
- [x] **Contratos de API definidos** - Supabase queries, OpenAI, Minimax
- [x] **Modelos Pydantic detalhados** - ForecastContent, ForecastJobPayload, etc.
- [x] **Tipos TypeScript definidos** - Forecast, ForecastFilter, ForecastCarouselItem
- [x] **Segurança (RLS, .env, validação)** - Policies, secrets, error handling
- [x] **Plano de testes detalhado** - Unit, integration, E2E manual
- [x] **Riscos e rollback documentados** - Tabela com 5 riscos principais
- [x] **Pseudocódigo para fluxos complexos** - Geração e cleanup

---

**Próximos passos:**
- [ ] Aprovação deste SPEC
- [ ] Handoff para Implementation Agent com este arquivo

---

> [!IMPORTANT]
> Este SPEC detalha a implementação técnica da página Previsões. O Implementation Agent deve seguir esta especificação para garantir consistência com a arquitetura existente do Milla.
