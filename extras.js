(() => {
  'use strict';

  const STEMS = ['甲','乙','丙','丁','戊','己','庚','辛','壬','癸'];
  const BRANCHES = ['子','丑','寅','卯','辰','巳','午','未','申','酉','戌','亥'];
  const STEM_ELEMENT = {甲:'木',乙:'木',丙:'火',丁:'火',戊:'土',己:'土',庚:'金',辛:'金',壬:'水',癸:'水'};
  const BRANCH_ELEMENT = {子:'水',丑:'土',寅:'木',卯:'木',辰:'土',巳:'火',午:'火',未:'土',申:'金',酉:'金',戌:'土',亥:'水'};
  const ZODIAC = {子:'鼠',丑:'牛',寅:'虎',卯:'兔',辰:'龙',巳:'蛇',午:'马',未:'羊',申:'猴',酉:'鸡',戌:'狗',亥:'猪'};
  const LIUHE = new Set(['子丑','丑子','寅亥','亥寅','卯戌','戌卯','辰酉','酉辰','巳申','申巳','午未','未午']);
  const CHONG = new Set(['子午','午子','丑未','未丑','寅申','申寅','卯酉','酉卯','辰戌','戌辰','巳亥','亥巳']);
  const SANHE_GROUPS = [new Set(['申','子','辰']),new Set(['亥','卯','未']),new Set(['寅','午','戌']),new Set(['巳','酉','丑'])];

  const NAYIN_PAIRS = [
    '海中金','炉中火','大林木','路旁土','剑锋金','山头火',
    '涧下水','城头土','白蜡金','杨柳木','泉中水','屋上土',
    '霹雳火','松柏木','长流水','沙中金','山下火','平地木',
    '壁上土','金箔金','覆灯火','天河水','大驿土','钗钏金',
    '桑柘木','大溪水','沙中土','天上火','石榴木','大海水'
  ];

  const LUNAR_DAY_NAMES = [
    '初一','初二','初三','初四','初五','初六','初七','初八','初九','初十',
    '十一','十二','十三','十四','十五','十六','十七','十八','十九','二十',
    '廿一','廿二','廿三','廿四','廿五','廿六','廿七','廿八','廿九','三十'
  ];

  const $ = (id) => document.getElementById(id);
  const mod = (n,m) => ((n % m) + m) % m;

  function gregorianToJdn(year, month, day) {
    const a = Math.floor((14 - month) / 12);
    const y = year + 4800 - a;
    const m = month + 12 * a - 3;
    return day + Math.floor((153*m+2)/5) + 365*y + Math.floor(y/4) - Math.floor(y/100) + Math.floor(y/400) - 32045;
  }

  function dayPillar(date) {
    const jdn = gregorianToJdn(date.getFullYear(), date.getMonth()+1, date.getDate());
    const index = mod(jdn + 49, 60);
    return {
      index,
      stem: STEMS[index % 10],
      branch: BRANCHES[index % 12],
      text: STEMS[index % 10] + BRANCHES[index % 12]
    };
  }

  function hourBranch(date) {
    const hour = date.getHours();
    const idx = hour === 23 ? 0 : Math.floor((hour + 1) / 2) % 12;
    return BRANCHES[idx];
  }

  function lunarInfo(date) {
    try {
      const fmt = new Intl.DateTimeFormat('zh-CN-u-ca-chinese', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
      if (fmt.resolvedOptions().calendar !== 'chinese') throw new Error('Unsupported calendar');
      const parts = fmt.formatToParts(date);
      const pick = (type) => parts.find(p => p.type === type)?.value || '';
      const yearName = pick('yearName');
      const month = pick('month');
      const dayRaw = Number(pick('day'));
      const day = Number.isFinite(dayRaw) && dayRaw >= 1 && dayRaw <= 30 ? LUNAR_DAY_NAMES[dayRaw - 1] : pick('day');
      const yearBranch = yearName ? yearName.slice(-1) : '';
      const zodiac = ZODIAC[yearBranch] || '';
      return {
        text: `农历${yearName ? yearName + '年 ' : ''}${month}${day}`,
        short: `${month}${day}`,
        yearName,
        zodiac
      };
    } catch (_) {
      return {text:'农历换算暂不可用', short:'--', yearName:'', zodiac:''};
    }
  }

  function branchRelation(dayBranch, hourBranchValue) {
    if (dayBranch === hourBranchValue) return '同支';
    const pair = dayBranch + hourBranchValue;
    if (LIUHE.has(pair)) return '六合';
    if (CHONG.has(pair)) return '六冲';
    if (SANHE_GROUPS.some(group => group.has(dayBranch) && group.has(hourBranchValue))) return '三合';
    return '平';
  }

  function renderExtras() {
    const now = window.HuangliCalendar.date();
    const lunar = lunarInfo(now);
    const pillar = dayPillar(now);
    const hour = hourBranch(now);
    const opposite = BRANCHES[(BRANCHES.indexOf(pillar.branch) + 6) % 12];
    const relation = branchRelation(pillar.branch, hour);
    const nayin = NAYIN_PAIRS[Math.floor(pillar.index / 2)];
    const dayElement = STEM_ELEMENT[pillar.stem];
    const hourElement = BRANCH_ELEMENT[hour];

    const lunarText = $('lunarText');
    if (lunarText) lunarText.textContent = `${lunar.text}${lunar.zodiac ? ' · ' + lunar.zodiac + '年' : ''}`;

    if ($('zodiacBadge')) $('zodiacBadge').textContent = lunar.zodiac ? `${lunar.zodiac}年` : '农历';
    if ($('metaLunar')) $('metaLunar').textContent = lunar.short;
    if ($('metaNayin')) $('metaNayin').textContent = `${pillar.text} · ${nayin}`;
    if ($('metaChong')) $('metaChong').textContent = `${pillar.branch}日冲${ZODIAC[opposite] || opposite}`;
    if ($('metaWuxing')) $('metaWuxing').textContent = `日主${dayElement} · ${hour}时${hourElement}`;
    if ($('metaRelation')) {
      const relationText = relation === '平'
        ? `${hour}时与所选日${pillar.branch}日无明显六合、六冲或三合关系。`
        : `${hour}时与所选日${pillar.branch}日形成「${relation}」关系，已作为时辰评分的一部分。`;
      $('metaRelation').textContent = relationText;
    }
  }

  document.addEventListener('reading-date-change', renderExtras);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) renderExtras(); });
  renderExtras();
  setInterval(renderExtras, 60 * 1000);
})();
