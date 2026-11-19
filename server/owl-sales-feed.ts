import collections from '../src/features/market-collections.json';
import tokens from '../public/data/tokens.json';
import { usdtAddress } from './ton-rates';

const collection = collections.find(item => item.id === 'genesis')!.address;
const friendly = /^[A-Za-z0-9_-]{48}$/;
const raw = /^0:[0-9a-f]{64}$/i;
const hex = (bytes: string) => Array.from(bytes, char => char.charCodeAt(0).toString(16).padStart(2, '0')).join('');
const rawAddress = (address: string) => friendly.test(address)
  ? '0:' + hex(atob(address.replaceAll('-', '+').replaceAll('_', '/')).slice(2, 34))
  : raw.test(address) ? address.toLowerCase() : '';
const rawCollection = rawAddress(collection);
export const notAddress = tokens.tokens.find(token => token.symbol === 'NOT')!.master_address!;
export type SaleCurrency = 'GRAM' | 'USDT' | 'NOT';
export type OwlSale = { id: string; at: number; nft: string; name: string; amount: number; currency: SaleCurrency };

function sale(nft: string, name: unknown, at: number, amount: number, currency: SaleCurrency): OwlSale | null {
  const address = rawAddress(nft);
  if (!address || !Number.isSafeInteger(at) || at <= 0 || !Number.isFinite(amount) || amount <= 0) return null;
  const title = typeof name === 'string' && /^NOT Wise #[0-9]{1,8}$/i.test(name)
    ? 'NOT Wise #' + name.split('#')[1] : 'NOT Wise';
  return { id: [address, at, amount, currency].join(':'), at, nft: friendly.test(nft) ? nft : address, name: title, amount, currency };
}

const currencyForAddress = (address: string): SaleCurrency | null => {
  const jetton = rawAddress(address);
  return jetton === rawAddress(usdtAddress) ? 'USDT' : jetton === rawAddress(notAddress) ? 'NOT' : null;
};

type EventAmount = {
  currency_type?: string; token_name?: string; jetton?: string; jetton_master?: string;
  decimals?: number; value?: string;
};
type EventPurchase = {
  auction_type?: string;
  nft?: { address: string; collection?: { address: string }; metadata?: { name?: string } };
  amount?: EventAmount;
};

export function parseTonSales(event: {
  timestamp: number; in_progress?: boolean;
  actions?: { type: string; status: string; NftPurchase?: EventPurchase }[];
}, addresses: Map<string, string>) {
  const result: OwlSale[] = [];
  if (event.in_progress || !Array.isArray(event.actions)) return result;
  for (const action of event.actions) {
    const purchase = action.NftPurchase;
    if (action.type !== 'NftPurchase' || action.status !== 'ok' || purchase?.auction_type !== 'getgems' ||
        !purchase.nft || rawAddress(purchase.nft.collection?.address ?? '') !== rawCollection) continue;
    const amount = purchase.amount;
    const currency = amount?.currency_type === 'native' ? 'GRAM' :
      currencyForAddress(amount?.jetton ?? amount?.jetton_master ?? '');
    const decimals = amount?.decimals ?? -1;
    if (!currency || !/^\d{1,30}$/.test(amount?.value ?? '') || !Number.isInteger(decimals) || decimals < 0 || decimals > 18) continue;
    const nft = rawAddress(purchase.nft.address);
    const normalized = sale(addresses.get(nft) ?? nft, purchase.nft.metadata?.name, event.timestamp, Number(amount?.value) / 10 ** decimals, currency);
    if (normalized) result.push(normalized);
  }
  return result;
}

type HistoryRow = {
  address: string; name?: string; time: string; collectionAddress?: string;
  typeData: { type: string; currency?: string; price?: string | null };
};

export function parseGetgemsSales(items: HistoryRow[]) {
  return items.flatMap(item => {
    const row = item.typeData;
    if (row?.type !== 'sold' || rawAddress(item.collectionAddress ?? '') !== rawCollection) return [];
    const currency = !row.currency || row.currency === 'TON' ? 'GRAM' : row.currency;
    if (currency !== 'GRAM' && currency !== 'USDT' && currency !== 'NOT') return [];
    const normalized = sale(item.address, item.name, Math.floor(Date.parse(item.time) / 1000), Number(row.price), currency);
    return normalized ? [normalized] : [];
  });
}

async function read(url: string, headers?: HeadersInit) {
  const response = await fetch(url, { headers, signal: AbortSignal.timeout(5200) });
  if (!response.ok) throw new Error('Sale feed unavailable');
  return response.json();
}

export async function getgemsHistory(token: string, since: number, until: number, after: string) {
  const query = new URLSearchParams({
    minTime: String(since * 1000), maxTime: String(until * 1000 + 999), limit: '100', types: 'sold',
  });
  if (after) query.set('after', after);
  const data = await read(`https://api.getgems.io/public-api/v1/collection/history/${collection}?` + query,
    { Authorization: token });
  if (!Array.isArray(data?.response?.items)) throw new Error('Unexpected Getgems response');
  return { sales: parseGetgemsSales(data.response.items), cursor: data.response.cursor as string | null };
}

export async function tonTransfers(since: number, until: number, lt: string) {
  const query = new URLSearchParams({
    collection_address: collection, start_utime: String(since), end_utime: String(until), sort: 'asc', limit: '30',
  });
  if (lt) query.set('start_lt', String(BigInt(lt) + 1n));
  const data = await read('https://toncenter.com/api/v3/nft/transfers?' + query);
  if (!Array.isArray(data?.nft_transfers)) throw new Error('Unexpected TON transfers');
  const addresses = new Map<string, string>();
  const transfers: { trace: string; lt: string }[] = [];
  for (const transfer of data.nft_transfers) {
    const item = rawAddress(transfer.nft_address ?? '');
    const address = data.address_book?.[transfer.nft_address]?.user_friendly;
    if (typeof address === 'string' && rawAddress(address) === item) addresses.set(item, address);
    if (!/^\d{1,24}$/.test(transfer.transaction_lt) || !/^[0-9A-Za-z+/]{43}=$/.test(transfer.trace_id)) {
      throw new Error('Unexpected TON transfer');
    }
    transfers.push({ trace: hex(atob(transfer.trace_id)), lt: transfer.transaction_lt });
  }
  return { addresses, transfers };
}

export async function salesFromTrace(trace: string, addresses: Map<string, string>) {
  const event = await read('https://tonapi.io/v2/events/' + trace);
  if (event.in_progress || !Array.isArray(event.actions)) throw new Error('TON trace pending');
  return parseTonSales(event, addresses);
}

export function getgemsItemLink(address: string) {
  if (friendly.test(address)) return `https://getgems.io/collection/${collection}/${address}`;
  // Encode a raw workchain-0 NFT address to the bounceable TON format.
  const body = new Uint8Array(36);
  body[0] = 0x11;
  body.set(address.slice(2).match(/../g)!.map(byte => parseInt(byte, 16)), 2);
  let crc = 0;
  for (const byte of body.slice(0, 34)) {
    crc ^= byte << 8;
    for (let bit = 0; bit < 8; bit++) crc = ((crc << 1) ^ (crc & 0x8000 ? 0x1021 : 0)) & 0xffff;
  }
  body[34] = crc >> 8;
  body[35] = crc & 255;
  return `https://getgems.io/collection/${collection}/` +
    btoa(String.fromCharCode(...body)).replaceAll('+', '-').replaceAll('/', '_');
}
