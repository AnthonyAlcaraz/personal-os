// Focus Agent — Priority filter and briefing generator
// See specs/FOCUS.md for full specification

export async function run(config, state, scoutResult, horizonResult) {
  // TODO: Implement
  // 1. Merge scout + horizon outputs
  // 2. Apply priority matrix (urgency x importance)
  // 3. Generate numbered action list
  // 4. Render briefing (terminal + HTML)
  // 5. Update continuity tracker
  return {
    action_list: [],
    briefing: { terminal: '', html: '', audio_script: '' },
    continuity: { new: 0, carried_forward: 0, completed: 0, escalated: 0 }
  };
}
