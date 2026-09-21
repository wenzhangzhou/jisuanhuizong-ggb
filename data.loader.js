(function(){
  'use strict';
  var PARTS=["meta","boundaries","sources","selection","geometry","ejot","torquePlastic","torqueCases","torqueMachine","options"];
  function fail(m){document.body.innerHTML='<p style="padding:2rem;color:#b00">数据加载失败：'+m+'</p>';}
  function boot(d){
    window.SCREW_DATA=d;
    window.dispatchEvent(new Event('screw-data-ready'));
  }
  function merge(a,b){var o={};Object.keys(a||{}).forEach(function(k){o[k]=a[k];});Object.keys(b||{}).forEach(function(k){o[k]=b[k];});return o;}
  function loadParts(){
    return Promise.all(PARTS.map(function(k){
      return fetch('data/parts/'+k+'.json',{cache:'no-cache'}).then(function(r){
        if(!r.ok) return [k,null];
        return r.json().then(function(v){return [k,v];});
      }).catch(function(){return [k,null];});
    })).then(function(pairs){
      var d={}, missing=[];
      pairs.forEach(function(p){ if(p[1]==null) missing.push(p[0]); else d[p[0]]=p[1]; });
      if(!d.torqueMachine || !d.meta || !d.options) throw new Error('缺少关键部件: '+missing.join(','));
      if(!d.geometry) d.geometry=[];
      if(!d.selection) d.selection=[];
      if(!d.sources) d.sources=[];
      if(!d.boundaries) d.boundaries={title:'',items:[]};
      if(!d.ejot) d.ejot=[];
      if(!d.torquePlastic) d.torquePlastic={methods:[],rows:[]};
      if(!d.torqueCases) d.torqueCases=[];
      boot(d);
    });
  }
  Promise.all([
    fetch('data/data.core.json',{cache:'no-cache'}).then(function(r){return r.ok?r.json():Promise.reject();}),
    fetch('data/data.extra.json',{cache:'no-cache'}).then(function(r){return r.ok?r.json():Promise.reject();})
  ]).then(function(pair){boot(merge(pair[0],pair[1]));}).catch(function(){
    fetch('data/data.json',{cache:'no-cache'}).then(function(r){
      if(!r.ok) throw new Error('data.json');
      return r.json();
    }).then(boot).catch(function(){ return loadParts(); }).catch(function(e){fail(String(e&&e.message||e));});
  });
})();
