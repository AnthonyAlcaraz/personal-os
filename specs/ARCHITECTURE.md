# Architecture Specification

## System Overview

Personal OS is an AI-powered AWS account team operating system. It replaces interrupt-driven work with scheduled **Pulse briefings** — orchestrating seven agents through a parallel pipeline triggered at configured times. Beyond communication triage and calendar awareness, it automates the full sales cycle: prospect research, personalized outreach, proposal generation, and pipeline health monitoring.

```
┌─────────────────────────────────────────────────────────────┐
│                   Windows Task Scheduler                     │
│              (Morning / Midday / End-of-Day)                 │
└───────────────────────────┬─────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                       Orchestrator                           │
│                   (CLAUDE.md + Node.js)                       │
│                                                              │
│  Phase 1: Scout + DataAgent + SalesIntel  (parallel)         │
│  Phase 2: Horizon + Outreach              (parallel)         │
│  Phase 3: DealAccel                       (depends on 1+2)   │
│  Phase 4: Focus                           (merges all)       │
└───────────────────────────┬─────────────────────────────────┘
                            │
        ┌───────────────────┼───────────────────┐
        ▼                   ▼                   ▼
  ┌───────────┐     ┌─────────────┐     ┌───────────┐
  │   Scout   │     │  DataAgent  │     │ SalesIntel │
  │  (comms)  │     │   (data)    │     │ (research) │
  └─────┬─────┘     └──────┬──────┘     └─────┬─────┘
        │                  │                   │
        ▼                  │                   ▼
  ┌───────────┐            │            ┌───────────┐
  │  Horizon  │            │            │ Outreach  │
  │(calendar) │            │            │ (comms)   │
  └─────┬─────┘            │            └─────┬─────┘
        │                  │                   │
        └──────────┬───────┘───────────────────┘
                   ▼
           ┌─────────────┐
           │ DealAccel   │
           │ (pipeline)  │
           └──────┬──────┘
                  ▼
           ┌─────────────┐
           │    Focus     │
           │ (prioritize) │
           └──────┬──────┘
                  ▼
        Briefing Output
   (Terminal / HTML / Audio)
```

## Technology Stack

| Component | Technology | Rationale |
|-----------|-----------|-----------|
| Runtime | Node.js 20+ | Consistent with Z commands ecosystem |
| Orchestrator | Claude Code SDK | Agent pipeline, CLAUDE.md driven |
| Scheduler | Windows Task Scheduler | Native, reliable, already used for Z9 |
| Slack | Slack Web API (Bolt SDK) | Official SDK, real-time + history |
| Outlook | Microsoft Graph API | Mail + Calendar unified API |
| Salesforce | jsforce / REST API | Mature Node.js Salesforce client |
| Enrichment | Apollo / Clearbit API | Contact + company data enrichment |
| LinkedIn | Chrome 9222 (immortal) | Reuses existing debug session |
| AI Generation | Anthropic Claude API | Opus for proposals, Sonnet for outreach |
| Slide Engine | Marp / Reveal.js | Reuses Z4 pipeline for pitch decks |
| Config | YAML | Human-readable, simple |
| Output | Terminal + HTML + TTS | Multi-format delivery |

## Agent Architecture

### Core Agents (Communication + Data)

| Agent | Phase | Dependencies | Role |
|-------|-------|-------------|------|
| **Scout** | 1 (parallel) | None | Monitor Slack + Outlook, triage, draft responses |
| **DataAgent** | 1 (parallel) | None | Database monitoring, anomaly detection, KPI tracking |
| **Horizon** | 2 | Scout | Calendar awareness, meeting prep, CRM enrichment |
| **Focus** | 4 (final) | All agents | Merge signals, prioritize, generate briefing |

### Sales Agents (Revenue Pipeline)

| Agent | Phase | Dependencies | Role |
|-------|-------|-------------|------|
| **SalesIntel** | 1 (parallel) | None | Prospect research, enrichment, buying signal detection |
| **Outreach** | 2 (parallel) | SalesIntel | Personalized email, LinkedIn, call scripts, follow-ups |
| **DealAccel** | 3 | Horizon + SalesIntel | Proposals, pitch decks, deal health scoring, pipeline risks |

## Integration Architecture

### Slack

```
Slack Web API
├── Auth: OAuth2 Bot Token + User Token
├── Endpoints:
│   ├── conversations.history — channel messages
│   ├── conversations.list — discover channels
│   ├── im.history — direct messages
│   ├── users.info — resolve user details
│   └── chat.postMessage — send drafts
├── Rate Limits: Tier 3 (~50 req/min)
└── Incremental: timestamp-based (oldest param)
```

