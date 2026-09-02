const OWNER='kutbiAluminiumGlassandHardware';
const REPO='kutbiAluminiumGlassandHardware.github.io';
const BRANCH='main';
const PHOTO_DIR='images/photos';
const MAX_SIZE=900*1024;
const MAX_FILES=150;
const $=id=>document.getElementById(id);

const AREAS=['Bannerghatta Road','Gottigere','Arekere','Hulimavu','JP Nagar','BTM Layout','Jayanagar','Begur','Electronic City','HSR Layout','Whitefield','Koramangala','Basavanagudi','Sarjapura','Kudlu Gate','Marathahalli','Defence Colony Indiranagar','Akshaya Nagar','Arekere MICO Layout 2nd Stage','Lakshmi Layout'];
const SERVICES=['Aluminium Window Repair','Aluminium Sliding Window Repair','Aluminium Window Wheel Replacement','Aluminium Window Roller Replacement','Aluminium Window Alignment','Aluminium Window Track Repair','Aluminium Window Lock Replacement','Aluminium Window Handle Replacement','Aluminium Window Rubber Beading Replacement','Aluminium Window Glass Replacement','Aluminium Sliding Door Repair','Aluminium Door Repair','Aluminium Door Wheel Replacement','Aluminium Door Lock Replacement','Aluminium Door Handle Replacement','Sliding Window Repair','Sliding Window Wheel Replacement','Sliding Window Roller Replacement','Sliding Window Alignment','Sliding Window Lock Replacement','Sliding Door Repair','Sliding Door Wheel Replacement','Sliding Door Lock Replacement','uPVC Window Repair','uPVC Sliding Window Repair','uPVC Window Wheel Replacement','uPVC Window Roller Replacement','uPVC Window Alignment','uPVC Window Lock Replacement','uPVC Window Handle Replacement','uPVC Window Rubber Beading Replacement','uPVC Window Glass Replacement','uPVC Door Repair','uPVC Sliding Door Repair','uPVC Door Wheel Replacement','uPVC Door Lock Replacement','uPVC Door Handle Replacement','Broken Glass Replacement','Window Glass Replacement','Glass Repair','Mosquito Mesh Installation','Mosquito Mesh Repair','Mosquito Mesh Replacement','Velcro Mosquito Mesh','Magnetic Mosquito Mesh','Pleated Mosquito Mesh','Netlon Mosquito Mesh','Mosquito Mesh Door Installation','Mosquito Mesh Window Installation','Pigeon Net Installation','Balcony Bird Net Installation','Bird Net Replacement','Invisible Grill Installation','Cloth Dryer Installation','Cloth Dryer Repair','Other Kutbi Service'];

const API='https://api.github.com/repos/'+OWNER+'/'+REPO+'/contents/';
const headers=token=>({Authorization:'Bearer '+token,Accept:'application/vnd.github+json','Content-Type':'application/json'});
const show=(text,ok=true)=>{const el=$('photoResult');if(!el)return;el.hidden=false;el.className='result '+(ok?'ok':'err');el.textContent=text;};
const progress=(n,total)=>{const el=$('photoProgressBar');if(el)el.style.width=(total?Math.round(n/total*100):0)+'%';};
const normalize=s=>String(s||'').toLowerCase().replace(/[_-]+/g,' ').replace(/\s+/g,' ').trim().replace(/\bbangalore\b/g,'bengaluru');
const slug=s=>normalize(s).replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'').slice(0,70)||'photo';

async function request(path,options={}){
  const response=await fetch(API+path,options);
  const data=await response.json().catch(()=>({}));
  if(!response.ok)throw new Error(data.message||('GitHub request failed ('+response.status+')'));
  return data;
}

function decodeBase64(value){
  const raw=String(value||'').replace(/\n/g,'');
  try{return decodeURIComponent(escape(atob(raw)));}catch(e){return atob(raw);}
}
function encodeBase64(value){return btoa(unescape(encodeURIComponent(value)));}

async function readManifest(token){
  const data=await request(PHOTO_DIR+'/photos.json?ref='+BRANCH+'&cache='+Date.now(),{headers:headers(token)});
  let items;
  try{items=JSON.parse(decodeBase64(data.content));}catch(e){throw new Error('Photo gallery metadata file could not be read.');}
  if(!Array.isArray(items))throw new Error('Photo gallery metadata must be a JSON array.');
  return {items,sha:data.sha};
}

