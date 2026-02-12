// Monitor — executes KPI queries and detects anomalies
// Compares current values against thresholds and historical data

import { DatabaseClient } from '../../integrations/database/client.js';
import { loadDataSources } from '../../config/loader.js';

/**
 * Evaluate an alert condition against a KPI result.
 * Supports: "value < N", "value > N", "change_pct > N", "change_pct < N"
 */
function evaluateAlert(alertRule, kpi) {
  if (!alertRule) return false;

  const match = alertRule.match(/^(\w+)\s*([<>]=?)\s*(-?[\d.]+)$/);
  if (!match) return false;

  const [, field, op, thresholdStr] = match;
  const threshold = parseFloat(thresholdStr);
  const actual = kpi[field];

  if (actual === null || actual === undefined) return false;

  switch (op) {
    case '<': return actual < threshold;
    case '>': return actual > threshold;
    case '<=': return actual <= threshold;
    case '>=': return actual >= threshold;
    default: return false;
  }
}

/**
 * Determine anomaly severity based on deviation.
 */
function determineSeverity(kpi) {
  if (kpi.change_pct === null) return 'info';
  const abs = Math.abs(kpi.change_pct);
  if (abs > 50) return 'high';
  if (abs > 20) return 'medium';
  return 'low';
}

/**
 * Run all configured monitor queries and detect anomalies.
 */
export async function runMonitors(dataConfig, dataState) {
  const sources = loadDataSources();
  const monitors = sources.monitors || [];
  const databases = sources.databases || [];

  if (monitors.length === 0) {
    return { kpis: [], anomalies: [] };
  }

  const previousValues = dataState?.monitor_values || {};
  const history = dataState?.monitor_history || {};
  const historyMax = dataConfig?.monitor?.history_pulses || 10;

  const kpis = [];
  const anomalies = [];

  for (const monitor of monitors) {
    const dbConfig = databases.find(d => d.name === monitor.source);
    if (!dbConfig) {
      console.warn(`[DataAgent] Monitor source not found: ${monitor.source}`);
      continue;
    }

    const client = new DatabaseClient(dbConfig);

    for (const query of monitor.queries || []) {
      const key = `${monitor.source}.${query.name}`;

      let currentValue = null;
      let error = null;

      try {
        const result = await client.executeSQL(query.sql);
        if (result && result.length > 0) {
          // Take the first numeric value from the first row
          const row = result[0];
          currentValue = row.value ?? row[Object.keys(row)[0]] ?? null;
          if (typeof currentValue === 'string') currentValue = parseFloat(currentValue);
        }
      } catch (err) {
        error = err.message;
        console.error(`[DataAgent] Monitor query failed (${key}): ${err.message}`);
      }

      const previousValue = previousValues[key] ?? null;
      const changePct = (previousValue !== null && previousValue !== 0 && currentValue !== null)
        ? ((currentValue - previousValue) / Math.abs(previousValue)) * 100
        : null;

      const kpi = {
        source: monitor.source,
        name: query.name,
        value: currentValue,
        previous: previousValue,
        change_pct: changePct,
        error,
      };
      kpis.push(kpi);

      // Check alert conditions
      if (!error && evaluateAlert(query.alert_when, kpi)) {
        anomalies.push({
          ...kpi,
          alert_rule: query.alert_when,
          severity: determineSeverity(kpi),
        });
      }

      // Update state for next pulse
      if (currentValue !== null) {
        if (!dataState.monitor_values) dataState.monitor_values = {};
        dataState.monitor_values[key] = currentValue;

        // Maintain rolling history
        if (!dataState.monitor_history) dataState.monitor_history = {};
        if (!dataState.monitor_history[key]) dataState.monitor_history[key] = [];
        dataState.monitor_history[key].push(currentValue);
        if (dataState.monitor_history[key].length > historyMax) {
          dataState.monitor_history[key].shift();
        }
      }
    }
  }

  console.log(`[DataAgent] Monitors: ${kpis.length} KPIs checked, ${anomalies.length} anomalies`);
  return { kpis, anomalies };
}
