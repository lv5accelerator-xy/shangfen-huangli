const {test}=require('node:test');
const assert=require('node:assert/strict');
const {spawnSync}=require('node:child_process');
const {setup,flush,profile,PROFILE_KEY}=require('./helpers/runtime.cjs');
process.env.TZ='America/Toronto';

function consistent(s,date,hour){
  const r=s.window.HuangliReading;
  assert.equal(r.date,date);assert.equal(s.node('readingDate').value,date);
  assert.equal(r.currentHour.label,hour);
  assert.equal(s.node('pillarText').textContent,r.pillar);
  assert.ok(s.node('metaNayin').textContent.startsWith(r.pillar+' ·'));
  assert.ok(s.node('metaWuxing').textContent.includes(r.currentHour.branch+'时'));
  assert.ok(s.node('currentHourText').textContent.startsWith(hour));
  assert.equal(Number(s.node('bestModeScore').textContent),r.bestMode.score);
  assert.ok(s.node('aiFortuneSummary').textContent.includes(r.bestMode.score+' 分'));
}
const actions={share:s=>s.click('shareBtn'),save:async s=>{await s.click('profileBtn');await s.click('saveProfileBtn');},
  timer:s=>s.tick(60000),foreground:s=>{s.document.hidden=false;s.emit('visibilitychange');}};
