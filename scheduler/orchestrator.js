// Personal OS Orchestrator
// Runs the Scout → Horizon → Focus pipeline

import { run as runScout } from '../agents/scout/index.js';
import { run as runHorizon } from '../agents/horizon/index.js';
import { run as runFocus } from '../agents/focus/index.js';

async function pulse() {
  console.log(`[Personal OS] Pulse started at ${new Date().toISOString()}`);

  // TODO: Load config and state
  const config = {};
  const state = {};

  // Pipeline: Scout → Horizon → Focus
  const scoutResult = await runScout(config, state);
  console.log(`[Scout] ${scoutResult.stats.total_messages} messages processed`);

  const horizonResult = await runHorizon(config, state, scoutResult);
  console.log(`[Horizon] ${horizonResult.stats.total_meetings} meetings prepared`);

  const focusResult = await runFocus(config, state, scoutResult, horizonResult);
  console.log(`[Focus] ${focusResult.action_list.length} action items`);

  // Output briefing
  console.log(focusResult.briefing.terminal);

  // TODO: Save state for next pulse
  console.log(`[Personal OS] Pulse complete`);
}

pulse().catch(console.error);
