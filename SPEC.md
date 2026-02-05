# SPEC - Milla: Especificação Técnica MVP

> **Versão:** 1.0 | **Data:** 2026-02-04 | **Status:** Draft | **Base:** PRD.md aprovado

---

## 1. Arquitetura

### 1.1 Componentes Confirmados

| Componente | Tecnologia | Responsabilidade |
|------------|------------|------------------|
| Frontend | Vite + React + TS + Tailwind | UI, Auth flows, leitura de dados |
| Backend/DB | Supabase (Auth + Postgres + RLS) | Autenticação, persistência, segurança |
| Storage | Supabase Storage | Imagens das cartas (bucket `cards`) |
| Email | Resend (via Supabase SMTP) | Reset password, welcome |
| IA | OpenAI API (GPT-4o) | Geração de JSON por seção |
| Worker | Python (FastAPI) na VPS/EasyPanel | Pipeline IA, jobs, escrita via service_role |

### 1.2 Diagrama

```
┌─────────────────────────────────────────────────────────────────────┐
│                            VERCEL                                   │
│  ┌───────────────────────────────────────────────────────────────┐  │
│  │   Frontend (Vite + React + TS + Tailwind)                     │  │
│  │   - Auth UI (login/signup/reset)                              │  │
│  │   - Onboarding/Paywall/Perfil                                 │  │
│  │   - Leitura via supabase-js (anon key + RLS)                  │  │
│  └───────────────────────────────────────────────────────────────┘  │
│  ┌───────────────────────────────────────────────────────────────┐  │
│  │   /api/webhooks/payment (placeholder futuro)                  │  │
│  └───────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────┘
                              │ supabase-js (anon key)
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│                          SUPABASE                                   │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐                 │
│  │    Auth     │  │  Postgres   │  │   Storage   │                 │
│  │ (email/pw)  │  │  + RLS      │  │   (cards)   │                 │
│  └─────────────┘  └─────────────┘  └─────────────┘                 │
│         │                │                                          │
│         └────────────────┼──────── Resend (SMTP) ──▶ Email         │
└─────────────────────────────────────────────────────────────────────┘
                              │ service_role (secreto)
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│                      VPS / EASYPANEL                                │
│  ┌───────────────────────────────────────────────────────────────┐  │
│  │   Python Worker (FastAPI + APScheduler)                       │  │
│  │   - Poll jobs pendentes a cada 30s                            │  │
│  │   - Chama OpenAI                                              │  │
│  │   - Valida JSON (Pydantic)                                    │  │
│  │   - Upsert readings via service_role                          │  │
│  │   - POST /health (healthcheck)                                │  │
│  └───────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│                          OPENAI                                     │
│   POST /v1/chat/completions (response_format: json_object)          │
└─────────────────────────────────────────────────────────────────────┘
```

### 1.3 Fluxos End-to-End

#### a) Signup/Login
```
User → /signup → Supabase Auth (create user)
     → (opcional) Email de confirmação via Resend
     → Login → JWT retornado → Frontend armazena sessão
```

#### b) Reset Password
```
User → /reset-password → Supabase Auth.resetPasswordForEmail()
     → Supabase dispara email via Resend (SMTP configurado)
     → User clica link → /reset-password?token=xxx
     → User define nova senha → Auth.updateUser()
     → Redireciona /login
```

#### c) Primeiro Login (Onboarding)
```
Login OK → Frontend verifica profiles.onboarding_completed_at
         → Se NULL → redireciona /onboarding
         → User preenche: full_name, birthdate, checkboxes
         → PATCH profiles: salva dados + consent_terms_at + consent_disclaimer_at
         → SET onboarding_completed_at = now()
         → Evento lógico: "onboarding_completed"
         → Redireciona /paywall
```

#### d) Assinatura Ativa
```
(Webhook ou seed manual) → INSERT/UPDATE subscriptions
  status='active', current_period_end > now()
→ Evento lógico: "subscription_activated"
→ Worker cria 5 jobs (1 por seção) com idempotency_key
→ Polling processa jobs → OpenAI → Pydantic → UPSERT readings
→ Frontend poll /readings → exibe Perfil
```

#### e) Assinatura Expirada
```
Frontend verifica subscriptions.status != 'active' OR current_period_end < now()
→ Redireciona /paywall com mensagem "Assinatura expirada"
```

---

## 2. Módulos / Pastas / Responsabilidades

### 2.1 Repositório Web (`milla/`)

