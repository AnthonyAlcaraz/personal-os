// Config Loader — loads YAML config with {{ env('VAR') }} interpolation

import { readFileSync, existsSync, mkdirSync, writeFileSync } from 'fs';
import { resolve } from 'path';
import yaml from 'js-yaml';

const ROOT = resolve(import.meta.dirname, '..');

/**
 * Interpolate {{ env('VAR_NAME') }} patterns with process.env values.
 */
function interpolateEnv(text) {
  return text.replace(/\{\{\s*env\(['"](\w+)['"]\)\s*\}\}/g, (match, varName) => {
    const value = process.env[varName];
    if (value === undefined) {
      console.warn(`[Config] Warning: env var ${varName} is not set`);
      return '';
    }
    return value;
  });
}

/**
 * Load and parse a YAML file with env interpolation.
 */
function loadYaml(filePath) {
  if (!existsSync(filePath)) {
    throw new Error(`Config file not found: ${filePath}`);
  }
  const raw = readFileSync(filePath, 'utf8');
  const interpolated = interpolateEnv(raw);
  return yaml.load(interpolated);
}

/**
 * Load main config.yaml (with local override support).
 */
export function loadConfig() {
  const localPath = resolve(ROOT, 'config', 'config.local.yaml');
  const defaultPath = resolve(ROOT, 'config', 'config.yaml');
  const configPath = existsSync(localPath) ? localPath : defaultPath;
  return loadYaml(configPath);
}

/**
 * Load data-sources.yaml with env interpolation.
 */
export function loadDataSources() {
  const filePath = resolve(ROOT, 'config', 'data-sources.yaml');
  return loadYaml(filePath);
}

/**
 * Load data-rules.md as plain text (injected into agent prompts).
 */
export function loadDataRules() {
  const filePath = resolve(ROOT, 'config', 'data-rules.md');
  if (!existsSync(filePath)) return '';
  return readFileSync(filePath, 'utf8');
}

/**
 * Load and save pulse state.
 */
const STATE_PATH = resolve(ROOT, 'state', 'last_pulse_state.json');

export function loadState() {
  if (!existsSync(STATE_PATH)) return {};
  return JSON.parse(readFileSync(STATE_PATH, 'utf8'));
}

export function saveState(state) {
  const dir = resolve(ROOT, 'state');
  mkdirSync(dir, { recursive: true });
  writeFileSync(STATE_PATH, JSON.stringify(state, null, 2));
}
