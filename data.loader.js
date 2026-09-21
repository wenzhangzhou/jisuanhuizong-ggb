(function () {
  'use strict';
  var PARTS = ["meta", "boundaries", "sources", "selection", "geometry", "ejot", "torquePlastic", "torqueCases", "torqueMachine", "options"];
  function fail(msg) {
    document.body.innerHTML = '<p style="padding:2rem;color:#b00">数据加载失败：' + msg + '</p>';
  }
  function boot(data) {
    window.SCREW_DATA = data;
    window.dispatchEvent(new Event('screw-data-ready'));
  }
  fetch('data/data.json', { cache: 'no-cache' })
    .then(function (r) {
      if (!r.ok) throw new Error('data/data.json HTTP ' + r.status);
      return r.json();
    })
    .then(boot)
    .catch(function () {
      Promise.all(
        PARTS.map(function (k) {
          return fetch('data/parts/' + k + '.json', { cache: 'no-cache' }).then(function (r) {
            if (!r.ok) throw new Error(k + ' HTTP ' + r.status);
            return r.json().then(function (v) { return [k, v]; });
          });
        })
      )
        .then(function (pairs) {
          var data = {};
          pairs.forEach(function (p) { data[p[0]] = p[1]; });
          boot(data);
        })
        .catch(function (e) { fail(String(e && e.message || e)); });
    });
})();