```
milla/
├── src/
│   ├── components/
│   │   ├── auth/           # LoginForm, SignupForm, ResetPasswordForm
│   │   ├── onboarding/     # OnboardingForm, ConsentCheckbox, DisclaimerCheckbox
│   │   ├── paywall/        # PaywallScreen, PlanCard, ReactivatePrompt
│   │   └── profile/        # ProfileHeader, TabNavigation, ReadingCard
│   ├── hooks/
│   │   ├── useAuth.ts      # login, signup, logout, resetPassword, session
│   │   ├── useProfile.ts   # getProfile, updateProfile, checkOnboarding
│   │   ├── useSubscription.ts # getSubscription, isActive
│   │   └── useReadings.ts  # getReadingBySection, getAllReadings
│   ├── pages/              # Landing, Login, Signup, ResetPassword, Onboarding, Paywall, Profile
│   ├── lib/
│   │   ├── supabase.ts     # createClient (ANON key apenas)
│   │   └── constants.ts    # SECTIONS enum, route paths
│   └── types/
│       └── database.ts     # Tipos gerados (supabase gen types)
├── supabase/
│   └── migrations/         # DDL numerado
└── public/
    └── cards/              # Fallback local (ou usar Storage)
```

### 2.2 Repositório Worker (`milla-worker/`)

```
milla-worker/
├── app/
│   ├── main.py             # FastAPI app + scheduler
│   ├── config.py           # Settings via pydantic-settings
│   ├── models/
│   │   ├── reading.py      # ReadingContent (Pydantic)
│   │   └── job.py          # JobPayload, JobStatus
│   ├── services/
│   │   ├── supabase_client.py  # Client com SERVICE_ROLE
│   │   ├── openai_service.py   # Chamada à API
│   │   ├── job_processor.py    # Lógica de polling e processamento
│   │   └── numerology.py       # Cálculos e mapeamento para Arcanos
│   └── prompts/
│       └── templates/      # Arquivos .txt por seção
├── tests/
└── requirements.txt
```

### 2.3 Interface Web ↔ Worker

| Operação | Quem executa | Como |
|----------|--------------|------|
| SELECT profiles/subscriptions/readings/jobs | Frontend | supabase-js (anon key + RLS) |
| INSERT/UPDATE jobs | Worker | service_role |
| INSERT/UPDATE readings | Worker | service_role |
| INSERT/UPDATE subscriptions | Worker ou Webhook | service_role |

> [!CAUTION]
> **O frontend NUNCA usa `service_role`.** Apenas `anon` key exposta no client.

---

## 3. Modelo de Dados e Migrations

### 3.1 Enums (via CHECK constraints)

```sql
-- Migration: 000_create_enums.sql

-- subscription_status
CREATE TYPE subscription_status AS ENUM ('active', 'canceled', 'past_due', 'trialing');

-- subscription_plan
CREATE TYPE subscription_plan AS ENUM ('quarterly', 'yearly');

-- job_status
CREATE TYPE job_status AS ENUM ('pending', 'processing', 'completed', 'failed');

-- reading_section
CREATE TYPE reading_section AS ENUM (
  'missao_da_alma',
  'personalidade',
  'destino',
  'proposito',
  'manifestacao_material'
);
```

### 3.2 Tabela `profiles`

```sql
-- Migration: 001_create_profiles.sql

CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  birthdate DATE,
  locale TEXT DEFAULT 'pt-BR',
  onboarding_completed_at TIMESTAMPTZ,
  consent_terms_at TIMESTAMPTZ,
  consent_disclaimer_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Trigger para criar profile vazio no signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id) VALUES (NEW.id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Índice
CREATE INDEX idx_profiles_onboarding ON profiles(onboarding_completed_at);
```

### 3.3 Tabela `subscriptions`

```sql
-- Migration: 002_create_subscriptions.sql

CREATE TABLE subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  status subscription_status NOT NULL DEFAULT 'trialing',
  plan subscription_plan NOT NULL,
  payment_provider TEXT,  -- placeholder: 'stripe', 'paddle', etc.
  provider_subscription_id TEXT,
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  canceled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  
  CONSTRAINT unique_user_subscription UNIQUE (user_id)
);

CREATE INDEX idx_subscriptions_status ON subscriptions(status, current_period_end);
```

### 3.4 Tabela `prompts`

```sql
-- Migration: 003_create_prompts.sql

CREATE TABLE prompts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  section reading_section NOT NULL,
  version TEXT NOT NULL,  -- semver: '1.0.0'
  template TEXT NOT NULL,
  schema JSONB NOT NULL,  -- JSON Schema esperado
  is_active BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  
  CONSTRAINT unique_active_prompt_per_section 
    EXCLUDE (section WITH =) WHERE (is_active = true)
);

CREATE INDEX idx_prompts_active ON prompts(section) WHERE is_active = true;
```

### 3.5 Tabela `readings`

