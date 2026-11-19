import { handleSchedule } from '@vercel/schedules';
import { pollOwlSales } from '../server/owl-sale-alerts.js';

export const POST = handleSchedule(async () => {
  console.info('NOT Wise sale alerts', await pollOwlSales());
});
