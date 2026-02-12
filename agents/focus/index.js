// Focus Agent — Priority filter and briefing generator
// See specs/FOCUS.md for full specification

export async function run(config, state, scoutResult, horizonResult, dataResult) {
  // TODO: Implement full priority matrix
  // 1. Merge scout + horizon + data outputs
  // 2. Apply priority matrix (urgency x importance)
  // 3. Generate numbered action list
  // 4. Render briefing (terminal + HTML)
  // 5. Update continuity tracker

  const actionList = [];
  const briefingSections = [];

  // Merge DataAgent anomalies as action items
  if (dataResult && dataResult.anomalies) {
    for (const anomaly of dataResult.anomalies) {
      actionList.push({
        priority: anomaly.severity === 'high' ? 'urgent' : 'action',
        category: 'data',
        title: `[DATA] ${anomaly.name}: ${anomaly.alert_rule}`,
        detail: `${anomaly.source}.${anomaly.name} = ${anomaly.value}${anomaly.previous !== null ? ` (was ${anomaly.previous})` : ''}`,
        source: 'data-agent',
      });
    }
  }

  // Merge DataAgent briefing sections
  if (dataResult && dataResult.brief) {
    briefingSections.push(...dataResult.brief);
  }

  // Build terminal briefing
  let terminalOutput = '';
  if (briefingSections.length > 0) {
    for (const section of briefingSections) {
      terminalOutput += `\n[${section.priority.toUpperCase()}] ${section.title}\n`;
      for (const item of section.items) {
        terminalOutput += `  - ${item}\n`;
      }
    }
  }

  return {
    action_list: actionList,
    briefing: {
      terminal: terminalOutput || '(no briefing items)',
      html: '',
      audio_script: '',
    },
    continuity: { new: 0, carried_forward: 0, completed: 0, escalated: 0 },
  };
}
