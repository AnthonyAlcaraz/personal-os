# Architecture Specification

## System Overview

Personal OS runs on a Windows pro machine as a scheduled automation. It orchestrates three agents (Scout → Horizon → Focus) through a sequential pipeline triggered at configured Pulse times.

```
┌─────────────────────────────────────────────────┐
│              Windows Task Scheduler              │
│         (Morning / Midday / End-of-Day)          │
└──────────────────────┬──────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────┐
│                  Orchestrator                    │
│            (CLAUDE.md + Node.js)                 │
│                                                  │
│  1. Load config                                  │
│  2. Run Scout → collect comms                    │
│  3. Run Horizon → enrich calendar                │
│  4. Run Focus → prioritize + brief               │
│  5. Deliver output                               │
└──────────────────────┬──────────────────────────┘
                       │
          ┌────────────┼────────────┐
          ▼            ▼            ▼
     ┌─────────┐ ┌──────────┐ ┌─────────┐
     │  Scout  │ │ Horizon  │ │  Focus  │
     └────┬────┘ └────┬─────┘ └────┬────┘
          │           │            │
    ┌─────┴─────┐  ┌──┴──┐   ┌────┴────┐
    │Slack  Mail│  │Cal SF│   │ Merge + │
    │API    API │  │API   │   │ Deliver │
    └───────────┘  └──────┘   └─────────┘
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
| Config | YAML | Human-readable, simple |
| Output | Terminal + HTML + TTS | Multi-format delivery |

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
├── Endpoints:
│   ├── /query — SOQL queries
│   ├── /sobjects/Account/{id}
│   ├── /sobjects/Contact/{id}
│   └── /sobjects/Opportunity/{id}
├── Rate Limits: Based on org edition
└── Lookup: Contact email → Account → Opportunities
```

## Data Flow

### Per-Pulse Execution

```
1. Scheduler triggers orchestrator
2. Load config.yaml + last_pulse_state.json
3. Scout:
   a. Fetch Slack messages since last_pulse_timestamp
   b. Fetch Outlook emails since last_pulse_timestamp
   c. Classify by priority (VIP, urgency, content)
   d. Generate draft responses
   e. Output → scout_result.json
4. Horizon:
   a. Fetch calendar events (next 24h)
   b. For each attendee, query Salesforce
   c. Cross-reference with Scout output
   d. Generate meeting briefs
   e. Output → horizon_result.json
5. Focus:
   a. Merge scout + horizon results
   b. Apply priority matrix
   c. Generate action list
   d. Render briefing (terminal + HTML)
   e. Update continuity tracker
   f. Output → focus_result.json + briefing files
6. Save last_pulse_state.json
```

### State Management

```json
{
  "last_pulse": "2026-02-11T07:00:00Z",
  "pulse_type": "morning",
  "slack_cursor": "...",
  "outlook_delta_token": "...",
  "carry_forward_items": [...],
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
- Audit log for all API calls

## Directory Structure

```
personal-os/
├── config/
│   ├── config.yaml          # Main configuration
│   ├── vip-contacts.yaml    # VIP contact list
│   └── .env.example         # Environment variable template
├── agents/
│   ├── scout/
│   │   └── index.js
│   ├── horizon/
│   │   └── index.js
│   └── focus/
│   │   └── index.js
├── integrations/
│   ├── slack/
│   │   └── client.js
│   ├── salesforce/
│   │   └── client.js
│   └── outlook/
│   │   └── client.js
├── scheduler/
│   ├── orchestrator.js      # Main pipeline
│   └── setup-tasks.ps1      # Task Scheduler setup
├── output/
│   ├── briefings/           # Generated briefings
│   └── state/               # Pulse state files
├── specs/                   # This folder
└── CLAUDE.md                # Agent orchestration config
```

## Open Questions

- [ ] Should state persist in a SQLite DB or flat JSON files?
- [ ] Multi-device support — run on work laptop only, or sync state?
- [ ] Error handling — if Slack API is down, should the Pulse continue with partial data?
- [ ] Telemetry — track personal productivity metrics over time?
