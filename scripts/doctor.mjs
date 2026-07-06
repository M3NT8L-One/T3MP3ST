#!/usr/bin/env node
import { access, readFile } from 'node:fs/promises';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import process from 'node:process';

const execFileAsync = promisify(execFile);
const baseUrl = (process.env.T3MP3ST_API_URL || 'http://127.0.0.1:3333').replace(/\/$/, '');
const jsonMode = process.argv.includes('--json');
const strictMode = process.argv.includes('--strict');
const checks = [];
const DEFAULT_API_TIMEOUT_MS = 2500;
// Tool/agent inspection endpoints spawn bounded child probes (up to 8s for an
// agent version); leave room for response overhead without weakening fast checks.
const INSPECTION_API_TIMEOUT_MS = 12_000;

function check(name, passed, detail = '', severity = 'block') {
  checks.push({ name, passed: Boolean(passed), detail, severity });
}

async function fileExists(path) {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

async function commandPath(binary) {
  try {
    const { stdout } = await execFileAsync('which', [binary], { timeout: 1500 });
    return stdout.trim();
  } catch {
    return '';
  }
}

async function apiGet(path, timeoutMs = DEFAULT_API_TIMEOUT_MS) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(`${baseUrl}${path}`, { signal: controller.signal });
    const text = await response.text();
    let data = {};
    try {
      data = text ? JSON.parse(text) : {};
    } catch {
      data = { raw: text };
    }
    return { ok: response.ok, status: response.status, data };
  } finally {
    clearTimeout(timer);
  }
}

function scriptExists(pkg, scriptName) {
  return Boolean(pkg.scripts && pkg.scripts[scriptName]);
}

async function commandOutput(binary, args, timeout = 4000) {
  try {
    const { stdout, stderr } = await execFileAsync(binary, args, { timeout, maxBuffer: 1024 * 1024 });
    return { ok: true, stdout: stdout.trim(), stderr: stderr.trim() };
  } catch (error) {
    return {
      ok: false,
      stdout: String(error.stdout || '').trim(),
      stderr: String(error.stderr || error.message || '').trim(),
    };
  }
}

function truthy(value) {
  return /^(1|true|yes|on)$/i.test(String(value || '').trim());
}

async function readDotEnv(path) {
  const values = {};
  if (!(await fileExists(path))) return values;
  const text = await readFile(path, 'utf8');
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    const eq = line.indexOf('=');
    if (eq <= 0) continue;
    const key = line.slice(0, eq).trim();
    let value = line.slice(eq + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    values[key] = value;
  }
  return values;
}

const firstLine = (text) => String(text || '').split(/\r?\n/).find(Boolean) || '';

function isLoopbackTarget(target) {
  const raw = String(target || '').trim();
  if (!raw) return false;
  const host = raw.replace(/^\[|\]$/g, '');
  if (['localhost', '127.0.0.1', '::1'].includes(host)) return true;
  if (/^127\./.test(host)) return true;
  try {
    const url = new URL(raw);
    const urlHost = url.hostname.replace(/^\[|\]$/g, '');
    return urlHost === 'localhost' || urlHost === '::1' || /^127\./.test(urlHost);
  } catch {
    return false;
  }
}

function missionSummary(status) {
  if (!status?.mission && !status?.active) return status?.lifecycle?.state || 'idle';
  const lifecycle = status.lifecycle || {};
  const mission = status.mission || {};
  const phase = mission.currentPhase || 'unknown-phase';
  const progress = typeof mission.progress === 'number' ? `${Math.round(mission.progress)}%` : 'n/a';
  const operators = status.operators?.summary || {};
  const state = lifecycle.state || (status.active ? 'running' : mission.status || 'idle');
  return `${state} ${phase} ${progress}, tick ${status.tickCount ?? 'n/a'}, ${Number(operators.busy || 0)}/${Number(operators.total || 0)} busy`;
}

