export async function redis<T>(command: (string | number)[]): Promise<T> {
  const url = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL;
  const secret = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;
  if (!url || !secret) throw new Error('Database unavailable');
  const response = await fetch(url, {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + secret, 'Content-Type': 'application/json' },
    body: JSON.stringify(command),
    signal: AbortSignal.timeout(4500),
  });
  if (!response.ok) throw new Error('Database unavailable');
  const result = await response.json();
  if (result.error) throw new Error('Database command failed');
  return result.result;
}