### Microsoft Outlook (Graph API)

```
Microsoft Graph API
├── Auth: OAuth2 Authorization Code + MSAL
├── Mail Endpoints:
│   ├── /me/messages — inbox
│   ├── /me/messages/delta — incremental sync
│   └── /me/sendMail — send drafts
├── Calendar Endpoints:
│   ├── /me/calendarView — time-range events
│   └── /me/events/{id} — event details
├── Rate Limits: ~10,000 req/10min
└── Incremental: delta tokens
```

### Salesforce

```
Salesforce REST API
├── Auth: OAuth2 JWT Bearer Flow
├── Read Endpoints:
│   ├── /query — SOQL queries (pipeline, contacts, accounts)
│   ├── /sobjects/Account/{id}
│   ├── /sobjects/Contact/{id}
│   ├── /sobjects/Opportunity/{id}
│   └── /sobjects/Lead/{id}
├── Write Endpoints:
│   ├── /sobjects/Contact/{id} — enrichment writeback
│   ├── /sobjects/Account/{id} — signal notes
│   ├── /sobjects/Task — activity logging
│   └── /sobjects/Opportunity/{id} — health score field
├── Rate Limits: Based on org edition
└── Lookup: Contact email → Account → Opportunities → Activities
```

### Enrichment APIs

```
Apollo / Clearbit
├── Auth: API key (header)
├── Endpoints:
│   ├── /people/match — contact enrichment by email
│   ├── /companies/match — company enrichment by domain
│   └── /signals — buying intent signals
├── Rate Limits: 300 req/min (Apollo), 600 req/min (Clearbit)
└── Fallback: Apollo primary, Clearbit secondary
```

### LinkedIn (Chrome 9222)

```
LinkedIn via Immortal Chrome
├── Auth: Existing session cookies (Chrome 9222)
├── Operations:
│   ├── Profile scrape — title, company, connections
│   ├── Company page — employee count, recent posts
│   └── 2nd-degree network — mutual connections
├── Rate Limits: 80 req/hour (conservative)
└── Reuses: Z commands Chrome debug session
```

## Data Flow

### Per-Pulse Execution

```
1. Scheduler triggers orchestrator
2. Load config.yaml + last_pulse_state.json

3. Phase 1 — Parallel collectors (no dependencies):
   a. Scout: Fetch Slack/Outlook → Triage → Draft responses
   b. DataAgent: Sync DB context → Run monitors → Detect anomalies
   c. SalesIntel: Pull CRM changes → Enrich contacts → Detect signals → Write dossiers

4. Phase 2 — Dependent agents (parallel within phase):
   a. Horizon: Fetch calendar → Enrich with Salesforce → Generate briefs
   b. Outreach: Read dossiers → Generate personalized drafts → Queue for review

5. Phase 3 — Pipeline intelligence:
   a. DealAccel: Score health → Generate proposals → Build decks → Detect risks

6. Phase 4 — Merge and deliver:
   a. Focus: Merge all outputs → Prioritize → Generate briefing → Track continuity

7. Save last_pulse_state.json
```

### State Management

```json
{
  "last_pulse": "2026-02-11T07:00:00Z",
  "pulse_type": "morning",
  "slack_cursor": "...",
  "outlook_delta_token": "...",
  "carry_forward_items": [...],
  "sales_intel": {
    "last_enrichment_run": "...",
    "enrichment_queue": [...],
    "signal_cache": {...}
  },
  "outreach": {
    "pending_drafts": [...],
    "sent_today": { "emails": 0, "linkedin": 0, "calls": 0 }
  },
  "deal_accel": {
    "health_scores": {...},
    "proposals_generated": [...],
    "pipeline_snapshot": {...}
  },
  "stats": {
    "total_pulses": 42,
    "avg_action_items": 7
  }
}
```

## Security

- OAuth tokens stored in environment variables (not config files)
- Salesforce JWT key stored in Windows Credential Manager
- No message content persisted beyond current Pulse (privacy)
- Enrichment data cached locally with configurable TTL
- LinkedIn scraping respects rate limits and uses existing auth session
- Outreach drafts require human approval before sending (queue mode)
- Audit log for all API calls
- Prospect dossiers excluded from git (in .gitignore)

## Directory Structure