async function writeManifest(items,sha,token){
  let currentSha=sha;
  for(let attempt=0;attempt<5;attempt++){
    const body={message:'Update Kutbi photo gallery metadata',content:encodeBase64(JSON.stringify(items,null,2)+'\n'),branch:BRANCH,sha:currentSha};
    const response=await fetch(API+PHOTO_DIR+'/photos.json',{method:'PUT',headers:headers(token),body:JSON.stringify(body)});
    const data=await response.json().catch(()=>({}));
    if(response.ok)return data;
    if(response.status!==409)throw new Error(data.message||'Could not save photo gallery metadata.');
    currentSha=(await readManifest(token)).sha;
  }
  throw new Error('Photo gallery metadata changed during upload. Please retry.');
}

function readImage(file){
  return new Promise((resolve,reject)=>{
    const url=URL.createObjectURL(file);
    const img=new Image();
    img.onload=()=>{URL.revokeObjectURL(url);resolve(img);};
    img.onerror=()=>{URL.revokeObjectURL(url);reject(new Error('Could not read '+file.name));};
    img.src=url;
  });
}

async function optimize(file){
  if(file.size<=MAX_SIZE&&/^image\/(jpeg|jpg)$/i.test(file.type))return file;
  const img=await readImage(file);
  let width=img.naturalWidth,height=img.naturalHeight;
  const scale=Math.min(1,2400/Math.max(width,height));
  width=Math.max(500,Math.round(width*scale));
  height=Math.max(500,Math.round(height*scale));
  for(let pass=0;pass<28;pass++){
    const canvas=document.createElement('canvas');
    canvas.width=width;canvas.height=height;
    const ctx=canvas.getContext('2d');
    if(!ctx)throw new Error('Browser image processing is unavailable.');
    ctx.drawImage(img,0,0,width,height);
    const quality=Math.max(.42,.84-(pass%8)*.05);
    const blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/jpeg',quality));
    if(blob&&blob.size<=MAX_SIZE)return new File([blob],file.name.replace(/\.[^.]+$/,'')+'.jpg',{type:'image/jpeg',lastModified:Date.now()});
    if(pass>=7){width=Math.max(500,Math.round(width*.82));height=Math.max(500,Math.round(height*.82));}
  }
  throw new Error('Could not reduce '+file.name+' below 900 KB.');
}

function toBase64(file){
  return new Promise((resolve,reject)=>{
    const reader=new FileReader();
    reader.onload=()=>resolve(String(reader.result).split(',')[1]);
    reader.onerror=()=>reject(new Error('Could not read '+file.name));
    reader.readAsDataURL(file);
  });
}

function infer(text){
  const n=normalize(text);
  let service=SERVICES.find(x=>x!=='Other Kutbi Service'&&n.includes(normalize(x)))||'';
  if(!service){
    if(/wheel|roller/.test(n))service=/upvc/.test(n)?'uPVC Window Wheel Replacement':'Aluminium Window Wheel Replacement';
    else if(/rubber|beading/.test(n))service='Aluminium Window Rubber Beading Replacement';
    else if(/broken|glass/.test(n))service='Broken Glass Replacement';
    else if(/mesh|mosquito|netlon|velcro|magnetic|pleated/.test(n))service='Mosquito Mesh Replacement';
    else if(/lock|handle/.test(n))service=/upvc/.test(n)?'uPVC Door Repair':'Aluminium Window Repair';
    else if(/door/.test(n))service=/upvc/.test(n)?'uPVC Door Repair':'Aluminium Door Repair';
    else service=/upvc/.test(n)?'uPVC Window Repair':'Aluminium Window Repair';
  }
  const found=AREAS.find(x=>n.includes(normalize(x)));
  return {service,area:found?found+', Bengaluru':'Bengaluru'};
}

async function uploadOne(file,original,index,total,token,manualService,manualArea,description,stamp){
  const detected=infer(original.name+' '+description);
  const service=manualService||detected.service;
  const area=manualArea?manualArea+', Bengaluru':detected.area;
  const filename=slug(service)+'-'+slug(area)+'-'+stamp+'-'+String(index+1).padStart(3,'0')+'.jpg';
  show('Uploading photo '+(index+1)+' of '+total+'...\n'+filename+'\n'+Math.round(file.size/1024)+' KB');
  await request(PHOTO_DIR+'/'+filename,{method:'PUT',headers:headers(token),body:JSON.stringify({message:'Add Kutbi gallery photo '+filename,content:await toBase64(file),branch:BRANCH})});
  progress(index+1,total);
  return {id:String(stamp+index),path:PHOTO_DIR+'/'+filename,type:'photo',service,area,date:new Date().toISOString().slice(0,10),sizeMB:(file.size/1048576).toFixed(2),originalName:original.name,seoFileName:filename,description:description||'',alt:service+' in '+area+' - Kutbi Aluminium Glass & Hardware',keywords:[service,area,'Bengaluru','Window Repair Bangalore','Mosquito Mesh Bangalore','Kutbi Aluminium Glass & Hardware'],metadataSource:(manualService||manualArea)?'manual':'auto'};
}