```sql
-- Migration: 004_create_readings.sql

CREATE TABLE readings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  section reading_section NOT NULL,
  content JSONB NOT NULL,
  prompt_version TEXT NOT NULL,
  model_used TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  
  CONSTRAINT unique_reading_per_section UNIQUE (user_id, section)
);

CREATE INDEX idx_readings_user ON readings(user_id);
```

### 3.6 Tabela `jobs`

```sql
-- Migration: 005_create_jobs.sql

CREATE TABLE jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  type TEXT NOT NULL DEFAULT 'generate_reading',
  status job_status NOT NULL DEFAULT 'pending',
  payload JSONB NOT NULL,
  result JSONB,
  idempotency_key TEXT NOT NULL UNIQUE,
  attempts INT DEFAULT 0,
  max_attempts INT DEFAULT 3,
  last_error TEXT,
  scheduled_at TIMESTAMPTZ DEFAULT now(),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_jobs_pending ON jobs(status, scheduled_at) 
  WHERE status = 'pending';
CREATE INDEX idx_jobs_user ON jobs(user_id);
```

### 3.7 Storage Bucket

```sql
-- Via Dashboard ou CLI
-- Bucket: cards (public)
-- Total: 22 imagens (uma por Arcano Maior)
-- Convenção: cards/{arcano_slug}.webp
-- Ex: cards/o-hierofante.webp, cards/o-mago.webp, cards/a-sacerdotisa.webp
-- Formato: WebP (recomendado) ou PNG
-- Tamanho sugerido: 400x600px
```

> [!NOTE]
> As 22 imagens dos Arcanos Maiores ainda precisam ser criadas/adquiridas.

---

## 4. RLS + Policies

### 4.1 Habilitar RLS

```sql
-- Migration: 006_enable_rls.sql

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE readings ENABLE ROW LEVEL SECURITY;
ALTER TABLE jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE prompts ENABLE ROW LEVEL SECURITY;
```

### 4.2 Policies `profiles`

```sql
-- SELECT: próprio perfil
CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

-- UPDATE: próprio perfil
CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- INSERT: apenas trigger (SECURITY DEFINER)
-- DELETE: não permitido via RLS
```

### 4.3 Policies `subscriptions`

```sql
-- SELECT: própria subscription
CREATE POLICY "Users can view own subscription"
  ON subscriptions FOR SELECT
  USING (auth.uid() = user_id);

-- INSERT/UPDATE/DELETE: apenas service_role (worker/webbook)
-- Não criar policies para essas operações = bloqueado para anon
```

### 4.4 Policies `readings`

```sql
-- SELECT: próprios readings
CREATE POLICY "Users can view own readings"
  ON readings FOR SELECT
  USING (auth.uid() = user_id);

-- INSERT/UPDATE: apenas service_role
```

### 4.5 Policies `jobs`

```sql
-- SELECT: próprios jobs (para mostrar status "gerando...")
CREATE POLICY "Users can view own jobs"
  ON jobs FOR SELECT
  USING (auth.uid() = user_id);

-- INSERT/UPDATE: apenas service_role
```

### 4.6 Policies `prompts`

```sql
-- SELECT: público (prompts não contêm dados sensíveis)
-- Trade-off: expõe templates, mas simplifica debug
-- Alternativa: só service_role (mais seguro, menos debug)
CREATE POLICY "Prompts are publicly readable"
  ON prompts FOR SELECT
  USING (true);

-- INSERT/UPDATE/DELETE: apenas service_role
```

> [!NOTE]
> **Recomendação:** Para MVP, `prompts` público é aceitável. Em produção, considerar restringir a `service_role` se templates forem proprietários.

---

## 5. Contratos e APIs

### 5.1 Operações Frontend (via supabase-js)

```typescript
// Auth
supabase.auth.signUp({ email, password })
supabase.auth.signInWithPassword({ email, password })
supabase.auth.signOut()
supabase.auth.resetPasswordForEmail(email)
supabase.auth.updateUser({ password })

// Profiles
supabase.from('profiles').select('*').eq('id', userId).single()
supabase.from('profiles').update({ full_name, birthdate, ... }).eq('id', userId)

// Subscriptions
supabase.from('subscriptions').select('*').eq('user_id', userId).single()

// Readings
supabase.from('readings').select('*').eq('user_id', userId)
supabase.from('readings').select('*').eq('user_id', userId).eq('section', section).single()

// Jobs
supabase.from('jobs').select('*').eq('user_id', userId).order('created_at', { ascending: false })
```

### 5.2 Rotas HTTP Adicionais (Vercel)

| Rota | Status MVP | Descrição |
|------|------------|-----------|
| `/api/webhooks/payment` | Placeholder | Futuro: recebe eventos do provedor |

> [!NOTE]
> MVP não requer rotas Vercel adicionais. Jobs são enfileiradoas pelo Worker ao detectar `subscription_activated`.

