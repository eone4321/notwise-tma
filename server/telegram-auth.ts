const encoder = new TextEncoder();

export async function hmac(key: Uint8Array<ArrayBuffer>, message: string) {
  const cryptoKey = await crypto.subtle.importKey('raw', key, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return new Uint8Array(await crypto.subtle.sign('HMAC', cryptoKey, encoder.encode(message)));
}

export async function telegramUser(request: Request, token: string) {
  const authorization = request.headers.get('Authorization');
  if (!authorization?.startsWith('tma ') || authorization.length > 8192) return null;
  const params = new URLSearchParams(authorization.slice(4));
  if (new Set(params.keys()).size !== [...params.keys()].length) return null;
  const hash = params.get('hash') ?? '';
  const authDate = Number(params.get('auth_date'));
  const age = Math.floor(Date.now() / 1000) - authDate;
  if (!/^[a-f0-9]{64}$/.test(hash) || !Number.isSafeInteger(authDate) || age < -30 || age > 3600) return null;
  params.delete('hash');
  params.sort();
  const data = [...params].map(([key, value]) => key + '=' + value).join('\n');
  const signature = await hmac(await hmac(encoder.encode('WebAppData'), token), data);
  let difference = 0;
  for (let index = 0; index < signature.length; index++) {
    difference |= signature[index] ^ parseInt(hash.slice(index * 2, index * 2 + 2), 16);
  }
  if (difference !== 0) return null;
  const user = JSON.parse(params.get('user') ?? 'null');
  if (!Number.isSafeInteger(user?.id) || user.id <= 0 || user.is_bot) return null;
  const name = [user.first_name, user.last_name].filter(value => typeof value === 'string').join(' ').trim().slice(0, 120) || 'Игрок';
  const avatar = typeof user.photo_url === 'string' && /^https:\/\/t\.me\/i\/userpic\/[\w./-]{1,400}\.(?:jpg|jpeg|png|webp)$/i.test(user.photo_url)
    ? user.photo_url : '';
  return { id: String(user.id), name, avatar, language: typeof user.language_code === 'string' && /^[a-zA-Z-]{2,15}$/.test(user.language_code) ? user.language_code : null, start: params.get('start_param') ?? '' };
}
