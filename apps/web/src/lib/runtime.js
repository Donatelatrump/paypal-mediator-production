export const liveEnabled =
  import.meta.env.VITE_DATA_MODE === 'live' ||
  (import.meta.env.VITE_DATA_MODE !== 'preview' &&
    Boolean(
      import.meta.env.VITE_SUPABASE_URL &&
      import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
    ));
