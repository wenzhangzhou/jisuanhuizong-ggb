(function () {
  'use strict';

  var DEFAULTS = {
    ta: 32,
    rh: 80,
    tiMode: '-18',
    tiCustom: 0,
    df: 60,
    vipMode: 'foam',
    dv: 15,
    lf: 0.022,
    lv: 0.005,
    ho: 10,
    hi: 8,
    margin: 2
  };

  function $(id) { return document.getElementById(id); }

  function num(id, fallback) {
    var v = parseFloat($(id).value);
    return Number.isFinite(v) ? v : fallback;
  }

  /** Magnus dew point °C */
  function dewPoint(ta, rh) {
    var a = 17.62, b = 243.12;
    rh = Math.min(100, Math.max(0.01, rh));
    var gamma = Math.log(rh / 100) + (a * ta) / (b + ta);
    return (b * gamma) / (a - gamma);
  }

  function calc() {
    var ta = num('ta', DEFAULTS.ta);
    var rh = num('rh', DEFAULTS.rh);
    var tiMode = $('tiMode').value;
    var ti = tiMode === 'custom' ? num('tiCustom', DEFAULTS.tiCustom) : parseFloat(tiMode);
    var dfMm = num('df', DEFAULTS.df);
    var vipMode = $('vipMode').value;
    var dvMm = vipMode === 'foam_vip' ? num('dv', DEFAULTS.dv) : 0;
    var lf = num('lf', DEFAULTS.lf);
    var lv = num('lv', DEFAULTS.lv);
    var ho = num('ho', DEFAULTS.ho);
    var hi = num('hi', DEFAULTS.hi);
    var margin = num('margin', DEFAULTS.margin);

    var verdictEl = $('verdict');
    var resultEl = $('result');

    if (!(ho > 0 && hi > 0 && lf > 0 && (dvMm <= 0 || lv > 0) && dfMm > 0)) {
      verdictEl.className = 'verdict warn';
      verdictEl.textContent = '请检查输入：厚度与换热/导热系数须为正数。';
      resultEl.innerHTML = '';
      return;
    }

    var df = dfMm / 1000;
    var dv = dvMm / 1000;
    var rWall = df / lf + (dv > 0 ? dv / lv : 0);
    var rTotal = 1 / ho + rWall + 1 / hi;
    var q = (ta - ti) / rTotal;
    var ts = ta - q / ho;
    var td = dewPoint(ta, rh);
    var gap = ts - td;
    var ok = gap > margin;

    verdictEl.className = 'verdict ' + (ok ? 'ok' : 'bad');
    verdictEl.textContent = ok
      ? '满足防凝露要求（Ts > Td + Δ）'
      : '不满足防凝露要求（存在凝露风险）';

    resultEl.innerHTML =
      metric('露点 Td', td.toFixed(2), '°C', '由环境温度与湿度计算') +
      metric('外表面温度 Ts', ts.toFixed(2), '°C', '箱壁外侧表面') +
      metric('裕度 Ts − Td', gap.toFixed(2), '°C', '需大于安全裕度 ' + margin.toFixed(1) + '°C') +
      metric('热流密度 q', q.toFixed(2), 'W/m²', '稳态一维') +
      metric('壁面热阻', rWall.toFixed(3), 'm²·K/W', vipMode === 'foam_vip' ? '发泡 + VIP' : '仅发泡') +
      metric('总热阻', rTotal.toFixed(3), 'm²·K/W', '含两侧对流膜');
  }

  function metric(label, value, unit, hint) {
    return (
      '<div class="metric">' +
      '<div class="label">' + label + '</div>' +
      '<div class="value">' + value + '<span class="unit">' + unit + '</span></div>' +
      '<div class="hint">' + hint + '</div>' +
      '</div>'
    );
  }

  function syncVisibility() {
    $('tiCustomWrap').hidden = $('tiMode').value !== 'custom';
    $('dvWrap').hidden = $('vipMode').value !== 'foam_vip';
  }

  function reset() {
    $('ta').value = DEFAULTS.ta;
    $('rh').value = DEFAULTS.rh;
    $('tiMode').value = DEFAULTS.tiMode;
    $('tiCustom').value = DEFAULTS.tiCustom;
    $('df').value = DEFAULTS.df;
    $('vipMode').value = DEFAULTS.vipMode;
    $('dv').value = DEFAULTS.dv;
    $('lf').value = DEFAULTS.lf;
    $('lv').value = DEFAULTS.lv;
    $('ho').value = DEFAULTS.ho;
    $('hi').value = DEFAULTS.hi;
    $('margin').value = DEFAULTS.margin;
    syncVisibility();
    calc();
  }

  function bind() {
    ['ta', 'rh', 'tiMode', 'tiCustom', 'df', 'vipMode', 'dv', 'lf', 'lv', 'ho', 'hi', 'margin'].forEach(function (id) {
      var el = $(id);
      el.addEventListener('input', function () {
        syncVisibility();
        calc();
      });
      el.addEventListener('change', function () {
        syncVisibility();
        calc();
      });
    });
    $('resetBtn').addEventListener('click', reset);
    syncVisibility();
    calc();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bind);
  } else {
    bind();
  }
})();
