# Sales Intel Agent Specification

> Automates prospect research. Enriches every lead with company signals, decision-maker mapping, and buying intent before a human touches it.

## Trigger

Invoked in Phase 1 of the Pulse pipeline, in parallel with Scout and DataAgent (no dependencies).

## Inputs

- Salesforce new leads and pipeline opportunities (via SalesforceClient)
- LinkedIn company signals (via Chrome 9222 or Apollo/Clearbit API)
- Brand voice guardrails (`config/brand-voice.md`)
- Account enrichment cache (`data/context/sales-intel/`)

## Behavior

### 1. Harvest Pipeline

Pull new and updated records from Salesforce:
- New leads added since last Pulse
- Opportunities that changed stage
- Contacts added to active deals
- Accounts with stale last-touch dates

### 2. Enrich Contacts

For each new lead or contact, build a prospect dossier:

| Data Point | Source | Method |
|-----------|--------|--------|
| **Title, role, seniority** | LinkedIn | Profile scrape via Chrome 9222 |
| **Company size, industry, revenue** | Apollo / Clearbit API | REST enrichment call |
| **Tech stack** | BuiltWith / company careers page | Keyword extraction |
| **Recent news** | Google News API | Company name search |
| **Mutual connections** | LinkedIn | 2nd-degree network scan |

### 3. Detect Buying Signals

Score prospect intent by watching for:
- Job postings mentioning your solution category (e.g., "data governance", "cloud migration")
- Leadership changes (new CTO, VP Engineering)
- Funding rounds (Series B+, growth stage)
- Earnings calls mentioning relevant pain points
- Competitor displacement signals (job posts removing competitor skill requirements)

Signal scoring:

| Signal | Points | Rationale |
|--------|--------|-----------|
| Job posting matches keywords | +20 | Active hiring = active project |
| New C-level hire | +15 | New leaders bring new vendors |
| Funding round | +25 | Budget unlocked |
| Competitor mentioned in job posts | +10 | Incumbent may be displaced |
| Company news matches pain points | +10 | Awareness-stage signal |

### 4. Build Prospect Dossiers

Write enriched Markdown files to `data/context/sales-intel/`:

```
## [Company Name] — Prospect Dossier

**Account**: [Salesforce Account ID]
**Industry**: [industry] | **Size**: [employee count] | **Revenue**: [ARR if known]
**Decision Makers**:
- [Name] — [Title] — [LinkedIn URL]
- [Name] — [Title] — [LinkedIn URL]

**Buying Signals** (score: [total]):
- [signal description] (+[points])

**Tech Stack**: [detected technologies]
**Pain Points**: [inferred from job posts, news, earnings]
**Recommended Approach**: [based on persona + signals]
**Last Updated**: [timestamp]
```

### 5. Sync to Salesforce

Write enrichment data back to CRM:
- Update Contact fields (title, LinkedIn URL)
- Add Account notes (buying signals, tech stack)
- Tag leads with signal score for prioritization

## Outputs

```json
{
  "new_leads": [
    {
      "name": "...",
      "company": "...",
      "signal_score": 0,
      "signals": [...],
      "dossier_path": "data/context/sales-intel/company-name.md"
    }
  ],
  "updated_accounts": [...],
  "stale_deals": [...],
  "brief": [
    {
      "priority": "urgent|action|fyi",
      "category": "sales-intel",
      "title": "...",
      "items": ["..."]
    }
  ],
  "stats": {
    "leads_enriched": 0,
    "signals_detected": 0,
    "accounts_updated": 0,
    "dossiers_written": 0
  }
}
```

## Integration Contracts

### Salesforce

- REST API with OAuth2 (JWT bearer flow)
- Objects: Lead, Contact, Account, Opportunity
- SOQL queries for pipeline changes since last Pulse
- Write-back: Contact/Account field updates

### LinkedIn (via Chrome 9222)

- Reuses immortal Chrome debug session from Z commands
- Profile scraping: title, company, connections
- Company page: employee count, recent posts
- Rate limit: 80 requests/hour (conservative)

### Apollo / Clearbit

- REST API with API key auth
- Endpoints: `/people/match`, `/companies/match`
- Rate limits: 300 req/min (Apollo), 600 req/min (Clearbit)
- Fallback: Apollo primary, Clearbit secondary

## Configuration

```yaml
sales_intel:
  enabled: true
  enrichment_provider: "apollo"          # apollo | clearbit
  linkedin_scraping: true                # requires Chrome 9222
  signal_keywords:
    - "data governance"
    - "cloud migration"
    - "AI adoption"
    - "modernization"
    - "digital transformation"
  signal_score_threshold: 30             # minimum score to flag as high-intent
  dossier_dir: "data/context/sales-intel"
  salesforce_writeback: true             # push enrichment back to CRM
  stale_deal_days: 14                    # flag deals with no activity
  max_enrichments_per_pulse: 20          # rate limit protection
```

## AWS Context

This agent is purpose-built for an AWS account team workflow:
- Signal keywords default to AWS service categories (migration, modernization, data, AI/ML)
- Enrichment prioritizes accounts in AWS-relevant industries
- Integrates with AWS Partner CRM fields when available (APN tier, MAP eligibility, EDP status)
- Dossiers include AWS workload assessment signals (on-prem footprint, cloud maturity)

## Open Questions

- [ ] Apollo vs Clearbit — which provides better signal coverage for AWS accounts?
- [ ] LinkedIn scraping rate limits — should we batch across Pulses (10 per Pulse) or burst?
- [ ] Should signal scoring weights be configurable per-deal or global?
- [ ] Integration with AWS Partner Network API for account-level data?
- [ ] Privacy compliance — GDPR implications of storing LinkedIn data locally?