async function optimizeAndUpload(){
  const token=($('photoToken')?.value||'').trim();
  const files=[...($('photoFiles')?.files||[])];
  const manualService=($('photoService')?.value||'').trim();
  const manualArea=($('photoArea')?.value||'').trim();
  const description=($('photoDescription')?.value||'').trim();
  const button=$('optimizePhotos');
  if(!files.length)return show('Please select photos first.',false);
  if(files.length>MAX_FILES)return show('Maximum 150 photos per batch. You selected '+files.length+'.',false);
  if(!token)return show('Please enter your GitHub access token.',false);
  button.disabled=true;ready=[];original=[];progress(0,files.length);
  try{
    show('Checking GitHub access and photo gallery...');
    await readManifest(token);
    for(let i=0;i<files.length;i++){
      show('Optimizing photo '+(i+1)+' of '+files.length+'...\n'+files[i].name);
      ready.push(await optimize(files[i]));original.push(files[i]);progress(i+1,files.length);
    }
    const stamp=Date.now();
    const added=[];
    for(let i=0;i<ready.length;i++)added.push(await uploadOne(ready[i],original[i],i,ready.length,token,manualService,manualArea,description,stamp));
    show('Saving photo gallery metadata...');
    const latest=await readManifest(token);
    await writeManifest(added.concat(latest.items),latest.sha,token);
    show('✓ '+added.length+' photos optimized and uploaded successfully.\n✓ SEO filename, ALT text, service, area and keywords saved.');
    $('photoFiles').value='';ready=[];original=[];await loadExisting();
  }catch(error){
    show('Upload failed.\n'+(error.message||error)+'\n\nNo existing gallery photos were deleted. Photos already uploaded in this batch remain safe. Fix the issue and retry.',false);
  }finally{button.disabled=false;}
}

let cache=[];
async function loadExisting(){
  const token=($('photoToken')?.value||'').trim(),select=$('photoExisting');
  if(!token||!select)return;
  try{
    select.innerHTML='<option>Loading photos...</option>';
    const manifest=await readManifest(token);cache=manifest.items;
    select.innerHTML='<option value="">Select uploaded photo</option>'+cache.map((item,i)=>'<option value="'+i+'">'+(item.service||'Uncategorised')+' · '+(item.area||'Bengaluru')+' · '+(item.originalName||item.seoFileName||item.path)+'</option>').join('');
  }catch(error){select.innerHTML='<option>Could not load photos</option>';}
}
function fillExisting(){const i=Number($('photoExisting')?.value),item=cache[i];if(!item)return;$('photoService').value=item.service||'';$('photoArea').value=String(item.area||'').replace(/,?\s*bengaluru$/i,'');$('photoDescription').value=item.description||'';}
async function updateExisting(){
  const token=($('photoToken')?.value||'').trim(),i=Number($('photoExisting')?.value),selected=cache[i];
  if(!token||!selected)return show('Enter your token and select an uploaded photo.',false);
  try{
    const manifest=await readManifest(token);
    const updated={...selected,service:$('photoService').value||selected.service,area:$('photoArea').value?$('photoArea').value+', Bengaluru':selected.area,description:$('photoDescription').value||selected.description||''};
    updated.alt=updated.service+' in '+updated.area+' - Kutbi Aluminium Glass & Hardware';updated.metadataSource='manual';
    const pos=manifest.items.findIndex(item=>String(item.id)===String(selected.id)||item.path===selected.path);
    if(pos<0)throw new Error('Photo not found in gallery metadata.');
    manifest.items[pos]=updated;await writeManifest(manifest.items,manifest.sha,token);cache=manifest.items;show('✓ Photo SEO metadata updated.');
  }catch(error){show('Update failed: '+error.message,false);}
}

function init(){
  if($('optimizePhotos'))$('optimizePhotos').addEventListener('click',optimizeAndUpload);
  if($('photoToken'))$('photoToken').addEventListener('blur',loadExisting);
  if($('photoExisting'))$('photoExisting').addEventListener('change',fillExisting);
  if($('photoUpdate'))$('photoUpdate').addEventListener('click',updateExisting);
  if($('photoFiles'))$('photoFiles').addEventListener('change',()=>{ready=[];original=[];progress(0,0);const count=$('photoFiles').files.length;if(count>MAX_FILES)show('You selected '+count+' photos. Maximum is 150 per batch.',false);else if(count)show(count+' photos selected. Press “Optimize & Upload Photos”.');});
}
let ready=[],original=[];
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
