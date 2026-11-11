const publicNames = {
  VITE_API_URL: ['VITE_API_URL', 'NEXT_PUBLIC_API_BASE_URL'],
  VITE_SUPABASE_URL: ['VITE_SUPABASE_URL', 'NEXT_PUBLIC_SUPABASE_URL'],
  VITE_SUPABASE_PUBLISHABLE_KEY: [
    'VITE_SUPABASE_PUBLISHABLE_KEY',
    'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  ],
};

export function apiBaseUrl(value) {
  const url = new URL(value || 'https://resolve-ai-api-ybmj.onrender.com/api');
  if (
    !['http:', 'https:'].includes(url.protocol) ||
    url.username ||
    url.password
  ) {
    throw new Error(
      'The public API URL must use HTTP or HTTPS without credentials.',
    );
  }
  url.search = '';
  url.hash = '';
  url.pathname =
    url.pathname.replace(/\/+$/, '').replace(/(?:\/api)+$/, '/api') || '/api';
  return url.toString().replace(/\/$/, '');
}

export function publicEnvironment(environment) {
  const result = { VITE_DATA_MODE: environment.VITE_DATA_MODE || 'live' };
  for (const [target, names] of Object.entries(publicNames)) {
    result[target] =
      names
        .map((name) => environment[name])
        .find((value) => typeof value === 'string' && value.trim())
        ?.trim() || '';
  }
  result.VITE_API_URL = apiBaseUrl(result.VITE_API_URL);
  return result;
}
