import test from 'node:test';
import assert from 'node:assert/strict';

function createRedisMock() {
  const strings = new Map<string, string>();
  const hashes = new Map<string, Map<string, string>>();

  function handleCommand(cmd: (string | number)[]) {
    const op = String(cmd[0]).toUpperCase();
    if (op === 'GET') {
      return strings.get(String(cmd[1])) ?? null;
    }
    if (op === 'SET') {
      const key = String(cmd[1]);
      const val = String(cmd[2]);
      const hasNx = cmd.slice(3).some(x => String(x).toUpperCase() === 'NX');
      if (hasNx && strings.has(key)) return null;
      strings.set(key, val);
      return 'OK';
    }
    if (op === 'DEL') {
      strings.delete(String(cmd[1]));
      hashes.delete(String(cmd[1]));
      return 1;
    }
    if (op === 'HGET') {
      return hashes.get(String(cmd[1]))?.get(String(cmd[2])) ?? null;
    }
    if (op === 'HSET') {
      const key = String(cmd[1]);
      let map = hashes.get(key);
      if (!map) { map = new Map(); hashes.set(key, map); }
      for (let i = 2; i < cmd.length; i += 2) {
        map.set(String(cmd[i]), String(cmd[i + 1]));
      }
      return 1;
    }
    if (op === 'HGETALL') {
      const map = hashes.get(String(cmd[1]));
      if (!map) return {};
      return Object.fromEntries(map.entries());
    }
    if (op === 'PERSIST') return 1;
    return null;
  }

  return { strings, hashes, handleCommand };
}

test('resolveItemSlug, nameToSlug, parseEnchant, normalizeCurrency cover all edge cases', async () => {
  const { resolveItemSlug, nameToSlug, parseEnchant, normalizeCurrency } = await import('../server/market-sales.ts');

  assert.equal(nameToSlug('100,000 XP Floppy'), 'floppy-100k');
  assert.equal(nameToSlug('1,000,000 XP Floppy'), 'floppy-1m');
  assert.equal(nameToSlug('10,000,000 XP Floppy'), 'floppy-10m');
  assert.equal(nameToSlug('10,000 $NOT Voucher'), 'voucher-10k');
  assert.equal(nameToSlug('100,000 $NOT Voucher'), 'voucher-100k');
  assert.equal(nameToSlug('Obsidian Ring of Strength +5'), 'ring-str-2');
  assert.equal(nameToSlug('NOT Wise Skin #9875'), 'owl-skin');

  assert.equal(resolveItemSlug('https://cdn.notwise.co/nft/items/img/chiller.png', 'Unknown'), 'chiller');
  assert.equal(resolveItemSlug(undefined, 'Unknown', 'https://api.notwise.co/nft/metadata/exp/45/1896.json'), 'floppy-100k');
  assert.equal(resolveItemSlug(undefined, 'Unknown', 'https://api.notwise.co/nft/metadata/vouchers/43/10.json'), 'voucher-10k');

  assert.equal(parseEnchant('Obsidian Ring of Strength +5'), 5);
  assert.equal(parseEnchant('Chiller'), 0);
  assert.equal(parseEnchant('Skin +25'), 0);

  assert.equal(normalizeCurrency('TON'), 'GRAM');
  assert.equal(normalizeCurrency('toncoin'), 'GRAM');
  assert.equal(normalizeCurrency('USD₮'), 'USDT');
  assert.equal(normalizeCurrency('$NOT'), 'NOT');
  assert.equal(normalizeCurrency('not'), 'NOT');
});

