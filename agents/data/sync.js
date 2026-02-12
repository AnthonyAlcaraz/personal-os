// Context Sync — introspects databases and generates Markdown context files
// Follows nao's file-system-as-context pattern: no vector DB, just Markdown

import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync, rmSync } from 'fs';
import { resolve, join } from 'path';
import Handlebars from 'handlebars';
import { DatabaseClient } from '../../integrations/database/client.js';
import { loadDataSources } from '../../config/loader.js';

const ROOT = resolve(import.meta.dirname, '../..');
const CONTEXT_DIR = resolve(ROOT, 'data', 'context', 'databases');
const TEMPLATES_DIR = resolve(ROOT, 'data', 'templates', 'databases');

// Register Handlebars helpers
Handlebars.registerHelper('json', (obj) => JSON.stringify(obj));
Handlebars.registerHelper('length', (arr) => Array.isArray(arr) ? arr.length : 0);

function loadTemplates() {
  const templates = {};
  const files = readdirSync(TEMPLATES_DIR).filter(f => f.endsWith('.hbs'));
  for (const file of files) {
    const name = file.replace('.hbs', '');
    const source = readFileSync(join(TEMPLATES_DIR, file), 'utf8');
    templates[name] = Handlebars.compile(source);
  }
  return templates;
}

function buildContextPath(dbConfig, schemaName, tableName) {
  return join(
    CONTEXT_DIR,
    `type=${dbConfig.type}`,
    `database=${dbConfig.name}`,
    `schema=${schemaName}`,
    `table=${tableName}`
  );
}

function writeIfChanged(dir, fileName, content) {
  mkdirSync(dir, { recursive: true });
  const filePath = join(dir, fileName);
  if (existsSync(filePath)) {
    const existing = readFileSync(filePath, 'utf8');
    if (existing === content) return false;
  }
  writeFileSync(filePath, content);
  return true;
}

function cleanStaleContext(activePaths) {
  // Remove context directories that no longer correspond to active sources
  if (!existsSync(CONTEXT_DIR)) return;
  const activeSet = new Set(activePaths);

  function walkAndClean(dir, depth = 0) {
    if (!existsSync(dir)) return;
    const entries = readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.isDirectory()) {
        const fullPath = join(dir, entry.name);
        if (depth >= 3 && !activeSet.has(fullPath)) {
          // This is a table-level directory not in active set — remove it
          rmSync(fullPath, { recursive: true, force: true });
        } else {
          walkAndClean(fullPath, depth + 1);
        }
      }
    }
    // Remove empty parent dirs
    const remaining = readdirSync(dir);
    if (remaining.length === 0 && dir !== CONTEXT_DIR) {
      rmSync(dir, { recursive: true, force: true });
    }
  }

  walkAndClean(CONTEXT_DIR);
}

export async function syncContext(dataConfig, dataState) {
  const sources = loadDataSources();
  const databases = sources.databases || [];

  if (databases.length === 0) {
    return { sourcesChecked: 0, totalTables: 0, changes: [] };
  }

  // Check if we should skip sync (within interval window)
  const syncInterval = (dataConfig?.sync_interval_hours || 6) * 3600 * 1000;
  const lastSync = dataState?.last_sync ? new Date(dataState.last_sync).getTime() : 0;
  if (Date.now() - lastSync < syncInterval && !dataConfig?.force_sync) {
    console.log('[DataAgent] Skipping sync — within interval window');
    return { sourcesChecked: 0, totalTables: 0, changes: [], skipped: true };
  }

  const templates = loadTemplates();
  const changes = [];
  const activePaths = [];
  let totalTables = 0;

  for (const dbConfig of databases) {
    console.log(`[DataAgent] Syncing ${dbConfig.name} (${dbConfig.type})...`);
    const client = new DatabaseClient(dbConfig);

    let introspection;
    try {
      introspection = await client.introspect();
    } catch (err) {
      console.error(`[DataAgent] Failed to introspect ${dbConfig.name}: ${err.message}`);
      continue;
    }

    for (const schema of introspection.schemas) {
      for (const table of schema.tables) {
        totalTables++;
        const contextDir = buildContextPath(dbConfig, schema.name, table.name);
        activePaths.push(contextDir);

        const templateContext = {
          db: dbConfig,
          schema: { name: schema.name },
          table: {
            name: table.name,
            columns: table.columns,
            row_count: table.row_count,
            column_count: table.column_count || table.columns.length,
            preview: table.preview || [],
            description: table.description || null,
          },
        };

        let changed = false;
        for (const [templateName, templateFn] of Object.entries(templates)) {
          const rendered = templateFn(templateContext);
          const didChange = writeIfChanged(contextDir, templateName, rendered);
          if (didChange) changed = true;
        }

        if (changed) {
          changes.push({
            db: dbConfig.name,
            schema: schema.name,
            table: table.name,
          });
        }
      }
    }
  }

  // Clean up stale context from removed sources/tables
  cleanStaleContext(activePaths);

  // Update state
  if (dataState) {
    dataState.last_sync = new Date().toISOString();
  }

  console.log(`[DataAgent] Sync complete: ${databases.length} sources, ${totalTables} tables, ${changes.length} changes`);
  return { sourcesChecked: databases.length, totalTables, changes };
}
