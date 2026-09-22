(() => {
  'use strict';

  const STEMS = ['甲','乙','丙','丁','戊','己','庚','辛','壬','癸'];
  const BRANCHES = ['子','丑','寅','卯','辰','巳','午','未','申','酉','戌','亥'];
  const STEM_ELEMENT = { 甲:'木',乙:'木',丙:'火',丁:'火',戊:'土',己:'土',庚:'金',辛:'金',壬:'水',癸:'水' };
  const BRANCH_ELEMENT = { 子:'水',丑:'土',寅:'木',卯:'木',辰:'土',巳:'火',午:'火',未:'土',申:'金',酉:'金',戌:'土',亥:'水' };
  const ELEMENT_DIRECTION = { 木:'东',火:'南',土:'中宫',金:'西',水:'北' };
  const ELEMENT_COLOR = { 木:'青绿',火:'朱红',土:'米黄',金:'银白',水:'玄黑' };
  const HOUR_LABELS = [
    {branch:'子',label:'子时',range:'23:00–01:00'}, {branch:'丑',label:'丑时',range:'01:00–03:00'},
    {branch:'寅',label:'寅时',range:'03:00–05:00'}, {branch:'卯',label:'卯时',range:'05:00–07:00'},
    {branch:'辰',label:'辰时',range:'07:00–09:00'}, {branch:'巳',label:'巳时',range:'09:00–11:00'},
    {branch:'午',label:'午时',range:'11:00–13:00'}, {branch:'未',label:'未时',range:'13:00–15:00'},
    {branch:'申',label:'申时',range:'15:00–17:00'}, {branch:'酉',label:'酉时',range:'17:00–19:00'},
    {branch:'戌',label:'戌时',range:'19:00–21:00'}, {branch:'亥',label:'亥时',range:'21:00–23:00'}
  ];
  const MODES = {
    ranked:{key:'ranked',name:'排位',glyph:'剑',main:'金',secondary:'火',desc:'纪律、决断、执行'},
    aram:{key:'aram',name:'ARAM',glyph:'焰',main:'火',secondary:'水',desc:'爆发、流动、随机应变'},
    tft:{key:'tft',name:'TFT',glyph:'弈',main:'水',secondary:'土',desc:'观察、运营、积累'}
  };
  const LIUHE = new Set(['子丑','丑子','寅亥','亥寅','卯戌','戌卯','辰酉','酉辰','巳申','申巳','午未','未午']);
  const CHONG = new Set(['子午','午子','丑未','未丑','寅申','申寅','卯酉','酉卯','辰戌','戌辰','巳亥','亥巳']);
  const SANHE_GROUPS = [new Set(['申','子','辰']),new Set(['亥','卯','未']),new Set(['寅','午','戌']),new Set(['巳','酉','丑'])];
  const PROFILE_KEY = 'shangfenHuangliProfileV1';

  let selectedMode = 'ranked';
  let reading = null;
  let toastTimer = null;

  const $ = (id) => document.getElementById(id);
  const mod = (n,m) => ((n % m) + m) % m;
  const clamp = (n,min,max) => Math.max(min, Math.min(max,n));

  function gregorianToJdn(year, month, day) {
    const a = Math.floor((14 - month) / 12);
    const y = year + 4800 - a;
    const m = month + 12 * a - 3;
    return day + Math.floor((153*m+2)/5) + 365*y + Math.floor(y/4) - Math.floor(y/100) + Math.floor(y/400) - 32045;
  }

  function dayPillar(date) {
    const jdn = gregorianToJdn(date.getFullYear(), date.getMonth()+1, date.getDate());
    const index = mod(jdn + 49, 60);
    const stem = STEMS[index % 10];
    const branch = BRANCHES[index % 12];
    return {index,stem,branch,text:stem+branch,jdn};
  }

  function hourBranchIndex(hour) {
    if (hour === 23) return 0;
    return Math.floor((hour + 1) / 2) % 12;
  }

  function elementRelationScore(source,target) {
    if (source === target) return 6;
    const produce = {木:'火',火:'土',土:'金',金:'水',水:'木'};
    const control = {木:'土',土:'水',水:'火',火:'金',金:'木'};
    if (produce[source] === target) return 9;
    if (produce[target] === source) return 4;
    if (control[source] === target) return -8;
    if (control[target] === source) return -4;
    return 0;
  }

  function branchRelationScore(a,b) {
    if (a === b) return 4;
    if (LIUHE.has(a+b)) return 9;
    if (CHONG.has(a+b)) return -13;
    if (SANHE_GROUPS.some(group => group.has(a) && group.has(b))) return 6;
    return 0;
  }

  function calcMingGongBranch(lunarMonth,birthHourIndex) {
    const monthBase = mod(2 + (Number(lunarMonth)-1), 12);
    return BRANCHES[mod(monthBase - Number(birthHourIndex), 12)];
  }

  function getProfile() {
    try {
      const raw = localStorage.getItem(PROFILE_KEY);
      if (!raw) return null;
      const p = JSON.parse(raw);
      if (p && p.enabled && p.lunarMonth && Number.isInteger(p.birthHourIndex)) {
        return {...p, mingGongBranch:calcMingGongBranch(p.lunarMonth,p.birthHourIndex)};
      }
    } catch (_) {}
    return null;
  }

  function getStoredProfileForm() {
    try {
      const raw = localStorage.getItem(PROFILE_KEY);
      if (raw) return JSON.parse(raw);
    } catch (_) {}
    return {enabled:false,lunarMonth:1,birthHourIndex:0};
  }

  function scoreLabel(score,modeKey) {
    if (score >= 86) return modeKey === 'ranked' ? '大吉 · 冲�n' : '大吉 · 开玩';
    if (score >= 74) return modeKey === 'ranked' ? '吉 · 可排' : '吉 · 很合适';
    if (score >= 62) return '平吉 · 稳着来';
    if (score >= 50) return modeKey === 'ranked' ? '平 · 少排' : '平 · 随缘玩';
    return modeKey === 'ranked' ? '避战 · 别硬排' : '小凶 · 换个模式';
  }

  function scoreTone(score) {
    if (score >= 86) return 'excellent';
    if (score >= 74) return 'good';
    if (score >= 62) return 'okay';
    if (score >= 50) return 'caution';
    return 'bad';
  }

  function scoreMode({pillar,hourBranch,mode,profile}) {
    let score = 58;
    const dayStemElement = STEM_ELEMENT[pillar.stem];
    const dayBranchElement = BRANCH_ELEMENT[pillar.branch];
    const hourElement = BRANCH_ELEMENT[hourBranch];
    score += elementRelationScore(dayStemElement,mode.main);
    score += Math.round(elementRelationScore(dayBranchElement,mode.secondary)*0.7);
    score += Math.round(elementRelationScore(hourElement,mode.main)*1.2);
    score += branchRelationScore(pillar.branch,hourBranch);
    if (profile && profile.mingGongBranch) score += Math.round(branchRelationScore(profile.mingGongBranch,hourBranch)*0.65);
    const salt = {ranked:3,aram:11,tft:19}[mode.key];
    score += mod(pillar.jdn + BRANCHES.indexOf(hourBranch)*7 + salt,5)-2;
    return clamp(score,25,96);
  }

  function buildDayReading(date,profile) {
    const pillar = dayPillar(date);
    const nowIdx = hourBranchIndex(date.getHours());
    const currentBranch = BRANCHES[nowIdx];
    const modes = Object.values(MODES).map(mode => {
      const score = scoreMode({pillar,hourBranch:currentBranch,mode,profile});
      return {...mode,score,label:scoreLabel(score,mode.key),tone:scoreTone(score)};
    }).sort((a,b)=>b.score-a.score);
    const slots = HOUR_LABELS.map((h,index) => {
      const scores = {};
      Object.values(MODES).forEach(mode => { scores[mode.key] = scoreMode({pillar,hourBranch:h.branch,mode,profile}); });
      return {...h,index,current:index===nowIdx,scores};
    });
    const bestByMode = {};
    Object.values(MODES).forEach(mode => {
      bestByMode[mode.key] = slots.map(s=>({...s,score:s.scores[mode.key]})).sort((a,b)=>b.score-a.score).slice(0,3);
    });
    const mainElement = STEM_ELEMENT[pillar.stem];
    return {pillar,currentHour:HOUR_LABELS[nowIdx],modes,bestMode:modes[0],slots,bestByMode,
      fengshui:{element:mainElement,direction:ELEMENT_DIRECTION[mainElement],color:ELEMENT_COLOR[mainElement]}};
  }

  function formatDate(date) {
    const week = ['日','一','二','三','四','五','六'][date.getDay()];
    return `${date.getFullYear()}年${date.getMonth()+1}月${date.getDate()}日 · 周${week}`;
  }

  function escapeHtml(value) {
    return String(value).replace(/[&<>'"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
  }

  function render() {
    const now = new Date();
    const profile = getProfile();
    reading = buildDayReading(now,profile);
    $('todayText').textContent = formatDate(now);
    $('pillarText').textContent = reading.pillar.text;
    $('bestModeName').textContent = reading.bestMode.name;
    $('bestModeScore').textContent = reading.bestMode.score;
    $('bestModeLabel').textContent = reading.bestMode.label;
    $('currentHourText').textContent = `${reading.currentHour.label} ${reading.currentHour.range}`;
    $('fengshuiText').textContent = `宜向${reading.fengshui.direction} · ${reading.fengshui.color}`;

    const tip = $('profileTipText');
    const dot = $('profileDot');
    if (profile) {
      tip.textContent = `已启用命宫加成：命宫在 ${profile.mingGongBranch} 宫`;
      dot.classList.remove('dim');
    } else {
      tip.textContent = '未启用个性化命宫 · 点此设置农历生月与出生时辰';
      dot.classList.add('dim');
    }

    $('modeList').innerHTML = reading.modes.map(item => `
      <article class="mode card ${item.tone}">
        <div class="mode-glyph">${escapeHtml(item.glyph)}</div>
        <div class="mode-body">
          <div class="mode-head"><span class="mode-name">${escapeHtml(item.name)}</span><span class="mode-score">${item.score}</span></div>
          <div class="mode-label">${escapeHtml(item.label)}</div>
          <div class="mode-desc">${escapeHtml(item.desc)}</div>
        </div>
      </article>`).join('');
    renderModeSection();
  }

  function renderModeSection() {
    if (!reading) return;
    document.querySelectorAll('.tab').forEach(tab => tab.classList.toggle('active',tab.dataset.mode === selectedMode));
    $('hoursGrid').innerHTML = reading.slots.map(slot => {
      const score = slot.scores[selectedMode];
      return `<article class="hour card ${scoreTone(score)} ${slot.current?'current':''}">
        <div class="hour-top"><span class="hour-name">${slot.label}</span><span class="hour-score">${score}</span></div>
        <div class="hour-range">${slot.range}</div>
        <div class="hour-verdict">${scoreLabel(score,selectedMode)}</div>
        ${slot.current?'<span class="now-pill">此刻</span>':''}
      </article>`;
    }).join('');
    $('bestTitle').textContent = `${MODES[selectedMode].name} 黄金三时辰`;
    $('bestRows').innerHTML = reading.bestByMode[selectedMode].map((item,index)=>`<div class="best-row"><span>${index+1}. ${item.label} · ${item.range}</span><span class="gold">${item.score}分</span></div>`).join('');
  }

  function fillProfileForm() {
    const months = ['正月','二月','三月','四月','五月','六月','七月','八月','九月','十月','冬月','腊月'];
    $('lunarMonth').innerHTML = months.map((m,i)=>`<option value="${i+1}">${m}</option>`).join('');
    $('birthHour').innerHTML = HOUR_LABELS.map((h,i)=>`<option value="${i}">${h.label} · ${h.range}</option>`).join('');
    const p = getStoredProfileForm();
    $('profileEnabled').checked = !!p.enabled;
    $('lunarMonth').value = String(p.lunarMonth || 1);
    $('birthHour').value = String(Number.isInteger(p.birthHourIndex) ? p.birthHourIndex : 0);
    updateMingPreview();
  }

  function updateMingPreview() {
    const branch = calcMingGongBranch(Number($('lunarMonth').value), Number($('birthHour').value));
    $('mingGongText').textContent = `命宫在 ${branch} 宫`;
  }

  function openProfile() {
    fillProfileForm();
    $('profileModal').hidden = false;
    document.body.style.overflow = 'hidden';
  }

  function closeProfile() {
    $('profileModal').hidden = true;
    document.body.style.overflow = '';
  }

  function saveProfile() {
    const p = {
      enabled:$('profileEnabled').checked,
      lunarMonth:Number($('lunarMonth').value),
      birthHourIndex:Number($('birthHour').value)
    };
    localStorage.setItem(PROFILE_KEY,JSON.stringify(p));
    closeProfile();
    render();
    showToast('命盘设置已保存');
  }

  async function shareReading() {
    if (!reading) return;
    const best = reading.bestMode;
    const bestSlot = reading.bestByMode[best.key][0];
    const text = `上分黄历｜${formatDate(new Date())}\n此刻宜玩：${best.name} ${best.score}分（${best.label}）\n今日黄金时辰：${bestSlot.label} ${bestSlot.range}`;
    try {
      if (navigator.share) {
        await navigator.share({title:'上分黄历',text,url:location.href});
      } else if (navigator.clipboard) {
        await navigator.clipboard.writeText(`${text}\n${location.href}`);
        showToast('今日上分签已复制');
      } else {
        window.prompt('复制下面内容分享给朋友：',`${text}\n${location.href}`);
      }
    } catch (err) {
      if (err && err.name !== 'AbortError') showToast('分享失败，请复制浏览器地址');
    }
  }

  function showToast(message) {
    const toast = $('toast');
    toast.textContent = message;
    toast.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(()=>toast.classList.remove('show'),1800);
  }

  document.querySelectorAll('.tab').forEach(tab => tab.addEventListener('click',()=>{
    selectedMode = tab.dataset.mode;
    renderModeSection();
  }));
  $('profileBtn').addEventListener('click',openProfile);
  $('profileTip').addEventListener('click',openProfile);
  $('closeProfileBtn').addEventListener('click',closeProfile);
  $('profileModal').addEventListener('click',(e)=>{ if (e.target === $('profileModal')) closeProfile(); });
  $('lunarMonth').addEventListener('change',updateMingPreview);
  $('birthHour').addEventListener('change',updateMingPreview);
  $('saveProfileBtn').addEventListener('click',saveProfile);
  $('shareBtn').addEventListener('click',shareReading);
  document.addEventListener('keydown',(e)=>{ if (e.key === 'Escape' && !$('profileModal').hidden) closeProfile(); });

  render();
  setInterval(render, 60 * 1000);
})();
