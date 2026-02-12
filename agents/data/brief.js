// Brief Generator — produces structured sections for Focus agent

/**
 * Generate briefing sections from monitor and sync results.
 * Returns an array of sections that Focus merges into the final briefing.
 */
export function generateBrief(monitorResult, syncResult) {
  const sections = [];

  // Anomalies are urgent
  if (monitorResult.anomalies.length > 0) {
    sections.push({
      priority: 'urgent',
      category: 'data',
      title: 'Data Anomalies',
      items: monitorResult.anomalies.map(a => {
        const change = a.change_pct !== null
          ? ` (${a.change_pct > 0 ? '+' : ''}${a.change_pct.toFixed(1)}% vs last pulse)`
          : '';
        return `[${a.severity.toUpperCase()}] ${a.source}.${a.name} = ${a.value}${change} — triggered: ${a.alert_rule}`;
      }),
    });
  }

  // KPI summary is informational
  if (monitorResult.kpis.length > 0) {
    const healthyKpis = monitorResult.kpis.filter(k => !k.error);
    if (healthyKpis.length > 0) {
      sections.push({
        priority: 'fyi',
        category: 'data',
        title: 'KPI Summary',
        items: healthyKpis.map(k => {
          const change = k.change_pct !== null
            ? ` (${k.change_pct > 0 ? '+' : ''}${k.change_pct.toFixed(1)}%)`
            : '';
          return `${k.name}: ${k.value}${change}`;
        }),
      });
    }

    // Errors get flagged separately
    const errorKpis = monitorResult.kpis.filter(k => k.error);
    if (errorKpis.length > 0) {
      sections.push({
        priority: 'action',
        category: 'data',
        title: 'Monitor Errors',
        items: errorKpis.map(k => `${k.source}.${k.name}: ${k.error}`),
      });
    }
  }

  // Schema changes
  if (syncResult.changes && syncResult.changes.length > 0) {
    sections.push({
      priority: 'fyi',
      category: 'data',
      title: 'Schema Changes',
      items: syncResult.changes.map(c => `${c.db}.${c.schema}.${c.table} — context updated`),
    });
  }

  return sections;
}
