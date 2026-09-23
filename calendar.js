(() => {
  'use strict';
  const key = date => [date.getFullYear(), String(date.getMonth()+1).padStart(2,'0'), String(date.getDate()).padStart(2,'0')].join('-');
  function parse(value) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
    const [y,m,d] = value.split('-').map(Number);
    const date = new Date(y,m-1,d,12);
    return y >= 1900 && y <= 2100 && key(date) === value ? date : null;
  }
  function validProfile(p) {
    return !!p && typeof p.enabled === 'boolean' && Number.isInteger(p.lunarMonth) && p.lunarMonth >= 1 && p.lunarMonth <= 12 && Number.isInteger(p.birthHourIndex) && p.birthHourIndex >= 0 && p.birthHourIndex <= 11;
  }
  let selected = null;
  function date() {
    const now = new Date();
    const chosen = selected ? parse(selected) : now;
    chosen.setHours(now.getHours(),now.getMinutes(),now.getSeconds(),0);
    return chosen;
  }
  function select(value) {
    if (!parse(value)) return false;
    selected = value === key(new Date()) ? null : value;
    document.dispatchEvent(new Event('reading-date-change'));
    return true;
  }
  window.HuangliCalendar = {key,parse,validProfile,date,select};
})();
