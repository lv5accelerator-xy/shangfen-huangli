(() => {
  'use strict';

  const $ = (id) => document.getElementById(id);
  let currentReading = null;
  let requestSeq = 0;

  const MODE_TIPS = {
    ranked: '排位更吃执行与心态，建议优先使用熟练英雄，不要临场大幅换位置。',
    aram: 'ARAM 更适合放松和试节奏，把阵容配合放在个人击杀前面。',
    tft: 'TFT 更适合稳运营，前中期先保经济与血量，不必强追单一阵容。'
  };

  function endpoint() {
    return String(window.SHANGFEN_AI_ENDPOINT || '').trim();
  }

  function escapeHtml(value) {
    return String(value).replace(/[&<>'"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
  }

  function localFortune(reading) {
    const best = reading.bestMode;
    const second = reading.modes[1] || best;
    const lead = Math.max(0, Number(best.score) - Number(second.score));
    const bestHour = reading.goldenHours?.[best.key]?.[0];
    const profileText = reading.profile?.mingGongBranch
      ? `命宫 ${reading.profile.mingGongBranch} 宫已参与权重`
      : '当前未启用命宫加成';

    let posture = '稳着打';
    if (best.score >= 86) posture = '可以主动冲分';
    else if (best.score < 62) posture = '更适合低压力玩法';

    const summary = `此刻优先 ${best.name}：${best.score} 分，${best.label}。今天的节奏关键词是“${posture}”；${profileText}。`;
    const tips = [
      lead <= 3
        ? `${best.name} 与 ${second.name} 只差 ${lead} 分，状态不对时可以直接切换模式，不必硬撑。`
        : `${best.name} 比第二选择高 ${lead} 分，当前模式倾向比较明确。`,
      bestHour
        ? `全天更好的窗口是 ${bestHour.label}（${bestHour.range}），该时段 ${bestHour.score} 分。`
        : `当前时辰为 ${reading.currentHour.label}（${reading.currentHour.range}），先用一局确认手感。`,
      MODE_TIPS[best.key] || '先用一局确认状态，再决定是否继续。'
    ];
    return {summary, tips, source:'local'};
  }

  function normalizeRemote(payload) {
    const outputs = payload?.data?.outputs || payload?.outputs || payload?.result || payload || {};
    let summary = outputs.summary || outputs.answer || outputs.text || payload?.answer || '';
    let tips = outputs.tips || outputs.suggestions || [];
    if (typeof tips === 'string') {
      tips = tips.split(/\n+/).map(item => item.replace(/^[-•\d.、\s]+/, '').trim()).filter(Boolean);
    }
    if (!Array.isArray(tips)) tips = [];
    tips = tips.map(String).map(item => item.trim()).filter(Boolean).slice(0, 4);
    if (!summary || typeof summary !== 'string') return null;
    if (!tips.length) tips = ['先用一局确认实际手感，再决定是否继续当前模式。'];
    return {summary:summary.trim(), tips, source:'ai'};
  }

  function renderFortune(fortune, statusText, sourceText) {
    const summary = $('aiFortuneSummary');
    const tips = $('aiFortuneTips');
    const status = $('aiFortuneStatus');
    const source = $('aiFortuneSource');
    if (summary) summary.textContent = fortune.summary;
    if (tips) tips.innerHTML = fortune.tips.map((tip, index) =>
      `<div class="ai-tip"><span>${index + 1}</span><p>${escapeHtml(tip)}</p></div>`
    ).join('');
    if (status) status.textContent = statusText;
    if (source) source.textContent = sourceText;
    window.HuangliAIFortune = fortune;
  }

  function renderLocal(reason) {
    if (!currentReading) return;
    const fortune = localFortune(currentReading);
    renderFortune(
      fortune,
      '本地解读',
      reason || '未配置 AI 后端，当前由本地规则即时生成；接入 Dify 后可自动切换。'
    );
  }

  async function requestAI() {
    if (!currentReading) return;
    const url = endpoint();
    if (!url) {
      renderLocal('AI 后端尚未配置，已刷新本地规则解读；不会上传任何出生资料。');
      return;
    }

    const seq = ++requestSeq;
    const button = $('aiRefreshBtn');
    const status = $('aiFortuneStatus');
    if (button) button.disabled = true;
    if (status) status.textContent = 'AI 生成中';

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {'Content-Type':'application/json'},
        body: JSON.stringify({version:1, reading:currentReading})
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const payload = await response.json();
      if (seq !== requestSeq) return;
      const fortune = normalizeRemote(payload);
      if (!fortune) throw new Error('Invalid AI response');
      renderFortune(fortune, 'AI 解读', '来自已配置的安全 AI 后端；前端不会保存服务端密钥。');
    } catch (_) {
      if (seq === requestSeq) renderLocal('AI 服务暂不可用，已自动回退到本地规则解读。');
    } finally {
      if (seq === requestSeq && button) button.disabled = false;
    }
  }

  function syncReading() {
    const next = window.HuangliReading;
    if (!next || !next.bestMode || !Array.isArray(next.modes)) return;
    currentReading = next;
    renderLocal();
  }

  document.addEventListener('huangli-reading', syncReading);
  $('aiRefreshBtn')?.addEventListener('click', requestAI);
  syncReading();
})();
