# Data Rules

Business rules that guide DataAgent behavior during SQL generation and anomaly interpretation.
Update this file as you learn what the agent gets wrong — it's injected into the system prompt.

## Query Rules

- Always use UTC timestamps unless the user specifies a timezone
- Revenue figures should be rounded to 2 decimal places
- Use exact column names from the schema — never guess column names

## Anomaly Rules

- Revenue drops > 20% on weekdays are anomalies; weekend drops up to 40% are normal
- Ignore staging/test schemas for all monitoring
- Missing data (NULL aggregates) should be flagged separately from zero values

## Data Definitions

- Define business terms here so the agent uses them consistently
- Example: "Active customer" = placed an order in the last 90 days
