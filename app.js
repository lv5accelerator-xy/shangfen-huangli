(() => {
  'use strict';

  const calendar = window.HuangliCalendar;
  const {BRANCHES,STEM_ELEMENT,BRANCH_ELEMENT,HOUR_LABELS,dayPillar,branchRelationScore} = calendar;
  const ELEMENT_DIRECTION = { 木:'东',火:'南',土:'中宫',金:'西',水:'北' };
  const ELEMENT_COLOR = { 木:'青绿',火:'朱红',土:'米黄',金:'银白',水:'玄黑' };
  const MODES = {
    ranked:{key:'ranked',name:'排位',glyph:'剑',main:'金',secondary:'火',desc:'纪律、决断、执行'},
    aram:{key:'aram',name:'ARAM',glyph:'焰',main:'火',secondary:'水',desc:'爆发、流动、随机应变'},
    tft:{key:'tft',name:'TFT',glyph:'弈',main:'水',secondary:'土',desc:'观察、运营、积累'}
  };
  const PROFILE_KEY = 'shangfenHuangliProfileV1';

  let selectedMode = 'ranked';
  let reading = null;
  let toastTimer = null;
  let profileOpener = null;

  const $ = (id) => document.getElementById(id);
  const mod = (n,m) => ((n % m) + m) % m;
  const clamp = (n,min,max) => Math.max(min, Math.min(max,n));

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

  function calcMingGongBranch(lunarMonth,birthHourIndex) {
    const monthBase = mod(2 + (Number(lunarMonth)-1), 12);
    return BRANCHES[mod(monthBase - Number(birthHourIndex), 12)];
  }

  function getProfile() {
    try {
      const raw = localStorage.getItem(PROFILE_KEY);
      if (!raw) return null;
      const p = JSON.parse(raw);
      if (calendar.validProfile(p) && p.enabled) {
        return {...p, mingGongBranch:calcMingGongBranch(p.lunarMonth,p.birthHourIndex)};
      }
    } catch (_) {}
    return null;
  }

  function getStoredProfileForm() {
    try {
      const raw = localStorage.getItem(PROFILE_KEY);
      if (raw) { const p = JSON.parse(raw); if (calendar.validProfile(p)) return p; }
    } catch (_) {}
    return {enabled:false,lunarMonth:1,birthHourIndex:0};
  }

  function scoreLabel(score,modeKey) {
    if (score >= 86) return modeKey === 'ranked' ? '大吉 · 冲分' : '大吉 · 开玩';
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

  function buildDayReading(clock,profile) {
    const {date,isToday,hourIndex:nowIdx} = clock;
    const pillar = dayPillar(date);
    const currentBranch = BRANCHES[nowIdx];
    const modes = Object.values(MODES).map(mode => {
      const score = scoreMode({pillar,hourBranch:currentBranch,mode,profile});
      return {...mode,score,label:scoreLabel(score,mode.key),tone:scoreTone(score)};
    }).sort((a,b)=>b.score-a.score);
    const slots = HOUR_LABELS.map((h,index) => {
      const scores = {};
      Object.values(MODES).forEach(mode => { scores[mode.key] = scoreMode({pillar,hourBranch:h.branch,mode,profile}); });
      return {...h,index,current:isToday && index===nowIdx,scores};
    });
    const bestByMode = {};
    Object.values(MODES).forEach(mode => {
      bestByMode[mode.key] = slots.map(s=>({...s,score:s.scores[mode.key]})).sort((a,b)=>b.score-a.score).slice(0,3);
    });
    const mainElement = STEM_ELEMENT[pillar.stem];
    return {date,isToday,pillar,currentHour:HOUR_LABELS[nowIdx],modes,bestMode:modes[0],slots,bestByMode,
      fengshui:{element:mainElement,direction:ELEMENT_DIRECTION[mainElement],color:ELEMENT_COLOR[mainElement]}};
  }

  function formatDate(date) {
    const week = ['日','一','二','三','四','五','六'][date.getDay()];
    return `${date.getFullYear()}年${date.getMonth()+1}月${date.getDate()}日 · 周${week}`;
  }

  function escapeHtml(value) {
    return String(value).replace(/[&<>'"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
  }

  function publishReading(profile) {
    if (!reading) return;
    const goldenHours = {};
    Object.entries(reading.bestByMode).forEach(([key, rows]) => {
      goldenHours[key] = rows.map(item => ({label:item.label, range:item.range, score:item.score}));
    });
    window.HuangliReading = {
      version: 1,
      date: calendar.key(reading.date),
      isToday: reading.isToday,
      pillarInfo: {...reading.pillar},
      lunar: calendar.lunarInfo(reading.date),
      pillar: reading.pillar.text,
      currentHour: {
        branch: reading.currentHour.branch,
        label: reading.currentHour.label,
        range: reading.currentHour.range
      },
      bestMode: {
        key: reading.bestMode.key,
        name: reading.bestMode.name,
        score: reading.bestMode.score,
        label: reading.bestMode.label
      },
      modes: reading.modes.map(item => ({
        key:item.key,
        name:item.name,
        score:item.score,
        label:item.label,
        desc:item.desc
      })),
      goldenHours,
      fengshui: {...reading.fengshui},
      profile: profile ? {mingGongBranch: profile.mingGongBranch} : null
    };
    document.dispatchEvent(new Event('huangli-reading'));
  }

  function render() {
    const clock = calendar.snapshot();
    const {date:now,isToday} = clock;
    const profile = getProfile();
    reading = buildDayReading(clock,profile);
    $('todayText').textContent = formatDate(now);
    $('readingDate').value = calendar.key(now);
    $('prevDate').disabled = calendar.key(now) === '1900-01-01';
    $('nextDate').disabled = calendar.key(now) === '2100-12-31';
    $('heroKicker').textContent = isToday ? '此刻宜玩' : '所选日 · 同时辰推荐';
    $('modesTitle').textContent = isToday ? '现在打什么' : '所选日同时辰打什么';
    $('calendarNote').textContent = `按设备本地时间（${Intl.DateTimeFormat().resolvedOptions().timeZone}）计算；${isToday ? '每分钟自动更新' : '预览采用当前钟点，不是实时运势'}。子时含当日 00–01 时与 23–24 时，日柱按零点换日。`;
    $('battleEyebrow').textContent = isToday ? '今日战局 · 娱乐占测' : clock.key + ' · 战局预览';
    $('aiFortuneEyebrow').textContent = isToday ? 'AI READY · 今日上分签' : 'AI READY · ' + clock.key + ' 上分签预览';
    $('metaphysicsEyebrow').textContent = isToday ? '传统历法 · 今日玄历' : '传统历法 · 所选日玄历';
    $('cultureTitle').textContent = isToday ? '今天怎么看？' : '这天怎么看？';
    $('metaphysicsTitle').textContent = isToday ? '今日命理速览' : '所选日命理速览';
    $('shareBtn').textContent = isToday ? '分享今日上分签' : '分享这天的上分签';
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
    publishReading(profile);
  }

  function renderModeSection() {
    if (!reading) return;
    document.querySelectorAll('.tab').forEach(tab => { const active = tab.dataset.mode === selectedMode; tab.classList.toggle('active',active); tab.setAttribute('aria-selected', String(active)); });
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

  function openProfile(event) {
    profileOpener = event.currentTarget;
    fillProfileForm();
    $('profileModal').hidden = false;
    document.body.style.overflow = 'hidden';
    $('app').inert = true;
    $('closeProfileBtn').focus();
  }

  function closeProfile(restoreFocus = true) {
    $('profileModal').hidden = true;
    document.body.style.overflow = '';
    $('app').inert = false;
    if (restoreFocus) (profileOpener || $('profileBtn')).focus();
  }

  function saveProfile() {
    const p = {
      enabled:$('profileEnabled').checked,
      lunarMonth:Number($('lunarMonth').value),
      birthHourIndex:Number($('birthHour').value)
    };
    try { localStorage.setItem(PROFILE_KEY,JSON.stringify(p)); }
    catch (_) { showToast('无法保存，请允许浏览器存储后重试'); return; }
    closeProfile();
    render();
    showToast('命盘设置已保存');
  }

  function clearProfile() {
    try { localStorage.removeItem(PROFILE_KEY); }
    catch (_) { showToast('无法清除，请允许浏览器存储后重试'); return; }
    closeProfile(false);
    render();
    document.dispatchEvent(new Event('profile-cleared'));
    showToast('本地命盘资料已清除，请重新填写');
  }

  async function shareReading() {
    if (!reading) return;
    render();
    const best = reading.bestMode;
    const bestSlot = reading.bestByMode[best.key][0];
    const text = `上分黄历｜${formatDate(reading.date)}\n${reading.isToday ? '此刻推荐' : '所选日同时辰推荐'}：${best.name} ${best.score}分（${best.label}）\n当日黄金时辰：${bestSlot.label} ${bestSlot.range}`;
    try {
      if (navigator.share) {
        await navigator.share({title:'上分黄历',text,url:location.href});
      } else if (navigator.clipboard) {
        await navigator.clipboard.writeText(`${text}\n${location.href}`);
        showToast(reading.isToday ? '今日上分签已复制' : '所选日上分签已复制');
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
  $('clearProfileBtn').addEventListener('click',clearProfile);
  $('shareBtn').addEventListener('click',shareReading);
  document.addEventListener('keydown',(e)=>{ if (e.key === 'Escape' && !$('profileModal').hidden) closeProfile(); });

  $('readingDate').addEventListener('change', () => { if (!calendar.select($('readingDate').value)) { showToast('请选择 1900–2100 年间的有效日期'); render(); } });
  for (const [id,step] of [['prevDate',-1],['nextDate',1]]) $(id).addEventListener('click', () => {
    const date = calendar.date(); date.setDate(date.getDate()+step); calendar.select(calendar.key(date));
  });
  $('todayBtn').addEventListener('click', () => calendar.select(calendar.key(new Date())));
  document.addEventListener('reading-date-change', render);
  document.addEventListener('reading-refresh', render);
  window.addEventListener('pageshow', render);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) render(); });
  render();
  setInterval(render, 60 * 1000);
})();
