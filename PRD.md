# PRD - Milla: Mapa da Vida

> **Versão:** 1.0 | **Data:** 2026-02-04 | **Status:** Draft

---

## 1. Objetivo e Escopo (MVP)

### 1.1 Visão do Produto
**Milla** é um web app que gera um "Mapa da Vida" personalizado combinando Numerologia, Tarot, Astrologia Chinesa, Cabalá, Baralho Cigano e Psicologia/Coaching. O usuário recebe interpretações arquetípicas e um plano de ação prático.

### 1.2 Escopo MVP
| Incluído | Excluído (v2+) |
|----------|----------------|
| Login/Signup (email/senha) | OAuth (Google, Apple) |
| Reset password via Resend | Previsões, Desafios |
| Onboarding (nome, data nasc., consentimento) | Configurações avançadas |
| Paywall (assinatura trimestral/anual) | Notificações push |
| Página "Perfil" com 5 tabs | Compartilhamento social |
| Geração de conteúdo via OpenAI | Multi-idioma |

### 1.3 Monetização
- **Planos:** Trimestral e Anual
- **Momento do Paywall:** Antes de iniciar pipeline de IA (evita custo sem assinatura ativa)

---

## 2. UX Flows

### 2.1 Fluxo de Autenticação

```
┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│   Landing   │───▶│   Sign Up   │───▶│  Confirmar  │
│    Page     │    │  (email/pw) │    │   Email?*   │
└─────────────┘    └─────────────┘    └─────────────┘
       │                                     │
       ▼                                     ▼
┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│    Login    │───▶│  Onboarding │───▶│   Paywall   │
│             │    │  (1º login) │    │             │
└─────────────┘    └─────────────┘    └─────────────┘
                                            │
                                            ▼
                                     ┌─────────────┐
                                     │   Perfil    │
                                     └─────────────┘
```

*Confirmação de email opcional no MVP (Supabase default).

### 2.2 Reset Password
1. Usuário clica "Esqueci senha"
2. Frontend chama Supabase Auth → dispara email via Resend
3. Usuário recebe link com token
4. Clica → abre `/reset-password?token=xxx`
5. Define nova senha → redireciona ao login

### 2.3 Onboarding (1º Login)
1. Modal/página fullscreen coleta:
   - Nome completo (required)
   - Data de nascimento (required)
   - Checkbox consentimento LGPD + Termos
   - Checkbox disclaimer "autoconhecimento/entretenimento"
2. Submit → salva em `profiles`
3. Emite evento `onboarding_completed`
4. Redireciona ao **Paywall**

### 2.4 Paywall
| Estado | Comportamento |
|--------|---------------|
| Sem assinatura | Mostra planos + CTA para assinar |
| Assinatura expirada | Mostra aviso + opção de reativar |
| Assinatura ativa | Redireciona a `/perfil` |

- **Lógica:** Antes de chamar pipeline IA, verifica `subscriptions.status = 'active'` e `current_period_end > now()`

### 2.5 Página Perfil

```
┌─────────────────────────────────────────────────────────┐
│  Nome Completo                 [TAB1][TAB2][TAB3]...    │
├─────────────────────────────────────────────────────────┤
│                                                         │
│    ┌─────────┐                                          │
│    │  CARTA  │   Título: A Sabedoria que Transcende     │
│    │ (imagem)│                                          │
│    └─────────┘   INTERPRETAÇÃO                          │
│                  Lorem ipsum dolor sit amet...          │
│                                                         │
│                  SOMBRA                                 │
│                  Cuidado com...                         │
│                                                         │
│                  CONSELHO                               │
│                  Pratique...                            │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

**Tabs:**
1. MISSÃO DA ALMA (default)
2. PERSONALIDADE
3. DESTINO
4. PROPÓSITO
5. MANIFESTAÇÃO MATERIAL

---

## 3. Arquitetura Proposta

```
┌─────────────────────────────────────────────────────────────────┐
│                           VERCEL                                │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │  Frontend (Vite + React + TS + Tailwind)                │    │
│  └─────────────────────────────────────────────────────────┘    │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │  API Routes / Edge Functions (opcional)                 │    │
│  └─────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────┘
                              │
        ┌─────────────────────┼─────────────────────┐
        ▼                     ▼                     ▼
┌───────────────┐    ┌───────────────┐    ┌───────────────┐
│   SUPABASE    │    │    RESEND     │    │    OPENAI     │
│  Auth + DB    │    │    (email)    │    │   (GPT API)   │
│  + Storage    │    │               │    │               │
│  + RLS        │    │               │    │               │
└───────────────┘    └───────────────┘    └───────────────┘
        │
        │ webhook / polling
        ▼
