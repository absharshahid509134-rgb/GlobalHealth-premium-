// Acceptance-only fixtures live in an isolated temporary runtime directory.
// They are never shipped as application accounts or written to data/runtime/.
import { spawn } from 'node:child_process';
import { mkdtemp, mkdir, readFile, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import net from 'node:net';
import { fileURLToPath } from 'node:url';

const repo = fileURLToPath(new URL('../../', import.meta.url));

async function unusedPort() {
  const listener = net.createServer();
  await new Promise((resolve, reject) => { listener.once('error', reject); listener.listen(0, '127.0.0.1', resolve); });
  const port = listener.address().port;
  await new Promise((resolve, reject) => listener.close(error => error ? reject(error) : resolve()));
  return port;
}

export async function withTestServer({ nodeEnv = 'test', files = {}, env = {} } = {}, check) {
  const directory = await mkdtemp(path.join(tmpdir(), 'globalhealth-auth-acceptance-'));
  const runtime = path.join(directory, 'runtime');
  let child;
  let logs = '';
  try {
    await mkdir(runtime);
    for (const [name, content] of Object.entries(files)) await writeFile(path.join(runtime, name), JSON.stringify(content));
    const port = await unusedPort();
    child = spawn(process.execPath, ['--import', 'tsx', 'server.ts'], {
      cwd: repo,
      env: {
        ...process.env, NODE_ENV: nodeEnv, GH_RUNTIME_DIR: path.relative(repo, directory), PORT: String(port), DISABLE_HMR: 'true',
        GEMINI_API_KEY: '', NEWS_ADMIN_BOOTSTRAP_EMAIL: '', NEWS_ADMIN_BOOTSTRAP_PASSWORD: '',
        ...env,
      },
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    child.stdout.on('data', chunk => { logs += chunk; });
    child.stderr.on('data', chunk => { logs += chunk; });
    await new Promise((resolve, reject) => {
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
    const base = `http://127.0.0.1:${port}`;
    const request = async (endpoint, { token, body, method = body === undefined ? 'GET' : 'POST' } = {}) => {
      const response = await fetch(base + endpoint, {
        method,
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: body === undefined ? undefined : JSON.stringify(body),
      });
      return { status: response.status, body: await response.json(), cache: response.headers.get('cache-control') };
    };
    await check({ request, base, readRuntime: async name => JSON.parse(await readFile(path.join(runtime, name), 'utf8')) });
  } finally {
    if (child && child.exitCode === null && child.signalCode === null) {
      await new Promise(resolve => {
        const timer = setTimeout(() => child.kill('SIGKILL'), 5_000);
        child.once('exit', () => { clearTimeout(timer); resolve(); });
        child.kill('SIGTERM');
      });
    }
    await rm(directory, { recursive: true, force: true });
  }
}
