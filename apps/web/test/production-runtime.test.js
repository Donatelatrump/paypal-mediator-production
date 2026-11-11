import test from 'node:test';
import assert from 'node:assert/strict';
import { publicEnvironment, apiBaseUrl } from '../runtime-config.mjs';
import { routeFromLocation, routePath } from '../src/lib/routes.js';

test('existing Vercel public variables work and API prefixes are normalized once', () => {
  const configuration = publicEnvironment({
    NEXT_PUBLIC_API_BASE_URL: 'https://backend.test/api/api/',
    NEXT_PUBLIC_SUPABASE_URL: 'https://project.supabase.co',
    NEXT_PUBLIC_SUPABASE_ANON_KEY: 'public-key',
    SUPABASE_SERVICE_ROLE_KEY: 'must-never-be-exposed',
    DATABASE_URL: 'must-never-be-exposed',
  });
  assert.equal(configuration.VITE_API_URL, 'https://backend.test/api');
  assert.equal(configuration.VITE_SUPABASE_PUBLISHABLE_KEY, 'public-key');
  assert.equal(configuration.VITE_DATA_MODE, 'live');
  assert.ok(!JSON.stringify(configuration).includes('must-never-be-exposed'));
  assert.equal(apiBaseUrl('https://backend.test'), 'https://backend.test/api');
  assert.throws(
    () => apiBaseUrl('https://user:password@backend.test'),
    /without credentials/,
  );
  assert.throws(() => apiBaseUrl('file:///tmp/backend'), /HTTP/);
});

test('canonical frontend environment variables take precedence over legacy values', () => {
  const configuration = publicEnvironment({
    VITE_DATA_MODE: 'preview',
    VITE_API_URL: 'https://new.test/api',
    NEXT_PUBLIC_API_BASE_URL: 'https://old.test/api',
    VITE_SUPABASE_PUBLISHABLE_KEY: 'new-key',
    NEXT_PUBLIC_SUPABASE_ANON_KEY: 'old-key',
  });
  assert.equal(configuration.VITE_API_URL, 'https://new.test/api');
  assert.equal(configuration.VITE_SUPABASE_PUBLISHABLE_KEY, 'new-key');
  assert.equal(configuration.VITE_DATA_MODE, 'preview');
});

test('existing production URLs and nested evidence routes survive page reloads', () => {
  for (const route of [
    { page: 'overview' },
    { page: 'transactions' },
    { page: 'disputes' },
    { page: 'activity' },
    { page: 'details', id: 'tx-1' },
    { page: 'dispute-details', id: 'dis-1' },
    { page: 'evidence', id: 'tx-1' },
    { page: 'evidence', id: 'tx-1', disputeId: 'dis-1' },
    { page: 'overview', settings: 'merchant' },
  ]) {
    const url = new URL(routePath(route), 'https://frontend.test');
    assert.deepEqual(routeFromLocation(url), route);
  }
});

test('login return paths remain on the app origin', () => {
  assert.deepEqual(
    routeFromLocation(
      new URL('https://frontend.test/login?callbackUrl=/transactions'),
    ),
    { page: 'transactions' },
  );
  assert.deepEqual(
    routeFromLocation(
      new URL(
        'https://frontend.test/login?callbackUrl=//external.test/disputes',
      ),
    ),
    { page: 'overview' },
  );
  assert.deepEqual(
    routeFromLocation(
      new URL('https://frontend.test/login?callbackUrl=https://external.test'),
    ),
    { page: 'overview' },
  );
});
