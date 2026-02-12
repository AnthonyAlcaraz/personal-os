// Database Client — Node.js wrapper around Python Ibis sidecar
// Provides unified interface to 7 database backends

import { execFile } from 'child_process';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SIDECAR_PATH = resolve(__dirname, 'sidecar.py');
const PYTHON = process.env.PYTHON_PATH || (process.platform === 'win32' ? 'py' : 'python3');

export class DatabaseClient {
  constructor(dbConfig) {
    this.config = dbConfig;
  }

  async introspect() {
    return this._call('introspect', this.config);
  }

  async executeSQL(sql) {
    return this._call('query', { config: this.config, sql });
  }

  async testConnection() {
    return this._call('test-connection', this.config);
  }

  _call(command, payload) {
    return new Promise((resolve, reject) => {
      const input = JSON.stringify(payload);
      const proc = execFile(PYTHON, [SIDECAR_PATH, command], {
        timeout: 60000,
        maxBuffer: 10 * 1024 * 1024, // 10MB
        cwd: process.cwd(),
      }, (error, stdout, stderr) => {
        if (error) {
          const msg = stderr?.trim() || error.message;
          return reject(new Error(`Sidecar ${command} failed: ${msg}`));
        }
        try {
          resolve(JSON.parse(stdout));
        } catch (e) {
          reject(new Error(`Invalid JSON from sidecar: ${stdout.slice(0, 500)}`));
        }
      });

      proc.stdin.write(input);
      proc.stdin.end();
    });
  }
}