┌───────────────────────────────────────────────────────────┐
│              VPS / EASYPANEL                              │
│  ┌─────────────────────────────────────────────────────┐  │
│  │  Python Worker (FastAPI ou script standalone)       │  │
│  │  - Processa jobs da fila                            │  │
│  │  - Chama OpenAI                                     │  │
│  │  - Escreve resultado no Supabase                    │  │
│  └─────────────────────────────────────────────────────┘  │
└───────────────────────────────────────────────────────────┘
```

### 3.1 Responsabilidades

| Componente | Responsabilidade |
|------------|------------------|
| **Vercel (Frontend)** | UI, chamadas Supabase (auth, reads), rota de webhook de pagamento (futura) |
| **Supabase** | Auth, Postgres, RLS, Storage (imagens cartas), Edge Functions (triggers opcionais) |
| **Resend** | Transacional: reset password, welcome email, lembretes |
| **OpenAI** | Geração de JSON interpretativo por seção |
| **Python Worker (VPS)** | Pipeline IA, retries, logs, idempotência |

---

## 4. Modelo de Dados

### 4.1 Diagrama ER Simplificado

```
┌──────────────┐       ┌──────────────┐       ┌──────────────┐
│   profiles   │──────▶│   readings   │◀──────│    jobs      │
└──────────────┘       └──────────────┘       └──────────────┘
       │                      │
       │                      │
       ▼                      ▼
┌──────────────┐       ┌──────────────┐
│ subscriptions│       │   prompts    │
└──────────────┘       └──────────────┘
```

### 4.2 Tabelas

#### `profiles`
| Coluna | Tipo | Descrição |
|--------|------|-----------|
| `id` | uuid (PK, FK auth.users) | Mesmo ID do Supabase Auth |
| `full_name` | text | Nome completo |
| `birthdate` | date | Data de nascimento |
| `locale` | text | pt-BR (default) |
| `onboarding_completed_at` | timestamptz | Null se não completou |
| `consent_terms_at` | timestamptz | Aceite LGPD/Termos |
| `consent_disclaimer_at` | timestamptz | Aceite disclaimer |
| `created_at` | timestamptz | |
| `updated_at` | timestamptz | |

#### `subscriptions`
| Coluna | Tipo | Descrição |
|--------|------|-----------|
| `id` | uuid (PK) | |
| `user_id` | uuid (FK profiles) | |
| `status` | text | `active`, `canceled`, `past_due`, `trialing` |
| `plan` | text | `quarterly`, `yearly` |
| `payment_provider` | text | Placeholder: `stripe`, `paddle`, etc. |
| `provider_subscription_id` | text | ID externo |
| `current_period_start` | timestamptz | |
| `current_period_end` | timestamptz | |
| `canceled_at` | timestamptz | Null se não cancelou |
| `created_at` | timestamptz | |
| `updated_at` | timestamptz | |

#### `readings`
| Coluna | Tipo | Descrição |
|--------|------|-----------|
| `id` | uuid (PK) | |
| `user_id` | uuid (FK profiles) | |
| `section` | text | `missao_da_alma`, `personalidade`, `destino`, `proposito`, `manifestacao_material` |
| `content` | jsonb | JSON gerado pela IA |
| `prompt_version` | text | Referência ao prompt usado |
| `model_used` | text | Ex: `gpt-4o` |
| `created_at` | timestamptz | |

**Exemplo `content`:**
```json
{
  "carta": "O Hierofante",
  "titulo": "A Sabedoria que Transcende e Enraíza",
  "interpretacao": "...",
  "sombra": "...",
  "conselho": "..."
}
```

#### `prompts`
| Coluna | Tipo | Descrição |
|--------|------|-----------|
| `id` | uuid (PK) | |
| `section` | text | Qual seção o prompt atende |
| `version` | text | Semver: `1.0.0` |
| `template` | text | Prompt com placeholders |
| `schema` | jsonb | JSON Schema esperado da resposta |
| `is_active` | boolean | Apenas um ativo por seção |
| `created_at` | timestamptz | |

#### `jobs`
| Coluna | Tipo | Descrição |
|--------|------|-----------|
| `id` | uuid (PK) | |
| `user_id` | uuid (FK profiles) | |
| `type` | text | `generate_reading` |
| `status` | text | `pending`, `processing`, `completed`, `failed` |
| `payload` | jsonb | Dados de entrada |
| `result` | jsonb | Resultado ou erro |
| `idempotency_key` | text (unique) | Evita duplicação |
| `attempts` | int | Contador de tentativas |
| `max_attempts` | int | Default: 3 |
| `last_error` | text | Último erro |
| `scheduled_at` | timestamptz | Quando executar |
| `started_at` | timestamptz | |
| `completed_at` | timestamptz | |
| `created_at` | timestamptz | |

---

## 5. Políticas RLS

> **Premissa:** Cada usuário acessa **apenas seus próprios dados**.

```sql
-- profiles: usuário só vê/edita o próprio perfil
CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);