### 5.3 Eventos Internos (Convenções de Estado)

| Evento | Condição | Ação |
|--------|----------|------|
| `onboarding_completed` | `profiles.onboarding_completed_at IS NOT NULL` | Frontend redireciona paywall |
| `subscription_activated` | `subscriptions.status = 'active' AND current_period_end > now()` | Worker cria jobs |
| `job_completed` | `jobs.status = 'completed'` | Frontend pode buscar readings |

### 5.4 Instrumentação de Growth (Analytics Events)

```typescript
// Pseudocódigo - implementar com Mixpanel/Amplitude/PostHog
track('onboarding_started', { user_id })
track('onboarding_completed', { user_id, birthdate_year })
track('paywall_viewed', { user_id, has_previous_subscription: bool })
track('subscription_started', { user_id, plan })
track('subscription_activated', { user_id, plan })
track('reading_generation_started', { user_id, section })
track('reading_generation_completed', { user_id, section, duration_ms })
track('reading_generation_failed', { user_id, section, error_type })
track('profile_viewed', { user_id })
track('tab_selected', { user_id, section })
```

---

## 6. Pipeline IA (Worker Python)

### 6.1 Política de Custo

> [!CAUTION]
> **NUNCA rodar IA sem assinatura ativa.** Jobs só são criados após `subscription_activated`.

### 6.2 Enfileiramento de Jobs

```python
# Pseudocódigo: ao detectar subscription_activated
def enqueue_reading_jobs(user_id: str):
    sections = ['missao_da_alma', 'personalidade', 'destino', 'proposito', 'manifestacao_material']
    prompt = get_active_prompt(section)  # busca prompts.is_active = true
    
    for section in sections:
        idempotency_key = f"generate_reading:{user_id}:{section}:{prompt.version}"
        
        # INSERT ... ON CONFLICT DO NOTHING
        supabase.table('jobs').upsert({
            'user_id': user_id,
            'type': 'generate_reading',
            'status': 'pending',
            'payload': {'section': section},
            'idempotency_key': idempotency_key,
            'scheduled_at': now()
        }, on_conflict='idempotency_key', ignore_duplicates=True)
```

### 6.3 Polling (Cron 30s)

```python
# Pseudocódigo: job_processor.py
async def process_pending_jobs():
    # 1. Seleciona jobs pendentes (com lock)
    jobs = supabase.rpc('claim_pending_jobs', {'limit': 5}).execute()
    # RPC usa: FOR UPDATE SKIP LOCKED e UPDATE status='processing'
    
    for job in jobs.data:
        try:
            await process_single_job(job)
        except Exception as e:
            await handle_job_failure(job, e)
```

### 6.4 Cálculo de Numerologia (22 Arcanos Maiores)

Cada seção calcula um número a partir da data de nascimento, que mapeia para um dos 22 Arcanos Maiores:

```python
# numerology.py

ARCANOS_MAIORES = {
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
    22: "O Louco",  # também pode ser 0
}

def reduce_to_arcano(number: int) -> int:
    """Reduz número para 1-22 (Arcanos Maiores)"""
    if number <= 22:
        return number
    # Soma dígitos até ficar <= 22
    while number > 22:
        number = sum(int(d) for d in str(number))
    return number if number > 0 else 22

def calculate_section_number(birthdate: date, section: str) -> int:
    """Calcula número específico por seção baseado na data de nascimento"""
    day, month, year = birthdate.day, birthdate.month, birthdate.year
    
    calculations = {
        'missao_da_alma': sum(int(d) for d in str(day)),
        'personalidade': sum(int(d) for d in str(month)),
        'destino': sum(int(d) for d in str(day + month + year)),
        'proposito': sum(int(d) for d in str(day + month)),
        'manifestacao_material': sum(int(d) for d in str(year)),
    }
    
    raw_number = calculations.get(section, 1)
    return reduce_to_arcano(raw_number)

def get_arcano_name(number: int) -> str:
    return ARCANOS_MAIORES.get(number, "O Louco")
```

### 6.5 Processamento Individual

