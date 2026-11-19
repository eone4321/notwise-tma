export type Tier = 'dark'|'silver'|'gold';
export const tiers: Tier[] = ['dark','silver','gold'];
export const tierNames: Record<Tier,string> = {dark:'Обсидиановая',silver:'Серебряная',gold:'Золотая'};
export const baseChance: Record<Tier,number> = {dark:1,silver:1.5,gold:5};
export const duration: Record<Tier,number> = {dark:14_400_000,silver:28_800_000,gold:86_400_000};
export const starPrice: Record<Tier,number> = {dark:100,silver:500,gold:2500};
export function speedupPrice(tier:Tier,elapsed:number){return Math.max(1,starPrice[tier]-Math.floor(Math.min(duration[tier],Math.max(0,elapsed))*starPrice[tier]/duration[tier]));}
export function notOdds(tier:Tier,owlLevel=0){
 const amounts=[1,5,10,100,1000,5000,10000,100000,1000000,10000000];
 const raw=amounts.map(amount=>({amount,scaled:Math.min(100,(100/amount/3/(amount>5000?10:amount>100?3:1))*(1+Math.max(0,owlLevel)/100)*baseChance[tier])}));
 let larger=0;return raw.reverse().map(({amount,scaled})=>{const chance=Math.min(scaled,Math.max(0,100-larger));larger+=scaled;return{amount,chance}}).reverse();
}
const percent = new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 1 });
const whole = new Intl.NumberFormat('ru-RU');
export function chanceLabel(value: number) {
  if (value === 0) return '0%';
  if (value < .05) return '≈ 1 из ' + whole.format(Math.round(100 / value));
  return percent.format(value) + '%';
}
export function xpReward(level:number,tier:Tier,xp:number[]){const multi={dark:4,silver:6,gold:14}[tier];return xp[Math.max(1,Math.min(xp.length - 1,level))]*multi;}
export function coinReward(level:number,tier:Tier){const multi={dark:1.5,silver:2.5,gold:5}[tier];return (level<20?70:100)*multi;}
