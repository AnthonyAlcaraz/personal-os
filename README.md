# Personal OS — AWS Account Team Edition

AI-powered operating system for AWS account teams. Replaces interrupt-driven work with scheduled cognition and automates the full sales cycle from prospect research to proposal delivery.

Inspired by [Armand Ruiz's Personal OS concept](https://www.linkedin.com/posts/armand-ruiz_im-building-my-personal-os-to-automate-my-activity-7427324324602171392-jy5J) — adapted for a Windows pro environment with **Slack**, **Salesforce**, **Outlook**, and **any SQL database**. Sales modules inspired by [Nathalie Henry's WRITER framework](https://www.linkedin.com/in/nathaliehenry1).

## Concept

Instead of constantly checking notifications, CRM, and dashboards, the system delivers scheduled **Pulse briefings** (morning, midday, end-of-day) through a pipeline of seven specialized agents:

```
Scheduler (Task Scheduler)
    |
    v
  Phase 1 (parallel):
  +-- Scout --------+-- DataAgent --+-- SalesIntel --+
  |  (comms)        |  (data)       |  (research)    |
  +--------+--------+-------+-------+-------+--------+
           |                |               |
  Phase 2 (parallel):      |               |
  +-- Horizon --+          |    +-- Outreach --+
  |  (calendar) |          |    |  (comms gen) |
  +------+------+          |    +------+-------+
         |                 |           |
  Phase 3:                 |           |
  +-- DealAccel -----------+-----------+
  |  (proposals + pipeline)            |
  +----------------+-------------------+
                   |
  Phase 4:         |
  +-- Focus -------+
  |  (prioritize)  |
  +-------+--------+
          |
          v
   Briefing Output
(Terminal / HTML / Audio)
```

## Agents

### Core Agents

| Agent | Role | Integrations |
|-------|------|-------------|
| **Scout** | Monitor communications, draft responses, flag urgency | Slack, Outlook |
| **Horizon** | Calendar awareness, meeting prep, schedule optimization | Outlook Calendar, Salesforce |
| **DataAgent** | Database monitoring, anomaly detection, KPI tracking, data Q&A | Any SQL database (7 backends) |
| **Focus** | Filter noise, prioritize actions, generate briefing | All sources |

### Sales Agents

| Agent | Role | Integrations |
|-------|------|-------------|
| **SalesIntel** | Prospect research, contact enrichment, buying signal detection | Salesforce, Apollo/Clearbit, LinkedIn |
| **Outreach** | Personalized email, LinkedIn DMs, call scripts, meeting follow-ups | Claude API, Salesforce, Battlecards |
| **DealAccel** | Proposal generation, pitch decks, deal health scoring, pipeline risk alerts | Salesforce, ROI benchmarks, Z4 engine |

## Sales Capabilities

Mapped from [WRITER AI framework](https://www.linkedin.com/in/nathaliehenry1):

| Capability | Agent | What It Does |
|-----------|-------|-------------|
| Prospect research automation | **SalesIntel** | Enriches leads with company data, decision-makers, tech stack, buying signals |
| Personalized outreach at scale | **Outreach** | Generates custom emails, LinkedIn DMs, call scripts per prospect |
| Automated proposal creation | **DealAccel** | Builds proposals with ROI calculations from industry benchmarks |
| Custom pitch deck building | **DealAccel** | Generates slide decks with matched case studies per meeting type |
| Instant follow-up writing | **Outreach** | Meeting recaps, objection responses, stale deal re-engagement |
| Brand consistency | **Outreach** | Brand voice guardrails enforced across all generated content |

## AWS Context

This OS is purpose-built for AWS account teams:
- **Signal keywords** tuned to AWS service categories (migration, modernization, data, AI/ML)
- **ROI benchmarks** from AWS case studies and IDC/Forrester AWS reports
- **Proposal templates** reference AWS services, pricing models, programs (MAP, EDP)
- **Pitch decks** include AWS architecture diagrams and Well-Architected Framework
- **Battlecards** include AWS vs Azure/GCP positioning
- **Pipeline stages** map to AWS partner sales methodology

## DataAgent

Inspired by [nao](https://github.com/getnao/nao) — the open-source data agent that recreates OpenAI's internal data agent using YAML + Markdown configuration.

**Key features:**
- **YAML-configured** — Define data sources in `config/data-sources.yaml`, no code changes needed
- **7 database backends** — DuckDB, Postgres, Snowflake, BigQuery, Databricks, Redshift, MSSQL via Python Ibis
- **File-system-as-context** — Schema metadata stored as Markdown files (no vector DB)
- **Anomaly detection** — KPI queries with alert thresholds, integrated into Pulse briefings
- **CLI chat** — Ask natural language questions about your data: `npm run data-cli`

See [specs/DATA.md](specs/DATA.md) for full specification.

## Integrations

- **Slack** — Channel monitoring, DM triage, VIP contact list, draft responses
- **Salesforce** — Full CRM: accounts, contacts, opportunities, pipeline, activity logging
- **Outlook** — Email triage, calendar events, meeting invites, draft sending
- **Databases** — Any SQL database via Python Ibis sidecar (7 backends)
- **Apollo / Clearbit** — Contact and company enrichment APIs
- **LinkedIn** — Profile scraping via Chrome 9222 debug session
- **Claude API** — Opus for proposals, Sonnet for outreach generation

## Quick Start

```bash
# Install Node.js dependencies
npm install

# Install Python dependencies (for DataAgent database access)
npm run setup-python

# Configure
cp config/config.yaml config/config.local.yaml
cp config/data-sources.yaml config/data-sources.local.yaml
# Edit with your connections and API keys

# Run a Pulse
npm run pulse

# Interactive data Q&A
npm run data-cli

# Run data tests
npm run data-test
```

## Architecture

- **Scheduler**: Windows Task Scheduler triggers Pulse at configured times
- **Orchestrator**: 4-phase parallel pipeline with dependency resolution
- **Output**: Terminal digest, HTML report, audio podcast summary
- **Context**: File-system-as-context — all data stored as auditable Markdown

See [specs/ARCHITECTURE.md](specs/ARCHITECTURE.md) for full specification.

## Project Structure

```
personal-os/
├── specs/                    # Detailed specifications
│   ├── ARCHITECTURE.md
│   ├── SCOUT.md
│   ├── HORIZON.md
│   ├── FOCUS.md
│   ├── DATA.md
│   ├── SALES-INTEL.md        # Prospect research agent
│   ├── OUTREACH.md           # Communication generation agent
│   └── DEAL-ACCEL.md         # Pipeline acceleration agent
├── agents/
│   ├── scout/                # Communication monitoring
│   ├── horizon/              # Calendar + CRM awareness
│   ├── data/                 # Database monitoring (fully implemented)
│   ├── focus/                # Priority filtering + briefing
│   ├── sales-intel/          # Prospect research + enrichment
│   ├── outreach/             # Personalized outreach generation
│   └── deal-accel/           # Proposals, decks, pipeline health
├── integrations/
│   ├── slack/
│   ├── salesforce/
│   ├── outlook/
│   ├── database/
│   └── enrichment/           # Apollo/Clearbit unified client
├── data/
│   ├── context/              # Generated context (gitignored)
│   │   ├── databases/        # Schema metadata
│   │   ├── sales-intel/      # Prospect dossiers
│   │   ├── battlecards/      # Competitive positioning
│   │   └── case-studies/     # By industry/workload/size
│   └── templates/
│       ├── databases/        # DataAgent templates
│       ├── outreach/         # Email/LinkedIn/call templates
│       ├── proposals/        # Proposal templates
│       └── decks/            # Pitch deck templates
├── config/
│   ├── config.yaml
│   ├── data-sources.yaml
│   ├── brand-voice.md        # Outreach tone + style guide
│   └── roi-benchmarks.yaml   # Industry ROI data for proposals
├── scheduler/
│   ├── orchestrator.js       # 4-phase pipeline
│   └── data-cli.js           # Interactive data Q&A
├── output/
│   ├── briefings/
│   ├── proposals/
│   └── decks/
└── tests/
    └── data/                 # YAML test cases
```

## Status

**Phase: Implementation** — DataAgent integrated, Scout/Horizon/Focus skeletons ready, Sales agents (SalesIntel, Outreach, DealAccel) specified and ready for implementation.
