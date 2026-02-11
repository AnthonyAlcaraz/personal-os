# Horizon Agent Specification

> Calendar awareness agent. Ensures you arrive at every meeting prepared with full context.

## Trigger

Invoked second in the Pulse pipeline, after Scout.

## Inputs

- Outlook Calendar events (next 24 hours)
- Salesforce account/opportunity data for meeting attendees
- Scout output (relevant communications about upcoming meetings)

## Behavior

### 1. Scan Calendar

Fetch all events in the lookahead window:
- Meetings, calls, appointments
- Include attendee lists and meeting descriptions
- Flag conflicts and back-to-back situations

### 2. Enrich with CRM Context

For each meeting, look up attendees in Salesforce:
- Account name, industry, tier
- Open opportunities (stage, amount, close date)
- Recent activity (last touch, notes)
- Account health signals

### 3. Gather Communication Context

Cross-reference Scout output:
- Recent Slack threads mentioning attendees or account
- Email threads with meeting participants
- Unresolved action items from prior meetings

### 4. Generate Meeting Briefs

For each meeting, produce a structured brief:

```
## [Meeting Title] — [Time]
**Attendees**: [names + roles]
**Account**: [Salesforce account summary]
**Context**: [recent comms, open items]
**Suggested talking points**: [based on CRM + comms]
**Prep needed**: [documents to review, decisions needed]
```

### 5. Schedule Optimization

Flag:
- Back-to-back meetings with no prep buffer
- Meetings without agendas
- Meetings that could be async (no decision items)

## Outputs

```json
{
  "meetings": [
    {
      "title": "...",
      "time": "...",
      "attendees": [...],
      "crm_context": {...},
      "recent_comms": [...],
      "talking_points": [...],
      "prep_items": [...],
      "flags": [...]
    }
  ],
  "schedule_warnings": [...],
  "stats": {
    "total_meetings": 0,
    "meetings_with_crm": 0,
    "conflicts": 0
  }
}
```

## Integration Contracts

### Outlook Calendar
- Microsoft Graph API
- Scopes: `Calendars.Read`
- CalendarView endpoint for time-range queries

### Salesforce
- REST API with OAuth2 (JWT bearer flow)
- Objects: Account, Contact, Opportunity, Task, Event
- SOQL queries for attendee lookup by email

## Configuration

```yaml
horizon:
  lookahead_hours: 24
  prep_buffer_minutes: 15
  salesforce:
    instance_url: "https://company.my.salesforce.com"
    api_version: "v59.0"
  outlook:
    calendar_id: "primary"
  meeting_brief_depth: "detailed"  # summary | detailed
```

## Open Questions

- [ ] Should Horizon suggest rescheduling for conflicting meetings?
- [ ] How deep should CRM context go? (Account level vs full opportunity pipeline)
- [ ] Integration with meeting notes tools (e.g., auto-create agenda doc)?
