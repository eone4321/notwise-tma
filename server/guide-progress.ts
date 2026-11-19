const progressScript = `
if redis.call('ZSCORE', KEYS[4], ARGV[1]) == false then return false end

local function setMark(field, value)
  local previous = redis.call('HEXISTS', KEYS[1], field)
  if previous == value then return end
  if value == 1 then redis.call('HSET', KEYS[1], field, 1)
  else redis.call('HDEL', KEYS[1], field) end
  if string.sub(field, 1, 2) == 'c:' then
    redis.call('HINCRBY', KEYS[3], string.sub(field, 3), value - previous)
  end
end

local action = ARGV[2]
if action == 'progress' and redis.call('SET', KEYS[2], '1', 'NX') then
  for i = 3, #ARGV do setMark(ARGV[i], 1) end
elseif action == 'mark' then
  setMark(ARGV[3], tonumber(ARGV[4]))
end

local count = redis.call('ZCARD', KEYS[4])
return {redis.call('HKEYS', KEYS[1]), count, count >= 50 and redis.call('HGETALL', KEYS[3]) or {}}
`;

type Redis = <T>(command: (string | number)[]) => Promise<T>;
const validId = (value: unknown): value is number =>
  typeof value === 'number' && Number.isInteger(value) && value >= 1 && value <= 100;

export async function guideProgress(redis: Redis, namespace: string, id: string, input: Record<string, unknown>) {
  let args: (string | number)[];
  if (input.action === 'mark') {
    if ((input.group !== 'c' && input.group !== 's') || !validId(input.id) || typeof input.checked !== 'boolean') return null;
    args = [input.group + ':' + input.id, Number(input.checked)];
  } else {
    const completed = input.completed ?? [];
    const collected = input.collected ?? [];
    if (![completed, collected].every(values =>
      Array.isArray(values) && values.length <= 100 && values.every(validId))) return null;
    args = [...(completed as number[]).map(value => 'c:' + value), ...(collected as number[]).map(value => 's:' + value)];
  }
  const result = await redis<[string[], number, string[]] | null>([
    'EVAL', progressScript, 4, namespace + 'progress:' + id, namespace + 'progress-imported:' + id,
    namespace + 'completion-counts', namespace + 'members', id, String(input.action), ...args,
  ]);
  if (!result) return false;
  const [marks, users, counts] = result;
  const percentages: Record<string, number> | null = users >= 50 ? {} : null;
  if (percentages) {
    for (let index = 0; index < counts.length; index += 2) {
      percentages[counts[index]] = Math.round(Number(counts[index + 1]) / users * 100);
    }
  }
  return {
    completed: marks.filter(mark => mark.startsWith('c:')).map(mark => Number(mark.slice(2))),
    collected: marks.filter(mark => mark.startsWith('s:')).map(mark => Number(mark.slice(2))),
    percentages,
  };
}
