/**
 * Convert a raw TON address ("0:<64 hex>") into a user-friendly bounceable base64url address ("EQ...").
 * Returns the original string unchanged if it is already user-friendly or not a valid raw address.
 */
export function toFriendlyTonAddress(raw: string): string {
  const trimmed = raw.trim();
  const match = /^(-?\d+):([0-9a-fA-F]{64})$/.exec(trimmed);
  if (!match) return trimmed;
  const wc = Number(match[1]) & 0xff;
  const hex = match[2];
  const bytes = new Uint8Array(36);
  bytes[0] = 0x11; // bounceable mainnet tag
  bytes[1] = wc;
  for (let i = 0; i < 32; i++) {
    bytes[2 + i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  }
  // CRC16-CCITT (poly 0x1021, init 0x0000) over first 34 bytes
  let crc = 0;
  for (let i = 0; i < 34; i++) {
    crc ^= bytes[i] << 8;
    for (let bit = 0; bit < 8; bit++) {
      crc = (crc & 0x8000) ? ((crc << 1) ^ 0x1021) & 0xffff : (crc << 1) & 0xffff;
    }
  }
  bytes[34] = (crc >> 8) & 0xff;
  bytes[35] = crc & 0xff;

  let binary = '';
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_');
}

export function getgemsNftUrl(address: string): string {
  return `https://getgems.io/nft/${toFriendlyTonAddress(address)}`;
}