```
personal-os/
├── config/
│   ├── config.yaml              # Main configuration
│   ├── data-sources.yaml        # Database connections + monitors
│   ├── data-rules.md            # Business rules for DataAgent
│   ├── vip-contacts.yaml        # VIP contact list
│   ├── brand-voice.md           # Tone, banned phrases, style guide
│   ├── roi-benchmarks.yaml      # Industry ROI benchmarks for proposals
│   └── .env.example             # Environment variable template
├── agents/
│   ├── scout/
│   │   └── index.js
│   ├── horizon/
│   │   └── index.js
│   ├── data/
│   │   ├── index.js             # DataAgent: sync, monitor, answer, brief
│   │   ├── sync.js
│   │   ├── monitor.js
│   │   ├── answer.js
│   │   ├── brief.js
│   │   └── tools.js
│   ├── focus/
│   │   └── index.js
│   ├── sales-intel/
│   │   ├── index.js             # Prospect research orchestrator
│   │   ├── enrich.js            # Contact + company enrichment
│   │   ├── signals.js           # Buying signal detection + scoring
│   │   └── brief.js             # Briefing section for Focus
│   ├── outreach/
│   │   ├── index.js             # Outreach generation orchestrator
│   │   ├── generate.js          # Multi-channel draft generation
│   │   ├── followup.js          # Meeting recap + objection handling
│   │   ├── templates.js         # Template selection by context
│   │   └── queue.js             # Review queue management
│   └── deal-accel/
│       ├── index.js             # Deal acceleration orchestrator
│       ├── scoring.js           # Deal health scoring engine
│       ├── proposal.js          # Proposal generation with ROI
│       ├── deck.js              # Pitch deck builder (Marp/Reveal.js)
│       └── casematch.js         # Case study matching algorithm
├── integrations/
│   ├── slack/
│   │   └── client.js
│   ├── salesforce/
│   │   └── client.js
│   ├── outlook/
│   │   └── client.js
│   ├── database/
│   │   ├── client.js
│   │   └── sidecar.py
│   └── enrichment/
│       └── client.js            # Apollo/Clearbit unified client
├── data/
│   ├── context/
│   │   ├── databases/           # DataAgent schema context
│   │   ├── sales-intel/         # Prospect dossiers (Markdown)
│   │   ├── battlecards/         # Competitive positioning
│   │   └── case-studies/        # Organized by industry/workload/size
│   └── templates/
│       ├── databases/           # DataAgent Handlebars templates
│       ├── outreach/            # Email, LinkedIn, call script templates
│       ├── proposals/           # Proposal Handlebars templates
│       └── decks/               # Pitch deck Marp/Reveal.js templates
├── output/
│   ├── briefings/               # Generated Pulse briefings
│   ├── proposals/               # Generated proposals (Markdown + PDF)
│   ├── decks/                   # Generated pitch decks (PDF + PPTX)
│   └── state/                   # Pulse state files
├── scheduler/
│   ├── orchestrator.js          # Main 4-phase pipeline
│   ├── data-cli.js              # Interactive data Q&A
│   └── setup-tasks.ps1          # Task Scheduler setup
├── specs/
│   ├── ARCHITECTURE.md          # This file
│   ├── SCOUT.md
│   ├── HORIZON.md
│   ├── FOCUS.md
│   ├── DATA.md
│   ├── SALES-INTEL.md
│   ├── OUTREACH.md
│   └── DEAL-ACCEL.md
├── tests/
│   └── data/                    # YAML test cases for DataAgent
└── CLAUDE.md                    # Agent orchestration config
```

## AWS OS Design Principles

This system is designed as a replicable **AWS Account Team OS**:

1. **Salesforce-native**: All CRM operations go through Salesforce — no shadow databases
2. **Human-in-the-loop**: All outreach and proposals queue for review before delivery
3. **Signal-driven**: Enrichment and outreach prioritized by buying signal score, not spray-and-pray
4. **AWS-contextualized**: Templates, benchmarks, and case studies tuned for AWS sales motions (MAP, EDP, Well-Architected)
5. **Composable**: Each agent is independently deployable — start with Sales Intel alone, add Outreach and Deal Accel as workflows mature
6. **File-system-as-context**: No vector DB — all context stored as auditable Markdown files

## Open Questions

- [ ] Should state persist in a SQLite DB or flat JSON files?
- [ ] Multi-device support — run on work laptop only, or sync state?
- [ ] Error handling — if Slack API is down, should the Pulse continue with partial data?
- [ ] Telemetry — track personal productivity metrics over time?
- [ ] Should the Outreach queue have a web UI or terminal-only review?
- [ ] Integration with AWS Partner Central API for account-level APN data?
- [ ] Multi-account team support — can multiple reps share a single OS instance?
