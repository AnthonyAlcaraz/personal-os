# Outreach Agent Specification

> Generates personalized sales communications at scale. Turns prospect dossiers into ready-to-send emails, LinkedIn messages, call scripts, and follow-ups.

## Trigger

Invoked in Phase 2 of the Pulse pipeline, after Sales Intel completes. Runs in parallel with Horizon.

## Inputs

- Sales Intel output (prospect dossiers, signal scores)
- Horizon output (completed meetings requiring follow-up)
- Battlecard library (`data/context/battlecards/`)
- Brand voice guardrails (`config/brand-voice.md`)
- Email/message templates (`data/templates/outreach/`)
- Outreach queue state (drafts pending review)

## Behavior

### 1. Generate Personalized Outreach

For each high-priority prospect from Sales Intel, generate multi-channel drafts:

| Channel | Format | Personalization Source |
|---------|--------|----------------------|
| **Email** | Subject + body, 150-250 words | Dossier pain points + signal triggers |
| **LinkedIn DM** | Connection request + message, 300 char limit | Mutual connections + shared interests |
| **Call Script** | Opening + discovery questions + value prop | Industry context + tech stack |
| **Video Script** | 60-second personalized intro | Company news + specific use case |

Personalization depth by signal score:

| Score Range | Outreach Level | Effort |
|------------|---------------|--------|
| 50+ | Hyper-personalized | Custom case study match, specific ROI numbers |
| 30-49 | Personalized | Industry pain points, relevant signals |
| 10-29 | Semi-personalized | Template with company name + industry |
| <10 | Skip | Not enough context for meaningful outreach |

### 2. Match Case Studies

For each prospect, find the most relevant case study from the library:

```
data/context/case-studies/
├── by-industry/
│   ├── financial-services.md
│   ├── healthcare.md
│   └── retail.md
├── by-workload/
│   ├── migration.md
│   ├── data-analytics.md
│   └── ai-ml.md
└── by-size/
    ├── enterprise.md
    ├── mid-market.md
    └── startup.md
```

Matching algorithm: industry + workload type + company size. Falls back to closest match.

### 3. Generate Follow-ups

After meetings detected by Horizon, auto-generate:

**Meeting Recap Email**:
- Key discussion points (from calendar notes + CRM activity)
- Agreed action items with owners
- Relevant resources/links
- Next meeting suggestion

**Objection Response**:
- Match objection to battlecard library
- Generate counter-argument with data points
- Suggest proof points (case studies, benchmarks)

**Stale Deal Re-engagement**:
- For deals flagged by Sales Intel as stale (no activity > N days)
- Generate re-engagement message with new trigger (industry news, product update, case study)

### 4. Queue for Review

All generated content goes to a review queue, never sent automatically:

```json
{
  "queue": [
    {
      "id": "outreach-001",
      "type": "email|linkedin|call_script|followup",
      "prospect": "Name — Company",
      "channel": "email",
      "subject": "...",
      "body": "...",
      "signal_score": 45,
      "case_study_match": "migration-financial-services",
      "status": "pending_review",
      "created_at": "..."
    }
  ]
}
```

### 5. Brand Voice Enforcement

All generated content validated against `config/brand-voice.md`:
- Tone: professional, consultative (not salesy)
- Banned phrases: "just checking in", "hope you're well", "circle back"
- Required elements: specific value proposition, clear CTA, personalized hook
- Length limits per channel

## Outputs

```json
{
  "drafts": [
    {
      "prospect": "...",
      "channel": "email|linkedin|call_script|followup",
      "content": { "subject": "...", "body": "..." },
      "personalization": { "signal_score": 0, "case_study": "...", "pain_points": [...] },
      "status": "pending_review"
    }
  ],
  "followups": [
    {
      "meeting_id": "...",
      "type": "recap|objection|re-engagement",
      "content": "..."
    }
  ],
  "brief": [
    {
      "priority": "action",
      "category": "outreach",
      "title": "...",
      "items": ["..."]
    }
  ],
  "stats": {
    "drafts_generated": 0,
    "followups_generated": 0,
    "emails": 0,
    "linkedin_messages": 0,
    "call_scripts": 0,
    "avg_signal_score": 0
  }
}
```

## Integration Contracts

### Claude API (Anthropic)

- Model: Claude Sonnet 4.5 for draft generation (cost-effective at volume)
- System prompt includes brand voice + prospect dossier + case study
- Temperature: 0.7 for creative variation, 0.3 for follow-ups
- Max tokens: 500 per draft

### Salesforce

- Read: Opportunity stage, last activity, contact preferences
- Write: Log outreach activity (Task object) when draft is approved and sent

### Email (future)

- Microsoft Graph API `/me/sendMail` for Outlook integration
- Draft creation in Outlook (not auto-send)

## Configuration

```yaml
outreach:
  enabled: true
  channels:
    - email
    - linkedin
    - call_script
  auto_followup:
    meeting_recap: true              # generate after every meeting
    objection_response: true         # match to battlecards
    stale_re_engagement: true        # re-engage dormant deals
  battlecard_dir: "data/context/battlecards"
  case_study_dir: "data/context/case-studies"
  brand_voice_file: "config/brand-voice.md"
  templates_dir: "data/templates/outreach"
  daily_targets:
    emails: 20
    linkedin_messages: 10
    call_scripts: 5
  review_mode: "queue"               # queue (human approval) | auto
  generation:
    model: "claude-sonnet-4-5-20250929"
    temperature_outreach: 0.7
    temperature_followup: 0.3
    max_tokens: 500
```

## AWS Context

Outreach templates are tuned for AWS account team conversations:
- Value propositions reference AWS services (Migration Acceleration Program, EDP, credits)
- Case studies organized by AWS workload type (migration, modernization, data lake, AI/ML)
- Battlecards include AWS vs competitor positioning (Azure, GCP)
- Follow-ups reference AWS-specific next steps (Well-Architected Review, Immersion Day, POC)
- Call scripts include AWS discovery questions (current spend, commitment level, workload inventory)

## Open Questions

- [ ] Should we support A/B testing of outreach variants per prospect?
- [ ] Auto-send after N hours if not reviewed? Or strict human-in-the-loop?
- [ ] Integration with Outreach.io or Salesloft for sequence management?
- [ ] Should call scripts include real-time objection handling (live mode)?
- [ ] Multi-language support for EMEA accounts?
