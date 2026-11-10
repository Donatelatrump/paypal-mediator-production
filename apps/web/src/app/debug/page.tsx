import ClientDebug from './client-debug';

export default function DebugPage() {
  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Debug Environment Variables</h1>
      <div className="bg-gray-100 p-4 rounded font-mono text-sm space-y-2">
        <div><strong>NEXT_PUBLIC_SUPABASE_URL (Server):</strong> {process.env.NEXT_PUBLIC_SUPABASE_URL || 'NOT SET'}</div>
        <div><strong>NEXT_PUBLIC_SUPABASE_ANON_KEY (Server):</strong> {process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? 'SET (hidden)' : 'NOT SET'}</div>
        <div><strong>NEXT_PUBLIC_API_BASE_URL (Server):</strong> {process.env.NEXT_PUBLIC_API_BASE_URL || 'NOT SET'}</div>
      </div>
      <div className="mt-4 p-4 bg-blue-50 rounded">
        <h2 className="font-bold mb-2">Runtime Check</h2>
        <p id="runtime-url">Checking...</p>
      </div>
      <hr className="my-8" />
      <ClientDebug />
    </div>
  );
}