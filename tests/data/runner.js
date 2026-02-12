#!/usr/bin/env node
// DataAgent Test Runner — YAML test cases (prompt -> expected SQL)
// Usage: node tests/data/runner.js

import { readdirSync, readFileSync } from 'fs';
import { resolve, join } from 'path';
import yaml from 'js-yaml';
import { answerQuestion } from '../../agents/data/answer.js';
import { loadConfig } from '../../config/loader.js';

const TESTS_DIR = resolve(import.meta.dirname, 'cases');
const config = loadConfig();

function normalizeSql(sql) {
  if (!sql) return '';
  return sql.trim().replace(/\s+/g, ' ').toLowerCase().replace(/;$/, '');
}

async function runTests() {
  let files;
  try {
    files = readdirSync(TESTS_DIR).filter(f => f.endsWith('.yml') || f.endsWith('.yaml'));
  } catch {
    console.error(`No test cases found in ${TESTS_DIR}`);
    console.log('Create .yml files with: name, prompt, source, sql fields');
    process.exit(1);
  }

  if (files.length === 0) {
    console.log('No test cases found.');
    process.exit(0);
  }

  console.log(`Running ${files.length} test case(s)...\n`);
  const results = [];

  for (const file of files) {
    const testCase = yaml.load(readFileSync(join(TESTS_DIR, file), 'utf8'));
    const name = testCase.name || file;
    process.stdout.write(`  ${name}... `);

    const startTime = Date.now();
    let answer;
    try {
      answer = await answerQuestion(testCase.prompt, config.data);
    } catch (err) {
      console.log('ERROR');
      results.push({ name, passed: false, error: err.message, file, duration: Date.now() - startTime });
      continue;
    }
    const duration = Date.now() - startTime;

    if (answer.error) {
      console.log(`FAIL (${answer.error})`);
      results.push({ name, passed: false, error: answer.error, file, duration });
      continue;
    }

    // Compare SQL (normalized)
    const expectedSql = normalizeSql(testCase.sql);
    const actualSql = normalizeSql(answer.sql);
    const sqlMatch = expectedSql === actualSql;

    // Check source matches if specified
    const sourceMatch = !testCase.source || answer.source === testCase.source;

    const passed = sqlMatch && sourceMatch;

    if (passed) {
      console.log(`PASS (${duration}ms)`);
    } else {
      console.log('FAIL');
      if (!sqlMatch) {
        console.log(`    Expected SQL: ${testCase.sql.trim()}`);
        console.log(`    Actual SQL:   ${answer.sql}`);
      }
      if (!sourceMatch) {
        console.log(`    Expected source: ${testCase.source}`);
        console.log(`    Actual source:   ${answer.source}`);
      }
    }

    results.push({
      name,
      passed,
      expected_sql: testCase.sql,
      actual_sql: answer.sql,
      expected_source: testCase.source,
      actual_source: answer.source,
      file,
      duration,
    });
  }

  // Summary
  const pass = results.filter(r => r.passed).length;
  const fail = results.length - pass;
  console.log(`\n${pass}/${results.length} passed${fail > 0 ? `, ${fail} failed` : ''}`);

  process.exit(fail > 0 ? 1 : 0);
}

runTests().catch(err => {
  console.error(err);
  process.exit(1);
});
