'use client';

import { useEffect, useState } from 'react';

export default function ClientDebug() {
  const [envVars, setEnvVars] = useState<Record<string, string>>({});

  useEffect(() => {
    // Client-side environment variables are only available if prefixed with NEXT_PUBLIC_
    const vars = {
      NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL || 'NOT SET',
      NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? 'SET (hidden)' : 'NOT SET',
      NEXT_PUBLIC_API_BASE_URL: process.env.NEXT_PUBLIC_API_BASE_URL || 'NOT SET',
    };
    setEnvVars(vars);
  }, []);

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Client-Side Debug Environment Variables</h1>
      <div className="bg-gray-100 p-4 rounded font-mono text-sm space-y-2">
        {Object.entries(envVars).map(([key, value]) => (
          <div key={key}><strong>{key}:</strong> {value}</div>
        ))}
      </div>
    </div>
  );
}