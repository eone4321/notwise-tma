import items from './shop-data.json';

export function shopPrice(id: string) {
  const item = items.find(entry => entry.id === id);
  if (!item) return '';
  return item.price.toLocaleString('ru-RU') + (item.currency === 'stars' ? ' ⭐' : ' монет') +
    (item.required_level ? ' · с ' + item.required_level + ' ур.' : '');
}