-- subscriptions: apenas leitura do próprio registro
CREATE POLICY "Users can view own subscription"
  ON subscriptions FOR SELECT
  USING (auth.uid() = user_id);

-- readings: apenas leitura dos próprios readings
CREATE POLICY "Users can view own readings"
  ON readings FOR SELECT
  USING (auth.uid() = user_id);

-- jobs: usuário pode ver status dos próprios jobs
CREATE POLICY "Users can view own jobs"
  ON jobs FOR SELECT
  USING (auth.uid() = user_id);

-- prompts: leitura pública (ou restrita a service_role)
CREATE POLICY "Prompts are readable"
  ON prompts FOR SELECT
  USING (true);
```

> [!WARNING]
> **INSERT/DELETE em `subscriptions`, `readings`, `jobs`:** Apenas via `service_role` (backend Python ou Edge Functions). O frontend nunca insere diretamente.

---

## 6. Contratos de API e Eventos

### 6.1 Rotas Principais (Frontend ↔ Supabase)

| Método | Rota | Descrição |
|--------|------|-----------|
| `POST` | `/auth/signup` | Supabase Auth nativo |
| `POST` | `/auth/login` | Supabase Auth nativo |
| `POST` | `/auth/reset-password` | Supabase + Resend |
| `GET` | `/profiles` | Busca perfil do usuário logado |
| `PATCH` | `/profiles` | Atualiza perfil (onboarding) |
| `GET` | `/subscriptions` | Status da assinatura |
| `GET` | `/readings?section=X` | Leitura por seção |
| `GET` | `/jobs?status=X` | Jobs do usuário |

### 6.2 Rotas do Worker Python (Internas)

| Método | Rota | Descrição |
|--------|------|-----------|
| `POST` | `/internal/jobs/process` | Chamado por cron/fila |
| `POST` | `/internal/webhooks/payment` | Webhook do provedor de pagamento |

### 6.3 Eventos Internos

| Evento | Trigger | Ação |
|--------|---------|------|
| `onboarding_completed` | Profile atualizado com `onboarding_completed_at` | Frontend redireciona ao Paywall |
| `subscription_activated` | Webhook pagamento ou insert em subscriptions | Cria job `generate_reading` para 5 seções |
| `job_completed` | Worker finaliza job com sucesso | Frontend pode buscar `readings` |
| `subscription_expired` | Cron ou webhook | Atualiza status; bloqueia acesso ao Perfil |

---

## 7. Estratégia de Automação: Python vs n8n

### 7.1 Comparativo Conceitual

| Aspecto | n8n | Python Worker |
|---------|-----|---------------|
| **Interface** | Visual low-code | Código explícito |
| **Curva de aprendizado** | Baixa para fluxos simples | Média (requer dev) |
| **Customização** | Limitada a nodes disponíveis | Total |
| **Debugging** | UI de execução | Logs + breakpoints |
| **Idempotência** | Manual (nodes de verificação) | Nativo via `idempotency_key` |
| **Retries** | Configurável por node | Total controle |
| **Custo** | Self-hosted grátis; Cloud pago | Apenas infra (VPS) |
| **Escalabilidade** | Workers limitados | Horizontal (múltiplos workers) |

### 7.2 Recomendação para Milla

**Python Worker** é mais indicado porque:
1. Pipeline de IA requer validação complexa (Pydantic)
2. Controle granular de retries e backoff
3. Já possui VPS com EasyPanel
4. Evita lock-in em plataforma

### 7.3 Arquitetura do Worker

```
┌────────────────────────────────────────────────────────┐
│  EASYPANEL (VPS)                                       │
│  ┌──────────────────────────────────────────────────┐  │
│  │  Python Worker (FastAPI + APScheduler ou Celery) │  │
│  │                                                  │  │
│  │  1. Poll: SELECT * FROM jobs WHERE status='pending' │
│  │     AND scheduled_at <= now() ORDER BY created_at│  │
│  │     FOR UPDATE SKIP LOCKED                       │  │
│  │                                                  │  │
│  │  2. UPDATE status = 'processing'                 │  │
│  │                                                  │  │
│  │  3. Chama OpenAI com prompt versionado           │  │
│  │                                                  │  │
│  │  4. Valida JSON com Pydantic                     │  │
│  │                                                  │  │
│  │  5. INSERT em readings (ou UPDATE job com erro)  │  │
│  │                                                  │  │
│  │  6. UPDATE job status = 'completed' ou 'failed'  │  │
│  └──────────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────────┘
```

### 7.4 Comunicação Vercel ↔ VPS

| Opção | Prós | Contras |
|-------|------|---------|
| **Polling (cron)** | Simples, sem webhook | Latência (ex: 30s) |
| **Webhook (Supabase → VPS)** | Tempo real | Requer endpoint público |
| **Supabase Realtime** | Tempo real, nativo | Mais complexo |

**Recomendação MVP:** Polling a cada 30s via cron no EasyPanel.

---

## 8. Estratégia de Prompts e Geração de JSON

### 8.1 Versionamento de Prompts

- Tabela `prompts` guarda histórico
- Cada `reading` referencia `prompt_version`
- Permite A/B testing e rollback

### 8.2 Estrutura do Prompt (Exemplo)

```markdown
# CONTEXTO
Você é Milla, uma guia espiritual que combina Numerologia, Tarot e Psicologia.

