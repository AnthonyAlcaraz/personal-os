# Personal OS

AI-powered workflow automation that replaces interrupt-driven work with scheduled cognition.

Inspired by [Armand Ruiz's Personal OS concept](https://www.linkedin.com/posts/armand-ruiz_im-building-my-personal-os-to-automate-my-activity-7427324324602171392-jy5J) — adapted for a Windows pro environment with **Slack**, **Salesforce**, and **Outlook**.

## Concept

Instead of constantly checking notifications across Slack, email, and CRM, the system delivers scheduled **Pulse briefings** (morning, midday, end-of-day) through a pipeline of three specialized agents:

```
Scheduler (Task Scheduler)
    │
    ▼
  Scout ──→ Horizon ──→ Focus
  (comms)    (calendar)   (prioritize)
    │
    ▼
  Briefing Output (Terminal / HTML / Audio)
```

## Agents

| Agent | Role | Integrations |
|-------|------|-------------|
| **Scout** | Monitor communications, draft responses, flag urgency | Slack, Outlook |
| **Horizon** | Calendar awareness, meeting prep, schedule optimization | Outlook Calendar, Salesforce |
| **Focus** | Filter noise, prioritize actions, generate briefing | All sources |

## Integrations

- **Slack** — Channel monitoring, DM triage, VIP contact list, draft responses
- **Salesforce** — Account context, opportunity updates, meeting prep with CRM data
- **Outlook** — Email triage, calendar events, meeting invites

## Architecture

- **Scheduler**: Windows Task Scheduler triggers Pulse at configured times
- **Orchestrator**: CLAUDE.md-driven pipeline, sequential agent execution
- **Output**: Terminal digest, HTML report, audio podcast summary

## Project Structure

```
personal-os/
├── specs/              # Detailed specifications
│   ├── ARCHITECTURE.md
│   ├── SCOUT.md
│   ├── HORIZON.md
│   └── FOCUS.md
├── agents/             # Agent implementations (placeholder)
│   ├── scout/
│   ├── horizon/
│   └── focus/
├── integrations/       # Integration adapters (placeholder)
│   ├── slack/
│   ├── salesforce/
│   └── outlook/
├── scheduler/          # Pulse scheduling
└── config/             # Configuration templates
```

## Status

**Phase: Specifications** — defining agent behaviors, integration contracts, and architecture before implementation.
