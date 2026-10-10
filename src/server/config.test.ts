import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadRuntimeConfig } from './config';

test('loadRuntimeConfig defaults to development with safe defaults', () => {
  const cfg = loadRuntimeConfig({});
  assert.equal(cfg.nodeEnv, 'development');
  assert.equal(cfg.isProduction, false);
  assert.equal(cfg.port, 3000);
  assert.equal(cfg.corsOrigins.length, 0);
});

test('loadRuntimeConfig parses production mode and explicit origins', () => {
  const cfg = loadRuntimeConfig({
    NODE_ENV: 'production',
    CORS_ORIGIN: 'https://globalhealth.example',
    PORT: '8443'
  });
  assert.equal(cfg.isProduction, true);
  assert.equal(cfg.port, 8443);
  assert.deepEqual(cfg.corsOrigins, ['https://globalhealth.example']);
});

test('retired demo environment variables cannot re-enable demo accounts', () => {
  for (const NODE_ENV of ['development', 'test', 'production']) {
    const cfg = loadRuntimeConfig({ NODE_ENV, PUBLIC_DEMO_ENABLED: 'true', DEMO_SESSION_SECRET: 'old-secret' });
    assert.equal('publicDemoEnabled' in cfg, false);
    assert.equal('demoSessionSecret' in cfg, false);
  }
});

test('loadRuntimeConfig warns when production critical gates are missing', () => {
  const cfg = loadRuntimeConfig({ NODE_ENV: 'production' });
  assert.ok(cfg.warnings.some((w) => w.includes('GH_ADMIN_KEY')));
  assert.ok(cfg.warnings.some((w) => w.includes('PRESCRIPTION_SIGNING_SECRET')));
  assert.ok(cfg.warnings.some((w) => w.includes('MEDAUTH_REGISTRY_URL')));
});

test('loadRuntimeConfig rejects wildcard CORS in production', () => {
  assert.throws(
    () => loadRuntimeConfig({ NODE_ENV: 'production', CORS_ORIGIN: '*' }),
    /CORS_ORIGIN must not be "\*"/
  );
});

test('invalid port falls back to 3000 with a warning', () => {
  const cfg = loadRuntimeConfig({ PORT: 'not-a-port' });
  assert.equal(cfg.port, 3000);
  assert.ok(cfg.warnings.some((w) => w.includes('PORT')));
});

test('trust proxy defaults to one hop in production and off otherwise', () => {
  assert.equal(loadRuntimeConfig({ NODE_ENV: 'production' }).trustProxy, 1);
  assert.equal(loadRuntimeConfig({ NODE_ENV: 'development' }).trustProxy, false);
  assert.equal(loadRuntimeConfig({ NODE_ENV: 'production', TRUST_PROXY: 'false' }).trustProxy, false);
  assert.equal(loadRuntimeConfig({ NODE_ENV: 'production', TRUST_PROXY: '2' }).trustProxy, 2);
  assert.equal(loadRuntimeConfig({ NODE_ENV: 'development', TRUST_PROXY: 'true' }).trustProxy, true);
});