# DADOS DO USUÁRIO
- Nome: {{full_name}}
- Data de nascimento: {{birthdate}}
- Número calculado para esta seção: {{calculated_number}}

# TAREFA
Gere a interpretação para a seção "{{section}}" seguindo EXATAMENTE o schema JSON abaixo.

# REGRAS
1. Linguagem: português brasileiro, acolhedora
2. Tom: reflexivo, nunca determinístico ("pode indicar", não "você vai")
3. Inclua disclaimer implícito de autoconhecimento
4. Evite previsões de saúde, finanças específicas ou relacionamentos determinísticos

# SCHEMA JSON (obrigatório)
{
  "carta": "string (nome da carta)",
  "titulo": "string (máx 60 chars)",
  "interpretacao": "string (150-300 palavras)",
  "sombra": "string (50-100 palavras)",
  "conselho": "string (50-100 palavras)"
}
```

### 8.3 Validação com Pydantic

```python
from pydantic import BaseModel, Field, validator

class ReadingContent(BaseModel):
    carta: str = Field(..., max_length=50)
    titulo: str = Field(..., max_length=60)
    interpretacao: str = Field(..., min_length=500, max_length=2000)
    sombra: str = Field(..., min_length=150, max_length=600)
    conselho: str = Field(..., min_length=150, max_length=600)

    @validator('interpretacao', 'sombra', 'conselho')
    def no_deterministic_language(cls, v):
        forbidden = ['você vai', 'certamente', 'com certeza']
        for word in forbidden:
            if word.lower() in v.lower():
                raise ValueError(f"Linguagem determinística detectada: {word}")
        return v