```python
async def process_single_job(job: dict):
    section = job['payload']['section']
    user_id = job['user_id']
    
    # 1. Carrega profile
    profile = supabase.table('profiles').select('*').eq('id', user_id).single().execute()
    
    # 2. Carrega prompt ativo
    prompt = supabase.table('prompts').select('*').eq('section', section).eq('is_active', True).single().execute()
    
    # 3. Calcula número e arcano
    ponto_valor = calculate_section_number(profile.data['birthdate'], section)
    arcano_name = get_arcano_name(ponto_valor)
    
    # 4. Monta prompt com dados do n8n
    final_prompt = prompt.data['template'].format(
        nome=profile.data['full_name'],
        ponto_nome=section_display_name(section),  # "Missão da Alma", etc.
        ponto_valor=ponto_valor,
        arcano=arcano_name
    )
    
    # 5. Chama OpenAI
    response = await openai_client.chat.completions.create(
        model="gpt-4o",
        messages=[{"role": "user", "content": final_prompt}],
        response_format={"type": "json_object"}
    )
    
    # 6. Valida com Pydantic
    content = ReadingContent.model_validate_json(response.choices[0].message.content)
    
    # 7. Upsert reading
    supabase.table('readings').upsert({
        'user_id': user_id,
        'section': section,
        'content': content.model_dump(),
        'prompt_version': prompt.data['version'],
        'model_used': 'gpt-4o'
    }, on_conflict='user_id,section').execute()
    
    # 8. Marca job completed
    supabase.table('jobs').update({
        'status': 'completed',
        'completed_at': datetime.utcnow().isoformat()
    }).eq('id', job['id']).execute()
```

### 6.5 Tratamento de Erros e Retries

```python
async def handle_job_failure(job: dict, error: Exception):
    attempts = job['attempts'] + 1
    max_attempts = job['max_attempts']
    
    if attempts >= max_attempts:
        status = 'failed'
        scheduled_at = None
    else:
        status = 'pending'
        # Backoff exponencial: 30s, 60s, 120s
        delay = 30 * (2 ** (attempts - 1))
        scheduled_at = datetime.utcnow() + timedelta(seconds=delay)
    
    supabase.table('jobs').update({
        'status': status,
        'attempts': attempts,
        'last_error': str(error)[:500],
        'scheduled_at': scheduled_at.isoformat() if scheduled_at else None
    }).eq('id', job['id']).execute()
```

### 6.6 Idempotência

| Aspecto | Implementação |
|---------|---------------|
| **idempotency_key** | `generate_reading:{user_id}:{section}:{prompt_version}` |
| **Jobs** | `ON CONFLICT (idempotency_key) DO NOTHING` |
| **Readings** | `ON CONFLICT (user_id, section) DO UPDATE` |

### 6.7 Logs e Observabilidade

```python
# Logs estruturados (JSON), sem dados sensíveis
import structlog
logger = structlog.get_logger()

logger.info("job_started", job_id=job['id'], section=section)
logger.info("job_completed", job_id=job['id'], duration_ms=elapsed)
logger.error("job_failed", job_id=job['id'], error_type=type(e).__name__)
# NUNCA logar: full_name, birthdate, content completo
```

### 6.8 Healthcheck

```python
@app.get("/health")
async def health():
    return {"status": "ok", "timestamp": datetime.utcnow().isoformat()}
```

---

## 7. OpenAI Prompt/Schema

### 7.1 Modelo Pydantic

```python
from pydantic import BaseModel, Field, field_validator
from typing import List

FORBIDDEN_TERMS = ['você vai', 'certamente', 'com certeza', 'sempre', 'nunca', 'definitivamente']

class ReadingContent(BaseModel):
    arcano: str = Field(..., max_length=50, description="Nome do Arcano (ex: O Hierofante)")
    titulo: str = Field(..., max_length=100, description="Título impactante da interpretação")
    interpretacao: str = Field(..., min_length=200, max_length=2000, description="Texto profundo sobre a essência da carta")
    sombra: str = Field(..., min_length=50, max_length=600, description="O que trava o cliente")
    conselho: str = Field(..., min_length=50, max_length=600, description="Ação contínua")
    
    @field_validator('interpretacao', 'sombra', 'conselho')
    @classmethod
    def no_deterministic_language(cls, v: str) -> str:
        v_lower = v.lower()
        for term in FORBIDDEN_TERMS:
            if term in v_lower:
                raise ValueError(f"Linguagem determinística detectada: '{term}'")
        return v
```

### 7.2 Template de Prompt (Metodologia Milla)

Este é o prompt base adaptado do n8n original:

