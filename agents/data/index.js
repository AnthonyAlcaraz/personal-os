// DataAgent — Database monitoring, anomaly detection, and data Q&A
// See specs/DATA.md for full specification
// Runs parallel with Scout in the Pulse pipeline

import { syncContext } from './sync.js';
import { runMonitors } from './monitor.js';
import { generateBrief } from './brief.js';

export async function run(config, state) {
  const dataConfig = config.data || {};
  if (!dataConfig.enabled) {
    console.log('[DataAgent] Disabled in config');
    return {
      kpis: [],
      anomalies: [],
      schema_changes: [],
      brief: [],
      stats: { total_sources: 0, total_tables: 0, kpis_tracked: 0, anomalies_detected: 0 },
    };
  }

  // Initialize data state if needed
  if (!state.data) state.data = {};
  const dataState = state.data;

  // 1. Sync context (refresh schema metadata from all sources)
  let syncResult = { sourcesChecked: 0, totalTables: 0, changes: [] };
  if (dataConfig.sync_on_pulse !== false) {
    try {
      syncResult = await syncContext(dataConfig, dataState);
    } catch (err) {
      console.error(`[DataAgent] Sync failed: ${err.message}`);
    }
  }

  // 2. Run monitors (execute KPI queries, detect anomalies)
  let monitorResult = { kpis: [], anomalies: [] };
  if (dataConfig.monitor?.enabled !== false) {
    try {
      monitorResult = await runMonitors(dataConfig, dataState);
    } catch (err) {
      console.error(`[DataAgent] Monitor failed: ${err.message}`);
    }
  }

  // 3. Generate briefing section for Focus
  const brief = generateBrief(monitorResult, syncResult);

  return {
    kpis: monitorResult.kpis,
    anomalies: monitorResult.anomalies,
    schema_changes: syncResult.changes,
    brief,
    stats: {
      total_sources: syncResult.sourcesChecked,
      total_tables: syncResult.totalTables,
      kpis_tracked: monitorResult.kpis.length,
      anomalies_detected: monitorResult.anomalies.length,
    },
  };
}
