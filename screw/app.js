(function () {
  'use strict';
  var s = document.createElement('script');
  s.src = '../app.js';
  s.onerror = function () {
    document.body.innerHTML = '<p style="padding:2rem;color:#b00">无法加载 ../app.js</p>';
  };
  document.head.appendChild(s);
})();
