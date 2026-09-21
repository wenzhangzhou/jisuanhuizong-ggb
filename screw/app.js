(function () {
  'use strict';
  // Temporary loader: root app.js is byte-identical; full copy follows if needed.
  var s = document.createElement('script');
  s.src = '../app.js';
  s.onerror = function () {
    document.body.innerHTML = '<p style="padding:2rem;color:#b00">无法加载 screw/app.js（../app.js）</p>';
  };
  document.head.appendChild(s);
})();