async function main() {
  const startedAt = new Date().toISOString();
  const major = Number(process.versions.node.split('.')[0]);
  check('Node runtime is supported', major >= 18, `node ${process.version}`);

  const packageJsonExists = await fileExists('package.json');
  check('package.json exists', packageJsonExists);
  const pkg = packageJsonExists ? JSON.parse(await readFile('package.json', 'utf8')) : {};
  for (const script of ['doctor', 'ops:status', 'ops:preflight', 'server', 'typecheck', 'test', 'arsenal:smoke', 'field:drill', 'exploit:smoke', 'prompt:audit']) {
    check(`npm script: ${script}`, scriptExists(pkg, script), pkg.scripts?.[script] || 'missing');
  }

  const requiredFiles = [
    'README.md',
    'SECURITY.md',
    'CONTRIBUTING.md',
    'docs/index.html',
    'docs/TEAM_PREVIEW.md',
    'docs/ARSENAL_ACTIVATION_PLAN.md',
    'docs/INSTALL_MATRIX.md',
    'docs/SCOPE_AND_AUTHORIZATION.md',
    'examples/demo-missions.json',
    'src/server.ts',
    'dist/mcp-server.js',
    'src/arsenal/catalog.ts',
  ];
  for (const file of requiredFiles) {
    check(`file: ${file}`, await fileExists(file), '', file.startsWith('docs/') || file.startsWith('examples/') ? 'warn' : 'block');
  }

  const commandChecks = [
    ['git', 'required for provenance'],
    ['node', 'required runtime'],
    ['npm', 'required package manager'],
    ['hermes', 'required for Hermes local-agent integration'],
    ['file', 'core evidence tool'],
    ['curl', 'core HTTP tool'],
    ['dig', 'DNS evidence tool'],
    ['whois', 'OSINT evidence tool'],
    ['nmap', 'optional high-value recon'],
    ['nuclei', 'optional high-value scanner'],
    ['semgrep', 'optional supply-chain scanner'],
    ['promptfoo', 'optional AI eval runner'],
  ];
  for (const [binary, detail] of commandChecks) {
    const path = await commandPath(binary);
    const required = ['git', 'node', 'npm', 'hermes', 'file', 'curl'].includes(binary);
    check(`command: ${binary}`, Boolean(path), path || `missing - ${detail}`, required ? 'block' : 'warn');
  }

  const projectEnv = await readDotEnv('.env');
  const hermesProfile = process.env.T3MP3ST_HERMES_PROFILE || projectEnv.T3MP3ST_HERMES_PROFILE || '';
  check(
    'Hermes profile env is t3mp3st',
    hermesProfile === 't3mp3st',
    hermesProfile ? `T3MP3ST_HERMES_PROFILE=${hermesProfile}` : 'missing T3MP3ST_HERMES_PROFILE in .env',
  );
  const yoloSetting = process.env.T3MP3ST_HERMES_YOLO || projectEnv.T3MP3ST_HERMES_YOLO || '';
  check(
    'Hermes yolo env disabled',
    !truthy(yoloSetting),
    yoloSetting ? 'T3MP3ST_HERMES_YOLO is set; unset it for manual approvals' : 'not set',
  );

  if (hermesProfile) {
    const envPath = await commandOutput('hermes', ['--profile', hermesProfile, 'config', 'env-path']);
    check(
      'Hermes profile env file exists',
      envPath.ok && await fileExists(envPath.stdout),
      envPath.ok ? envPath.stdout : envPath.stderr,
    );

    const configPath = await commandOutput('hermes', ['--profile', hermesProfile, 'config', 'path']);
    const configExists = configPath.ok && await fileExists(configPath.stdout);
    check('Hermes profile config exists', configExists, configPath.ok ? configPath.stdout : configPath.stderr);

    if (configExists) {
      const cfgText = await readFile(configPath.stdout, 'utf8');
      const expectedMcp = `${process.cwd()}/dist/mcp-server.js`;
      check(
        'Hermes MCP t3mp3st-recon configured',
        cfgText.includes('t3mp3st-recon:') && cfgText.includes(expectedMcp) && cfgText.includes('security_recon'),
        expectedMcp,
      );
    }

    const configCheck = await commandOutput('hermes', ['--profile', hermesProfile, 'config', 'check'], 8000);
    const configCheckText = `${configCheck.stdout}\n${configCheck.stderr}`;
    check('Hermes profile config check', configCheck.ok, firstLine(configCheckText) || 'config check failed');
    check(
      'Hermes profile config current',
      configCheck.ok && !/update available/i.test(configCheckText),
      firstLine(configCheckText) || 'current',
      'warn',
    );
  }

  let apiReachable = false;
  try {
    const health = await apiGet('/health');
    apiReachable = health.ok;
    check('API health endpoint', health.ok && health.data.status === 'operational', `${health.status} ${health.data.status || 'unknown'}`);
    if (health.ok) {
      check('API exposes mission dispatch', health.data.missionDispatch === true, String(health.data.missionDispatch));
      check('API exposes resources', Number(health.data.resources?.packs || 0) >= 10, `${health.data.resources?.packs || 0} packs`);
      check('API exposes arsenal', Number(health.data.arsenal?.total || 0) >= 40, `${health.data.arsenal?.total || 0} adapters / ${health.data.arsenal?.commandReady || 0} command-ready`);
    }
  } catch (error) {
    check('API health endpoint', false, `offline - run npm run server for live API checks (${error.name || 'error'})`, 'warn');
  }

  if (apiReachable) {
    const preflight = await apiGet('/api/preflight', INSPECTION_API_TIMEOUT_MS);
    check('Capability preflight', preflight.ok && typeof preflight.data.score === 'number', `${preflight.data.score ?? 'n/a'}/100`);
    const arsenal = await apiGet('/api/arsenal/status', INSPECTION_API_TIMEOUT_MS);
    check('Arsenal status', arsenal.ok && arsenal.data.schema_version === 't3mp3st_arsenal_status/v1', `${arsenal.data.summary?.installedCommandReady ?? 0}/${arsenal.data.summary?.commandReady ?? 0} installed`);
    check('Arsenal does not fake empty coverage', arsenal.ok && arsenal.data.summary?.unmodeled === false, `unmodeled=${arsenal.data.summary?.unmodeled}`);
    const activation = await apiGet('/api/arsenal/activation');
    check('Arsenal activation plan', activation.ok && activation.data.schema_version === 't3mp3st_arsenal_activation/v1', `${activation.data.summary?.total || 0} wired / doc ${activation.data.localPlanDoc || 'missing'}`);
    const localAgents = await apiGet('/api/agents/local/detect', INSPECTION_API_TIMEOUT_MS);
    const hermesAgent = Array.isArray(localAgents.data.agents)
      ? localAgents.data.agents.find(agent => agent.id === 'hermes')
      : null;
    check('War Room detects Hermes local agent', localAgents.ok && hermesAgent?.ready === true, hermesAgent ? `ready=${hermesAgent.ready}` : 'missing');
    const connectedAgents = Array.isArray(localAgents.data.connected) ? localAgents.data.connected : [];
    check('War Room has Hermes connected', connectedAgents.includes('hermes'), connectedAgents.join(',') || 'not connected', 'warn');

    const missionStatus = await apiGet('/api/mission/status');
    check('Mission status endpoint', missionStatus.ok, `${missionStatus.status} ${missionSummary(missionStatus.data)}`);
    const lifecycleState = String(missionStatus.data?.lifecycle?.state || '');
    const lifecycleBlocked = ['zombie', 'stalled', 'orphaned_loop'].includes(lifecycleState);
    check(
      'Mission lifecycle is coherent',
      !lifecycleBlocked,
      missionStatus.data?.lifecycle?.recommendation || missionSummary(missionStatus.data),
      'block',
    );
    const activeMission = Boolean(missionStatus.data?.active || missionStatus.data?.mission?.status === 'active' || lifecycleState === 'paused');
    check('No active mission parked', !activeMission, missionSummary(missionStatus.data), 'warn');
    const targets = Array.isArray(missionStatus.data?.targets) ? missionStatus.data.targets : [];
    const externalTargets = targets.filter(target => !isLoopbackTarget(target?.address || target?.url || target));
    check('Active mission targets are loopback-scoped', !activeMission || externalTargets.length === 0, externalTargets.map(target => target.address || target.url || target).join(', ') || 'loopback/none', 'warn');

    const pendingApprovals = await apiGet('/api/approvals?status=pending');
    const approvals = Array.isArray(pendingApprovals.data.approvals) ? pendingApprovals.data.approvals : [];
    check('Pending approval queue visible', pendingApprovals.ok, `${pendingApprovals.status} ${approvals.length} pending`);
    check('No pending approvals', approvals.length === 0, approvals.map(item => item.id).join(', ') || 'none', 'warn');
    const externalPending = approvals.filter(approval => !isLoopbackTarget(approval.target));
    check('Pending approvals are loopback-scoped', externalPending.length === 0, externalPending.map(approval => `${approval.id}:${approval.target}`).join(', ') || 'loopback/none', 'warn');
  }

  const blocks = checks.filter(item => !item.passed && item.severity === 'block');
  const warnings = checks.filter(item => !item.passed && item.severity === 'warn');
  const result = {
    tool: 't3mp3st-doctor',
    startedAt,
    finishedAt: new Date().toISOString(),
    baseUrl,
    passed: blocks.length === 0 && (!strictMode || warnings.length === 0),
    summary: {
      checks: checks.length,
      passed: checks.filter(item => item.passed).length,
      warnings: warnings.length,
      blockers: blocks.length,
      strict: strictMode,
    },
    checks,
  };

  if (jsonMode) {
    console.log(JSON.stringify(result, null, 2));
  } else {
    console.log(`T3MP3ST doctor: ${result.passed ? 'PASS' : 'CHECK REQUIRED'}`);
    console.log(`${result.summary.passed}/${result.summary.checks} checks passed, ${result.summary.warnings} warning(s), ${result.summary.blockers} blocker(s)`);
    for (const item of checks) {
      const marker = item.passed ? 'ok' : item.severity === 'warn' ? 'warn' : 'block';
      console.log(`- ${marker.padEnd(5)} ${item.name}${item.detail ? ` - ${item.detail}` : ''}`);
    }
  }

  process.exitCode = result.passed ? 0 : 1;
}

main().catch(error => {
  console.error(`doctor failed: ${error.stack || error.message || error}`);
  process.exitCode = 1;
});
