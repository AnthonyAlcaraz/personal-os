// DataAgent Tools — file-system-as-context operations
// Mirrors nao's tool interface: list, read, grep, execute_sql

import { readdirSync, readFileSync, existsSync, statSync } from 'fs';
import { resolve, join, relative } from 'path';
import { DatabaseClient } from '../../integrations/database/client.js';
import { loadDataSources } from '../../config/loader.js';

const ROOT = resolve(import.meta.dirname, '../..');
const CONTEXT_ROOT = resolve(ROOT, 'data', 'context');

/**
 * List contents of a context directory.
 * Returns directory names and file names at the given path.
 */
export function listContext(subPath = '') {
  const fullPath = resolve(CONTEXT_ROOT, subPath);

  // Security: prevent path traversal
  if (!fullPath.startsWith(CONTEXT_ROOT)) {
    throw new Error('Path traversal not allowed');
  }

  if (!existsSync(fullPath)) return { path: subPath, entries: [] };

  const entries = readdirSync(fullPath, { withFileTypes: true }).map(entry => ({
    name: entry.name,
    type: entry.isDirectory() ? 'directory' : 'file',
  }));

  return { path: subPath, entries };
}

/**
 * Read a specific context file.
 */
export function readContext(filePath) {
  const fullPath = resolve(CONTEXT_ROOT, filePath);

  if (!fullPath.startsWith(CONTEXT_ROOT)) {
    throw new Error('Path traversal not allowed');
  }

  if (!existsSync(fullPath)) {
    throw new Error(`File not found: ${filePath}`);
  }

  return readFileSync(fullPath, 'utf8');
}

/**
 * Search across context files for a text pattern.
 * Returns matching file paths and lines.
 */
export function grepContext(pattern, subPath = '') {
  const searchRoot = resolve(CONTEXT_ROOT, subPath);

  if (!searchRoot.startsWith(CONTEXT_ROOT)) {
    throw new Error('Path traversal not allowed');
  }

  if (!existsSync(searchRoot)) return [];

  const regex = new RegExp(pattern, 'gi');
  const results = [];

  function walkDir(dir) {
    const entries = readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = join(dir, entry.name);
      if (entry.isDirectory()) {
        walkDir(fullPath);
      } else if (entry.isFile() && entry.name.endsWith('.md')) {
        const content = readFileSync(fullPath, 'utf8');
        const lines = content.split('\n');
        const matches = [];
        for (let i = 0; i < lines.length; i++) {
          if (regex.test(lines[i])) {
            matches.push({ line: i + 1, text: lines[i].trim() });
            regex.lastIndex = 0; // reset global regex
          }
        }
        if (matches.length > 0) {
          results.push({
            file: relative(CONTEXT_ROOT, fullPath),
            matches,
          });
        }
      }
    }
  }

  walkDir(searchRoot);
  return results;
}

/**
 * Execute SQL against a named data source.
 */
export async function executeSql(sourceName, sql) {
  const sources = loadDataSources();
  const dbConfig = (sources.databases || []).find(d => d.name === sourceName);

  if (!dbConfig) {
    throw new Error(`Data source not found: ${sourceName}. Available: ${(sources.databases || []).map(d => d.name).join(', ')}`);
  }

  const client = new DatabaseClient(dbConfig);
  return client.executeSQL(sql);
}

/**
 * List available data sources.
 */
export function listSources() {
  const sources = loadDataSources();
  return (sources.databases || []).map(d => ({
    name: d.name,
    type: d.type,
  }));
}

/**
 * Find context files relevant to a natural language question.
 * Searches column names, table names, and descriptions.
 */
export function findRelevantContext(question) {
  // Extract likely table/column names from the question
  const words = question.toLowerCase().split(/\s+/).filter(w => w.length > 2);
  const allResults = [];

  for (const word of words) {
    const matches = grepContext(word);
    for (const match of matches) {
      if (!allResults.find(r => r.file === match.file)) {
        allResults.push(match);
      }
    }
  }

  return allResults;
}