for(const [name,action] of Object.entries(actions)) {
  test(`midnight ${name} updates every surface from the same reading`,async()=>{
    const s=setup();
    assert.match(s.node('metaLunar').textContent,/九月初六/);
    s.setNow('2026-10-16T00:00:10-04:00');await action(s);
    consistent(s,'2026-10-16','子时');assert.equal(s.window.HuangliReading.pillar,'癸亥');
    assert.match(s.node('metaLunar').textContent,/九月初七/);
    if(name==='share')assert.match(s.shares[0].text,/2026年10月16日/);
  });
  test(`hour boundary ${name} updates relations and scores`,async()=>{
    const s=setup({now:'2026-10-15T02:59:30-04:00'});
    s.setNow('2026-10-15T03:00:10-04:00');await action(s);
    consistent(s,'2026-10-15','寅时');
    assert.match(s.node('metaRelation').textContent,/寅时/);
  });
  test(`explicit preview remains fixed after midnight via ${name}`,async()=>{
    const s=setup();await s.change('readingDate','2024-02-10');
    s.setNow('2026-10-16T03:00:10-04:00');await action(s);
    consistent(s,'2024-02-10','寅时');assert.equal(s.window.HuangliReading.isToday,false);
    assert.match(s.node('metaLunar').textContent,/正月初一/);
    assert.doesNotMatch(s.node('hoursGrid').innerHTML,/now-pill/);
  });
}
test('today button follows the next date; selected tomorrow becomes today then stays fixed',async()=>{
  const s=setup();await s.change('readingDate','2026-10-16');
  s.setNow('2026-10-16T12:00:00-04:00');s.emit('visibilitychange');
  assert.equal(s.window.HuangliReading.isToday,true);
  s.setNow('2026-10-17T12:00:00-04:00');s.emit('visibilitychange');
  assert.equal(s.window.HuangliReading.date,'2026-10-16');
  await s.click('todayBtn');s.setNow('2026-10-18T12:00:00-04:00');s.emit('visibilitychange');
  assert.equal(s.window.HuangliReading.date,'2026-10-18');
});
test('one refresh timer and one publication per action; no event recursion',async()=>{
  const s=setup();let count=0;s.document.addEventListener('huangli-reading',()=>count++);
  await s.click('shareBtn');assert.equal(count,1);
  await s.tick(60000);assert.equal(count,2);
  s.emit('visibilitychange');assert.equal(count,3);
  assert.equal([...s.timers.values()].filter(t=>t.repeat).length,1);
});
const zones=[
  ['America/Toronto','2026-10-15T02:30:00-04:00','2026-03-08','丑时'],
  ['America/Toronto','2026-11-01T01:30:00-04:00','2026-03-08','丑时'],
  ['America/Toronto','2026-11-01T01:30:00-05:00','2026-03-08','丑时'],
  ['Asia/Shanghai','2026-10-15T02:30:00+08:00','2026-03-08','丑时']
];
for(const [tz,now,selected,hour] of zones)test(`preview retains local clock: ${tz} ${now}`,()=>{
  const result=spawnSync(process.execPath,['-e',`
    const {setup}=require('./tests/helpers/runtime.cjs');
    const s=setup({now:${JSON.stringify(now)}});s.window.HuangliCalendar.select(${JSON.stringify(selected)});
    console.log(JSON.stringify({date:s.window.HuangliReading.date,hour:s.window.HuangliReading.currentHour.label,wuxing:s.node('metaWuxing').textContent}));
  `],{cwd:require('node:path').resolve(__dirname,'..'),env:{...process.env,TZ:tz},encoding:'utf8'});
  assert.equal(result.status,0,result.stderr);
  const r=JSON.parse(result.stdout);assert.equal(r.date,selected);assert.equal(r.hour,hour);assert.match(r.wuxing,/丑时/);
});
test('actual spring jump and fall repeated hour follow device clock',async()=>{
  for(const [before,after,hour] of [
    ['2026-03-08T01:59:30-05:00','2026-03-08T03:00:10-04:00','寅时'],
    ['2026-11-01T01:59:30-04:00','2026-11-01T01:00:10-05:00','丑时']]) {
    const s=setup({now:before});s.setNow(after);await s.click('shareBtn');
    consistent(s,after.slice(0,10),hour);
  }
});
for(const date of ['2024-02-10','2027-02-10'])test(`preview copy identifies ${date}`,async()=>{
  const s=setup();await s.change('readingDate',date);
  assert.match(s.node('aiFortuneSummary').textContent,new RegExp(date));
  assert.doesNotMatch(s.node('aiFortuneSummary').textContent,/此刻优先|今天的节奏/);
  for(const id of ['battleEyebrow','aiFortuneEyebrow','metaphysicsEyebrow','cultureTitle']) {
    assert.ok(s.node(id),`${id} must be present`);assert.doesNotMatch(s.node(id).textContent,/今日|今天/);
  }
});
test('new onboarding stores only required fields, leap month uses same month',async()=>{
  const s=setup({profile:null});
  s.node('onboardingBirthDate').value='2023-03-22';s.node('onboardingBirthTime').value='23:30';
  await s.click('onboardingSaveBtn');
  assert.deepEqual(JSON.parse(s.storage.get(PROFILE_KEY)),{enabled:true,lunarMonth:2,birthHourIndex:0});
});
test('valid legacy profile is read without rewriting or erasing extra fields',()=>{
  const legacy={...profile,enabled:false,birthDate:'2000-02-05',birthTime:'23:30',source:'old'};
  const s=setup({profile:legacy});assert.equal(s.node('onboardingModal').hidden,true);
  assert.deepEqual(JSON.parse(s.storage.get(PROFILE_KEY)),legacy);
});
test('clear removes only project key, resets both forms, opens gate and focuses date',async()=>{
  const s=setup();await s.click('profileBtn');
  assert.ok(s.node('clearProfileBtn'),'clear entry exists');await s.click('clearProfileBtn');
  assert.equal(s.storage.has(PROFILE_KEY),false);assert.equal(s.storage.get('unrelated-project'),'keep');
  assert.equal(s.node('profileModal').hidden,true);assert.equal(s.node('onboardingModal').hidden,false);
  assert.equal(s.node('app').inert,true);assert.equal(s.document.activeElement,s.node('onboardingBirthDate'));
  assert.equal(s.window.HuangliReading.profile,null);assert.equal(s.node('onboardingBirthDate').value,'');
  assert.equal(s.node('onboardingBirthTime').value,'');
  s.emit('keydown',{key:'Escape'});assert.equal(s.node('onboardingModal').hidden,false);
});
test('clear storage exception preserves profile and open editor with recovery message',async()=>{
  const s=setup({faults:{remove:true}});await s.click('profileBtn');
  assert.ok(s.node('clearProfileBtn'));await s.click('clearProfileBtn');
  assert.equal(s.storage.has(PROFILE_KEY),true);assert.equal(s.node('profileModal').hidden,false);
  assert.match(s.node('toast').textContent,/无法清除/);
});
test('profile save exception leaves editor open; storage read denial keeps first gate',async()=>{
  const s=setup({faults:{set:true}});await s.click('profileBtn');await s.click('saveProfileBtn');
  assert.equal(s.node('profileModal').hidden,false);assert.match(s.node('toast').textContent,/无法保存/);
  const denied=setup({faults:{get:true}});assert.equal(denied.node('onboardingModal').hidden,false);
});
test('profile editor close returns focus to its actual opener',async()=>{
  const s=setup();await s.click('profileTip');await s.click('closeProfileBtn');
  assert.equal(s.document.activeElement,s.node('profileTip'));assert.equal(s.node('app').inert,false);
});

