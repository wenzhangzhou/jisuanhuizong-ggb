(function () {
  'use strict';

  function start(DATA) {
  if (!DATA) {
    document.body.innerHTML = '<p style="padding:2rem">无法加载数据</p>';
    return;
  }

  const $ = (sel) => document.querySelector(sel);
  const el = (tag, cls, html) => {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (html != null) n.innerHTML = html;
    return n;
  };

  function fmtNum(v) {
    if (v == null || v === '—' || v === '') return null;
    if (typeof v === 'number') {
      return Number.isInteger(v) ? String(v) : String(Math.round(v * 1000) / 1000);
    }
    return String(v);
  }

  function natureTag(nature) {
    if (!nature) return '';
    if (nature.indexOf('近邻') >= 0) return '<span class="tag tag-approx">近邻类推</span>';
    if (nature.indexOf('原文') >= 0) return '<span class="tag tag-ok">原文可追溯</span>';
    if (nature.indexOf('名义') >= 0) return '<span class="tag tag-ok">原文名义表</span>';
    return '<span class="tag tag-method">' + escapeHtml(nature) + '</span>';
  }

  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, '&')
      .replace(/</g, '<')
      .replace(/>/g, '>')
      .replace(/"/g, '"');
  }

  function findSourceLink(hint) {
    if (!hint) return null;
    const h = String(hint);
    for (const s of DATA.sources) {
      const t = s.title || '';
      if (
        (h.indexOf('Bossard') >= 0 && t.indexOf('Bossard') >= 0 && (h.indexOf('F.079') >= 0 || t.indexOf('F.079') >= 0 || t.indexOf('Construction') >= 0 || t.indexOf('F071') >= 0)) ||
        (h.indexOf('TR Plas-Tech 30-20') >= 0 && t.indexOf('30-20') >= 0) ||
        (h.indexOf('TR Plas-Tech 30') >= 0 && t.indexOf('Plas-Tech® 30 Installation') >= 0) ||
        (h.indexOf('EJOT') >= 0 && t.indexOf('EJOT') >= 0) ||
        (h.indexOf('Covestro') >= 0 && h.indexOf('Table1') >= 0 && t.indexOf('Table 1') >= 0) ||
        (h.indexOf('Covestro') >= 0 && t.indexOf('Self-tapping') >= 0 && h.indexOf('Table1') < 0) ||
        (h.indexOf('PEM') >= 0 && t.indexOf('PEM') >= 0) ||
        (h.indexOf('T/CSAE') >= 0 && t.indexOf('T/CSAE') >= 0) ||
        (h.indexOf('Würth') >= 0 && t.indexOf('Würth') >= 0)
      ) {
        return s;
      }
    }
    // looser fallback
    for (const s of DATA.sources) {
      const t = (s.title || '') + (s.link || '');
      if (h.slice(0, 12) && t.indexOf(h.slice(0, 8)) >= 0) return s;
    }
    return null;
  }

  function citeHtml(text) {
    const s = findSourceLink(text);
    let out = '<div class="cite">出处：' + escapeHtml(text || '—');
    if (s && s.link && String(s.link).indexOf('http') === 0) {
      out += ' · <a href="' + escapeHtml(s.link) + '" target="_blank" rel="noopener">文献链接</a>';
    }
    out += '</div>';
    return out;
  }

  /** Public lookup API used by UI and smoke tests */
  function lookup(fastening, d1, material) {
    d1 = Number(d1);
    const result = {
      fastening,
      d1,
      material,
      geometry: [],
      ejot: null,
      selection: null,
      torqueMA: null,
      torqueCases: [],
      pemTorqueOut: [],
      methods: DATA.torquePlastic.methods || [],
    };

    if (fastening === '塑料自攻') {
      result.geometry = DATA.geometry.filter(
        (g) => Number(g.d1) === d1 && g.material === material
      );
      // also include TR 30-20 nominal for d1=5/6 as reference when material is primary
      if (d1 === 5 || d1 === 6) {
        const nom = DATA.geometry.filter(
          (g) => Number(g.d1) === d1 && String(g.material).indexOf('TR 30-20') >= 0
        );
        for (const n of nom) {
          if (!result.geometry.find((g) => g.coeffSource === n.coeffSource)) {
            result.geometry.push(n);
          }
        }
      }
      result.ejot = DATA.ejot.find((e) => Number(e.d1) === d1) || null;
      result.selection = DATA.selection.find(
        (s) =>
          s.fastening === '塑料自攻' &&
          Number(s.d1) === d1 &&
          s.material === material
      ) || null;

      const row = (DATA.torquePlastic.rows || []).find((r) => Number(r.d1) === d1);
      const cellVal = row ? row[material] : null;
      if (cellVal) {
        result.torqueMA = {
          value: null,
          note: cellVal,
          status: row.status,
          source: row.source,
          empty: true,
          kind: 'pointer',
        };
      } else {
        result.torqueMA = {
          value: null,
          note: '无公开装配扭矩数据',
          status: row ? row.status : '缺公开数据',
          source: row ? row.source : '—',
          empty: true,
          kind: 'empty',
        };
      }

      // related cases (not for direct use)
      result.torqueCases = DATA.torqueCases.filter((c) => {
        const conn = String(c.connection || '');
        const mat = String(c.material || '');
        // ABS d1=4 case when looking at plastic self-tap near Ø4
        if (d1 === 4 && mat.indexOf('ABS') === 0 && conn.indexOf('自攻') >= 0) return true;
        if (mat.indexOf('Makrolon') >= 0 || mat.indexOf('PC') === 0) {
          // only show PC cases as reference when material is PC/ABS
          if (material === 'PC/ABS' && String(c.valueType || '').indexOf('Torque-out') < 0 && String(c.valueType || '').indexOf('扭出') < 0) {
            return conn.indexOf('Type23') >= 0 || conn.indexOf('#6') >= 0;
          }
        }
        return false;
      });
    } else {
      // 机牙+嵌件
      result.selection = DATA.selection.find(
        (s) =>
          String(s.fastening).indexOf('机牙') >= 0 &&
          Number(s.d1) === d1 &&
          s.material === material
      ) || null;

      result.torqueMA = {
        value: null,
        note: '无公开装配扭矩数据',
        status: '装配扭矩待测（须低于嵌件脱出扭矩）',
        source: 'PEM sidata：公布的是 Torque-out，≠装配扭矩',
        empty: true,
        kind: 'empty',
      };

      // Map d1 to PEM thread labels
      const threadKeys = pemThreadsForD1(d1);
      result.pemTorqueOut = DATA.torqueMachine.rows.filter((r) =>
        threadKeys.some((k) => String(r.thread) === k || String(r.thread).indexOf(k) === 0)
      );

      // For PP+GF / LGF: no PEM data
      if (material !== 'PC/ABS' && material.indexOf('PP') === 0) {
        // keep rows for display as ABS/PC reference only, flag no match
        result.pemNoBase = true;
      }
    }

    return result;
  }

  function pemThreadsForD1(d1) {
    const map = {
      2: ['M2'],
      2.5: ['M2.5'],
      3: ['M3'],
      3.5: [], // no M3.5 in PEM table
      4: ['M4'],
      4.5: [],
      5: ['M5-1', 'M5-2'],
      6: ['M6-1', 'M6-2'],
    };
    return map[d1] || [];
  }

  // expose for smoke
  window.ScrewSelector = { lookup, DATA };

  function fillSelect(sel, items, formatter) {
    sel.innerHTML = '';
    for (const it of items) {
      const o = document.createElement('option');
      o.value = String(it);
      o.textContent = formatter ? formatter(it) : String(it);
      sel.appendChild(o);
    }
  }

  function initControls() {
    const fSel = $('#fastening');
    const dSel = $('#d1');
    const mSel = $('#material');

    fillSelect(fSel, DATA.options.fastenings);
    fillSelect(dSel, DATA.options.d1, (d) => 'Ø' + d);
    const mats = DATA.options.materialsPrimary.concat(
      DATA.options.materialsReference.filter((m) => m.indexOf('对照') >= 0 || m.indexOf('通用') >= 0)
    );
    // Prefer primary first; include PP(对照) and TR nominal as reference
    fillSelect(mSel, [
      ...DATA.options.materialsPrimary,
      'PP(对照)',
      '通用(TR 30-20名义表)',
    ]);

    fSel.value = '塑料自攻';
    dSel.value = '4';
    mSel.value = 'PC/ABS';

    [fSel, dSel, mSel].forEach((s) => s.addEventListener('change', render));
  }

  function pickPrimaryGeometry(geoms) {
    // Prefer Bossard as primary recommendation (matches 选型总表)
    const boss = geoms.find((g) => String(g.coeffSource).indexOf('Bossard') >= 0);
    return boss || geoms[0] || null;
  }

  function render() {
    const fastening = $('#fastening').value;
    const d1 = $('#d1').value;
    const material = $('#material').value;
    const res = lookup(fastening, d1, material);
    const out = $('#result');
    out.innerHTML = '';

    // Summary metrics
    const metrics = el('div', 'metrics');
    if (fastening === '塑料自攻') {
      const primary = pickPrimaryGeometry(res.geometry.filter((g) => g.material === material));
      const showGeom = primary || (res.geometry[0] || null);

      if (showGeom && fmtNum(showGeom.d0)) {
        metrics.appendChild(metricCard('推荐孔径 d0', fmtNum(showGeom.d0), 'mm', showGeom.coeffSource));
      } else if (res.ejot) {
        metrics.appendChild(
          metricCard(
            'EJOT db 范围',
            fmtNum(res.ejot.dbMin) + '–' + fmtNum(res.ejot.dbMax),
            'mm',
            res.ejot.source + '（db=0.85×d1±0.05）'
          )
        );
      } else {
        metrics.appendChild(metricCard('推荐孔径 d0', '—', 'mm', '无数据'));
      }

      if (showGeom && fmtNum(showGeom.D) && showGeom.D !== '—') {
        metrics.appendChild(metricCard('凸台外径 D', fmtNum(showGeom.D), 'mm', showGeom.coeffSource));
      } else if (res.ejot) {
        metrics.appendChild(metricCard('凸台外径 dT', fmtNum(res.ejot.dT), 'mm', res.ejot.source + '（dT=2×d1）'));
      }

      if (showGeom && fmtNum(showGeom.te) && showGeom.te !== '—') {
        metrics.appendChild(metricCard('旋合长度 te', fmtNum(showGeom.te), 'mm', showGeom.coeffSource));
      } else if (res.ejot) {
        metrics.appendChild(metricCard('旋合 te≥', fmtNum(res.ejot.teMin), 'mm', res.ejot.source + '（te≥2×d1）'));
      }

      // MA card
      const ma = el('div', 'metric');
      ma.innerHTML =
        '<div class="label">装配扭矩 MA</div>' +
        '<div class="value" style="font-size:1rem;color:var(--empty)">无公开装配扭矩数据</div>' +
        '<div class="src">' +
        escapeHtml(res.torqueMA.status || '') +
        (res.torqueMA.source && res.torqueMA.source !== '—'
          ? '<br/>' + escapeHtml(res.torqueMA.source)
          : '') +
        '</div>';
      metrics.appendChild(ma);
    } else {
      metrics.appendChild(
        metricCard('孔径 / 凸台 / 旋合', '按嵌件厂规范', '', '选型总表：按嵌件厂孔径/凸台/有效螺纹')
      );
      const ma = el('div', 'metric');
      ma.innerHTML =
        '<div class="label">装配扭矩 MA</div>' +
        '<div class="value" style="font-size:1rem;color:var(--empty)">无公开装配扭矩数据</div>' +
        '<div class="src">须低于嵌件脱出扭矩，应用试验确定<br/>出处：PEM sidata（Torque-out ≠ 装配扭矩）</div>';
      metrics.appendChild(ma);
    }
    out.appendChild(metrics);

    // Selection row status
    if (res.selection) {
      const b = el('div', 'block');
      const approx =
        String(res.selection.status || '').indexOf('近邻') >= 0 ||
        String(res.selection.sourceNote || '').indexOf('近邻') >= 0;
      if (approx) b.classList.add('approx-state');
      b.innerHTML =
        '<h3>选型总表摘要 ' +
        (approx ? '<span class="tag tag-approx">近邻/近似</span>' : '<span class="tag tag-ok">可追溯</span>') +
        '</h3>' +
        '<div>数据状态：' +
        escapeHtml(res.selection.status) +
        '</div>' +
        '<div>扭矩栏原文：「' +
        escapeHtml(res.selection.MA) +
        '」</div>' +
        citeHtml(res.selection.sourceNote);
      out.appendChild(b);
    }

    if (fastening === '塑料自攻') {
      // Geometry alternatives
      const gSec = el('div', 'block');
      gSec.innerHTML = '<h3>凸台几何（多出处对照）</h3>';
      const list = el('div', 'geom-list');
      const rows =
        res.geometry.length > 0
          ? res.geometry
          : DATA.geometry.filter((g) => Number(g.d1) === Number(d1) && g.material === material);

      if (rows.length === 0 && material.indexOf('通用') >= 0) {
        const nom = DATA.geometry.filter(
          (g) => Number(g.d1) === Number(d1) && String(g.material).indexOf('TR 30-20') >= 0
        );
        rows.push(...nom);
      }

      if (rows.length === 0) {
        list.innerHTML = '<p class="cite">该材料×直径在「螺柱凸台几何」表无独立行；可改选主材料或查看 EJOT 通用几何。</p>';
      } else {
        for (const g of rows) {
          const card = el('div', 'geom-card');
          const d0 = fmtNum(g.d0);
          const D = fmtNum(g.D);
          const te = fmtNum(g.te);
          card.innerHTML =
            '<div class="head">' +
            natureTag(g.nature) +
            '<span class="title">' +
            escapeHtml(g.coeffSource) +
            '</span></div>' +
            '<div class="vals">' +
            (d0 ? '<span>d0 = <strong>' + d0 + '</strong> mm</span>' : '') +
            (D && D !== '—' ? '<span>D = <strong>' + D + '</strong> mm</span>' : '<span>D = —</span>') +
            (te && te !== '—' ? '<span>te = <strong>' + te + '</strong> mm</span>' : '<span>te = —</span>') +
            (g.holeCoeff != null
              ? '<span>孔径系数 ' + escapeHtml(fmtNum(g.holeCoeff)) + '</span>'
              : '') +
            '</div>' +
            (g.note ? '<div class="cite">' + escapeHtml(g.note) + '</div>' : '') +
            citeHtml(g.coeffSource);
          list.appendChild(card);
        }
      }
      gSec.appendChild(list);
      out.appendChild(gSec);

      // EJOT
      if (res.ejot) {
        const e = res.ejot;
        const ej = el('div', 'block');
        ej.innerHTML =
          '<h3>EJOT EVO PT 通用几何（不分牌号） <span class="tag tag-method">通用</span></h3>' +
          '<div class="vals">' +
          '<span>db = <strong>' +
          fmtNum(e.db) +
          '</strong> mm（范围 <strong>' +
          fmtNum(e.dbMin) +
          '–' +
          fmtNum(e.dbMax) +
          '</strong>）</span>' +
          '<span>te ≥ <strong>' +
          fmtNum(e.teMin) +
          '</strong> mm</span>' +
          '<span>dT = <strong>' +
          fmtNum(e.dT) +
          '</strong> mm</span>' +
          '</div>' +
          citeHtml(e.source + '：db=0.85×d1±0.05；te≥2×d1；dT=2×d1；扭矩用 EVO CALC');
        out.appendChild(ej);
      }

      // Torque empty + methods
      const tBlock = el('div', 'block empty-state');
      tBlock.innerHTML =
        '<h3>装配扭矩 MA <span class="tag tag-empty">无公开数据</span></h3>' +
        '<p>本组合<strong>无公开装配扭矩数值</strong>。Excel「扭矩矩阵_塑料自攻」对应单元格为空或仅指向方法/个例。</p>' +
        (res.torqueMA.note && res.torqueMA.note !== '无公开装配扭矩数据'
          ? '<p>矩阵提示：' + escapeHtml(res.torqueMA.note) + '</p>'
          : '') +
        citeHtml(res.torqueMA.source && res.torqueMA.source !== '—' ? res.torqueMA.source : '依据与边界 / 扭矩矩阵_塑料自攻');

      for (const m of res.methods) {
        tBlock.appendChild(el('div', 'formula', escapeHtml(m)));
      }
      out.appendChild(tBlock);

      // Cases
      if (res.torqueCases.length) {
        const cBlock = el('div', 'block');
        cBlock.innerHTML =
          '<h3>相关有出处个例（不可直接外推） <span class="tag tag-method">个例</span></h3>';
        const table = el('table', 'data');
        table.innerHTML =
          '<thead><tr><th>材料</th><th>条件</th><th>种类</th><th>数值</th><th>可否直接用</th><th>出处</th></tr></thead>';
        const tb = document.createElement('tbody');
        for (const c of res.torqueCases) {
          const tr = document.createElement('tr');
          tr.innerHTML =
            '<td>' +
            escapeHtml(c.material) +
            '</td><td>' +
            escapeHtml(c.conditions) +
            '</td><td>' +
            escapeHtml(c.valueType) +
            '</td><td class="num">' +
            escapeHtml(fmtNum(c.value) ?? String(c.value)) +
            '</td><td>' +
            escapeHtml(c.applicable) +
            '</td><td>' +
            escapeHtml(c.source) +
            '</td>';
          tb.appendChild(tr);
        }
        table.appendChild(tb);
        cBlock.appendChild(table);
        out.appendChild(cBlock);
      }
    } else {
      // Machine + insert
      const pemBlock = el('div', 'block');
      pemBlock.innerHTML =
        '<h3>嵌件脱出扭矩 Torque-out <span class="tag tag-empty">≠装配扭矩</span></h3>' +
        '<p>以下为 PEM 公布的<strong>嵌件脱出扭矩（失效上限）</strong>，不是推荐拧紧扭矩。装配扭矩必须更低并做应用试验。</p>';

      if (res.pemNoBase) {
        const warn = el('div', 'block empty-state');
        warn.style.marginBottom = '0.75rem';
        warn.innerHTML =
          '<strong>基体无匹配数据：</strong>PEM 表仅有 ABS / PC，无 PP+GF30 / PP+LGF20 嵌件扭出数据。' +
          citeHtml('扭矩矩阵_机牙：PP+GF30 / PP+LGF20 + 嵌件：PEM表未给出对应基体，本表不填扭矩。');
        pemBlock.appendChild(warn);
      }

      if (res.pemTorqueOut.length === 0) {
        pemBlock.innerHTML +=
          '<p>公称直径 Ø' +
          escapeHtml(d1) +
          ' 在 PEM 表中无对应螺纹行（例如 M3.5 / 非标）。</p>' +
          citeHtml('PEM SI Threaded Inserts for Plastics (sidata)');
      } else {
        const grid = el('div', 'pem-grid');
        for (const r of res.pemTorqueOut) {
          const card = el('div', 'pem-card');
          card.innerHTML =
            '<div class="mat">' +
            escapeHtml(r.thread) +
            ' · 试验基体 ' +
            escapeHtml(r.baseMaterial) +
            '</div>' +
            '<div class="to">' +
            fmtNum(r.torqueOut) +
            ' <span class="unit">N·m</span></div>' +
            '<div class="label-to">嵌件脱出扭矩（≠装配扭矩）</div>' +
            '<div class="cite">' +
            escapeHtml(r.usage || '') +
            '<br/>出处：' +
            escapeHtml(r.source) +
            (r.note ? '；' + escapeHtml(r.note) : '') +
            '</div>';
          grid.appendChild(card);
        }
        pemBlock.appendChild(grid);
        // link
        const pemSrc = DATA.sources.find((s) => (s.title || '').indexOf('PEM') >= 0);
        if (pemSrc) {
          pemBlock.appendChild(
            el(
              'div',
              'cite',
              '文献：' +
                escapeHtml(pemSrc.title) +
                (pemSrc.link && String(pemSrc.link).indexOf('http') === 0
                  ? ' · <a href="' + escapeHtml(pemSrc.link) + '" target="_blank" rel="noopener">链接</a>'
                  : '')
            )
          );
        }
      }
      out.appendChild(pemBlock);

      const maEmpty = el('div', 'block empty-state');
      maEmpty.innerHTML =
        '<h3>装配扭矩 MA <span class="tag tag-empty">无公开数据</span></h3>' +
        '<p><strong>无公开装配扭矩数据</strong>。不得将 Torque-out 当作电批设定值。</p>' +
        citeHtml(DATA.torqueMachine.warning || 'PEM sidata');
      out.appendChild(maEmpty);
    }

    // Methods / boundaries always visible for plastic
    renderMetaSidebar();
  }

  function metricCard(label, value, unit, src) {
    const m = el('div', 'metric');
    m.innerHTML =
      '<div class="label">' +
      escapeHtml(label) +
      '</div>' +
      '<div class="value">' +
      escapeHtml(value) +
      (unit ? '<span class="unit">' + escapeHtml(unit) + '</span>' : '') +
      '</div>' +
      '<div class="src">' +
      escapeHtml(src || '') +
      '</div>';
    return m;
  }

  function renderMetaSidebar() {
    const box = $('#methods');
    box.innerHTML = '';
    box.appendChild(el('h2', null, '扭矩取值方法（须试验）'));
    for (const m of DATA.torquePlastic.methods || []) {
      box.appendChild(el('div', 'formula', escapeHtml(m)));
    }
    const cov = DATA.boundaries.items.find((i) => i.key && i.key.indexOf('Covestro') >= 0);
    const wu = DATA.boundaries.items.find((i) => i.key && i.key.indexOf('Würth') >= 0);
    const cae = DATA.boundaries.items.find((i) => i.key && i.key.indexOf('T/CSAE') >= 0);
    const machine = DATA.boundaries.items.find((i) => i.key && i.key.indexOf('机牙') >= 0);
    [cov, wu, cae, machine].forEach((it) => {
      if (!it) return;
      const d = el('div', 'cite');
      d.innerHTML = '<strong>' + escapeHtml(it.key) + '</strong>：' + escapeHtml(it.value);
      box.appendChild(d);
    });
  }

  function renderSources() {
    const box = $('#sources-body');
    const table = el('table', 'data');
    table.innerHTML =
      '<thead><tr><th>#</th><th>类型</th><th>文献</th><th>可用数据</th><th>用途</th><th>链接</th></tr></thead>';
    const tb = document.createElement('tbody');
    for (const s of DATA.sources) {
      const tr = document.createElement('tr');
      const link =
        s.link && String(s.link).indexOf('http') === 0
          ? '<a href="' + escapeHtml(s.link) + '" target="_blank" rel="noopener">打开</a>'
          : escapeHtml(s.link || '—');
      tr.innerHTML =
        '<td>' +
        escapeHtml(s.id) +
        '</td><td>' +
        escapeHtml(s.type) +
        '</td><td>' +
        escapeHtml(s.title) +
        '</td><td>' +
        escapeHtml(s.usableData) +
        '</td><td>' +
        escapeHtml(s.useInTable) +
        '</td><td>' +
        link +
        '</td>';
      tb.appendChild(tr);
    }
    table.appendChild(tb);
    box.appendChild(table);
  }

  function renderBoundaries() {
    const box = $('#boundaries');
    const ul = el('div', null);
    for (const it of DATA.boundaries.items) {
      const p = el('div', 'cite');
      p.innerHTML = '<strong>' + escapeHtml(it.key) + '</strong>：' + escapeHtml(it.value || '');
      ul.appendChild(p);
    }
    box.appendChild(ul);
  }

  function bootUi() {
    if ($('#disclaimer') && DATA.meta) $('#disclaimer').textContent = DATA.meta.disclaimer || '';
    if ($('#updated') && DATA.meta) $('#updated').textContent = '数据更新日期：' + (DATA.meta.updated || '');
    initControls();
    renderSources();
    renderBoundaries();
    render();
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bootUi);
  } else {
    bootUi();
  }

  }
  function onData(d) {
    if (!d || !d.options || !d.options.fastenings) {
      document.body.innerHTML = '<p style="padding:2rem;color:#b00">数据不完整，无法初始化选型</p>';
      return;
    }
    start(d);
  }
  if (window.SCREW_DATA) onData(window.SCREW_DATA);
  else window.addEventListener('screw-data-ready', function () { onData(window.SCREW_DATA); });
})();