```
Atuação: Você é a Milla, uma mentora espiritual e analista numerológica. Sua linguagem é profunda, acolhedora, mas extremamente prática e direta. Você não faz previsões genéricas; você revela a estrutura da alma do cliente.

Tarefa: Interprete o tema {ponto_nome} para (Número {ponto_valor}) para o cliente {nome}.

Metodologia de Interpretação:
1. Identifique o Arcano Maior correspondente ao número.
2. Explique a força desse arquétipo na vida do cliente baseado no tema {ponto_nome}.
3. Revele a "Sombra" (o desafio ou bloqueio) que esse número traz.
4. Dê uma orientação prática de como agir com base nessa energia e no tema em análise.

Referência de Conhecimento (Metodologia Milla):
1 (O Mago): Início, potencial, poder de manifestação. Sombra: Insegurança.
2 (A Sacerdotisa): Intuição, silêncio, saber oculto. Sombra: Calar sentimentos.
3 (A Imperatriz): Criação, prazer, abundância. Sombra: Autossabotagem.
4 (O Imperador): Estrutura, ordem, autoridade. Sombra: Rigidez.
5 (O Hierofante): Sabedoria, ensino, ética. Sombra: Culpa excessiva.
6 (Os Enamorados): Escolha, união, valores. Sombra: Indecisão.
7 (O Carro): Direção, foco, vitória. Sombra: Perda de controle.
8 (A Justiça): Equilíbrio, causa e efeito. Sombra: Autocrítica severa.
9 (O Eremita): Introspecção, busca interna. Sombra: Isolamento.
10 (A Roda da Fortuna): Ciclos, mudanças inevitáveis, movimento. Sombra: Instabilidade ou resistência ao novo.
11 (A Força): Domínio dos instintos, coragem mansa, resiliência. Sombra: Uso da força bruta ou repressão emocional.
12 (O Pendurado): Nova perspectiva, pausa necessária, sacrifício por um bem maior. Sombra: Estagnação ou vitimismo.
13 (A Morte): Transformação profunda, encerramento de ciclos, renascimento. Sombra: Medo de desapegar do que já morreu.
14 (A Temperança): Equilíbrio, paciência, alquimia emocional. Sombra: Falta de propósito ou excessos.
15 (O Diabo): Poder pessoal, magnetismo, sombra, desejos. Sombra: Prisão em vícios, obsessões ou ganância.
16 (A Torre): Ruptura de estruturas falsas, libertação súbita. Sombra: Caos interno ou negação da realidade.
17 (A Estrela): Esperança, inspiração, cura, conexão espiritual. Sombra: Desconexão da realidade ou desânimo.
18 (A Lua): Intuição profunda, inconsciente, mistério. Sombra: Ilusão, medos imaginários e confusão mental.
19 (O Sol): Clareza, sucesso, vitalidade, verdade exposta. Sombra: Arrogância ou necessidade excessiva de brilhar.
20 (O Julgamento): Chamado da alma, despertar, perdão, renovação. Sombra: Julgamento severo de si e dos outros.
21 (O Mundo): Conclusão, plenitude, sucesso total, integração. Sombra: Medo de finalizar etapas ou sensação de incompletude.
22/0 (O Louco): Liberdade, novos começos, salto de fé. Sombra: Irresponsabilidade ou falta de direção.

Formato de Saída (Obrigatório em JSON):
{{
  "arcano": "Nome do Arcano",
  "titulo": "Um título impactante",
  "interpretacao": "Texto profundo sobre a essência da carta relacionada ao tema",
  "sombra": "O que trava o cliente",
  "conselho": "Ação contínua"
}}
```

### 7.3 Mapeamento Seção → ponto_nome

| Section (DB) | ponto_nome (Display) |
|--------------|----------------------|
| `missao_da_alma` | Missão da Alma |
| `personalidade` | Personalidade |
| `destino` | Destino |
| `proposito` | Propósito |
| `manifestacao_material` | Manifestação Material |

### 7.4 Guardrails

| Guardrail | Implementação |
|-----------|---------------|
| Formato JSON | `response_format={"type": "json_object"}` |
| Linguagem | Pydantic validator + instrução no prompt |
| Tamanho | `Field(min_length, max_length)` |
| Posicionamento | Disclaimer implícito no prompt |

### 7.5 Fallback

```python
# Se JSON inválido, retry com correção
if not valid_json:
    retry_prompt = f"O JSON retornado é inválido. Corrija para o schema: {schema}"
    # Retry 1x antes de falhar
```

---

## 8. UI/UX – Especificação de Telas

### 8.1 Rotas

| Rota | Componente | Descrição |
|------|------------|-----------|
| `/` | Landing | Hero + CTA signup |
| `/signup` | Signup | Form email/password |
| `/login` | Login | Form email/password |
| `/reset-password` | ResetPassword | Form email ou nova senha (se token) |
| `/onboarding` | Onboarding | Form nome + birthdate + checkboxes |
| `/paywall` | Paywall | Planos + CTA (placeholder) |
| `/perfil` | Profile | Tabs + ReadingCards |

### 8.2 Guards de Rotas

```typescript
// Pseudocódigo
function RouteGuard({ children }) {
  const { user, loading } = useAuth()
  const { profile } = useProfile()
  const { subscription, isActive } = useSubscription()
  
  if (loading) return <LoadingSpinner />
  
  // Não logado → Login
  if (!user) return <Navigate to="/login" />
  
  // Onboarding incompleto → Onboarding
  if (!profile?.onboarding_completed_at) return <Navigate to="/onboarding" />
  
  // Subscription inativa → Paywall
  if (!isActive) return <Navigate to="/paywall" />
  
  // Tudo OK → Perfil
  return children
}
```