const remote={summary:'远端结果 <script>',tips:['<img src=x onerror=alert(1)>']};
const ai=()=>setup({now:'2026-10-15T12:00:00-04:00',endpoint:'/mock-ai'});
function idle(s){assert.equal(s.node('aiRefreshBtn').disabled,false);assert.equal(s.node('aiCancelBtn')?.hidden,true);}
test('no endpoint never fetches, including button and all refresh paths',async()=>{
  const s=setup();await s.click('aiRefreshBtn');await s.click('shareBtn');await s.tick(60000);s.emit('visibilitychange');
  assert.equal(s.requests.length,0);assert.equal(s.window.HuangliAIFortune.source,'local');
});
test('AI success escapes tips and keeps minimal request payload',async()=>{
  const s=ai();const pending=s.click('aiRefreshBtn');s.respond(0,remote);await pending;
  assert.equal(s.node('aiFortuneSummary').textContent,remote.summary);
  assert.match(s.node('aiFortuneTips').innerHTML,/&lt;img/);assert.doesNotMatch(s.node('aiFortuneTips').innerHTML,/<img/);
  assert.equal(s.node('aiFortuneStatus').textContent,'AI 解读');idle(s);
  assert.doesNotMatch(s.requests[0].init.body,/birthDate|birthTime/);
});
for(const [name,refresh] of Object.entries({...actions,mode:s=>s.tab('tft')}))test(`same input ${name} retains completed AI, no auto request`,async()=>{
  const s=ai();const pending=s.click('aiRefreshBtn');s.respond(0,remote);await pending;
  await refresh(s);assert.equal(s.node('aiFortuneSummary').textContent,remote.summary);
  assert.equal(s.requests.length,1);assert.equal(s.node('aiFortuneStatus').textContent,'AI 解读');
});
for(const change of ['date','profile','hour','clear'])test(`changed ${change} discards old response even if abort is ignored`,async()=>{
  const s=ai();s.click('aiRefreshBtn');
  if(change==='date')await s.change('readingDate','2024-02-10');
  if(change==='profile'){await s.click('profileBtn');s.node('lunarMonth').value='8';await s.click('saveProfileBtn');}
  if(change==='hour'){s.setNow('2026-10-15T13:01:00-04:00');s.emit('visibilitychange');}
  if(change==='clear'){assert.ok(s.node('clearProfileBtn'));await s.click('profileBtn');await s.click('clearProfileBtn');}
  assert.equal(s.requests[0].init.signal?.aborted,true);idle(s);
  const expected=s.node('aiFortuneSummary').textContent;s.respond(0,remote);await flush();
  assert.equal(s.node('aiFortuneSummary').textContent,expected);assert.equal(s.window.HuangliAIFortune.source,'local');
});
test('late old finally cannot enable button or replace a newer pending request',async()=>{
  const s=ai();s.click('aiRefreshBtn');await s.change('readingDate','2024-02-10');
  const newer=s.click('aiRefreshBtn');s.respond(0,remote);await flush();
  assert.equal(s.node('aiRefreshBtn').disabled,true);assert.equal(s.node('aiFortuneStatus').textContent,'AI 生成中');
  s.respond(1,{answer:'新日期结果'});await newer;assert.equal(s.node('aiFortuneSummary').textContent,'新日期结果');idle(s);
});
for(const payload of [{data:{outputs:{summary:'Dify',suggestions:'1. 一\n2. 二'}}},{outputs:{text:'Outputs'}},{result:{answer:'Result'}},{answer:'Answer'}])
test(`compatible AI response ${JSON.stringify(payload)}`,async()=>{
  const s=ai();const p=s.click('aiRefreshBtn');s.respond(0,payload);await p;assert.equal(s.window.HuangliAIFortune.source,'ai');
});
for(const kind of ['http','invalid','whitespace','json','network'])test(`AI ${kind} falls back and allows immediate retry`,async()=>{
  const s=ai();const p=s.click('aiRefreshBtn');
  if(kind==='network')s.requests[0].reject(Error('offline'));
  else if(kind==='json')s.requests[0].resolve({ok:true,json:async()=>{throw Error('bad json');}});
  else s.respond(0,kind==='invalid'?{}:kind==='whitespace'?{summary:'  '}:remote,kind!=='http');
  await p;assert.equal(s.window.HuangliAIFortune.source,'local');idle(s);
  assert.match(s.node('aiFortuneSource').textContent,/回退/);
  const retry=s.click('aiRefreshBtn');s.respond(1,remote);await retry;assert.equal(s.window.HuangliAIFortune.source,'ai');idle(s);
});
test('hung fetch times out, aborts, cleans timers and supports consecutive retries',async()=>{
  const s=ai();
  for(let i=0;i<3;i++) {
    s.click('aiRefreshBtn');await s.tick(15001);idle(s);
    assert.equal(s.requests[i].init.signal?.aborted,true);assert.match(s.node('aiFortuneSource').textContent,/超时/);
    assert.equal([...s.timers.values()].filter(t=>!t.repeat).length,0);
  }
  const p=s.click('aiRefreshBtn');s.respond(3,remote);await p;idle(s);
  s.respond(0,{answer:'过期'});await flush();assert.equal(s.node('aiFortuneSummary').textContent,remote.summary);
});
test('timeout also bounds a hanging response body',async()=>{
  const s=ai();s.click('aiRefreshBtn');s.requests[0].resolve({ok:true,json:()=>new Promise(()=>{})});
  await flush();await s.tick(15001);idle(s);assert.match(s.node('aiFortuneSource').textContent,/超时/);
});
test('explicit cancel and pagehide abort with local fallback; retry remains independent',async()=>{
  const s=ai();s.click('aiRefreshBtn');assert.equal(s.node('aiCancelBtn')?.hidden,false);
  await s.click('aiCancelBtn');idle(s);assert.equal(s.requests[0].init.signal.aborted,true);
  assert.match(s.node('aiFortuneSource').textContent,/取消/);
  s.click('aiRefreshBtn');s.emit('pagehide');idle(s);assert.equal(s.requests[1].init.signal.aborted,true);
  const p=s.click('aiRefreshBtn');s.respond(2,remote);await p;idle(s);
  assert.equal([...s.timers.values()].filter(t=>!t.repeat).length,0);
});
test('changed input clears completed cache; returning to old date does not retain stale AI',async()=>{
  const s=ai();const p=s.click('aiRefreshBtn');s.respond(0,remote);await p;
  await s.change('readingDate','2024-02-10');assert.equal(s.window.HuangliAIFortune.source,'local');
  await s.click('todayBtn');assert.equal(s.window.HuangliAIFortune.source,'local');assert.equal(s.requests.length,1);
});
test('same input refresh keeps a pending request and its timeout; no duplicate request',async()=>{
  const s=ai();s.click('aiRefreshBtn');await s.click('shareBtn');s.emit('visibilitychange');
  assert.equal(s.requests.length,1);assert.equal(s.requests[0].init.signal?.aborted,false);
  assert.equal(s.node('aiRefreshBtn').disabled,true);assert.equal(s.node('aiFortuneStatus').textContent,'AI 生成中');
  await s.tick(15001);idle(s);assert.match(s.node('aiFortuneSource').textContent,/超时/);
});
test('response validates unrefreshed clock change before displaying AI',async()=>{
  const s=ai();s.click('aiRefreshBtn');s.setNow('2026-10-16T03:00:10-04:00');
  s.respond(0,remote);await flush();consistent(s,'2026-10-16','寅时');
  assert.equal(s.window.HuangliAIFortune.source,'local');idle(s);
});
test('input switch cancellation settles even when fetch rejects AbortError later',async()=>{
  const s=ai();s.click('aiRefreshBtn');await s.change('readingDate','2024-02-10');
  s.requests[0].reject(Object.assign(Error('Aborted'),{name:'AbortError'}));await flush();
  assert.equal(s.window.HuangliAIFortune.source,'local');idle(s);
});
test('only interpretation inputs invalidate AI: equivalent minggong retains result',async()=>{
  const s=ai();const p=s.click('aiRefreshBtn');s.respond(0,remote);await p;
  await s.click('profileBtn');s.node('lunarMonth').value='2';s.node('birthHour').value='1';await s.click('saveProfileBtn');
  assert.equal(s.node('aiFortuneSummary').textContent,remote.summary);assert.equal(s.requests.length,1);
});
test('explicit retry supersedes pending request; old deadline cannot interrupt retry',async()=>{
  const s=ai();s.click('aiRefreshBtn');await s.tick(10000);
  const p=s.click('aiRefreshBtn');await s.tick(5001);
  assert.equal(s.requests[0].init.signal?.aborted,true);assert.equal(s.node('aiRefreshBtn').disabled,true);
  s.respond(1,remote);await p;idle(s);s.respond(0,{answer:'old'});await flush();
  assert.equal(s.node('aiFortuneSummary').textContent,remote.summary);
});
test('BFCache pageshow refreshes current reading and does not create another timer',async()=>{
  const s=setup();s.setNow('2026-10-16T03:00:10-04:00');s.emit('pageshow');
  consistent(s,'2026-10-16','寅时');assert.equal([...s.timers.values()].filter(t=>t.repeat).length,1);
});
test('editing profile disabled/enabled updates snapshot and minimal storage',async()=>{
  const s=setup({profile:{...profile,birthDate:'2000-02-05',birthTime:'23:30'}});
  await s.click('profileBtn');s.node('profileEnabled').checked=false;await s.click('saveProfileBtn');
  assert.equal(s.window.HuangliReading.profile,null);
  assert.deepEqual(JSON.parse(s.storage.get(PROFILE_KEY)),{...profile,enabled:false});
  await s.click('profileBtn');s.node('profileEnabled').checked=true;await s.click('saveProfileBtn');
  assert.equal(s.window.HuangliReading.profile.mingGongBranch,'寅');
});
