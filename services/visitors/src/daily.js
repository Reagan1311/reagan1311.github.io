const DAY = 86400000;
const OFFSET = 8 * 60 * 60 * 1000;

export function dayInShanghai(time = Date.now()) {
  return new Date(time + OFFSET).toISOString().slice(0, 10);
}

export function last30Dates(time = Date.now()) {
  const end = Date.parse(`${dayInShanghai(time)}T00:00:00Z`);
  return Array.from({ length: 30 }, (_, index) => new Date(end - (29 - index) * DAY).toISOString().slice(0, 10));
}

export function dailyActivity(rows, metadata, total, time = Date.now()) {
  if (!metadata?.daily_started_at) throw new Error("Daily tracking metadata missing");
  const since = dayInShanghai(Date.parse(metadata.daily_started_at));
  const counts = new Map(rows.map(({ day, visits }) => [day, visits]));
  const dates = last30Dates(time);
  const days = dates.map((date) => ({ date, count: date < since ? null : counts.get(date) || 0 }));
  return {
    timeZone: "Asia/Shanghai",
    since,
    start: dates[0],
    end: dates[29],
    today: days[29].count,
    last30Days: days.reduce((sum, day) => sum + (day.count || 0), 0),
    undatedVisits: Math.max(0, total - metadata.dated_total),
    days,
  };
}