### 8.3 Tela Profile

```
┌─────────────────────────────────────────────────────────────┐
│  {full_name}      [MISSÃO] [PERSON.] [DESTINO] [PROP.] [MAT.]
├─────────────────────────────────────────────────────────────┤
│                                                             │
│   ┌────────────┐                                            │
│   │   CARTA    │    {titulo}                                │
│   │  (imagem)  │                                            │
│   │            │    INTERPRETAÇÃO                           │
│   └────────────┘    {interpretacao}                         │
│                                                             │
│                     SOMBRA                                  │
│                     {sombra}                                │
│                                                             │
│                     CONSELHO                                │
│                     {conselho}                              │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 8.4 Estados da Tela Profile

| Estado | UI |
|--------|-----|
| Loading | Skeleton cards |
| Jobs pendentes/processing | "Gerando seu mapa..." + spinner |
| Jobs failed | "Erro ao gerar. [Tentar novamente]" |
| Readings prontos | Exibe conteúdo |

### 8.5 Imagens das Cartas

```
// Convenção de path
// Supabase Storage: /cards/{carta_slug}.webp
// Fallback local: /public/cards/{carta_slug}.webp

function getCardImageUrl(carta: string): string {
  const slug = slugify(carta) // "O Hierofante" → "o-hierofante"
  return `${supabaseUrl}/storage/v1/object/public/cards/${slug}.webp`
}
```

---

## 9. Dependências e Scripts

### 9.1 Web (`package.json`)

```json
{
  "dependencies": {
    "@supabase/supabase-js": "^2.x",
    "react": "^18.x",
    "react-dom": "^18.x",
    "react-router-dom": "^6.x",
    "@tanstack/react-query": "^5.x",
    "zod": "^3.x"
  },
  "devDependencies": {
    "vite": "^5.x",
    "typescript": "^5.x",
    "tailwindcss": "^3.x",
    "eslint": "^8.x",
    "prettier": "^3.x",
    "@testing-library/react": "^14.x",
    "vitest": "^1.x"
  },
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview",
    "lint": "eslint src --ext .ts,.tsx",
    "test": "vitest",
    "test:coverage": "vitest --coverage"
  }
}
```

### 9.2 Worker (`requirements.txt`)

```
fastapi>=0.110.0
uvicorn>=0.27.0
pydantic>=2.6.0
pydantic-settings>=2.2.0
httpx>=0.27.0
supabase>=2.4.0
openai>=1.12.0
apscheduler>=3.10.0
structlog>=24.1.0
pytest>=8.0.0
pytest-asyncio>=0.23.0
```

### 9.3 Scripts Worker

```bash
# Rodar localmente
uvicorn app.main:app --reload --port 8000

# Lint
ruff check app/

# Testes
pytest tests/ -v --cov=app

# Produção (EasyPanel)
uvicorn app.main:app --host 0.0.0.0 --port 8000
```

---

## 10. Testes

### 10.1 Unit Tests (Worker)

| Teste | Descrição |
|-------|-----------|
| `test_reading_content_valid` | JSON válido passa validação Pydantic |
| `test_reading_content_deterministic` | Rejeita linguagem determinística |
| `test_idempotency_key_format` | Formato correto do key |
| `test_backoff_calculation` | Delays corretos para retries |

### 10.2 Integration Tests (Worker)

| Teste | Descrição |
|-------|-----------|
| `test_rls_cross_user` | Usuário A não acessa dados de B |
| `test_upsert_reading` | Não duplica (user_id, section) |
| `test_job_idempotency` | Reprocessar não cria job duplicado |

### 10.3 E2E Tests (Web)

```
Cenário: Signup → Onboarding → Paywall → Perfil

1. Acessa /signup
2. Preenche email/password válidos
3. Submete → redireciona /onboarding
4. Preenche nome, birthdate, marca checkboxes
5. Submete → redireciona /paywall (assinatura inativa)
6. (Seed: ativa subscription no DB)
7. Refresh → redireciona /perfil
8. Aguarda jobs completarem
9. Verifica 5 tabs funcionando
10. Clica em cada tab → conteúdo carrega

Cenário: Reset Password

