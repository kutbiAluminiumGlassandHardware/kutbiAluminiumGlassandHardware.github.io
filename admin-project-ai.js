(function(){
'use strict';
var OWNER='kutbiAluminiumGlassandHardware',REPO='kutbiAluminiumGlassandHardware.github.io',BRANCH='main';
var API='https://api.github.com/repos/'+OWNER+'/'+REPO+'/contents/',REQUEST_DIR='.github/ai-project-requests',RESULT_DIR='images/projects/ai-results';
function $(id){return document.getElementById(id)}
function enc(s){return btoa(unescape(encodeURIComponent(s)))}
function auth(t){return {Authorization:'Bearer '+t,Accept:'application/vnd.github+json','Content-Type':'application/json'}}
async function put(path,body,t){var r=await fetch(API+path,{method:'PUT',headers:auth(t),body:JSON.stringify(body)}),d=await r.json().catch(function(){return{}});if(!r.ok)throw Error(d.message||('GitHub error '+r.status));return d}
async function get(path,t){var r=await fetch(API+path+'?ref='+BRANCH+'&t='+Date.now(),{cache:'no-store',headers:auth(t)}),d=await r.json().catch(function(){return{}});if(!r.ok)throw Object.assign(Error(d.message||('GitHub error '+r.status)),{status:r.status});return d}
async function remove(path,sha,t){var r=await fetch(API+path,{method:'DELETE',headers:auth(t),body:JSON.stringify({message:'Remove temporary Kutbi AI project result',sha:sha,branch:BRANCH})});if(!r.ok&&r.status!==404)throw Error('Could not clean temporary AI result.')}
function decode(s){try{return decodeURIComponent(escape(atob(String(s||'').replace(/\n/g,''))))}catch(e){return atob(String(s||'').replace(/\n/g,''))}}
function show(msg,ok){var e=$('result');if(!e)return;e.hidden=false;e.className='result '+(ok?'ok':'err');e.textContent=msg}
function serviceOptions(){var s=$('service');return s?Array.prototype.map.call(s.options,function(o){return o.value||o.textContent.trim()}).filter(Boolean):[]}
async function waitForResult(id,t){var path=RESULT_DIR+'/'+id+'.json';for(var i=0;i<36;i++){try{var d=await get(path,t),result=JSON.parse(decode(d.content));if(result.ok===false)throw Error(result.error||'AI could not generate the project details.');return{result:result,sha:d.sha,path:path}}catch(e){if(e.status!==404)throw e;await new Promise(function(r){setTimeout(r,4000)})}}throw Error('AI generation is taking longer than expected. Please wait a little and try again.')}
async function generate(){
 var prompt=$('kutbiProjectPrompt')?$('kutbiProjectPrompt').value.trim():'',token=$('token')?$('token').value.trim():'';
 if(!prompt){show('Please describe the project first.');return} if(!token){show('Please enter your GitHub access token first.');return}
 var button=$('kutbiGenerateProject');button.disabled=true;
 try{
  var id='project-'+Date.now()+'-'+Math.random().toString(36).slice(2,8),date=$('date')&&$('date').value?$('date').value:new Date().toISOString().slice(0,10);
  var request={id:id,prompt:prompt,date:date,services:serviceOptions()};
  show('Sending your project description to the secure Kutbi AI generator...\nPlease keep this page open.');
  await put(REQUEST_DIR+'/'+id+'.json',{message:'Request Kutbi AI project details',content:enc(JSON.stringify(request,null,2)+'\n'),branch:BRANCH},token);
  show('AI is preparing the project title, service, area and description...\nPlease wait.');
  var found=await waitForResult(id,token),r=found.result;
  $('title').value=r.title||'';$('service').value=r.service||'';$('area').value=r.area||'';$('date').value=r.date||date;$('description').value=r.description||'';
  show('✓ Project details generated.\n\nReview the fields above, make any changes you want, then use the existing “Optimize & Upload Project” button.\n\nNothing was uploaded or published by the AI.',true);
  remove(found.path,found.sha,token).catch(function(){});$('kutbiProjectPrompt').value='';
 }catch(e){show('AI generation failed.\n'+(e.message||String(e))+'\n\nYour existing Add Project fields and upload system were not changed.',false)}
 finally{button.disabled=false}
}
function init(){
 var manager=document.querySelector('.manager');if(!manager||$('kutbiProjectPrompt'))return;
 var wrap=document.createElement('div');
 wrap.innerHTML='<div style="margin:18px 0 20px;padding:18px;border:2px solid #d5dbe0;border-radius:14px;background:#fafbfc"><label for="kutbiProjectPrompt" style="margin-top:0">✨ Describe Your Project</label><textarea id="kutbiProjectPrompt" placeholder="Write the project naturally, just like you would write it in ChatGPT. Example: Aluminium sliding door repair and wheel replacement completed at Mantri Residency, Bannerghatta Road, Bengaluru. Door was stuck and difficult to move. Old wheels replaced and door adjusted for smooth movement." style="min-height:150px"></textarea><p class="hint">AI will fill the existing Project Title, Service, Project Area, Project Date and Project Description fields. Review everything before uploading.</p><button id="kutbiGenerateProject" class="btn" type="button">✨ Generate Project Details</button></div>';
 var firstRow=manager.querySelector('.row');manager.insertBefore(wrap,firstRow||manager.firstChild);$('kutbiGenerateProject').addEventListener('click',generate);
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();