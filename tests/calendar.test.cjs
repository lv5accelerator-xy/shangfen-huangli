const {test} = require('node:test');
const assert = require('node:assert/strict');
const {readFileSync} = require('node:fs');
const vm = require('node:vm');
function setup(profile, blocked=false) {
  const nodes = new Map(), events = new Map(), storage = new Map();
  if (profile !== undefined) storage.set('shangfenHuangliProfileV1', JSON.stringify(profile));
  const node = id => {
    if (!nodes.has(id)) nodes.set(id,{value:'',textContent:'',hidden:true,dataset:{},classList:{add(){},remove(){},toggle(){}},listeners:{},addEventListener(k,f){this.listeners[k]=f;},setAttribute(){},focus(){}});
    return nodes.get(id);
  };
  const document = {getElementById:node,querySelectorAll:()=>[],body:{classList:{add(){},remove(){}},style:{}},addEventListener(k,f){events.set(k,[...(events.get(k)||[]),f]);},dispatchEvent(e){for(const f of events.get(e.type)||[])f();}};
  const context = vm.createContext({window:{},document,Intl,Date,Event,setInterval(){},setTimeout(){},clearTimeout(){},localStorage:{getItem:k=>storage.get(k)||null,setItem(k,v){if(blocked)throw Error('blocked');storage.set(k,v);}}});
  for(const file of ['calendar.js','app.js','extras.js','onboarding.js'])vm.runInContext(readFileSync(file,'utf8'),context);
  return {calendar:context.window.HuangliCalendar,node,storage};
}
const profile={enabled:true,lunarMonth:1,birthHourIndex:0};
test('validates calendar boundaries and leap days',()=>{
 const {calendar:c}=setup(profile);
 assert.equal(c.parse('2025-02-29'),null);
 assert.equal(c.parse('2026-04-31'),null);
 assert.equal(c.parse('1899-12-31'),null);
 assert.equal(c.parse('2101-01-01'),null);
 assert.equal(c.key(c.parse('2024-02-29')),'2024-02-29');
});
test('rejects corrupt profiles, accepts intentionally disabled valid profile',()=>{
 const {calendar:c}=setup(profile);
 for(const p of [null,{}, {...profile,lunarMonth:1.5},{...profile,lunarMonth:13},{...profile,birthHourIndex:-1},{...profile,birthHourIndex:12}])assert.equal(c.validProfile(p),false);
 assert.equal(c.validProfile({...profile,enabled:false}),true);
 assert.equal(setup({...profile,enabled:false}).node('onboardingModal').hidden,true);
});
test('selected date updates all calendar surfaces and removes live marker',()=>{
 const {calendar:c,node}=setup(profile);
 c.select('2024-02-10');
 assert.match(node('todayText').textContent,/2024年2月10日/);
 assert.match(node('lunarText').textContent,/正月初一/);
 assert.match(node('heroKicker').textContent,/所选日/);
 assert.doesNotMatch(node('hoursGrid').innerHTML,/now-pill/);
 const pillar=node('pillarText').textContent;
 assert.ok(node('metaNayin').textContent.startsWith(pillar));
 node('nextDate').listeners.click();
 assert.match(node('todayText').textContent,/2月11日/);
 node('todayBtn').listeners.click();
 assert.equal(node('readingDate').value,c.key(new Date()));
 assert.match(node('hoursGrid').innerHTML,/now-pill/);
});
test('first-run blocks future date and missing input; saves valid lunar conversion',()=>{
 const {node,storage}=setup();
 assert.equal(node('app').inert,true);
 node('onboardingSaveBtn').listeners.click();
 assert.match(node('onboardingError').textContent,/请先填写/);
 node('onboardingBirthDate').value='2100-01-01';node('onboardingBirthTime').value='23:30';
 node('onboardingSaveBtn').listeners.click();
 assert.match(node('onboardingError').textContent,/出生日期须/);
 node('onboardingBirthDate').value='2000-02-05';
 node('onboardingSaveBtn').listeners.click();
 const p=JSON.parse(storage.get('shangfenHuangliProfileV1'));
 assert.equal(p.lunarMonth,1); assert.equal(p.birthHourIndex,0);
 assert.equal(node('onboardingModal').hidden,true);assert.equal(node('app').inert,false);
 assert.match(node('profileTipText').textContent,/已启用/);
});
test('storage denial leaves gate open and shows recovery message',()=>{
 const {node}=setup(undefined,true);
 node('onboardingBirthDate').value='2000-02-05';node('onboardingBirthTime').value='12:00';
 node('onboardingSaveBtn').listeners.click();
 assert.equal(node('onboardingModal').hidden,false);assert.match(node('onboardingError').textContent,/无法保存/);
});
