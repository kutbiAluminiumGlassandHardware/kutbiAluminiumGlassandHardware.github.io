/* Kutbi Photo Gallery - AI image analysis batch mode
   Uploads optimized photos to a temporary incoming folder.
   A secure GitHub Action then analyzes the actual image with OpenAI Vision,
   chooses the service from the approved Kutbi service list, creates factual
   SEO metadata, and moves the photo to its final SEO filename.
*/
(function(){
  const areaSelect=document.getElementById('photoArea');
  const randomize=document.getElementById('randomizePhotoAreas');
  const uploadButton=document.getElementById('optimizePhotos');
  if(!areaSelect||!uploadButton||typeof optimizeAndUpload!=='function') return;

  const INCOMING_DIR='images/photos/incoming';

  areaSelect.multiple=true;
  areaSelect.size=Math.min(8, Math.max(4, areaSelect.options.length));
  areaSelect.setAttribute('aria-label','Select one or more project areas');

  // The service is now determined by the actual image, not the filename.
  const serviceSelect=document.getElementById('photoService');
  if(serviceSelect?.options?.length){
    serviceSelect.options[0].textContent='AI auto-detect service from image';
    serviceSelect.value='';
    serviceSelect.disabled=true;
  }
  const serviceHint=serviceSelect?.parentElement?.querySelector('.hint');
  if(serviceHint) serviceHint.textContent='AI analyzes the actual photo and selects the most specific Kutbi service. Filename is never used to choose the service.';
  const description=document.getElementById('photoDescription');
  const descriptionLabel=description?.previousElementSibling;
  if(descriptionLabel) descriptionLabel.textContent='Photo Description (AI generated)';
  if(description){
    description.disabled=true;
    description.placeholder='AI will write a factual description from the actual image.';
  }

  function selectedAreas(){
    return Array.from(areaSelect.selectedOptions||[])
      .map(o=>String(o.value||o.textContent||'').trim())
      .filter(Boolean);
  }

  function slugLocal(s){
    return String(s||'').toLowerCase().replace(/[_-]+/g,' ').replace(/\s+/g,' ').trim()
      .replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'').slice(0,70)||'bengaluru';
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
    if(!areas.length) return Array(total).fill('');
    if(areas.length===1) return Array(total).fill(areas[0]);
    const pool=[];
    for(let i=0;i<total;i++) pool.push(areas[i%areas.length]);
    return shuffled(pool);
  }

  async function uploadPending(file,original,index,total,token,area,stamp){
    const areaSlug=area?slugLocal(area):'bengaluru';
    const unique=stamp+'-'+Math.random().toString(36).slice(2,7)+'-'+String(index+1).padStart(3,'0');
    const filename='pending-'+areaSlug+'-'+unique+'.jpg';
    show('Uploading photo '+(index+1)+' of '+total+' to AI queue...\n'+filename+'\n'+Math.round(file.size/1024)+' KB');
    await request(INCOMING_DIR+'/'+filename,{method:'PUT',headers:headers(token),body:JSON.stringify({message:'Queue Kutbi gallery photo for AI analysis '+filename,content:await toBase64(file),branch:BRANCH})});
    progress(index+1,total);
    return filename;
  }

  async function aiQueueUpload(){
    const token=tokenValue();
    const files=[...($('photoFiles')?.files||[])];
    const areas=selectedAreas();
    const button=document.getElementById('optimizePhotos');
    if(!files.length) return show('Please select photos first.',false);
    if(files.length>MAX_FILES) return show('Maximum 150 photos per batch. You selected '+files.length+'.',false);
    if(!token) return show('Please enter your GitHub access token in the main GitHub access token field at the top of this page.',false);
    if(randomize?.checked && !areas.length) return show('Please select at least one Project Area when Randomly distribute selected areas is enabled.',false);

    const areaAssignments=randomize?.checked ? makeBalancedAssignments(files.length,areas) : Array(files.length).fill(areas[0]||'');
    button.disabled=true;
    progress(0,files.length);
    try{
      show('Checking GitHub access...');
      await readManifest(token);
      const ready=[];
      for(let i=0;i<files.length;i++){
        show('Optimizing photo '+(i+1)+' of '+files.length+'...\n'+files[i].name);
        ready.push(await optimize(files[i]));
      }
      const stamp=Date.now();
      for(let i=0;i<ready.length;i++){
        await uploadPending(ready[i],files[i],i,ready.length,token,areaAssignments[i],stamp);
      }
      const areaSummary=areas.length?'\nSelected areas: '+areas.join(', '):'\nNo area selected: Bengaluru will be used.';
      show('✓ '+ready.length+' photos uploaded to the AI analysis queue.\n✓ Service will be detected from each actual image — NOT from the filename.\n✓ AI will create the factual photo description, ALT text, keywords and SEO filename.\n✓ Existing gallery photos were not deleted.'+areaSummary+'\n\nThe GitHub AI workflow will now process the queued photos automatically.');
      $('photoFiles').value='';
    }catch(error){
      show('Upload failed.\n'+(error.message||error)+'\n\nNo existing gallery photos were deleted.',false);
    }finally{
      button.disabled=false;
    }
  }

  const replacement=uploadButton.cloneNode(true);
  uploadButton.replaceWith(replacement);
  replacement.addEventListener('click',aiQueueUpload);

  const hint=document.getElementById('photoAreaBatchHint');
  if(hint) hint.textContent='Select one or more areas. Areas are distributed randomly and evenly; AI identifies the service from the actual photo.';
})();
