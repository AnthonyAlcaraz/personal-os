# DataAgent Specification

## Overview

The DataAgent is the fourth agent in the Personal OS pipeline. Inspired by the [nao open-source data agent](https://github.com/getnao/nao), it uses a YAML-driven, file-system-as-context approach to monitor databases, detect anomalies, and answer data questions.

It runs **in parallel** with Scout during each Pulse, feeding results into Focus alongside Scout and Horizon.

## Architecture

```
Orchestrator Pulse
    |
    +-- Promise.all([
    |       Scout (comms),
    |       DataAgent (data)       <-- parallel
    |   ])
    +-- Horizon (calendar, depends on Scout)
    +-- Focus (merges Scout + Horizon + DataAgent)
```

## Core Concepts (from nao)

| Concept | Implementation |
|---------|---------------|
| **YAML config** | `config/data-sources.yaml` — single file defines all database connections |
| **File-system-as-context** | `data/context/databases/` — Markdown files per table, no vector DB |
| **Templates** | `data/templates/databases/*.hbs` — Handlebars templates for context generation |
| **Data rules** | `config/data-rules.md` — business rules injected into agent prompts |
| **YAML tests** | `tests/data/cases/*.yml` — prompt-to-SQL evaluation cases |
| **Python sidecar** | `integrations/database/sidecar.py` — Ibis bridge for 7 database backends |

## Supported Databases

Via Python Ibis framework:
- DuckDB (local/embedded)
- PostgreSQL
- Snowflake
- BigQuery
- Databricks
- Redshift
- SQL Server (MSSQL)

## Pipeline: run(config, state)

```
1. SYNC — Refresh schema metadata from configured sources
   - Calls Python sidecar to introspect each database
   - Renders Handlebars templates to data/context/databases/
   - Detects and logs schema changes
   - Skips if within sync_interval_hours window

2. MONITOR — Execute KPI queries and detect anomalies
   - Runs SQL queries defined in data-sources.yaml monitors section
   - Compares results against thresholds (value < N, change_pct > N)
   - Maintains rolling history in pulse state

3. BRIEF — Generate sections for Focus
   - Anomalies → urgent priority items
   - KPI summary → informational section
   - Schema changes → FYI section
```

## Context Directory Structure

```
data/context/databases/
  type=postgres/
    database=prod_analytics/
      schema=public/
        table=orders/
          columns.md      — column names, types, nullable
          description.md  — row count, column count
          preview.md      — first 10 rows as JSONL
        table=customers/
          columns.md
          description.md
          preview.md
```

## Configuration

### data-sources.yaml

```yaml
databases:
  - name: prod-postgres
    type: postgres
    host: "{{ env('PG_HOST') }}"
    port: 5432
    database: "{{ env('PG_DATABASE') }}"
    user: "{{ env('PG_USER') }}"
    password: "{{ env('PG_PASSWORD') }}"
    include:
      - "public.*"
    exclude: []

monitors:
  - source: prod-postgres
    queries:
      - name: daily_revenue
        sql: "SELECT SUM(amount) as value FROM orders WHERE created_at >= CURRENT_DATE"
        alert_when: "value < 1000"
```

### config.yaml (data section)

```yaml
data:
  enabled: true
  sync_on_pulse: true
  sync_interval_hours: 6
  monitor:
    enabled: true
    history_pulses: 10
  cli:
    max_results: 100
    timeout_seconds: 30
```

## CLI Chat Mode

Interactive REPL for ad-hoc data questions:

```
$ npm run data-cli

DataAgent CLI — ask questions about your data
Connected sources: prod-postgres (postgres), local-analytics (duckdb)

data> What was total revenue yesterday?
SQL: SELECT SUM(amount) as total_revenue FROM orders WHERE order_date = CURRENT_DATE - 1

| total_revenue |
|--------------|
| 15234.50     |

Yesterday's total revenue was $15,234.50 from all completed orders.
```

## Test Framework

YAML test cases in `tests/data/cases/`:

```yaml
name: total_revenue
prompt: "What is the total revenue from all orders?"
source: prod-postgres
sql: |
  SELECT SUM(amount) as total_revenue FROM orders
```

Run with `npm run data-test`.

## Output Schema

```json
{
  "kpis": [{ "source": "...", "name": "...", "value": 0, "previous": 0, "change_pct": 0 }],
  "anomalies": [{ "source": "...", "name": "...", "value": 0, "alert_rule": "...", "severity": "high" }],
  "schema_changes": [{ "db": "...", "schema": "...", "table": "..." }],
  "brief": [{ "priority": "urgent|action|fyi", "category": "data", "title": "...", "items": ["..."] }],
  "stats": {
    "total_sources": 0,
    "total_tables": 0,
    "kpis_tracked": 0,
    "anomalies_detected": 0
  }
}
```

## Security

- Database credentials stored in `.env` only (never in YAML)
- `{{ env('VAR') }}` interpolation resolves at runtime
- Context files contain schema metadata only (no raw data beyond 10-row previews)
- Python sidecar runs as subprocess with 60s timeout
- Path traversal blocked in tools.js (sandboxed to data/context/)

## Open Questions

- [ ] Should the sidecar cache connections across calls? (Currently reconnects each time)
- [ ] Add support for file-based sources (CSV, Parquet) via DuckDB's read_csv/read_parquet?
- [ ] Implement Notion sync for business docs (like nao)?
- [ ] Add MCP server integration for BI tools (Metabase, Looker)?
- [ ] Should anomaly history be stored in SQLite instead of flat JSON?
