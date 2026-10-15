(() => {
  'use strict';
  const {BRANCHES,STEM_ELEMENT,BRANCH_ELEMENT,ZODIAC,NAYIN_PAIRS,branchRelation} = window.HuangliCalendar;
  const $ = id => document.getElementById(id);
  function renderExtras() {
    const state = window.HuangliReading;
    if (!state) return;
    const {lunar,pillarInfo:pillar} = state;
    const hour = state.currentHour.branch;
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


  document.addEventListener('huangli-reading', renderExtras);
  renderExtras();
})();
