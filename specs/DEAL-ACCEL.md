# Deal Accelerator Agent Specification

> Accelerates deals through the pipeline. Auto-generates proposals with ROI calculations, builds pitch decks with matched case studies, and detects at-risk deals before they stall.

## Trigger

Invoked in Phase 3 of the Pulse pipeline, after Horizon and Sales Intel complete. Needs CRM context from both.

## Inputs

- Horizon output (upcoming meetings, CRM context for attendees)
- Sales Intel output (prospect dossiers, signal scores, enrichment data)
- Salesforce opportunity pipeline (stages, amounts, close dates, activity history)
- ROI benchmarks (`config/roi-benchmarks.yaml`)
- Case study library (`data/context/case-studies/`)
- Proposal templates (`data/templates/proposals/`)
- Pitch deck templates (`data/templates/decks/`)

## Behavior

### 1. Score Deal Health

For every active opportunity, compute a health score:

| Factor | Weight | Scoring |
|--------|--------|---------|
| **Days in stage** | 25% | Green: <50% of avg, Yellow: 50-100%, Red: >100% |
| **Engagement recency** | 25% | Green: <7 days, Yellow: 7-14, Red: >14 |
| **Stakeholder coverage** | 20% | Green: 3+ contacts, Yellow: 2, Red: 1 |
| **Next step defined** | 15% | Green: scheduled, Yellow: verbal, Red: none |
| **Champion identified** | 15% | Green: confirmed, Yellow: possible, Red: none |

Health classification:

| Score | Status | Action |
|-------|--------|--------|
| 80-100 | Healthy | Monitor |
| 60-79 | Needs Attention | Suggest re-engagement |
| 40-59 | At Risk | Alert in briefing, generate recovery plan |
| <40 | Critical | Urgent flag, escalation recommendation |

### 2. Generate Proposals

For deals in Proposal or Negotiation stage, auto-generate custom proposals:

**Proposal Structure:**
```
1. Executive Summary
   - Prospect's business challenge (from dossier)
   - Proposed solution (matched to pain points)

2. Solution Architecture
   - Technical approach (from case study match)
   - Implementation timeline

3. ROI Analysis
   - Industry benchmarks (from roi-benchmarks.yaml)
   - Customer-specific calculations
   - Payback period projection

4. Case Study
   - Matched by industry + workload + size
   - Quantified results

5. Investment Summary
   - Pricing (from opportunity amount)
   - Payment terms
   - Comparison to cost of inaction

6. Next Steps
   - Clear CTA with timeline
```

**ROI Calculation Engine:**

Reads `config/roi-benchmarks.yaml` for industry-specific benchmarks:

```yaml
benchmarks:
  migration:
    cost_reduction_pct: 31          # IDC average
    developer_productivity_pct: 29  # Forrester
    downtime_reduction_pct: 69      # AWS case studies
    time_to_market_pct: 37
  data_analytics:
    query_performance_improvement: "10x"
    infrastructure_cost_reduction_pct: 45
    time_to_insight_reduction_pct: 60
```

Calculates prospect-specific ROI:
- Estimate current spend from company size + industry
- Apply benchmark percentages
- Project 3-year savings + revenue impact
- Generate payback period

### 3. Build Pitch Decks

For meetings with external attendees (detected by Horizon), generate slide decks:

**Deck Generation Pipeline** (reuses Z4 slide engine):
1. Select template by meeting type (intro, deep-dive, proposal, QBR)
2. Populate with prospect dossier data
3. Match and insert relevant case study slides
4. Generate AI visuals for key concepts (via Marp/Reveal.js)
5. Export as PDF + PPTX

**Deck Types:**

| Meeting Type | Slides | Content |
|-------------|--------|---------|
| **Intro/Discovery** | 8-10 | Company overview, capability map, relevant case studies, discovery questions |
| **Technical Deep-Dive** | 12-15 | Architecture diagrams, service details, migration approach, POC plan |
| **Proposal Presentation** | 10-12 | Business case, ROI, solution, pricing, timeline, next steps |
| **QBR / Account Review** | 8-10 | Usage metrics, savings achieved, roadmap, expansion opportunities |

### 4. Match Case Studies

Intelligent case study matching against the library:

```
Matching Dimensions:
├── Industry (exact match: +30, adjacent: +15)
├── Company size (same tier: +20, adjacent: +10)
├── Workload type (exact: +30, related: +15)
├── Geography (same region: +10)
└── Pain point overlap (per matching point: +5)
```

Returns top 3 matches with relevance scores. Falls back to generic case study if no match above threshold.

### 5. Detect Pipeline Risks

Aggregate health scores into pipeline-level insights:

- **Deals slipping**: Close date approaching but stage not advancing
- **Coverage gaps**: Pipeline value < 3x quota (insufficient coverage)
- **Stage clustering**: Too many deals stuck in same stage (process bottleneck)
- **Single-threaded deals**: Only one contact engaged (champion risk)
- **Quarter-end urgency**: Deals closing this quarter with health score < 60

## Outputs

```json
{
  "deal_health": [
    {
      "opportunity_id": "...",
      "name": "...",
      "account": "...",
      "stage": "...",
      "amount": 0,
      "health_score": 0,
      "status": "healthy|needs_attention|at_risk|critical",
      "factors": {...},
      "recommended_actions": [...]
    }
  ],
  "proposals": [
    {
      "opportunity_id": "...",
      "path": "output/proposals/company-name-proposal.md",
      "roi_summary": { "year_1_savings": 0, "payback_months": 0 }
    }
  ],
  "decks": [
    {
      "meeting_id": "...",
      "type": "intro|deep_dive|proposal|qbr",
      "path": "output/decks/company-name-deck.pdf"
    }
  ],
  "pipeline_risks": [
    {
      "risk": "coverage_gap|stage_bottleneck|quarter_end",
      "severity": "high|medium",
      "detail": "...",
      "recommendation": "..."
    }
  ],
  "brief": [
    {
      "priority": "urgent|action|fyi",
      "category": "deal-accel",
      "title": "...",
      "items": ["..."]
    }
  ],
  "stats": {
    "deals_scored": 0,
    "at_risk_deals": 0,
    "proposals_generated": 0,
    "decks_generated": 0,
    "pipeline_coverage_ratio": 0
  }
}
```

## Integration Contracts

### Salesforce

- REST API with OAuth2 (JWT bearer flow)
- Objects: Opportunity, OpportunityLineItem, OpportunityContactRole, Task, Event
- SOQL: Pipeline queries by stage, close date, last activity
- Write-back: Health score to custom field, activity logging

### Claude API (Anthropic)

- Model: Claude Opus 4.6 for proposals (quality matters for customer-facing docs)
- Model: Claude Sonnet 4.5 for deck content and summaries
- System prompt includes ROI benchmarks + case study + prospect dossier
- Temperature: 0.3 (factual, precise)

### Z4 Slide Engine (internal)

- Reuses Marp/Reveal.js pipeline from Z commands
- Template selection by meeting type
- AI image generation for concept slides

## Configuration

```yaml
deal_accel:
  enabled: true
  roi_benchmarks_file: "config/roi-benchmarks.yaml"
  case_study_dir: "data/context/case-studies"
  proposal_templates_dir: "data/templates/proposals"
  deck_templates_dir: "data/templates/decks"
  deck_engine: "marp"                    # marp | revealjs
  output_dir: "output"
  health_scoring:
    stale_stage_days:
      Prospecting: 14
      Qualification: 21
      Proposal: 14
      Negotiation: 10
    engagement_gap_warning_days: 7
    engagement_gap_critical_days: 14
    minimum_stakeholders: 2
  pipeline:
    coverage_ratio_target: 3.0           # pipeline / quota ratio
    quarter_end_alert_days: 30           # flag deals closing within N days
  generation:
    proposal_model: "claude-opus-4-6"
    deck_model: "claude-sonnet-4-5-20250929"
    temperature: 0.3
    auto_generate_proposals: true        # for Proposal-stage deals
    auto_generate_decks: true            # for meetings with external attendees
```

## AWS Context

Deal Accelerator is calibrated for AWS sales motions:
- **ROI benchmarks** sourced from AWS case studies, IDC/Forrester AWS-specific reports
- **Proposal templates** reference AWS services, pricing models (On-Demand, Reserved, Savings Plans)
- **Deck templates** include AWS architecture diagrams, Well-Architected Framework pillars
- **Pipeline stages** map to AWS partner sales stages (Prospect, Qualify, Propose, SOW, Closed Won)
- **Health scoring** accounts for AWS-specific deal dynamics (EDP timeline, MAP approval, credits allocation)
- **Case studies** tagged with AWS services used (EC2, S3, SageMaker, Bedrock, etc.)

## Open Questions

- [ ] Should proposals auto-populate pricing from Salesforce opportunity amount, or keep it manual?
- [ ] Integration with CPQ (Configure-Price-Quote) tools for complex pricing?
- [ ] Competitive intelligence integration — auto-detect competitor mentions in deal notes?
- [ ] Should deck generation trigger on meeting creation or only at Pulse time?
- [ ] Multi-stakeholder proposals — different versions for technical vs business audience?
- [ ] Integration with DocuSign for proposal signing workflow?
