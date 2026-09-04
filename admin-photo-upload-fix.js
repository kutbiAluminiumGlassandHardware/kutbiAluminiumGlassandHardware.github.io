/* Kutbi Photo Gallery upload reliability fix
   Handles GitHub Contents API SHA requirements for new/replaced files and metadata.
   Loaded after admin-add-photos.js so it can safely replace the upload button handler.
*/
(function(){
  const button=document.getElementById('optimizePhotos');
  if(!button) return;
  const API='https://api.github.com/repos/kutbiAluminiumGlassandHardware/kutbiAluminiumGlassandHardware.github.io/contents/';
  const BRANCH='main';
  const PHOTO_DIR='images/photos';
  const MAX_FILES=150;
  const MAX_SIZE=900*1024;
  const $id=id=>document.getElementById(id);
  const tokenValueLocal=()=>{
    const a=($id('token')?.value||'').trim();
    const b=($id('photoToken')?.value||'').trim();
    return a||b;
  };
  const headers=token=>({Authorization:'Bearer '+token,Accept:'application/vnd.github+json','Content-Type':'application/json'});
  const showLocal=(text,ok=true)=>{const el=$id('photoResult');if(!el)return;el.hidden=false;el.className='result '+(ok?'ok':'err');el.textContent=text;};
  const progressLocal=(n,total)=>{const el=$id('photoProgressBar');if(el)el.style.width=(total?Math.round(n/total*100):0)+'%';};
  const decode=value=>{const raw=String(value||'').replace(/\n/g,'');try{return decodeURIComponent(escape(atob(raw)));}catch(e){return atob(raw);}};
  const encode=value=>btoa(unescape(encodeURIComponent(value)));
  async function github(path,options={}){
    const response=await fetch(API+path,options);
    const data=await response.json().catch(()=>({}));
    if(!response.ok) throw new Error(data.message||('GitHub request failed ('+response.status+')'));
    return data;
  }
  async function getManifest(token){
    const data=await github(PHOTO_DIR+'/photos.json?ref='+BRANCH+'&cache='+Date.now(),{headers:headers(token)});
    let items=[];
    try{items=JSON.parse(decode(data.content));}catch(e){throw new Error('Photo gallery metadata file could not be read.');}
    if(!Array.isArray(items)) throw new Error('Photo gallery metadata must be a JSON array.');
    if(!data.sha) throw new Error('GitHub did not return the current photos.json SHA.');
    return {items,sha:data.sha};
  }
  async function putFile(path,body,token){
    const target=API+path;
    let response=await fetch(target,{method:'PUT',headers:headers(token),body:JSON.stringify(body)});
    let data=await response.json().catch(()=>({}));
    if(response.ok) return data;
    if(response.status===422 && /sha.*supplied|sha.*required|already exists/i.test(String(data.message||''))){
      const existing=await github(path+'?ref='+BRANCH+'&cache='+Date.now(),{headers:headers(token)});
      if(existing.sha){
        body.sha=existing.sha;
        response=await fetch(target,{method:'PUT',headers:headers(token),body:JSON.stringify(body)});
        data=await response.json().catch(()=>({}));
        if(response.ok) return data;
      }
    }
    throw new Error(data.message||'GitHub file upload failed.');
  }
  async function saveManifest(items,token){
    let lastError='';
    for(let attempt=0;attempt<5;attempt++){
      const latest=await getManifest(token);
      const body={message:'Update Kutbi photo gallery metadata',content:encode(JSON.stringify(items,null,2)+'\n'),branch:BRANCH,sha:latest.sha};
      try{return await putFile(PHOTO_DIR+'/photos.json',body,token);}
      catch(e){lastError=e.message||String(e);if(!/409|sha|does not match|conflict/i.test(lastError))throw e;}
    }
    throw new Error(lastError||'Could not save photo gallery metadata.');
  }
  async function uploadImage(file,filename,token){
    const path=PHOTO_DIR+'/'+filename;
    const body={message:'Add Kutbi gallery photo '+filename,content:await toBase64(file),branch:BRANCH};
    return putFile(path,body,token);
  }
  function toBase64(file){return new Promise((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve(String(r.result).split(',')[1]);r.onerror=()=>reject(new Error('Could not read '+file.name));r.readAsDataURL(file);});}
  async function run(){
    const token=tokenValueLocal();
    const files=[...($id('photoFiles')?.files||[])];
    const service=($id('photoService')?.value||'').trim();
    const area=($id('photoArea')?.value||'').trim();
    const description=($id('photoDescription')?.value||'').trim();
    if(!files.length)return showLocal('Please select photos first.',false);
    if(files.length>MAX_FILES)return showLocal('Maximum 150 photos per batch. You selected '+files.length+'.',false);
    if(!token)return showLocal('Please enter your GitHub access token.',false);
    if(typeof optimize!=='function'||typeof infer!=='function'||typeof seoMeta!=='function')return showLocal('Photo uploader functions are not loaded. Please refresh the page.',false);
    button.disabled=true;progressLocal(0,files.length);
    try{
      const original=files.slice();
      const ready=[];
      for(let i=0;i<files.length;i++){
        showLocal('Optimizing photo '+(i+1)+' of '+files.length+'...\n'+files[i].name);
        ready.push(await optimize(files[i]));
      }
      const stamp=Date.now();
      const added=[];
      for(let i=0;i<ready.length;i++){
        const detected=infer(original[i].name+' '+description);
        const chosenService=service||detected.service;
        const chosenArea=area||String(detected.area||'Bengaluru').replace(/,\s*Bengaluru$/i,'');
        const filename=slug(chosenService)+'-'+slug(chosenArea)+'-bengaluru-'+stamp+'-'+String(i+1).padStart(3,'0')+'-'+Math.random().toString(36).slice(2,7)+'.jpg';
        showLocal('Uploading photo '+(i+1)+' of '+files.length+'...\n'+filename+'\n'+Math.round(ready[i].size/1024)+' KB');
        await uploadImage(ready[i],filename,token);
        const meta=seoMeta(chosenService,chosenArea+', Bengaluru',description);
        added.push({id:String(stamp)+'-'+String(i),path:PHOTO_DIR+'/'+filename,type:'photo',service:chosenService,area:chosenArea+', Bengaluru',date:new Date().toISOString().slice(0,10),sizeMB:(ready[i].size/1048576).toFixed(2),originalName:original[i].name,seoFileName:filename,description:meta.description,alt:meta.alt,keywords:meta.keywords,metadataSource:(service||area||description)?'manual':'auto'});
        progressLocal(i+1,files.length);
      }
      showLocal('Saving photo gallery metadata...');
      const latest=await getManifest(token);
      await saveManifest(added.concat(latest.items),token);
      showLocal('✓ '+added.length+' photos uploaded successfully.\n✓ Optimized to 900 KB or less.\n✓ Unique SEO filenames created.\n✓ Service-specific ALT text, descriptions and keywords saved.');
      $id('photoFiles').value='';
      if(typeof loadExisting==='function')await loadExisting();
    }catch(error){
      showLocal('Upload failed.\n'+(error.message||error)+'\n\nNo existing gallery photos were deleted.',false);
    }finally{button.disabled=false;}
  }
  const replacement=button.cloneNode(true);
  button.replaceWith(replacement);
  replacement.addEventListener('click',run);
})();
