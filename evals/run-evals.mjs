#!/usr/bin/env node
/**
 * Behavior evals for the four owner-facing promises.
 *
 * Run:  node evals/run-evals.mjs [--only <id>] [--dry-run] [--out <dir>] [--model <name>]
 *       node evals/run-evals.mjs --dry-run     # validate scenarios and print the commands only
 *
 * Only Claude Code is measured: each turn spawns `claude -p --plugin-dir <repo>` in a temp folder.
 * Every real run spends account quota and can take 30 minutes or more across the four scenarios.
 * Results land in evals/.results/<id>.json and are never committed.
 */

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { evaluate, listHtmlPages } from './lib/assertions.mjs';
import { parseStream } from './lib/parse-stream.mjs';
import { makeRealSite } from '../tests/helpers/real-site.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.dirname(__dirname);
const scenariosDir = path.join(__dirname, 'scenarios');
const DEFAULT_OUT = path.join(__dirname, '.results');
const SENSITIVE_ENV = [
  'CLOUDFLARE_API_TOKEN',
  'CLOUDFLARE_ACCOUNT_ID',
  'VERCEL_TOKEN',
  'NETLIFY_AUTH_TOKEN',
  'GH_TOKEN',
  'GITHUB_TOKEN',
];
const TURN_TIMEOUT_MS = 20 * 60 * 1000;
const MAX_BUFFER = 256 * 1024 * 1024;

const USAGE = `Usage: node evals/run-evals.mjs [options]

Runs the four behavior evals against Claude Code and writes evals/.results/<id>.json.

Options:
  --only <id>     Run a single scenario id (for example 01-one-question)
  --dry-run       Validate the scenarios and print the commands; calls nothing
  --out <dir>     Result folder (default: evals/.results)
  --model <name>  Pass a model name to claude
  -h, --help      Show this help message

Exit codes: 0 all run scenarios PASS, 1 any FAIL/INCONCLUSIVE/ERROR, 2 bad flag or missing claude.`;

function parseArgs(argv) {
  const opts = { only: null, dryRun: false, out: DEFAULT_OUT, model: null, help: false };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '-h' || arg === '--help') opts.help = true;
    else if (arg === '--dry-run') opts.dryRun = true;
    else if (arg === '--only' || arg === '--out' || arg === '--model') {
      const value = argv[i + 1];
      if (!value || value.startsWith('--')) return { error: `${arg} needs a value` };
      if (arg === '--only') opts.only = value;
      else if (arg === '--out') opts.out = path.resolve(value);
      else opts.model = value;
      i += 1;
    } else {
      return { error: `unknown option: ${arg}` };
    }
  }
  return opts;
}

function loadScenarios() {
  return fs
    .readdirSync(scenariosDir)
    .filter((name) => name.endsWith('.json'))
    .sort()
    .map((name) => {
      const scenario = JSON.parse(fs.readFileSync(path.join(scenariosDir, name), 'utf8'));
      if (`${scenario.id}.json` !== name) throw new Error(`scenario id mismatch: ${name}`);
      return scenario;
    });
}

function safeEnv() {
  const env = { ...process.env };
  for (const key of SENSITIVE_ENV) delete env[key];
  return env;
}

function claudeVersion() {
  const res = spawnSync('claude', ['--version'], { encoding: 'utf8' });
  return res.status === 0 ? res.stdout.trim() : 'unknown';
}

function claudeArgs(scenario, prompt, { sessionId, model }) {
  const args = [
    '-p',
    prompt,
    '--plugin-dir',
    repoRoot,
    '--output-format',
    'stream-json',
    '--verbose',
    '--permission-mode',
    scenario.permissionMode,
  ];
  if (scenario.allowedTools?.length) args.push('--allowedTools', ...scenario.allowedTools);
  if (sessionId) args.push('--resume', sessionId);
  if (model) args.push('--model', model);
  return args;
}

function shellQuote(value) {
  return /^[\w./:=@-]+$/.test(value) ? value : `'${String(value).replace(/'/g, "'\\''")}'`;
}

function describeCommand(args) {
  return ['claude', ...args].map(shellQuote).join(' ');
}

function failedSkillOrRead(denials) {
  return (denials ?? []).find((denial) => denial.tool_name === 'Skill' || denial.tool_name === 'Read');
}

function scriptCalls(toolCalls, toolErrors) {
  return toolCalls
    .filter((call) => call.name === 'Bash' && String(call.input?.command ?? '').includes('scripts/'))
    .map((call) => ({
      command: String(call.input.command).slice(0, 300),
      failed: toolErrors[call.id] === true,
    }));
}