```

### 8.4 Guardrails de Conteúdo

| Guardrail | Implementação |
|-----------|---------------|
| Linguagem não-determinística | Validator Pydantic |
| Disclaimer implícito | Instrução no prompt |
| Limites de tamanho | `Field(min_length, max_length)` |
| Formato JSON | `response_format={"type": "json_object"}` (OpenAI) |
| Retry em caso de falha | Worker faz até 3 tentativas |

---

## 9. Riscos e Mitigação

| Risco | Impacto | Mitigação |
|-------|---------|-----------|
| **LGPD / Consentimento** | Legal | Checkbox obrigatório; `consent_*_at` no DB; termos claros |
| **Conteúdo sensível** | Reputação | Guardrails no prompt; revisão humana inicial |
| **Custos de IA descontrolados** | Financeiro | Paywall antes da IA; rate limit por user; monitorar uso |
| **Rate Limiting OpenAI** | UX | Fila com backoff exponencial; fallback model |
| **Abuso (múltiplas contas)** | Financeiro | Verificação de email; limite de trials |
| **Downtime Supabase** | UX | Cache local de readings já gerados |
| **Vazamento de dados** | Legal/Rep. | RLS rígido; auditar queries; HTTPS everywhere |
| **Worker fora do ar** | UX | Healthcheck no EasyPanel; alerta Discord/Slack |

---

## 10. Lista de Arquivos do Projeto

```
milla/
├── .env.example
├── .env.local                    # Variáveis locais (não comitar)
├── package.json
├── vite.config.ts
├── tailwind.config.ts
├── tsconfig.json
│
├── public/
│   └── cards/                    # Imagens das cartas (ou via Supabase Storage)
│
├── src/
│   ├── main.tsx
│   ├── App.tsx
│   ├── index.css
│   │
│   ├── components/
│   │   ├── ui/                   # Botões, inputs, modais
│   │   ├── layout/               # Header, Sidebar, Footer
│   │   ├── auth/                 # LoginForm, SignupForm, ResetPassword
│   │   ├── onboarding/           # OnboardingModal, ConsentCheckbox
│   │   ├── paywall/              # PaywallScreen, PlanCard
│   │   └── profile/              # ProfileTabs, ReadingCard
│   │
│   ├── pages/
│   │   ├── Landing.tsx
│   │   ├── Login.tsx
│   │   ├── Signup.tsx
│   │   ├── ResetPassword.tsx
│   │   ├── Onboarding.tsx
│   │   ├── Paywall.tsx
│   │   └── Profile.tsx
│   │
│   ├── hooks/
│   │   ├── useAuth.ts
│   │   ├── useProfile.ts
│   │   ├── useSubscription.ts
│   │   └── useReadings.ts
│   │
│   ├── lib/
│   │   ├── supabase.ts           # Cliente Supabase
│   │   ├── api.ts                # Helpers de fetch
│   │   └── utils.ts
│   │
│   ├── types/
│   │   ├── database.ts           # Tipos gerados do Supabase
│   │   └── reading.ts
│   │
│   └── constants/
│       └── sections.ts           # Enum das seções
│
├── supabase/
│   ├── migrations/
│   │   ├── 001_create_profiles.sql
│   │   ├── 002_create_subscriptions.sql
│   │   ├── 003_create_readings.sql
│   │   ├── 004_create_prompts.sql
│   │   └── 005_create_jobs.sql
│   │
│   └── functions/                # Edge Functions (opcional)
│       └── on-signup/            # Trigger para criar profile vazio
│
└── worker/                       # Python Worker (pode ser repo separado)
    ├── requirements.txt
    ├── main.py                   # Entrypoint FastAPI
    ├── config.py                 # Settings via pydantic-settings
    ├── models/
    │   └── reading.py            # Pydantic models
    ├── services/
    │   ├── openai_service.py
    │   ├── job_processor.py
    │   └── supabase_client.py
    └── prompts/
        └── templates/            # Arquivos .txt com prompts
```

---

## 11. Documentação Relevante

### 11.1 Supabase

| Tópico | Link |
|--------|------|
| Auth com email/senha | [docs.supabase.com/auth](https://supabase.com/docs/guides/auth) |
| Row Level Security | [docs.supabase.com/rls](https://supabase.com/docs/guides/auth/row-level-security) |
| Resend integration | [supabase.com/partners/resend](https://supabase.com/partners/integrations/resend) |
| Edge Functions | [docs.supabase.com/edge-functions](https://supabase.com/docs/guides/functions) |

### 11.2 Vercel

| Tópico | Link |
|--------|------|
| Deploy Vite | [vitejs.dev/deploy/vercel](https://vitejs.dev/guide/static-deploy.html#vercel) |
| Environment Variables | [vercel.com/docs/env-vars](https://vercel.com/docs/concepts/projects/environment-variables) |

### 11.3 OpenAI

| Tópico | Link |
|--------|------|
| Chat Completions API | [platform.openai.com/docs/api-reference](https://platform.openai.com/docs/api-reference/chat) |
| JSON Mode | [platform.openai.com/docs/json-mode](https://platform.openai.com/docs/guides/text-generation/json-mode) |

### 11.4 Python Worker

| Tópico | Link |
|--------|------|
| FastAPI | [fastapi.tiangolo.com](https://fastapi.tiangolo.com/) |
| Pydantic v2 | [docs.pydantic.dev](https://docs.pydantic.dev/latest/) |
| supabase-py | [github.com/supabase-community/supabase-py](https://github.com/supabase-community/supabase-py) |

### 11.5 EasyPanel

| Tópico | Link |
|--------|------|
| Deploy Python App | [easypanel.io/docs](https://easypanel.io/docs) |
| Cron Jobs | Configure via UI ou `crontab` interno |

---

## 12. Próximos Passos

1. **Aprovar este PRD**
2. Criar SPEC.md com detalhes técnicos
3. Configurar projeto Supabase e rodar migrations
4. Implementar frontend (auth → onboarding → paywall → perfil)
5. Implementar worker Python
6. Integrar provedor de pagamento
7. Testes E2E e deploy

---

> [!NOTE]
> Este PRD é um documento vivo. Será atualizado conforme decisões de design evoluírem.
