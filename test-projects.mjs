import test from 'node:test';
import assert from 'node:assert/strict';
const { fetchContributions, calendarDays } = await import('./assets/projects.mjs').catch(() => ({}));
const valid = { total: {2026: 2}, contributions: [{ date: '2026-01-01', count: 2, level: 1 }] };
test('fetches the selected year and preserves real contribution counts', async () => {
  assert.equal(typeof fetchContributions, 'function');
  const result = await fetchContributions(2026, async (url, options) => {
    assert.match(url, /Michaelvasandani\?y=2026$/);
    assert.ok(options.signal);
    return {ok:true, json:async () => valid};
  });
  assert.deepEqual(result, valid);
});
test('rejects HTTP errors and invalid payloads', async () => {
  assert.equal(typeof fetchContributions, 'function');
  await assert.rejects(fetchContributions(2026, async () => ({ok:false})), /unavailable/);
  await assert.rejects(fetchContributions(2026, async () => ({ok:true,json:async () => ({})})), /incomplete/);
});
test('positions days by weekday and includes leap day and future placeholders', () => {
  assert.equal(typeof calendarDays, 'function');
  const days = calendarDays(2024, [{date:'2024-02-29',count:4,level:2}], '2024-09-11');
  assert.equal(days.length,366);
  assert.equal(days[0].row,1);
  assert.equal(days[59].date,'2024-02-29');
  assert.equal(days[59].count,4);
  assert.equal(days[59].row,4);
  assert.equal(days.at(-1).future,true);
});

test('calendar uses year buttons and places the total outside the frame', async () => {
  const {readFile} = await import('node:fs/promises');
  const html=await readFile(new URL('./projects/index.html',import.meta.url),'utf8');
  assert.ok(!html.includes('<select'));
  assert.match(html,/id="contribution-years"/);
  assert.ok(html.indexOf('id="calendar-status"') < html.indexOf('class="calendar-frame"'));
});