function writeResult(outDir, scenario, payload) {
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(path.join(outDir, `${scenario.id}.json`), `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
}

function runScenario(scenario, opts) {
  const workDir = fs.mkdtempSync(path.join(os.tmpdir(), `tqd-eval-${scenario.id}-`));
  if (scenario.fixture === 'real-site') makeRealSite(workDir);

  const env = safeEnv();
  const toolCalls = [];
  const denials = [];
  let toolErrors = {};
  let result = '';
  let sessionId = null;
  let turns = 0;
  let measurementError = null;

  const runTurn = (prompt) => {
    turns += 1;
    const args = claudeArgs(scenario, prompt, { sessionId, model: opts.model });
    const res = spawnSync('claude', args, {
      cwd: workDir,
      env,
      encoding: 'utf8',
      timeout: TURN_TIMEOUT_MS,
      maxBuffer: MAX_BUFFER,
    });
    if (res.error) {
      measurementError = `claude failed to run: ${res.error.message}`;
      return null;
    }
    if (res.status !== 0) {
      measurementError = `claude exited ${res.status}: ${String(res.stderr ?? '').trim().slice(-300)}`;
      return null;
    }

    const parsed = parseStream(res.stdout);
    if (!parsed.hasResult) measurementError = 'stream has no result event';
    else if (parsed.isError) measurementError = 'result event has is_error=true';
    else {
      const blocked = failedSkillOrRead(parsed.denials);
      if (blocked) measurementError = `tool ${blocked.tool_name} was denied; the measurement is meaningless`;
    }

    result = parsed.result;
    sessionId = parsed.sessionId ?? sessionId;
    toolCalls.push(...parsed.toolCalls);
    toolErrors = { ...toolErrors, ...parsed.toolErrors };
    denials.push(...parsed.denials);
    return parsed;
  };

  for (const prompt of scenario.turns) {
    if (measurementError) break;
    runTurn(prompt);
  }

  const gate = scenario.continueUntil;
  if (!measurementError && gate) {
    let pages = listHtmlPages(workDir, ['404.html']).length;
    while (pages < gate.htmlPageCountMin && turns < gate.maxTurns) {
      runTurn(gate.prompt);
      if (measurementError) break;
      pages = listHtmlPages(workDir, ['404.html']).length;
    }
    if (!measurementError && pages < gate.htmlPageCountMin) {
      measurementError = null;
      const payload = finish('INCONCLUSIVE', [`only ${pages}/${gate.htmlPageCountMin} HTML pages after ${turns} turn(s)`]);
      return payload;
    }
  }

  if (measurementError) return finish('ERROR', [measurementError]);

  const ctx = { result, toolCalls, denials, workDir };
  const outcomes = scenario.assertions.map((assertion) => ({
    type: assertion.type,
    ...evaluate(assertion, ctx),
  }));
  const firstFailure = outcomes.find((outcome) => !outcome.pass);
  return finish(firstFailure ? 'FAIL' : 'PASS', outcomes, workDir, turns);

  function finish(status, outcomes, dir = workDir, usedTurns = turns) {
    const details = Array.isArray(outcomes) ? outcomes : outcomes.map((text) => ({ type: 'measurement', pass: false, detail: text }));
    const payload = {
      runAt: new Date().toISOString(),
      claudeVersion: opts.claudeVersion,
      model: opts.model ?? '(default)',
      status,
      assertions: details,
      resultTail: result.slice(-600),
      denials,
      workDir: dir,
      turns: usedTurns,
      scriptCalls: scriptCalls(toolCalls, toolErrors),
    };
    writeResult(opts.out, scenario, payload);
    return payload;
  }
}

function main() {
  const parsed = parseArgs(process.argv.slice(2));
  if (parsed.error) {
    console.error(`Error: ${parsed.error}\n\n${USAGE}`);
    return 2;
  }
  if (parsed.help) {
    console.log(USAGE);
    return 0;
  }

  const scenarios = loadScenarios();
  const selected = parsed.only ? scenarios.filter((scenario) => scenario.id === parsed.only) : scenarios;
  if (selected.length === 0) {
    console.error(`Error: no scenario with id "${parsed.only}"`);
    return 2;
  }

  if (parsed.dryRun) {
    for (const scenario of selected) {
      console.log(`# ${scenario.id} (${scenario.fixture}, ${scenario.permissionMode})`);
      console.log(describeCommand(claudeArgs(scenario, scenario.turns[0], { sessionId: null, model: parsed.model })));
    }
    return 0;
  }

  const missing = spawnSync('claude', ['--version'], { encoding: 'utf8' });
  if (missing.error || missing.status !== 0) {
    console.error('Error: the `claude` command is not available; these evals only measure Claude Code.');
    return 2;
  }

  const opts = { ...parsed, claudeVersion: claudeVersion() };
  const rows = [];
  let failed = false;
  for (const scenario of selected) {
    const payload = runScenario(scenario, opts);
    const first = payload.assertions.find((assertion) => !assertion.pass);
    rows.push({ id: scenario.id, status: payload.status, detail: first ? first.detail : 'all assertions passed' });
    if (payload.status !== 'PASS') failed = true;
  }

  const width = Math.max(...rows.map((row) => row.id.length), 4);
  for (const row of rows) console.log(`${row.id.padEnd(width)} | ${row.status.padEnd(12)} | ${row.detail}`);
  console.log(`\nResults: ${parsed.out}`);
  return failed ? 1 : 0;
}

process.exitCode = main();
