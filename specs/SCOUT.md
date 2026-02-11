# Scout Agent Specification

> Monitors communications across Slack and Outlook. Triages, drafts responses, and escalates urgency.

## Trigger

Invoked first in the Pulse pipeline by the orchestrator.

## Inputs

- Slack messages since last Pulse (channels + DMs)
- Outlook emails since last Pulse (inbox + focused)
- VIP contact list (from config)

## Behavior

### 1. Collect

Fetch all new messages from:
- **Slack**: Configured channels, all DMs, @mentions
- **Outlook**: Inbox items, flagged emails

### 2. Triage

Classify each message:

| Priority | Criteria | Action |
|----------|----------|--------|
| **Urgent** | VIP sender, keywords (e.g., "ASAP", "blocking"), escalation threads | Immediate notification |
| **Action Required** | Direct questions, requests, approvals pending | Queue for briefing |
| **FYI** | CC'd, group announcements, newsletters | Summarize only |
| **Noise** | Bot messages, automated alerts, social | Skip |

### 3. Draft Responses

For Action Required items, generate draft responses:
- Acknowledge receipt
- Answer if context is available
- Flag if more information needed

### 4. VIP Detection

Maintain a configurable VIP list. VIP messages always promote to Urgent regardless of content.

## Outputs

```json
{
  "urgent": [...],
  "action_required": [...],
  "fyi": [...],
  "draft_responses": [...],
  "stats": {
    "total_messages": 0,
    "slack_messages": 0,
    "outlook_emails": 0,
    "urgent_count": 0
  }
}
```

## Integration Contracts

### Slack
- OAuth2 with bot + user tokens
- Scopes: `channels:history`, `im:history`, `users:read`, `chat:write`
- Rate limit: Tier 3 (50+ req/min)

### Outlook
- Microsoft Graph API with OAuth2
- Scopes: `Mail.Read`, `Mail.Send` (for drafts)
- Delta query for incremental sync

## Configuration

```yaml
scout:
  vip_contacts:
    - slack_id: "U12345"
      name: "Manager Name"
    - email: "cto@company.com"
      name: "CTO"
  channels:
    - "#team-updates"
    - "#incidents"
  urgency_keywords:
    - "blocking"
    - "ASAP"
    - "urgent"
    - "production"
  notification_method: "terminal"  # terminal | desktop | phone
```

## Open Questions

- [ ] Should Scout send draft responses automatically or queue for approval?
- [ ] Phone call escalation for critical urgency — which service? (Twilio?)
- [ ] Thread context depth — how many parent messages to include for context?
