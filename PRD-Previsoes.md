# PRD: Página Previsões - Milla

> **Versão:** 1.0 | **Data:** 2026-02-06 | **Status:** Aguardando Aprovação

---

## 1. Contexto e Objetivo

### 1.1 Visão
A página **Previsões** é o coração do Milla - onde usuários recebem previsões personalizadas semanais e mensais em formato de texto e áudio, geradas por IA com a voz clonada da Milla via Minimax API.

### 1.2 O Problema
Atualmente o Milla só oferece o "Mapa da Vida" (leitura estática). Falta engajamento recorrente para retenção de usuários.

### 1.3 A Solução
Feed de previsões personalizadas com:
- **Previsão Semanal:** Entregue todo domingo às 20h (horário de Brasília)
- **Previsão Mensal:** Entregue todo dia 1º às 8h (horário de Brasília)
- **Previsão Anual:** Entregue todo 1º de janeiro às 8h (horário de Brasília)
- **Áudio narrado:** Voz clonada da Milla via Minimax API
- **Personalização:** Baseada em nome completo + data de nascimento do usuário
- **Cleanup automático:** Previsões semanais/mensais excluídas após 90 dias; anuais substituídas pela nova

### 1.4 Usuário Alvo
Assinantes ativos do Milla que completaram onboarding.

---

## 2. Arquivos Afetados

### Frontend (milla/)
| Arquivo | Ação | Descrição |
|---------|------|-----------|
| `src/pages/Previsoes.tsx` | [NEW] | Página principal com feed de previsões |
| `src/components/forecasts/ForecastCard.tsx` | [NEW] | Card de previsão com player de áudio |
| `src/components/forecasts/ForecastCarousel.tsx` | [NEW] | Carrossel horizontal com ícones por mês |
| `src/components/forecasts/AudioPlayer.tsx` | [NEW] | Player de áudio customizado |
| `src/hooks/useForecasts.ts` | [NEW] | Hook para buscar previsões |
| `src/App.tsx` | [MODIFY] | Adicionar rota `/previsoes` |
| `src/types/forecast.ts` | [NEW] | Tipos TypeScript para previsões |

### Backend (milla-worker/)
| Arquivo | Ação | Descrição |
|---------|------|-----------|
| `app/services/minimax_service.py` | [NEW] | Integração com Minimax TTS API |
| `app/services/forecast_generator.py` | [NEW] | Geração de previsões via OpenAI |
| `app/services/job_processor.py` | [MODIFY] | Adicionar tipo `generate_forecast` |
| `app/main.py` | [MODIFY] | Adicionar crons para previsões (semanal, mensal, anual) + cleanup |
| `app/config.py` | [MODIFY] | Adicionar configurações Minimax |
| `app/models/forecast.py` | [NEW] | Modelos Pydantic para previsões |

| Migração | Descrição |
|----------|-----------||
| `006_create_forecasts.sql` | Tabela de previsões com texto, audio_url, tipo (weekly/monthly/yearly) |
| `007_add_forecast_sections_to_prompts.sql` | Adicionar forecast_weekly, forecast_monthly, forecast_yearly à tabela prompts existente |

---

## 3. Documentação Essencial