test('Chiller recovers all Nov 20+21 sales across >360 traces, includes proxy purchase, rejects cancel, and survives sibling scan', async () => {
  const redisMock = createRedisMock();
  process.env.UPSTASH_REDIS_REST_URL = 'https://redis.mock.local';
  process.env.UPSTASH_REDIS_REST_TOKEN = 'test-token';
  delete process.env.GETGEMS_READ_TOKEN;
  process.env.TONCENTER_API_KEY = 'test-toncenter-key';

  const nowSec = Math.floor(Date.now() / 1000);
  const nov21Sec = nowSec - 30 * 60;
  const nov20Sec1 = nowSec - 28 * 3600;
  const nov20Sec2 = nowSec - 28 * 3600 - 500;

  const transfers: any[] = [];
  const metadata: Record<string, any> = {};
  const salesByContract = new Map<string, any>();

  const chillerNfts = [
    '0:EFE7960841C2D5A84DDB48BE30B9A077BDF5BC9E706DEB0AF3278EB2ADAD3B4E',
    '0:6488A31C6D4CBA2F04E447B79386859A0D7DADC5E56EA994256F081676B8A745',
    '0:B6C978852026C800BCA03A2CA0F8EF06758F1A027D0E16C5A19E657B66769A58',
    '0:1111111111111111111111111111111111111111111111111111111111111111',
    '0:2222222222222222222222222222222222222222222222222222222222222222',
  ];
  for (const addr of chillerNfts) {
    metadata[addr] = {
      token_info: [{ name: 'Chiller', image: 'https://cdn.notwise.co/nft/items/img/chiller.png' }],
    };
  }
  const lighterNft = '0:42F47AA035E1E40BF2FDBC4B5FE46E9F6C769B52965AFC055839BC63DC999BAD';
  metadata[lighterNft] = {
    token_info: [{ name: 'Lighter', image: 'https://cdn.notwise.co/nft/items/img/lighter.png' }],
  };

  for (let i = 0; i < 430; i++) {
    const tid = `trace-${i}`;
    const saleContract = `0:${i.toString(16).padStart(64, '0')}`;
    const sellerWallet = `0:a${i.toString(16).padStart(63, '0')}`;
    const buyerWallet = `0:b${i.toString(16).padStart(63, '0')}`;

    if (i === 5 || i === 418 || i === 421) {
      const idx = i === 5 ? 0 : i === 418 ? 1 : 2;
      const utime = i === 5 ? nov21Sec : i === 418 ? nov20Sec1 : nov20Sec2;
      const priceNano = i === 5 ? '15000000000' : i === 418 ? '20000000000' : '13000000000';
      const nft = chillerNfts[idx];
      transfers.push({ nft_address: nft, old_owner: saleContract, new_owner: buyerWallet, transaction_now: utime, trace_id: tid });
      salesByContract.set(saleContract, {
        type: 'getgems_sale',
        address: saleContract,
        nft_address: nft,
        nft_owner_address: sellerWallet,
        details: { is_complete: true, full_price: priceNano },
      });
    } else if (i === 10) {
      // Cancelled sale (new_owner === nft_owner_address)
      transfers.push({ nft_address: chillerNfts[3], old_owner: saleContract, new_owner: sellerWallet, transaction_now: nowSec - 1800, trace_id: tid });
      salesByContract.set(saleContract, {
        type: 'getgems_sale',
        address: saleContract,
        nft_address: chillerNfts[3],
        nft_owner_address: sellerWallet,
        details: { is_complete: true, full_price: '99000000000' },
      });
    } else if (i === 12) {
      // Proxy/cart purchase
      transfers.push({ nft_address: chillerNfts[4], old_owner: saleContract, new_owner: buyerWallet, transaction_now: nowSec - 3600, trace_id: tid });
      salesByContract.set(saleContract, {
        type: 'getgems_sale',
        address: saleContract,
        nft_address: chillerNfts[4],
        nft_owner_address: sellerWallet,
        details: { is_complete: true, full_price: '17500000000' },
      });
    } else {
      transfers.push({ nft_address: lighterNft, old_owner: saleContract, new_owner: buyerWallet, transaction_now: nowSec - i * 240, trace_id: tid });
      if (i < 20) {
        salesByContract.set(saleContract, {
          type: 'getgems_sale',
          address: saleContract,
          nft_address: lighterNft,
          nft_owner_address: sellerWallet,
          details: { is_complete: true, full_price: '1200000000' },
        });
      }
    }
  }

  let transferCalls = 0;
  let rateLimitedOnce = false;
  const origFetch = globalThis.fetch;
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const urlStr = String(input);
    if (urlStr === 'https://redis.mock.local') {
      const cmd = JSON.parse(String(init?.body ?? '[]'));
      return new Response(JSON.stringify({ result: redisMock.handleCommand(cmd) }), { status: 200 });
    }
    const u = new URL(urlStr);
    if (u.pathname === '/api/v3/nft/transfers') {
      transferCalls += 1;
      if (!rateLimitedOnce) {
        rateLimitedOnce = true;
        return new Response('rate limit', { status: 429 });
      }
      const offset = Number(u.searchParams.get('offset') ?? '0');
      const limit = Number(u.searchParams.get('limit') ?? '100');
      return new Response(JSON.stringify({ nft_transfers: transfers.slice(offset, offset + limit), metadata }), { status: 200 });
    }
    if (u.pathname === '/api/v3/nft/sales') {
      const addrs = u.searchParams.getAll('address').map(a => a.toLowerCase());
      const nft_sales = addrs.map(a => salesByContract.get(a)).filter(Boolean);
      return new Response(JSON.stringify({ nft_sales, metadata }), { status: 200 });
    }
    return new Response('Not Found', { status: 404 });
  }) as typeof fetch;

  try {
    const { default: handler } = await import('../api/market/sales.ts');

    // Lighter first
    const rLighter = await handler(new Request('https://notwise-tma.vercel.app/api/market/sales?slug=lighter'));
    assert.equal(rLighter.status, 200);

    // Chiller next -> must retry 429 cleanly and return all 4 genuine sales (not the 99 GRAM cancel)
    const rChiller = await handler(new Request('https://notwise-tma.vercel.app/api/market/sales?slug=chiller'));
    assert.equal(rChiller.status, 200);
    const body = await rChiller.json() as { slug: string; sales: { price: number }[] };
    assert.deepEqual(body.sales.map(s => s.price).sort((a, b) => a - b), [13, 15, 17.5, 20]);

    // Subsequent ?all=1 serves from Redis without hitting TON Center!
    const callsBeforeAll = transferCalls;
    const rAll = await handler(new Request('https://notwise-tma.vercel.app/api/market/sales?all=1'));
    assert.equal(rAll.status, 200);
    assert.equal(transferCalls, callsBeforeAll);
    const allBody = await rAll.json() as { bySlug: Record<string, { price: number }[]> };
    assert.equal(allBody.bySlug.chiller?.length, 4);
    assert.equal(allBody.bySlug.lighter?.length, 17);
  } finally {
    globalThis.fetch = origFetch;
  }
});

