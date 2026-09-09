(function(){
  function setup(inputId,labelText){
    const input=document.getElementById(inputId);
    if(!input||input.dataset.filesPickerReady)return;
    input.dataset.filesPickerReady='1';
    const button=document.createElement('button');
    button.type='button';
    button.textContent=labelText;
    button.style.cssText='width:100%;box-sizing:border-box;padding:12px;border:1px solid #ccd2d8;border-radius:9px;font:inherit;font-weight:700;cursor:pointer;margin-top:6px;background:#fff;';
    input.parentNode.insertBefore(button,input);
    input.style.display='none';
    button.addEventListener('click',async function(){
      if(window.showOpenFilePicker){
        try{
          const handles=await window.showOpenFilePicker({
            multiple:input.multiple,
            types:[{description:'Image files',accept:{'image/jpeg':['.jpg','.jpeg'],'image/png':['.png'],'image/webp':['.webp'],'image/gif':['.gif']}}]
          });
          const files=await Promise.all(handles.map(h=>h.getFile()));
          const dt=new DataTransfer();
          files.forEach(f=>dt.items.add(f));
          input.files=dt.files;
          button.textContent='✓ '+files.length+' photo(s) selected from Files';
        }catch(e){
          if(e&&e.name==='AbortError')return;
          input.click();
        }
      }else input.click();
    });
  }
  function setupAll(){
    setup('photoFiles','📁 Choose Photos from Files');
    setup('single','📁 Choose Photo from Files');
    setup('multiple','📁 Choose Photos from Files');
    setup('before','📁 Choose Before Images from Files');
    setup('after','📁 Choose After Images from Files');
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',setupAll);else setupAll();
})();
