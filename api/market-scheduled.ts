import { handleSchedule } from '@vercel/schedules';
import { refreshMarket } from '../server/getgems-market.js';

export const POST = handleSchedule(async () => {
  console.info('NOT Wise market refresh', await refreshMarket());
});