test('syncMarketSales handles auctions, pre-populates all slugs, preserves older sales, and webhook merges safely', async () => {
  const redisMock = createRedisMock();
  process.env.UPSTASH_REDIS_REST_URL = 'https://redis.mock.local';
  process.env.UPSTASH_REDIS_REST_TOKEN = 'test-token';
  process.env.TONCONSOLE_WEBHOOK_SECRET = 'super-secret-webhook-key-1234';
  delete process.env.GETGEMS_READ_TOKEN;
  process.env.TONCENTER_API_KEY = 'test-toncenter-key';

  const nowSec = Math.floor(Date.now() / 1000);
  const skinNft = '0:02AA397C3C58136E97C4979461A8F2D5122273518AE7A5852D4EF7E9F50622A5';
  const skinNftCanceled = '0:490FC4D912992AE0425493F2FE15097A84A7D8CBEEF3B328C197A68C5620DB78';
  const chillerNft = '0:EFE7960841C2D5A84DDB48BE30B9A077BDF5BC9E706DEB0AF3278EB2ADAD3B4E';

  const origFetch = globalThis.fetch;
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const urlStr = String(input);
    if (urlStr === 'https://redis.mock.local') {
      const cmd = JSON.parse(String(init?.body ?? '[]'));
      return new Response(JSON.stringify({ result: redisMock.handleCommand(cmd) }), { status: 200 });
    }
    const u = new URL(urlStr);
    if (u.hostname === 'tonapi.io' && u.pathname.startsWith('/v2/events/')) {
      return new Response(JSON.stringify({
        in_progress: false,
        timestamp: nowSec - 10,
        actions: [{
          type: 'NftPurchase',
          status: 'ok',
          NftPurchase: {
            nft: {
              address: chillerNft,
              collection: { address: 'EQBfQA3gHs5It6jeb6Wo82q_Djei1w1SWb02Vlne-Kc5MSn6' },
              metadata: { name: 'Chiller', image: 'https://cdn.notwise.co/nft/items/img/chiller.png' },
            },
            amount: { currency_type: 'jetton', token_name: 'USD₮', decimals: 6, value: '25000000' },
          },
        }],
      }), { status: 200 });
    }
    if (u.pathname === '/api/v3/nft/transfers') {
      const col = u.searchParams.get('collection_address');
      if (col === 'EQC_CN9MU1igRcqmuWeUxxyB6_Uvr4JrnyUCaLe609qQNrRA') {
        return new Response(JSON.stringify({
          nft_transfers: [
            { nft_address: skinNft, old_owner: '0:1'.padEnd(66, '1'), new_owner: '0:2'.padEnd(66, '2'), transaction_now: nowSec - 1200 },
            { nft_address: skinNftCanceled, old_owner: '0:3'.padEnd(66, '3'), new_owner: '0:4'.padEnd(66, '4'), transaction_now: nowSec - 1500 },
          ],
          metadata: {
            [skinNft]: { token_info: [{ name: 'NOT Wise Skin #5705' }] },
            [skinNftCanceled]: { token_info: [{ name: 'NOT Wise Skin #7172' }] },
          },
        }), { status: 200 });
      }
      return new Response(JSON.stringify({ nft_transfers: [], metadata: {} }), { status: 200 });
    }
    if (u.pathname === '/api/v3/nft/sales') {
      return new Response(JSON.stringify({
        nft_sales: [
          {
            type: 'getgems_auction',
            address: '0:1'.padEnd(66, '1'),
            nft_address: skinNft,
            nft_owner_address: '0:9'.padEnd(66, '9'),
            details: { end_flag: true, is_canceled: false, last_bid: '50000000000', last_member: '0:2'.padEnd(66, '2') },
          },
          {
            type: 'getgems_auction',
            address: '0:3'.padEnd(66, '3'),
            nft_address: skinNftCanceled,
            nft_owner_address: '0:4'.padEnd(66, '4'),
            details: { end_flag: true, is_canceled: true, last_bid: '0' },
          },
        ],
        metadata: {},
      }), { status: 200 });
    }
    return new Response('Not Found', { status: 404 });
  }) as typeof fetch;

  try {
    const { default: webhook } = await import('../api/tonconsole-webhook.ts');
    const { syncMarketSales, readAllSalesBundle, SALES_RETENTION_MS } = await import('../server/market-sales.ts');

    // Webhook receives a live USD₮ Chiller sale
    const whRes = await webhook(new Request('https://notwise-tma.vercel.app/api/tonconsole-webhook?secret=super-secret-webhook-key-1234', {
      method: 'POST',
      body: JSON.stringify({ tx_hash: 'a'.repeat(64) }),
    }));
    assert.equal(whRes.status, 200);
    const whJson = await whRes.json() as { ok: boolean; processed: number };
    assert.equal(whJson.processed, 1);

    // Cron sync runs and must preserve Chiller webhook sale AND populate owl-skin completed auction (excluding canceled auction)
    await syncMarketSales({ timeBudgetMs: 5000 });
    const bundle = await readAllSalesBundle(Date.now() - SALES_RETENTION_MS);

    assert.equal(bundle.bySlug.chiller?.length, 1);
    assert.equal(bundle.bySlug.chiller[0].currency, 'USDT');
    assert.equal(bundle.bySlug.chiller[0].price, 25);

    assert.equal(bundle.bySlug['owl-skin']?.length, 1);
    assert.equal(bundle.bySlug['owl-skin'][0].price, 50);
    assert.equal(bundle.bySlug['col:skins']?.length, 1);
    assert.ok(bundle.completeCollections.includes('owl-skin'));
    assert.ok(bundle.completeCollections.includes('col:skins'));
    assert.ok(bundle.syncedCollections.includes('col:items'));
  } finally {
    globalThis.fetch = origFetch;
  }
});

