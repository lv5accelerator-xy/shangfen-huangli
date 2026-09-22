(() => {
  'use strict';

  const PROFILE_KEY = 'shangfenHuangliProfileV1';
  const MONTH_MAP = {
    '正月':1,'一月':1,'二月':2,'三月':3,'四月':4,'五月':5,'六月':6,
    '七月':7,'八月':8,'九月':9,'十月':10,'十一月':11,'冬月':11,'十二月':12,'腊月':12
  };

  const $ = (id) => document.getElementById(id);

  function hasValidProfile() {
    try {
      const raw = localStorage.getItem(PROFILE_KEY);
      if (!raw) return false;
      const p = JSON.parse(raw);
      return !!(p && p.enabled && Number(p.lunarMonth) >= 1 && Number(p.lunarMonth) <= 12 && Number.isInteger(Number(p.birthHourIndex)));
    } catch (_) {
      return false;
    }
  }

  function hourIndexFromTime(value) {
    const hour = Number(String(value).split(':')[0]);
    if (!Number.isFinite(hour)) return null;
    return hour === 23 ? 0 : Math.floor((hour + 1) / 2) % 12;
  }

  function lunarMonthFromDate(value) {
    const parts = String(value).split('-').map(Number);
    if (parts.length !== 3 || parts.some(n => !Number.isFinite(n))) return null;
    const date = new Date(parts[0], parts[1] - 1, parts[2], 12, 0, 0);
    try {
      const fmt = new Intl.DateTimeFormat('zh-CN-u-ca-chinese', {month:'long'});
      const monthText = fmt.formatToParts(date).find(p => p.type === 'month')?.value || fmt.format(date);
      const normalized = monthText.replace(/^闰/, '');
      if (MONTH_MAP[normalized]) return MONTH_MAP[normalized];
      const numeric = Number(normalized.replace(/[^0-9]/g, ''));
      if (numeric >= 1 && numeric <= 12) return numeric;
    } catch (_) {}
    return null;
  }

  function openGate() {
    document.body.classList.add('chart-gated');
    $('onboardingModal').hidden = false;
    const maxDate = new Date();
    const iso = [
      maxDate.getFullYear(),
      String(maxDate.getMonth() + 1).padStart(2, '0'),
      String(maxDate.getDate()).padStart(2, '0')
    ].join('-');
    $('onboardingBirthDate').max = iso;
  }

  function showError(message) {
    $('onboardingError').textContent = message;
  }

  function save() {
    const birthDate = $('onboardingBirthDate').value;
    const birthTime = $('onboardingBirthTime').value;

    if (!birthDate || !birthTime) {
      showError('请先填写出生日期和出生时间。');
      return;
    }

    const lunarMonth = lunarMonthFromDate(birthDate);
    const birthHourIndex = hourIndexFromTime(birthTime);

    if (!lunarMonth || birthHourIndex === null) {
      showError('当前浏览器无法完成农历换算，请换用新版 Chrome / Safari 后再试。');
      return;
    }

    const profile = {
      enabled: true,
      lunarMonth,
      birthHourIndex,
      birthDate,
      birthTime,
      source: 'first-run-chart-gate',
      updatedAt: new Date().toISOString()
    };

    localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
    showError('');
    document.body.classList.remove('chart-gated');
    $('onboardingModal').hidden = true;
    location.reload();
  }

  if (!hasValidProfile()) {
    openGate();
  }

  $('onboardingSaveBtn')?.addEventListener('click', save);
  $('onboardingBirthDate')?.addEventListener('change', () => showError(''));
  $('onboardingBirthTime')?.addEventListener('change', () => showError(''));
})();