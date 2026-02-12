// Answer Engine — natural language to SQL pipeline
// Reads context files, builds prompt, calls Claude, executes SQL

import { findRelevantContext, readContext, listSources, executeSql, listContext } from './tools.js';
import { loadDataRules } from '../../config/loader.js';

/**
 * Build a system prompt with schema context and business rules.
 */
function buildSystemPrompt(relevantFiles, rules, sources) {
  let prompt = `You are a data analyst agent. Answer questions by writing SQL.

## Available Data Sources
${sources.map(s => `- **${s.name}** (${s.type})`).join('\n')}

## Business Rules
${rules}

## Schema Context
The following schema information is available:

`;

  for (const file of relevantFiles) {
    try {
      const content = readContext(file.file);
      prompt += `### ${file.file}\n${content}\n\n`;
    } catch {
      // Skip unreadable files
    }
  }

  prompt += `
## Instructions
1. Identify which data source to query
2. Write a single SQL query that answers the question
3. Return your answer in this exact JSON format:
{"source": "<source_name>", "sql": "<your SQL query>", "explanation": "<brief explanation of what the query does>"}

Only return the JSON. No markdown fences, no extra text.`;

  return prompt;
}

/**
 * Answer a natural language data question.
 * This is the core pipeline: context lookup → prompt → Claude → SQL → execute → format.
 *
 * Note: Requires ANTHROPIC_API_KEY environment variable or Claude Code SDK.
 * For the initial version, we extract SQL generation as a pluggable step
 * so it can be called from Claude Code sessions or via API.
 */
export async function answerQuestion(question, dataConfig) {
  // 1. Find relevant context files
  const relevantFiles = findRelevantContext(question);

  if (relevantFiles.length === 0) {
    // Broaden search: list all context to give the model something
    const root = listContext('databases');
    if (root.entries.length === 0) {
      return {
        question,
        sql: null,
        results: null,
        explanation: 'No data context available. Run sync first.',
        error: 'No context files found. Run the DataAgent sync first.',
      };
    }
  }

  // 2. Build prompt
  const rules = loadDataRules();
  const sources = listSources();
  const systemPrompt = buildSystemPrompt(relevantFiles, rules, sources);

  // 3. Call Claude to generate SQL
  // Uses the Anthropic SDK directly for standalone CLI usage
  let sqlResponse;
  try {
    const { default: Anthropic } = await import('@anthropic-ai/sdk');
    const client = new Anthropic();

    const response = await client.messages.create({
      model: 'claude-sonnet-4-5-20250929',
      max_tokens: 1024,
      system: systemPrompt,
      messages: [{ role: 'user', content: question }],
    });

    const text = response.content[0].text.trim();
    sqlResponse = JSON.parse(text);
  } catch (err) {
    return {
      question,
      sql: null,
      results: null,
      explanation: null,
      error: `SQL generation failed: ${err.message}`,
    };
  }

  // 4. Execute SQL
  let results;
  try {
    results = await executeSql(sqlResponse.source, sqlResponse.sql);
  } catch (err) {
    return {
      question,
      sql: sqlResponse.sql,
      source: sqlResponse.source,
      results: null,
      explanation: sqlResponse.explanation,
      error: `SQL execution failed: ${err.message}`,
    };
  }

  // 5. Truncate results if too many rows
  const maxResults = dataConfig?.cli?.max_results || 100;
  const truncated = results.length > maxResults;
  if (truncated) results = results.slice(0, maxResults);

  return {
    question,
    source: sqlResponse.source,
    sql: sqlResponse.sql,
    results,
    explanation: sqlResponse.explanation,
    truncated,
    total_rows: truncated ? `${maxResults}+ (truncated)` : results.length,
  };
}