test('scanToncenterCollectionSales does not advance oldestUtime when /v3/nft/sales fails on page 2, and 0-sale item uses fresh 30d collection watermark', async () => {
  const redisMock = createRedisMock();
  process.env.UPSTASH_REDIS_REST_URL = 'https://redis.mock.local';
  process.env.UPSTASH_REDIS_REST_TOKEN = 'test-token';
  delete process.env.GETGEMS_READ_TOKEN;
  process.env.TONCENTER_API_KEY = 'test-toncenter-key';

  const nowSec = Math.floor(Date.now() / 1000);
  const itemsCol = 'EQBfQA3gHs5It6jeb6Wo82q_Djei1w1SWb02Vlne-Kc5MSn6';
  const chillerNft = '0:EFE7960841C2D5A84DDB48BE30B9A077BDF5BC9E706DEB0AF3278EB2ADAD3B4E';

  const page0 = Array.from({ length: 1000 }, (_, i) => ({
    nft_address: chillerNft,
    old_owner: `0:c${i.toString(16).padStart(63, '0')}`,
    new_owner: `0:d${i.toString(16).padStart(63, '0')}`,
    transaction_now: nowSec - 100 - i,
  }));
  const page1 = [
    {
      nft_address: chillerNft,
      old_owner: `0:e${'0'.padStart(63, '0')}`,
      new_owner: `0:f${'0'.padStart(63, '0')}`,
      transaction_now: nowSec - 90_000,
    },
  ];
  const meta = {
    [chillerNft]: { token_info: [{ type: 'nft_items', name: 'Chiller', image: 'https://cdn.notwise.co/nft/items/img/chiller.png' }] },
  };

  let salesCalls = 0;
  let toncenterCalls = 0;
  const origFetch = globalThis.fetch;
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const urlStr = String(input);
    if (urlStr === 'https://redis.mock.local') {
      const cmd = JSON.parse(String(init?.body ?? '[]'));
      return new Response(JSON.stringify({ result: redisMock.handleCommand(cmd) }), { status: 200 });
    }
    const u = new URL(urlStr);
    toncenterCalls += 1;
    if (u.pathname === '/api/v3/nft/transfers') {
      const offset = Number(u.searchParams.get('offset') ?? '0');
      return new Response(JSON.stringify({
        nft_transfers: offset === 0 ? page0 : page1,
        metadata: meta,
      }), { status: 200 });
    }
    if (u.pathname === '/api/v3/nft/sales') {
      salesCalls += 1;
      // Succeed on page 0 batches (1000/80 = 13 calls), fail on page 1 batch (call 14)
      if (salesCalls >= 14) {
        return new Response('upstream error', { status: 500 });
      }
      return new Response(JSON.stringify({ nft_sales: [], metadata: {} }), { status: 200 });
    }
    return new Response('Not Found', { status: 404 });
  }) as typeof fetch;

  try {
    const { scanToncenterCollectionSales, SALES_WATERMARK_KEY } = await import('../server/market-sales.ts');
    const { default: salesHandler } = await import('../api/market/sales.ts');

    const res = await scanToncenterCollectionSales({
      collectionAddress: itemsCol,
      collectionSlug: 'col:items',
      filterBySlug: true,
      sinceSec: nowSec - 30 * 86400,
      maxPages: 2,
      timeBudgetMs: 15_000,
    });

    // Page 0 oldest was nowSec - 1099; page 1 failed /v3/nft/sales so oldestUtime must NOT advance to nowSec - 90_000!
    assert.equal(res.oldestUtime, nowSec - 1099);
    assert.equal(res.reachedEnd, false);

    // Now test 0-sale slug fast-path when parent collection watermark is 30d-complete & fresh
    redisMock.handleCommand(['SET', SALES_WATERMARK_KEY, JSON.stringify({
      [itemsCol]: {
        latestSec: nowSec - 30,
        backfilledUntilSec: nowSec - 30 * 86400,
        collectionSlug: 'col:items',
        complete30d: true,
      },
    })]);
    const callsBefore = toncenterCalls;
    const emptyRes = await salesHandler(new Request('https://notwise-tma.vercel.app/api/market/sales?slug=flask-empty'));
    assert.equal(emptyRes.status, 200);
    const emptyBody = await emptyRes.json() as { slug: string; sales: unknown[] };
    assert.deepEqual(emptyBody, { slug: 'flask-empty', sales: [] });
    assert.equal(toncenterCalls, callsBefore);
  } finally {
    globalThis.fetch = origFetch;
  }
});
