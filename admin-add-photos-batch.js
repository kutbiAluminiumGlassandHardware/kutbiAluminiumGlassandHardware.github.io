/* Kutbi Photo Gallery - balanced multi-area batch mode
   This file extends the existing admin-add-photos.js uploader.
   It is intentionally separate so the existing uploader logic remains intact.
*/
(function(){
  const areaSelect=document.getElementById('photoArea');
  const randomize=document.getElementById('randomizePhotoAreas');
  const uploadButton=document.getElementById('optimizePhotos');
  if(!areaSelect||!uploadButton||typeof optimizeAndUpload!=='function') return;

  areaSelect.multiple=true;
  areaSelect.size=Math.min(8, Math.max(4, areaSelect.options.length));
  areaSelect.setAttribute('aria-label','Select one or more project areas');

  function selectedAreas(){
    return Array.from(areaSelect.selectedOptions||[])
      .map(o=>String(o.value||o.textContent||'').trim())
      .filter(Boolean);
  }

  function shuffled(values){
    const a=values.slice();
    for(let i=a.length-1;i>0;i--){
      const j=Math.floor(Math.random()*(i+1));
      [a[i],a[j]]=[a[j],a[i]];
    }
    return a;
  }

  function makeBalancedAssignments(total,areas){
    if(!areas.length) return [];
    if(areas.length===1) return Array(total).fill(areas[0]);
    const pool=[];
    for(let i=0;i<total;i++) pool.push(areas[i%areas.length]);
    return shuffled(pool);
  }

  async function batchUploadOne(file,original,index,total,token,manualService,area,description,stamp){
    const detected=infer(original.name+' '+description);
    const service=manualService||detected.service;
    const chosenArea=area||detected.area;
    const areaName=String(chosenArea||'Bengaluru').replace(/,\s*Bengaluru$/i,'');
    const unique=stamp+'-'+Math.random().toString(36).slice(2,7)+'-'+String(index+1).padStart(3,'0');
    const filename=slug(service)+'-'+slug(areaName)+'-bengaluru-'+unique+'.jpg';
    const meta=seoMeta(service,areaName+', Bengaluru',description);
    show('Uploading photo '+(index+1)+' of '+total+'...\n'+filename+'\n'+Math.round(file.size/1024)+' KB');
    await request(PHOTO_DIR+'/'+filename,{method:'PUT',headers:headers(token),body:JSON.stringify({message:'Add Kutbi gallery photo '+filename,content:await toBase64(file),branch:BRANCH})});
    progress(index+1,total);
    return {
      id:String(stamp)+'-'+String(index),
      path:PHOTO_DIR+'/'+filename,
      type:'photo',
      service,
      area:areaName+', Bengaluru',
      date:new Date().toISOString().slice(0,10),
      sizeMB:(file.size/1048576).toFixed(2),
      originalName:original.name,
      seoFileName:filename,
      description:meta.description,
      alt:meta.alt,
      keywords:meta.keywords,
      metadataSource:(manualService||area||description)?'manual-batch':'auto'
    };
  }

  async function balancedOptimizeAndUpload(){
    const token=tokenValue();
    const files=[...($('photoFiles')?.files||[])];
    const manualService=($('photoService')?.value||'').trim();
    const areas=selectedAreas();
    const description=($('photoDescription')?.value||'').trim();
    const button=document.getElementById('optimizePhotos');
    if(!files.length) return show('Please select photos first.',false);
    if(files.length>MAX_FILES) return show('Maximum 150 photos per batch. You selected '+files.length+'.',false);
    if(!token) return show('Please enter your GitHub access token in the main GitHub access token field at the top of this page.',false);
    if(randomize?.checked && !areas.length) return show('Please select at least one Project Area when Randomly distribute selected areas is enabled.',false);

    const areaAssignments=randomize?.checked ? makeBalancedAssignments(files.length,areas) : [];
    if(randomize?.checked) show('Preparing '+files.length+' photos...\nSelected areas: '+areas.join(', ')+'\nAreas will be distributed randomly and as evenly as possible.');

    button.disabled=true;
    progress(0,files.length);
    try{
      show('Checking GitHub access...');
      await readManifest(token);
      const ready=[];
      const originals=files.slice();
      for(let i=0;i<files.length;i++){
        show('Optimizing photo '+(i+1)+' of '+files.length+'...\n'+files[i].name);
        ready.push(await optimize(files[i]));
      }
      const stamp=Date.now();
      const added=[];
      for(let i=0;i<ready.length;i++){
        const assigned= randomize?.checked ? areaAssignments[i] : '';
        added.push(await batchUploadOne(ready[i],originals[i],i,ready.length,token,manualService,assigned,description,stamp));
      }
      show('Saving photo gallery metadata...');
      const latest=await readManifest(token);
      await writeManifest(added.concat(latest.items),latest.sha,token);
      const summary=randomize?.checked ? '\n✓ Areas randomly distributed: '+areas.join(', ') : '';
      show('✓ '+added.length+' photos uploaded successfully.\n✓ Optimized to 900 KB or less.\n✓ Unique SEO filenames created.\n✓ Service-specific ALT text, descriptions and keywords saved.'+summary);
      $('photoFiles').value='';
      await loadExisting();
    }catch(error){
      show('Upload failed.\n'+(error.message||error)+'\n\nNo existing gallery photos were deleted.',false);
    }finally{
      button.disabled=false;
    }
  }

  // Replace the original button so its old click listener cannot trigger a second upload.
  const replacement=uploadButton.cloneNode(true);
  uploadButton.replaceWith(replacement);
  replacement.addEventListener('click',balancedOptimizeAndUpload);

  // Small live hint below the area selector.
  const hint=document.getElementById('photoAreaBatchHint');
  if(hint) hint.textContent='Select one or more areas. With random distribution enabled, the selected areas are shuffled and balanced across the photos.';
})();