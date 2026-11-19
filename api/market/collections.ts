export const config = { runtime: 'edge' };

const ALL_COLLECTIONS = [
  { id: 'genesis', address: 'EQA5HalN4asamSjufbmXF_Wr3jyapCEYcYN0igfBDe5Nmbm7' },
  { id: 'eggs', address: 'EQBFELwdddZzNFXhiZxE1i_4700KG7XmiDTLYzO7UJI-YuRk' },
  { id: 'owlings', address: 'EQAPpJOA7BJPDJw9d7Oy7roElafFzsIkjaPoKPe9nmNBKaOZ' },
  { id: 'classics', address: 'EQAh0jRY7l_jw7o2lI8N5Bl0bFo-5eOKYinsZ56ZRcKABnup' },
  { id: 'domains', address: 'EQAeYaHeFiU50lKiqqGdtQMZHuN_tkr7nRC0u8QTqoLINsDF' },
  { id: 'merch', address: 'EQDqaYWSjobNidKQy_5lkGGqmaupONjspD_9X36ge5WQGuQf' },
  { id: 'items', address: 'EQBfQA3gHs5It6jeb6Wo82q_Djei1w1SWb02Vlne-Kc5MSn6' },
  { id: 'skins', address: 'EQC_CN9MU1igRcqmuWeUxxyB6_Uvr4JrnyUCaLe609qQNrRA' },
  { id: 'family', address: 'EQD8uo-PGjYTihplpM6hiUp9xAFp5F_8fXU7UADhjpyufvjK' },
];

export default async function handler() {
  try {
    const promises = ALL_COLLECTIONS.map(async ({ id, address }) => {
      try {
        const r = await fetch(`https://api.getgems.io/public-api/v1/collection/basic-info/${address}`, {
          headers: { 'User-Agent': 'Mozilla/5.0' },
          signal: AbortSignal.timeout(4500),
        });
        if (!r.ok) return { id, address, supply: null };
        const d = await r.json();
        const info = d?.response;
        return {
          id,
          address,
          supply: typeof info?.total_supply === 'number' ? info.total_supply : null,
          holders: typeof info?.unique_owners === 'number' ? info.unique_owners : null,
          floor: typeof info?.floor === 'number' && info.floor > 0 ? info.floor : null,
        };
      } catch {
        return { id, address, supply: null };
      }
    });

    const items = await Promise.all(promises);
    return new Response(JSON.stringify({ items }), {
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=300, s-maxage=300, stale-while-revalidate=1200',
        'Access-Control-Allow-Origin': '*',
      },
    });
  } catch {
    return new Response(JSON.stringify({ items: [] }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    });
  }
}