### 3.1 Minimax API (Text-to-Speech)
- **Endpoint:** `https://api.minimax.chat/v1/t2a_v2`
- **Voice ID:** Usar voice_id da Milla já clonada
- **Formatos suportados:** MP3, WAV, FLAC, PCM
- **Limite de texto:** ~3000 caracteres por requisição
- **Preço:** Cobrado por caractere sintetizado
- **Referência:** [minimax.io/docs](https://www.minimaxi.com/document)

**Fluxo de uso:**
1. Enviar texto para endpoint T2A v2 com `voice_id` da Milla
2. Receber URL do áudio ou bytes
3. Upload para Supabase Storage
4. Salvar URL pública no banco

### 3.2 Supabase Storage
- **Bucket:** `forecasts-audio` (criar se não existir)
- **Estrutura:** `/{user_id}/{forecast_id}.mp3`
- **RLS:** Usuário só acessa seus próprios áudios
- **Fonte:** [docs.supabase.com/storage](https://supabase.com/docs/guides/storage)

### 3.3 APScheduler (Crons)
- Já configurado no milla-worker
- Adicionar jobs com timezone `America/Sao_Paulo`
- **Cron semanal:** `trigger: 'cron', day_of_week='sun', hour=20, minute=0`
- **Cron mensal:** `trigger: 'cron', day=1, hour=8, minute=0`
- **Cron anual:** `trigger: 'cron', month=1, day=1, hour=8, minute=0`
- **Cron cleanup:** `trigger: 'cron', hour=3, minute=0` (diário às 3h)
- **Fonte:** [apscheduler.readthedocs.io](https://apscheduler.readthedocs.io/)

---

## 4. Modelo de Dados

### 4.1 Tabela `forecasts`

```sql
CREATE TYPE forecast_type AS ENUM ('weekly', 'monthly', 'yearly');

CREATE TABLE forecasts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id),
    
    -- Tipo e período
    type forecast_type NOT NULL,
    period_start DATE NOT NULL,  -- Início do período (ex: 2026-02-02 para semana)
    period_end DATE NOT NULL,    -- Fim do período
    
    -- Conteúdo
    title TEXT NOT NULL,         -- Título curto (máx 100 chars)
    content TEXT NOT NULL,       -- Texto completo da previsão
    summary TEXT,                -- Resumo para preview no card
    
    -- Áudio
    audio_url TEXT,              -- URL do áudio no Supabase Storage
    audio_duration_seconds INT,  -- Duração em segundos
    
    -- Metadata IA
    prompt_version TEXT NOT NULL,
    model_used TEXT NOT NULL,
    calculation_base JSONB,      -- Dados usados para cálculo (numerologia, etc.)
    
    -- Timestamps
    delivered_at TIMESTAMPTZ,    -- Quando foi entregue ao usuário
    created_at TIMESTAMPTZ DEFAULT now(),
    expires_at TIMESTAMPTZ,      -- Quando será excluída (NULL para yearly)
    
    -- Constraint: um forecast por tipo por período por usuário
    UNIQUE(user_id, type, period_start)
);

-- Índices
CREATE INDEX idx_forecasts_user_id ON forecasts(user_id);
CREATE INDEX idx_forecasts_delivered_at ON forecasts(delivered_at DESC);
CREATE INDEX idx_forecasts_expires_at ON forecasts(expires_at) WHERE expires_at IS NOT NULL;

-- RLS
ALTER TABLE forecasts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own forecasts"
    ON forecasts FOR SELECT
    USING (auth.uid() = user_id AND delivered_at IS NOT NULL);
```

### 4.2 Atualização da tabela `prompts` existente

> [!NOTE]
> A tabela `prompts` já existe com sections do Mapa da Vida. Vamos adicionar novos valores ao enum.

```sql
-- Adicionar novos valores ao enum reading_section
ALTER TYPE reading_section ADD VALUE 'forecast_weekly';
ALTER TYPE reading_section ADD VALUE 'forecast_monthly';
ALTER TYPE reading_section ADD VALUE 'forecast_yearly';

-- Inserir prompts para cada tipo de previsão
-- Cada tipo tem seu próprio prompt e base de cálculo
INSERT INTO prompts (section, version, template, schema, is_active) VALUES
('forecast_weekly', '1.0.0', '[TEMPLATE SEMANAL]', '{...}', true),
('forecast_monthly', '1.0.0', '[TEMPLATE MENSAL]', '{...}', true),
('forecast_yearly', '1.0.0', '[TEMPLATE ANUAL]', '{...}', true);
```

### 4.3 Base de Cálculo por Tipo

Cada tipo de previsão usa uma base de cálculo diferente antes de enviar à IA:

| Tipo | Base de Cálculo | Dados Utilizados |
|------|-----------------|------------------|
| **weekly** | Número da semana + cálculos numerológicos | birthdate, current_week, ano_pessoal |
| **monthly** | Mês + ciclo numerológico | birthdate, current_month, ciclo_mensal |
| **yearly** | Ano + mapa astral simplificado | birthdate, current_year, ano_pessoal, regente_ano |

### 4.4 Atualização na tabela `jobs`

Adicionar novo tipo de job:
```sql
-- Já existe a coluna 'type', apenas usar valor 'generate_forecast'
-- Payload esperado:
-- {
--   "user_id": "uuid",
--   "forecast_type": "weekly" | "monthly" | "yearly",
--   "period_start": "2026-02-02",
--   "period_end": "2026-02-08"
-- }
```

---

## 5. Arquitetura de Automação

### 5.1 Fluxo de Geração de Previsões

```
┌─────────────────────────────────────────────────────────────────────┐
│  EASYPANEL (VPS) - milla-worker                                     │
│                                                                     │
│  ┌───────────────────────────────────────────────────────────────┐  │
│  │  APScheduler - CRON JOBS                                        │  │
│  │                                                               │  │
│  │  📅 Domingo 20h        → generate_forecast (weekly)            │  │
│  │  📅 Dia 1º 8h           → generate_forecast (monthly)           │  │
│  │  📅 1º Janeiro 8h       → generate_forecast (yearly)            │  │
│  │  🗑️ Diário 3h           → cleanup_expired_forecasts             │  │
│  └───────────────────────────────────────────────────────────────┘  │
│                             │                                       │
│                             ▼                                       │
│  ┌───────────────────────────────────────────────────────────────┐  │
│  │  Job Processor                                                 │  │
│  │                                                               │  │
│  │  1. Claim job pending                                         │  │
│  │  2. Busca profile (nome, birthdate)                           │  │
│  │  3. Calcula base numérica conforme tipo (semanal/mensal/anual)│  │
│  │  4. Busca prompt ativo para tipo (forecast_weekly/monthly/yearly)│
│  │  5. Chama OpenAI → gera texto personalizado                   │  │
│  │  6. Chama Minimax T2A → gera áudio com voz Milla              │  │
│  │  7. Upload áudio → Supabase Storage                           │  │
│  │  8. Insert em forecasts com audio_url + delivered_at          │  │
│  │     + expires_at (now + 90 dias para weekly/monthly)          │  │
│  │  9. Mark job completed                                        │  │
│  └───────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────┘
```

### 5.2 Política de Cleanup (Exclusão Automática)

| Tipo | Retenção | Trigger de Exclusão |
|------|----------|---------------------|
| **weekly** | 90 dias | Cron diário às 3h deleta onde `expires_at < now()` |
| **monthly** | 90 dias | Cron diário às 3h deleta onde `expires_at < now()` |
| **yearly** | Até nova ser criada | Antes de inserir nova yearly, deleta anterior do usuário |

```python
# Cleanup cron (roda diariamente às 3h)
def cleanup_expired_forecasts():
    supabase.table('forecasts').delete().lt('expires_at', 'now()').execute()
    # Também deletar áudios do Storage
    
# Antes de criar yearly:
def create_yearly_forecast(user_id):
    # Deleta previsão anual anterior
    supabase.table('forecasts').delete().eq('user_id', user_id).eq('type', 'yearly').execute()
    # Cria nova
    ...
```

### 5.2 Estratégia de Retry

| Tentativa | Backoff | Ação |
|-----------|---------|------|
| 1 | Imediato | Primeira tentativa |
| 2 | 30s | Retry após falha de API |
| 3 | 60s | Retry com backoff maior |
| 4+ | Falha permanente | Log erro, notificar admin |

### 5.3 Idempotência

- Chave: `forecast:{user_id}:{type}:{period_start}`
- Previne duplicação se cron rodar duas vezes
- Mesmo job não cria duas previsões

---

## 6. Decisões Técnicas Propostas

### 6.1 Stack Confirmada
| Componente | Tecnologia | Justificativa |
|------------|------------|---------------|
| Geração de Texto | **OpenAI GPT-4o** | Já integrado, token existente |
| Text-to-Speech | **Minimax T2A v2** | Voz da Milla já clonada |
| Storage de Áudio | **Supabase Storage** | Já configurado, RLS nativo |
| Agendamento | **APScheduler** | Já em uso no worker |
| Frontend | **Vite + React + TS** | Padrão do projeto |

### 6.2 Alternativas Consideradas

| Decisão | Opção Escolhida | Alternativa | Trade-off |
|---------|-----------------|-------------|-----------|
| Agendamento | APScheduler local | Supabase pg_cron | APScheduler já em uso; pg_cron requer Pro |
| Armazenamento de áudio | Supabase Storage | S3 / Cloudflare R3 | Supabase já configurado; RLS integrado |
| Player de áudio | Componente custom | react-h5-audio-player | Custom permite design Mystic Luxury |

### 6.3 Considerações de Custo

| Serviço | Custo Estimado | Observação |
|---------|----------------|------------|
| OpenAI GPT-4o | ~$0.01/previsão | ~500 tokens input + 1000 output |
| Minimax TTS | ~$0.02/previsão | ~2000 caracteres × $0.01/1000 |
| Supabase Storage | Incluso no plano | Até 1GB no Free tier |
| **Total por usuário/mês** | **~$0.10-0.15** | 4 semanais + 1 mensal |

---

## 7. Layout e UX

### 7.1 Estrutura da Página

```
┌─────────────────────────────────────────────────────────────────┐
│  PREVISÕES                                           [Header]    │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ← [🎤2025] [🔮Jan] [🎤Jan] [🔮Fev] [🎤Fev] [🔮2026] [🎤2026] → │
│    Podcast  Forecast Podcast Forecast Podcast Forecast Podcast │
│                                                                 │
│  ─────────────────────────────────────────────────────────────  │
│                                                                 │
│  Forecasts & Updates                                            │
│                                                                 │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │ [Avatar Milla]          │  Previsão Semanal - Fev S1       │ │
│  │  Milla                  │                                  │ │
│  │  02/06/2026             │  Lorem ipsum dolor sit amet...   │ │
│  │                         │                                  │ │
│  │  [Imagem decorativa]    │  ▶ ────────●─────── 02:34        │ │
│  │                         │                                  │ │
│  └────────────────────────────────────────────────────────────┘ │
│                                                                 │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │ [Avatar Milla]          │  Previsão Mensal - Fevereiro     │ │
│  │  ...                    │  ...                             │ │
│  └────────────────────────────────────────────────────────────┘ │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 7.2 Componentes

1. **ForecastCarousel:** Carrossel horizontal no topo
   - Ícones circulares (🎤 Podcast = áudio, 🔮 Forecast = texto)
   - Scroll horizontal com setas
   - Click filtra o feed

2. **ForecastCard:** Card de previsão
   - Imagem decorativa (pode ser gerada ou estática)
   - Avatar + nome "Milla" + data
   - Título da previsão
   - Texto (preview com "Ver mais")
   - Audio Player inline

3. **AudioPlayer:** Player customizado
   - Play/Pause, barra de progresso, tempo
   - Design Mystic Luxury (gradientes gold/purple)

---

## 8. Riscos e Mitigações

| Risco | Impacto | Probabilidade | Mitigação |
|-------|---------|---------------|-----------|
| **Minimax API fora do ar** | Alto | Baixa | Retry com backoff; entregar texto sem áudio |
| **Custo de TTS alto** | Médio | Média | Cache de áudios genéricos; limitar tamanho do texto |
| **Previsões duplicadas** | Médio | Baixa | Idempotency key obrigatória |
| **Timezone errado** | Médio | Média | Usar `pytz` + `America/Sao_Paulo` explícito |
| **Usuário não vê previsão nova** | Baixo | Média | Ordenar por `delivered_at DESC`; badge "Nova" |

---

## 9. Verificação e Testes

### 9.1 Testes Automatizados

```bash
# Backend - testes unitários existentes
cd milla-worker && pytest tests/

# Frontend - se houver testes configurados
cd milla && npm test
```

### 9.2 Testes Manuais

1. **Verificar geração de previsão:**
   - Trigger manual via `/trigger` endpoint
   - Verificar no Supabase se `forecasts` foi populado
   - Verificar se áudio foi salvo no Storage

2. **Verificar agendamento:**
   - Ajustar cron para próximo minuto
   - Aguardar execução
   - Verificar logs do worker

3. **Verificar frontend:**
   - Acessar `/previsoes` como usuário logado
   - Verificar carrossel e cards
   - Testar player de áudio

---

## 10. Próximos Passos

- [ ] **Aprovação deste PRD**
- [ ] Handoff para SPEC Agent com este arquivo
- [ ] Implementação das migrations Supabase
- [ ] Implementação do serviço Minimax no worker
- [ ] Implementação da página frontend
- [ ] Testes E2E

---

## 11. Resumo Executivo

| Item | Detalhe |
|------|---------|
| **Feature** | Página Previsões com feed de previsões semanais/mensais/anuais |
| **Personalização** | Nome + data de nascimento → cálculos numerológicos por tipo |
| **Texto** | OpenAI GPT-4o (já integrado) |
| **Áudio** | Minimax TTS com voz clonada da Milla |
| **Entrega Semanal** | Domingos 20h (horário de Brasília) |
| **Entrega Mensal** | Dia 1º 8h (horário de Brasília) |
| **Entrega Anual** | 1º de Janeiro 8h (horário de Brasília) |
| **Retenção** | 90 dias (semanal/mensal) / Substituída (anual) |
| **Storage** | Supabase Storage |
| **Agendamento** | APScheduler (já em uso no worker) |
| **Custo/usuário/mês** | ~$0.12-0.20 (inclui anual rateada) |

---

> [!IMPORTANT]
> Este PRD foca exclusivamente na página Previsões. O SPEC Agent detalhará implementação, schemas Pydantic, prompts, e código específico.
