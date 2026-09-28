/**
 * 供 gzip 工具 index.html 在 document.write 前注入云同步面板。
 */
(function (global) {
  function inject(html, opts) {
    opts = opts || {};
    const tool = opts.tool;
    const localKey = opts.localKey || '';
    if (!tool) return html;
    if (html.indexOf('cloud-sync.js') !== -1) return html;

    const css = '<link rel="stylesheet" href="../assets/cloud-sync.css" />';
    const localOpt = localKey
      ? 'localKey: ' + JSON.stringify(localKey) + ','
      : '';
    const boot =
      '<div id="cloud-scheme-panel"></div>' +
      '<script type="module">' +
      'import * as Cloud from "../assets/cloud-sync.js";' +
      'Cloud.init();' +
      'const host = document.getElementById("cloud-scheme-panel");' +
      'const anchor = document.querySelector(".scheme-bar") || document.querySelector("main") || document.body;' +
      'if (host && anchor && host.parentNode !== anchor) {' +
      '  anchor.insertBefore(host, anchor.firstChild);' +
      '}' +
      'Cloud.mountSchemePanel({' +
      '  tool: ' + JSON.stringify(tool) + ',' +
      localOpt +
      '  container: host,' +
      '  getState: () => Cloud.scrapeFormState(),' +
      '  applyState: (s) => Cloud.applyFormState(s)' +
      '});' +
      '<\/script>';

    if (html.indexOf('</head>') !== -1) html = html.replace('</head>', css + '</head>');
    else html = css + html;
    if (html.indexOf('</body>') !== -1) html = html.replace('</body>', boot + '</body>');
    else html += boot;
    return html;
  }
  global.CloudLoaderInject = { inject: inject };
})(typeof window !== 'undefined' ? window : globalThis);
