# Focus Agent Specification

> Filters noise into signal. Transforms all collected context into a prioritized action list and briefing.

## Trigger

Invoked last in the Pulse pipeline, after Scout and Horizon.

## Inputs

- Scout output (triaged communications, draft responses)
- Horizon output (meeting briefs, schedule warnings)
- Previous Focus output (for continuity tracking)

## Behavior

### 1. Aggregate

Merge all inputs into a unified view:
- Communications requiring action
- Meeting preparation tasks
- Schedule conflicts to resolve
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
- Deadline proximity
- Dependency chains (blocks others)

### 3. Generate Action List

Produce numbered, actionable items:

```
1. [URGENT] Reply to [VIP] about [topic] — draft ready
2. [PREP] Review account brief for 10:30am meeting with [Company]
3. [ACTION] Approve [request] in Slack #channel
4. [SCHEDULE] Block time for [deliverable] due Friday
5. [FYI] Team standup notes — no action needed
```

### 4. Generate Briefing

Produce multi-format output:

- **Terminal**: Concise numbered list with color coding
- **HTML**: Styled digest email/report
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
      "category": "comms|meeting|task",
      "title": "...",
      "detail": "...",
      "source": "scout|horizon",
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
| **Morning** | 7:00 AM | Full day prep, overnight catch-up |
| **Midday** | 12:00 PM | Afternoon prep, morning follow-ups |
| **End-of-Day** | 5:30 PM | Tomorrow preview, open item summary |

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