1. Acessa /reset-password
2. Digita email
3. Submete → mostra "Email enviado"
4. (Simula: acessa link com token)
5. Define nova senha
6. Submete → redireciona /login
7. Login com nova senha funciona
```

### 10.4 Cobertura Alvo

| Componente | Target |
|------------|--------|
| Worker (Python) | ≥ 80% |
| Web (componentes críticos) | ≥ 60% |

---

## 11. Critérios de Aceite (MVP)

- [ ] Login/Signup/Reset password funcionando
- [ ] Onboarding salva profile + consentimentos (`consent_*_at` preenchidos)
- [ ] Paywall bloqueia acesso quando `subscription.status != 'active'`
- [ ] Ao ativar subscription (seed), worker cria 5 jobs automaticamente
- [ ] Worker processa jobs e gera readings válidos
- [ ] Perfil exibe 5 tabs com conteúdo correto
- [ ] RLS impede acesso cruzado entre usuários
- [ ] Jobs idempotentes (reprocessar não duplica)
- [ ] Readings upsertem (não duplicam por section)
- [ ] Logs sem dados sensíveis (nome, birthdate, conteúdo)
- [ ] Healthcheck `/health` retorna 200

---

## 12. Task List de Implementação

### Fase 1: Setup
- [ ] Criar projeto Supabase
- [ ] Rodar migrations (enums + 5 tabelas)
- [ ] Habilitar RLS + criar policies
- [ ] Configurar Resend como SMTP no Supabase
- [ ] Criar bucket `cards` no Storage
- [ ] Criar projeto Vite + estrutura de pastas
- [ ] Criar projeto Python worker + estrutura

### Fase 2: Auth + Onboarding
- [ ] Implementar `useAuth` hook
- [ ] Criar páginas Login/Signup/ResetPassword
- [ ] Implementar `useProfile` hook
- [ ] Criar página Onboarding + form
- [ ] Testar fluxo completo

### Fase 3: Paywall + Subscription
- [ ] Implementar `useSubscription` hook
- [ ] Criar página Paywall (placeholder)
- [ ] Implementar guards de rota
- [ ] Criar script de seed para subscription (SQL ou Python)

### Fase 4: Worker
- [ ] Configurar supabase-py com service_role
- [ ] Implementar `numerology.py` (cálculos + mapeamento 22 Arcanos)
- [ ] Implementar job_processor (polling + claim)
- [ ] Implementar openai_service
- [ ] Criar modelo Pydantic ReadingContent
- [ ] Implementar lógica de retries/backoff
- [ ] Criar RPC `claim_pending_jobs` no Supabase
- [ ] Inserir prompts iniciais na tabela `prompts`
- [ ] Configurar APScheduler (30s)
- [ ] Deploy no EasyPanel

### Fase 5: Profile
- [ ] Implementar `useReadings` hook
- [ ] Criar componentes ProfileHeader + TabNavigation
- [ ] Criar componente ReadingCard
- [ ] Implementar estados (loading/gerando/error/ready)

### Fase 6: Assets (22 Cartas)
- [ ] Definir estilo visual das cartas (ilustração, IA, etc.)
- [ ] Gerar/adquirir 22 imagens dos Arcanos Maiores
- [ ] Upload no bucket `cards` do Supabase Storage
- [ ] Configurar convenção de nomes (slugify do nome do arcano)

### Fase 7: Testes + Polish
- [ ] Unit tests worker (Pydantic, numerology, idempotency)
- [ ] Integration tests RLS
- [ ] E2E tests web (signup → onboarding → paywall → perfil)
- [ ] Instrumentação analytics (opcional MVP)
- [ ] Review de segurança (secrets, logs, RLS)

---

## 13. Decisões Pendentes

> [!NOTE]
> As perguntas originais foram respondidas. Restam apenas decisões a serem tomadas durante a implementação:

1. **Analytics provider:** Ainda não definido. Opções: Mixpanel, Amplitude, PostHog. Recomendação: adiava para pós-MVP ou usar PostHog (self-hosted grátis).

2. **Estilo das imagens das cartas:** Decidir se serão ilustrações personalizadas, geradas por IA, ou adquiridas de banco de imagens.

3. **Cálculos de Numerologia:** Os cálculos por seção estão como proposta inicial. Validar com especialista se a lógica (dia, mês, soma total, etc.) está correta para cada tema.

---

## 14. Respostas às Perguntas Originais (Referência)

| Pergunta | Resposta |
|----------|----------|
| Cálculo de Numerologia | Implementar cálculo real baseado no n8n (22 Arcanos Maiores) |
| Imagens das Cartas | 22 imagens (uma por Arcano), ainda não criadas, formato WebP |
| Seed de Subscription | Script SQL ou Python para ativar subscription em testes |
| Prompt versão inicial | Usar template do n8n com Metodologia Milla (já documentado) |
| Analytics provider | Decisão adiada; opcional no MVP |

---

> [!NOTE]
> Este SPEC é um documento vivo. Atualizações serão feitas conforme decisões técnicas evoluírem.

