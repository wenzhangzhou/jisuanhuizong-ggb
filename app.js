(function () {
  'use strict';

  function esc(s) {
    return String(s == null ? '—' : s)
      .replace(/&/g, '&')
      .replace(/</g, '<')
      .replace(/>/g, '>')
      .replace(/"/g, '"');
  }

  function fill(sel, items) {
    sel.innerHTML = (items || []).map(function (v) {
      return '<option value="' + esc(v) + '">' + esc(v) + '</option>';
    }).join('');
  }

  function start(D) {
    if (!D || !D.options || !D.options.fastenings) {
      document.body.innerHTML = '<p style="padding:2rem;color:#b00">数据不完整，无法选型</p>';
      return;
    }
    var f = document.querySelector('#fastening');
    var d1 = document.querySelector('#d1');
    var mat = document.querySelector('#material');
    var result = document.querySelector('#result');
    if (!f || !d1 || !mat || !result) return;

    var disc = document.querySelector('#disclaimer');
    var upd = document.querySelector('#updated');
    if (disc && D.meta) disc.textContent = D.meta.disclaimer || '';
    if (upd && D.meta) upd.textContent = '数据更新日期：' + (D.meta.updated || '');

    fill(f, D.options.fastenings);
    fill(d1, (D.options.d1 || []).map(String));
    fill(mat, D.options.materialsPrimary || []);
    f.value = D.options.fastenings[0];
    d1.value = '4';
    mat.value = 'PC/ABS';

    var methods = document.querySelector('#methods');
    if (methods && D.torquePlastic && D.torquePlastic.methods) {
      methods.innerHTML = '<h2>扭矩取值方法（须试验）</h2>' +
        D.torquePlastic.methods.map(function (m) {
          return '<div class="formula">' + esc(m) + '</div>';
        }).join('');
    }
    var bounds = document.querySelector('#boundaries');
    if (bounds && D.boundaries && D.boundaries.items) {
      bounds.innerHTML = D.boundaries.items.map(function (it) {
        return '<div class="cite"><strong>' + esc(it.key) + '</strong>：' + esc(it.value) + '</div>';
      }).join('');
    }
    var src = document.querySelector('#sources-body');
    if (src && D.sources) {
      src.innerHTML = '<table class="data"><thead><tr><th>#</th><th>类型</th><th>文献</th><th>链接</th></tr></thead><tbody>' +
        D.sources.map(function (s) {
          return '<tr><td>' + esc(s.id) + '</td><td>' + esc(s.type) + '</td><td>' + esc(s.title) +
            '</td><td><a href="' + esc(s.link) + '" target="_blank" rel="noopener">打开</a></td></tr>';
        }).join('') + '</tbody></table>';
    }

    function render() {
      var mode = f.value;
      var dia = Number(d1.value);
      var material = mat.value;
      var geos = (D.geometry || []).filter(function (g) {
        return Number(g.d1) === dia && g.material === material;
      });
      var ej = (D.ejot || []).find(function (e) { return Number(e.d1) === dia; });
      var html = '';
      if (mode.indexOf('自攻') >= 0 || mode.indexOf('塑料') >= 0) {
        var g = geos[0];
        html += '<div class="metrics">';
        html += '<div class="metric"><div class="label">推荐孔径 d0</div><div class="value">' +
          (g ? esc(g.d0) : '—') + '<span class="unit">mm</span></div><div class="src">' +
          esc(g && g.coeffSource) + '</div></div>';
        html += '<div class="metric"><div class="label">凸台外径 D</div><div class="value">' +
          (g ? esc(g.D) : (ej ? esc(ej.dT) : '—')) + '<span class="unit">mm</span></div><div class="src">有出处几何</div></div>';
        html += '<div class="metric"><div class="label">旋合长度 te</div><div class="value">' +
          (g ? esc(g.te) : (ej ? esc(ej.teMin) : '—')) + '<span class="unit">mm</span></div><div class="src">EJOT te≥2×d1</div></div>';
        html += '<div class="metric"><div class="label">装配扭矩 MA</div><div class="value" style="font-size:1rem;color:var(--empty)">无公开装配扭矩数据</div><div class="src">须试验</div></div>';
        html += '</div>';
        if (g && g.nature) {
          html += '<div class="cite">性质：' + esc(g.nature) + '</div>';
        }
      } else {
        var rows = (D.torqueMachine && D.torqueMachine.rows) || [];
        var filtered;
        if (dia === 5) filtered = rows.filter(function (r) { return String(r.thread).indexOf('M5') === 0; });
        else if (dia === 6) filtered = rows.filter(function (r) { return String(r.thread).indexOf('M6') === 0; });
        else {
          var map = { 2: 'M2', 2.5: 'M2.5', 3: 'M3', 3.5: 'M3.5', 4: 'M4', 4.5: 'M4.5' };
          var th = map[dia] || '';
          filtered = rows.filter(function (r) { return String(r.thread) === th; });
        }
        html += '<div class="metrics">';
        html += '<div class="metric"><div class="label">几何</div><div class="value" style="font-size:1rem">按嵌件厂规范</div><div class="src">孔径/凸台按嵌件资料</div></div>';
        html += '<div class="metric"><div class="label">装配扭矩 MA</div><div class="value" style="font-size:1rem;color:var(--empty)">无公开装配扭矩数据</div><div class="src">Torque-out ≠ 装配扭矩</div></div>';
        html += '</div><div class="block"><h3>PEM 嵌件脱出扭矩（≠装配扭矩）</h3><div class="pem-grid">';
        html += filtered.map(function (r) {
          return '<div class="pem-card"><div class="mat">' + esc(r.thread) + ' · ' + esc(r.baseMaterial) +
            '</div><div class="to">' + esc(r.torqueOut) + ' <span class="unit">N·m</span></div>' +
            '<div class="label-to">嵌件脱出扭矩</div><div class="cite">' + esc(r.source) + '</div></div>';
        }).join('') || '<p>该规格无公开 PEM 数据</p>';
        html += '</div></div>';
      }
      result.innerHTML = html;
    }

    f.onchange = d1.onchange = mat.onchange = render;
    render();
  }

  function go(d) { start(d); }
  if (window.SCREW_DATA) go(window.SCREW_DATA);
  else window.addEventListener('screw-data-ready', function () { go(window.SCREW_DATA); });
})();
