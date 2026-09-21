(function(){
  'use strict';
  var PARTS=["meta","boundaries","sources","selection","geometry","ejot","torquePlastic","torqueCases","torqueMachine","options"];
  function fail(m){document.body.innerHTML='<p style="padding:2rem;color:#b00">数据加载失败：'+m+'</p>';}
  function boot(d){window.SCREW_DATA=d;window.dispatchEvent(new Event('screw-data-ready'));}
  function merge(a,b){var o={};Object.keys(a||{}).forEach(function(k){o[k]=a[k];});Object.keys(b||{}).forEach(function(k){o[k]=b[k];});return o;}
  Promise.all([
    fetch('data/data.core.json',{cache:'no-cache'}).then(function(r){return r.ok?r.json():Promise.reject(r.status);}),
    fetch('data/data.extra.json',{cache:'no-cache'}).then(function(r){return r.ok?r.json():Promise.reject(r.status);})
  ]).then(function(pair){boot(merge(pair[0],pair[1]));}).catch(function(){
    fetch('data/data.json',{cache:'no-cache'}).then(function(r){if(!r.ok)throw new Error('data.json '+r.status);return r.json();}).then(boot).catch(function(){
      Promise.all(PARTS.map(function(k){return fetch('data/parts/'+k+'.json',{cache:'no-cache'}).then(function(r){if(!r.ok)throw new Error(k+' '+r.status);return r.json().then(function(v){return[k,v];});});})).then(function(pairs){var d={};pairs.forEach(function(p){d[p[0]]=p[1];});boot(d);}).catch(function(e){fail(String(e&&e.message||e));});
    });
  });
})();
