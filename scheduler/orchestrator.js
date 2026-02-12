// Personal OS Orchestrator — AWS Account Team Edition
// 4-phase parallel pipeline with sales agents

import { run as runScout } from '../agents/scout/index.js';
import { run as runHorizon } from '../agents/horizon/index.js';
import { run as runData } from '../agents/data/index.js';
import { run as runSalesIntel } from '../agents/sales-intel/index.js';
import { run as runOutreach } from '../agents/outreach/index.js';
import { run as runDealAccel } from '../agents/deal-accel/index.js';
import { run as runFocus } from '../agents/focus/index.js';
import { loadConfig, loadState, saveState } from '../config/loader.js';

async function pulse() {
  console.log(`[Personal OS] Pulse started at ${new Date().toISOString()}`);

  const config = loadConfig();
  const state = loadState();

  // Phase 1: Scout + DataAgent + SalesIntel run in parallel (no dependencies)
  const [scoutResult, dataResult, salesIntelResult] = await Promise.all([
    runScout(config, state),
    runData(config, state),
    runSalesIntel(config, state),
  ]);

  console.log(`[Scout] ${scoutResult.stats.total_messages} messages processed`);
  console.log(`[Data] ${dataResult.stats.total_sources} sources, ${dataResult.stats.anomalies_detected} anomalies`);
  console.log(`[SalesIntel] ${salesIntelResult.stats.leads_enriched} leads enriched, ${salesIntelResult.stats.signals_detected} signals`);

  // Phase 2: Horizon + Outreach run in parallel
  // Horizon depends on Scout, Outreach depends on SalesIntel
  const [horizonResult, outreachResult] = await Promise.all([
    runHorizon(config, state, scoutResult),
    runOutreach(config, state, salesIntelResult),
  ]);

  console.log(`[Horizon] ${horizonResult.stats.total_meetings} meetings prepared`);
  console.log(`[Outreach] ${outreachResult.stats.drafts_generated} drafts, ${outreachResult.stats.followups_generated} follow-ups`);

  // Phase 3: DealAccel depends on Horizon + SalesIntel
  const dealAccelResult = await runDealAccel(config, state, horizonResult, salesIntelResult);
  console.log(`[DealAccel] ${dealAccelResult.stats.deals_scored} deals scored, ${dealAccelResult.stats.at_risk_deals} at risk`);

  // Phase 4: Focus merges all signals
  const focusResult = await runFocus(
    config, state,
    scoutResult, horizonResult, dataResult,
    salesIntelResult, outreachResult, dealAccelResult
  );
  console.log(`[Focus] ${focusResult.action_list.length} action items`);

  // Output briefing
  console.log(focusResult.briefing.terminal);

  // Save state for next pulse
  saveState(state);
  console.log(`[Personal OS] Pulse complete`);
}

pulse().catch(console.error);
