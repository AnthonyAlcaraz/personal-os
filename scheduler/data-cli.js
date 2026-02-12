#!/usr/bin/env node
// DataAgent CLI — interactive data Q&A outside of the Pulse cycle
// Usage: node scheduler/data-cli.js

import readline from 'readline';
import { answerQuestion } from '../agents/data/answer.js';
import { loadConfig } from '../config/loader.js';
import { listSources } from '../agents/data/tools.js';

const config = loadConfig();

console.log('DataAgent CLI — ask questions about your data');
console.log('Commands: "exit" to quit, "sources" to list data sources\n');

const sources = listSources();
if (sources.length === 0) {
  console.log('Warning: No data sources configured. Edit config/data-sources.yaml to add databases.\n');
} else {
  console.log(`Connected sources: ${sources.map(s => `${s.name} (${s.type})`).join(', ')}\n`);
}

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function prompt() {
  rl.question('data> ', async (input) => {
    const trimmed = input.trim();

    if (!trimmed) { prompt(); return; }
    if (trimmed === 'exit' || trimmed === 'quit') { rl.close(); return; }

    if (trimmed === 'sources') {
      const s = listSources();
      if (s.length === 0) {
        console.log('No data sources configured.\n');
      } else {
        for (const src of s) console.log(`  ${src.name} (${src.type})`);
        console.log();
      }
      prompt();
      return;
    }

    try {
      console.log('Thinking...\n');
      const result = await answerQuestion(trimmed, config.data);

      if (result.error) {
        console.error(`Error: ${result.error}\n`);
      } else {
        if (result.sql) console.log(`SQL: ${result.sql}\n`);
        if (result.results && result.results.length > 0) {
          console.table(result.results.slice(0, 20));
          if (result.truncated) console.log(`(showing ${result.results.length} of ${result.total_rows} rows)`);
        }
        if (result.explanation) console.log(`\n${result.explanation}\n`);
      }
    } catch (err) {
      console.error(`Error: ${err.message}\n`);
    }

    prompt();
  });
}

prompt();
