const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ROOT = path.resolve(__dirname, '../..');
const PROFILE_KEY = 'shangfenHuangliProfileV1';
const profile = {enabled:true,lunarMonth:1,birthHourIndex:0};
const flush = async () => { for (let i=0;i<20;i++) await Promise.resolve(); };

function setup(options={}) {
  let now = new Date(options.now || '2026-10-15T23:59:30-04:00').getTime();
  let serial=0;
  const timers=new Map(), nodes=new Map(), storage=new Map(), requests=[], shares=[];
  const listeners=new Map();
  const listen=(type,fn)=>listeners.set(type,[...(listeners.get(type)||[]),fn]);
  const emit=(type,event={})=>{ for(const fn of listeners.get(type)||[]) fn({type,...event}); };
  const classes=()=>{
    const values=new Set();
    return {add:v=>values.add(v),remove:v=>values.delete(v),contains:v=>values.has(v),
      toggle(v,on){if(on ?? !values.has(v)) values.add(v); else values.delete(v);}};
  };
  const html=fs.readFileSync(path.join(ROOT,'index.html'),'utf8');
  let document;
  for(const match of html.matchAll(/<[^>]*\bid="([^"]+)"[^>]*>/g)) {
    const [tag,id]=match;
    nodes.set(id,{id,value:'',textContent:'',innerHTML:'',hidden:/\bhidden\b/.test(tag),disabled:false,
      checked:false,inert:false,dataset:{},style:{},classList:classes(),listeners:new Map(),
      addEventListener(type,fn){this.listeners.set(type,[...(this.listeners.get(type)||[]),fn]);},
      setAttribute(k,v){this[k]=v;},focus(){document.activeElement=this;}});
  }
  const tabs=['ranked','aram','tft'].map(mode=>({dataset:{mode},classList:classes(),listeners:new Map(),
    setAttribute(k,v){this[k]=v;},addEventListener(type,fn){this.listeners.set(type,[fn]);}}));
  document={getElementById:id=>nodes.get(id)||null,querySelectorAll:selector=>selector==='.tab'?tabs:[],
    hidden:false,body:{classList:classes(),style:{}},activeElement:null,
    addEventListener:listen,dispatchEvent:event=>emit(event.type,event)};
  if(options.profile !== null) storage.set(PROFILE_KEY,JSON.stringify(options.profile||profile));
  storage.set('unrelated-project','keep');
  const faults={get:false,set:false,remove:false,...options.faults};
  const localStorage={getItem(k){if(faults.get)throw Error('denied');return storage.get(k)||null;},
    setItem(k,v){if(faults.set)throw Error('denied');storage.set(k,v);},
    removeItem(k){if(faults.remove)throw Error('denied');storage.delete(k);},
    clear(){throw Error('Must never clear other projects');}};
  class ClockDate extends Date {
    constructor(...args){super(...(args.length?args:[now]));}
    static now(){return now;}
  }
  function schedule(fn,delay,repeat=false){const id=++serial;timers.set(id,{fn,due:now+delay,delay,repeat});return id;}
  const window={SHANGFEN_AI_ENDPOINT:options.endpoint||'',addEventListener:listen};
  const context=vm.createContext({window,document,localStorage,Date:ClockDate,Intl,Event,AbortController,
    location:{href:'http://localhost/test'},navigator:{share:async value=>shares.push(value)},
    setTimeout:(fn,delay)=>schedule(fn,delay),clearTimeout:id=>timers.delete(id),
    setInterval:(fn,delay)=>schedule(fn,delay,true),clearInterval:id=>timers.delete(id),
    fetch:(url,init)=>new Promise((resolve,reject)=>requests.push({url,init,resolve,reject}))});
  for(const file of ['calendar.js','app.js','ai-fortune.js','extras.js','onboarding.js'])
    vm.runInContext(fs.readFileSync(path.join(ROOT,file),'utf8'),context,{filename:file});
  const fire=(target,type,event={})=>Promise.all((target?.listeners.get(type)||[]).map(fn=>fn({target,currentTarget:target,type,...event})));
  async function tick(ms){
    const end=now+ms;
    for(;;){
      const next=[...timers.entries()].filter(([,t])=>t.due<=end).sort((a,b)=>a[1].due-b[1].due)[0];
      if(!next)break;
      const [id,t]=next; now=t.due;
      if(t.repeat)t.due+=t.delay;else timers.delete(id);
      t.fn(); await flush();
    }
    now=end;await flush();
  }
  return {window,document,node:id=>nodes.get(id),storage,faults,requests,shares,timers,tabs,emit,tick,
    setNow:value=>{now=new Date(value).getTime();},
    click:id=>fire(nodes.get(id),'click'),change:(id,value)=>{nodes.get(id).value=value;return fire(nodes.get(id),'change');},
    tab:mode=>fire(tabs.find(t=>t.dataset.mode===mode),'click'),
    respond:(i,payload,ok=true)=>requests[i].resolve({ok,status:ok?200:503,json:async()=>payload})};
}
module.exports={setup,flush,profile,PROFILE_KEY};
