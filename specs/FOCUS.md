# Focus Agent Specification

> Filters noise into signal. Transforms all collected context into a prioritized action list and briefing.

## Trigger

Invoked last in the Pulse pipeline (Phase 4), after all other agents complete.

## Inputs

- Scout output (triaged communications, draft responses)
- Horizon output (meeting briefs, schedule warnings)
- DataAgent output (KPIs, anomalies, schema changes)
- SalesIntel output (enriched prospects, buying signals, stale deals)
- Outreach output (generated drafts pending review, follow-ups)
- DealAccel output (deal health scores, proposals, decks, pipeline risks)
- Previous Focus output (for continuity tracking)

## Behavior

### 1. Aggregate

Merge all inputs into a unified view:
- Communications requiring action
- Meeting preparation tasks
- Schedule conflicts to resolve
- Database anomalies and KPI alerts
- High-intent prospects to pursue
- Outreach drafts pending review
- At-risk deals requiring intervention
- Proposals and decks ready for delivery
- Pipeline-level risks (coverage gaps, bottlenecks)
- Carry-forward items from previous Pulse

### 2. Prioritize

Apply priority matrix:

| Urgency \ Importance | High Importance | Low Importance |
|----------------------|-----------------|----------------|
| **High Urgency** | DO NOW | Delegate/Quick |
| **Low Urgency** | SCHEDULE | DROP |

Factors:
- VIP sender weight
- Revenue impact (from Salesforce opportunity data)
- Deal health score (at-risk deals escalate)
- Signal score (high-intent prospects promote)
- Deadline proximity
- Dependency chains (blocks others)

### 3. Generate Action List

Produce numbered, actionable items:

```
1. [URGENT] Reply to [VIP] about [topic] — draft ready
2. [DEAL] Review proposal for [Company] — generated, needs approval
3. [PREP] Review account brief for 10:30am meeting with [Company]
4. [OUTREACH] Review 5 personalized emails — pending in queue
5. [RISK] Re-engage [Company] deal — stale 18 days, recovery plan ready
6. [ACTION] Approve [request] in Slack #channel
7. [DATA] Revenue anomaly — daily revenue 40% below threshold
8. [SCHEDULE] Block time for [deliverable] due Friday
9. [FYI] 3 new buying signals detected across pipeline
10. [FYI] Team standup notes — no action needed
```

### 4. Generate Briefing

Produce multi-format output:

- **Terminal**: Concise numbered list with color coding
- **HTML**: Styled digest email/report with sections per agent
- **Audio**: Script for text-to-speech podcast summary

### 5. Continuity Tracking

Track items across Pulses:
- New items this Pulse
- Items carried forward (aging)
- Items completed since last Pulse
- Items that escalated in priority

## Outputs

```json
{
  "action_list": [
    {
      "id": "...",
      "priority": "urgent|action|schedule|fyi",
      "category": "comms|meeting|task|data|sales|outreach|deal|pipeline",
      "title": "...",
      "detail": "...",
      "source": "scout|horizon|data|sales_intel|outreach|deal_accel",
      "draft_available": true,
      "age_pulses": 0
    }
  ],
  "briefing": {
    "terminal": "...",
    "html": "...",
    "audio_script": "..."
  },
  "continuity": {
    "new": 0,
    "carried_forward": 0,
    "completed": 0,
    "escalated": 0
  }
}
```

## Briefing Schedule

| Pulse | Time | Focus |
|-------|------|-------|
| **Morning** | 7:00 AM | Full day prep, overnight catch-up, pipeline review |
| **Midday** | 12:00 PM | Afternoon prep, morning follow-ups, outreach queue review |
| **End-of-Day** | 5:30 PM | Tomorrow preview, open item summary, deal health check |

## Configuration

```yaml
focus:
  pulse_schedule:
    morning: "07:00"
    midday: "12:00"
    evening: "17:30"
  output_formats:
    - terminal
    - html
  max_action_items: 10
  carry_forward_max_age: 5  # pulses before auto-drop
  audio:
    enabled: false
    voice: "alloy"  # OpenAI TTS voice
    output_dir: "./briefings/audio/"
```

## Open Questions

- [ ] Audio podcast — which TTS service? (OpenAI, ElevenLabs, Azure?)
- [ ] Should Focus auto-send the HTML digest via email or just save locally?
- [ ] Priority weights — should revenue impact outweigh VIP sender status?
- [ ] Integration with task managers (Todoist, Notion) for action items?
- [ ] Should sales items get their own briefing section or merge with general actions?
