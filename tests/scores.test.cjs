const {test}=require('node:test');
const assert=require('node:assert/strict');
const {setup}=require('./helpers/runtime.cjs');
// Captured from main cb01f71 before changing production code.
const fixtures=require('./score-fixtures.json');
process.env.TZ='America/Toronto';
for(const row of fixtures)test(`original scores ${row.date}, profile ${JSON.stringify(row.profile)}`,()=>{
  const s=setup({now:'2026-10-15T02:30:00-04:00',profile:row.profile});
  s.window.HuangliCalendar.select(row.date);
  assert.deepEqual(JSON.parse(JSON.stringify(s.window.HuangliReading.modes)),row.modes);
  assert.deepEqual(JSON.parse(JSON.stringify(s.window.HuangliReading.goldenHours)),row.goldenHours);
  const scores=[...s.node('hoursGrid').innerHTML.matchAll(/class="hour-score">(\d+)/g)].map(m=>Number(m[1]));
  assert.deepEqual(scores,row.hourScores);
});
