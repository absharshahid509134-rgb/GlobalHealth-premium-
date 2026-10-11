// Acceptance-only fixtures live in an isolated temporary runtime directory.
// They are never shipped as application accounts or written to data/runtime/.
import { spawn } from 'node:child_process';
import { mkdtemp, mkdir, readFile, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import net from 'node:net';
import { fileURLToPath } from 'node:url';

const repo = fileURLToPath(new URL('../../', import.meta.url));

// Environment that must never leak from a developer shell into acceptance runs.
const ISOLATED_DEFAULTS = {
  GEMINI_API_KEY: '',
  NEWS_ADMIN_BOOTSTRAP_EMAIL: '',
  NEWS_ADMIN_BOOTSTRAP_PASSWORD: '',
  GH_DEMO_MODE: '',
  SESSION_IDLE_TTL_HOURS: '',
  GH_DEMO_PASSWORD_USER: '',
  GH_DEMO_PASSWORD_DOCTOR: '',
  GH_DEMO_PASSWORD_HOSPITAL: '',
  GH_DEMO_PASSWORD_PHARMACY: '',
  GH_DEMO_PASSWORD_NEWS: '',
};

async function unusedPort() {
  const listener = net.createServer();
  await new Promise((resolve, reject) => { listener.once('error', reject); listener.listen(0, '127.0.0.1', resolve); });
  const port = listener.address().port;
  await new Promise((resolve, reject) => listener.close(error => error ? reject(error) : resolve()));
  return port;
}

/** Create an isolated runtime directory (optionally pre-seeded with store files). */
export async function createRuntimeDirectory(files = {}) {
  const directory = await mkdtemp(path.join(tmpdir(), 'globalhealth-auth-acceptance-'));
  const runtime = path.join(directory, 'runtime');
  await mkdir(runtime);
  for (const [name, content] of Object.entries(files)) await writeFile(path.join(runtime, name), JSON.stringify(content));
  return { directory, runtime };
}

/**
 * Start a server process that can be stopped and restarted against the same
 * runtime directory. Stopping sends SIGTERM (the production shutdown path).
 */
export async function startTestServer({ directory, nodeEnv = 'test', env = {} }) {
  const port = await unusedPort();
  let child;
  let logs = '';
  const start = () => new Promise((resolve, reject) => {
    child = spawn(process.execPath, ['--import', 'tsx', 'server.ts'], {
      cwd: repo,
      env: {
        ...process.env, ...ISOLATED_DEFAULTS, NODE_ENV: nodeEnv, GH_RUNTIME_DIR: path.relative(repo, directory),
        PORT: String(port), DISABLE_HMR: 'true', ...env,
      },
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    child.stdout.on('data', chunk => { logs += chunk; });
    child.stderr.on('data', chunk => { logs += chunk; });
    const timer = setTimeout(() => finish(new Error(`Test server did not start:\n${logs}`)), 60_000);
    const onOutput = () => { if (logs.includes('server listening')) finish(); };
    const onExit = code => finish(new Error(`Test server exited (${code}):\n${logs}`));
    const finish = error => {
      clearTimeout(timer);
      child.stdout.off('data', onOutput);
      child.stderr.off('data', onOutput);
      child.off('exit', onExit);
      child.off('error', finish);
      error ? reject(error) : resolve();
    };
    child.stdout.on('data', onOutput);
    child.stderr.on('data', onOutput);
    child.once('exit', onExit);
    child.once('error', finish);
    onOutput();
  });
  await start();
  const base = `http://127.0.0.1:${port}`;
  const request = async (endpoint, { token, body, method = body === undefined ? 'GET' : 'POST' } = {}) => {
    const response = await fetch(base + endpoint, {
      method,
      headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const text = await response.text();
    let parsed;
    try { parsed = JSON.parse(text); } catch { parsed = { raw: text }; }
    return { status: response.status, body: parsed, cache: response.headers.get('cache-control') };
  };
  const stop = async () => {
    if (!child || child.exitCode !== null || child.signalCode !== null) return;
    await new Promise(resolve => {
      const timer = setTimeout(() => child.kill('SIGKILL'), 10_000);
      child.once('exit', () => { clearTimeout(timer); resolve(); });
      child.kill('SIGTERM');
    });
  };
  return { base, request, stop, kill: signal => child.kill(signal), logs: () => logs };
}

export async function withTestServer({ nodeEnv = 'test', files = {}, env = {} } = {}, check) {
  const { directory, runtime } = await createRuntimeDirectory(files);
  let server;
  try {
    server = await startTestServer({ directory, nodeEnv, env });
    await check({
      request: server.request,
      base: server.base,
      readRuntime: async name => JSON.parse(await readFile(path.join(runtime, name), 'utf8')),
    });
  } finally {
    if (server) await server.stop();
    await rm(directory, { recursive: true, force: true });
  }
}
