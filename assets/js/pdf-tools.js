(()=>{
  const picker=document.getElementById('file-input');
  const dropzone=document.getElementById('dropzone');
  const pageList=document.getElementById('page-list');
  const emptyQueue=document.getElementById('empty-queue');
  const pageCount=document.getElementById('page-count');
  const status=document.getElementById('pdf-status');
  const clearButton=document.getElementById('clear-button');
  const outputForm=document.getElementById('output-form');
  const outputName=document.getElementById('output-name');
  const createButton=document.getElementById('create-button');
  const downloadLink=document.getElementById('download-link');
  const MAX_FILE_BYTES=40*1024*1024;
  const MAX_TOTAL_BYTES=120*1024*1024;
  const MAX_PAGES=500;
  const MAX_IMAGE_SIDE=2600;
  const A4_WIDTH=595.28;
  const A4_HEIGHT=841.89;
  const sources=new Map();
  let pages=[];
  let sourceSequence=0;
  let pageSequence=0;
  let busy=false;
  let outputUrl='';

  if(!window.PDFLib||!window.PDFLib.PDFDocument){
    announce('The PDF tool could not start. Refresh this page and try again.', 'error');
    return;
  }
  const PDFDocument=window.PDFLib.PDFDocument;

  function announce(message,state){
    status.textContent=message;
    status.dataset.state=state||'info';
  }

  function formatBytes(bytes){
    if(bytes<1024*1024)return Math.max(1,Math.round(bytes/1024))+' KB';
    return (bytes/(1024*1024)).toFixed(1)+' MB';
  }

  function currentFileBytes(){
    let total=0;
    sources.forEach(source=>{total+=source.fileSize;});
    return total;
  }

  function invalidateOutput(){
    if(outputUrl){URL.revokeObjectURL(outputUrl);outputUrl='';}
    downloadLink.hidden=true;
    downloadLink.removeAttribute('href');
    downloadLink.removeAttribute('download');
  }

  function updateControls(){
    const hasPages=pages.length>0;
    pageCount.textContent=pages.length+' '+(pages.length===1?'page':'pages');
    emptyQueue.hidden=hasPages;
    clearButton.disabled=!hasPages||busy;
    createButton.disabled=!hasPages||busy;
    picker.disabled=busy;
    dropzone.setAttribute('aria-disabled',busy?'true':'false');
  }

  function cleanupEmptySources(){
    const active=new Set(pages.map(page=>page.sourceId));
    for(const [id,source] of sources){
      if(!active.has(id)){
        if(source.previewUrl)URL.revokeObjectURL(source.previewUrl);
        sources.delete(id);
      }
    }
  }

  function makePageCard(page,index){
    const source=sources.get(page.sourceId);
    const card=document.createElement('li');
    card.className='pdf-page-card';
    card.draggable=!busy;
    card.dataset.pageId=page.id;
    card.setAttribute('aria-posinset',String(index+1));
    card.setAttribute('aria-setsize',String(pages.length));

    const thumb=document.createElement('div');
    thumb.className='pdf-page-thumb';
    if(source.kind==='image'){
      const image=document.createElement('img');
      image.src=source.previewUrl;
      image.alt='';
      image.loading='lazy';
      image.draggable=false;
      thumb.appendChild(image);
    }else{
      const mark=document.createElement('span');
      mark.textContent='PDF';
      thumb.appendChild(mark);
    }

    const copy=document.createElement('div');
    copy.className='pdf-page-copy';
    const order=document.createElement('span');
    order.className='pdf-page-order';
    order.textContent='OUTPUT PAGE '+String(index+1).padStart(2,'0');
    const name=document.createElement('strong');
    name.textContent=source.name;
    name.title=source.name;
    const detail=document.createElement('small');
    detail.textContent=source.kind==='image'?'Photo · '+source.width+' × '+source.height+' pixels':'PDF page '+(page.pageIndex+1)+' of '+source.pageTotal;
    copy.append(order,name,detail);

    const actions=document.createElement('div');
    actions.className='pdf-page-actions';
    const up=document.createElement('button');
    up.className='page-action';
    up.type='button';
    up.dataset.action='up';
    up.setAttribute('aria-label','Move '+source.name+' page '+(page.pageIndex+1)+' up');
    up.title='Move page up';
    up.textContent='↑';
    up.disabled=index===0||busy;
    const down=document.createElement('button');
    down.className='page-action';
    down.type='button';
    down.dataset.action='down';
    down.setAttribute('aria-label','Move '+source.name+' page '+(page.pageIndex+1)+' down');
    down.title='Move page down';
    down.textContent='↓';
    down.disabled=index===pages.length-1||busy;
    const remove=document.createElement('button');
    remove.className='page-action remove-page';
    remove.type='button';
    remove.dataset.action='remove';
    remove.setAttribute('aria-label','Remove '+source.name+' page '+(page.pageIndex+1));
    remove.title='Remove page';
    remove.textContent='×';
    remove.disabled=busy;
    actions.append(up,down,remove);
    card.append(thumb,copy,actions);
    return card;
  }

  function renderPages(focus){
    const focusedPage=focus&&focus.pageId;
    const focusedAction=focus&&focus.action;
    pageList.replaceChildren(...pages.map(makePageCard));
    updateControls();
    if(focusedPage&&focusedAction){
      const card=pageList.querySelector('[data-page-id="'+CSS.escape(focusedPage)+'"]');
      const control=card&&card.querySelector('[data-action="'+focusedAction+'"]');
      if(control&&!control.disabled)control.focus({preventScroll:true});
    }
  }

  function makeId(prefix,sequence){
    return prefix+'-'+sequence+'-'+Math.random().toString(36).slice(2,9);
  }

  async function decodePhoto(file){
    let bitmap;
    try{
      bitmap=await createImageBitmap(file,{imageOrientation:'from-image'});
    }catch(error){
      bitmap=await createImageBitmap(file);
    }
    const originalWidth=bitmap.width;
    const originalHeight=bitmap.height;
    const scale=Math.min(1,MAX_IMAGE_SIDE/Math.max(originalWidth,originalHeight));
    const width=Math.max(1,Math.round(originalWidth*scale));
    const height=Math.max(1,Math.round(originalHeight*scale));
    const canvas=document.createElement('canvas');
    canvas.width=width;
    canvas.height=height;
    const context=canvas.getContext('2d',{alpha:false});
    if(!context){bitmap.close();throw new Error('This browser cannot prepare image pages.');}
    context.fillStyle='#ffffff';
    context.fillRect(0,0,width,height);
    context.drawImage(bitmap,0,0,width,height);
    bitmap.close();
    const blob=await new Promise((resolve,reject)=>{
      canvas.toBlob(result=>result?resolve(result):reject(new Error('This photo could not be prepared.')),'image/jpeg',0.9);
    });
    return {bytes:new Uint8Array(await blob.arrayBuffer()),previewUrl:URL.createObjectURL(blob),width:originalWidth,height:originalHeight};
  }

  async function addOneFile(file){
    if(file.size>MAX_FILE_BYTES)throw new Error(file.name+' is larger than the 40 MB per-file limit.');
    if(currentFileBytes()+file.size>MAX_TOTAL_BYTES)throw new Error('The total selected file size would exceed 120 MB. Remove a file before adding more.');
    if(!file.size)throw new Error(file.name+' is empty.');
    const id=makeId('source',++sourceSequence);
    const looksLikePdf=file.type==='application/pdf'||/\.pdf$/i.test(file.name);
    if(looksLikePdf){
      const bytes=new Uint8Array(await file.arrayBuffer());
      let document;
      try{
        document=await PDFDocument.load(bytes);
      }catch(error){
        throw new Error(file.name+' could not be opened. Check that it is a valid, unlocked PDF.');
      }
      const pageTotal=document.getPageCount();
      if(!pageTotal)throw new Error(file.name+' does not contain any pages.');
      if(pages.length+pageTotal>MAX_PAGES)throw new Error('The workspace is limited to 500 pages. This PDF would exceed that limit.');
      const source={id,name:file.name,kind:'pdf',fileSize:file.size,document,pageTotal};
      sources.set(id,source);
      for(let pageIndex=0;pageIndex<pageTotal;pageIndex++)pages.push({id:makeId('page',++pageSequence),sourceId:id,pageIndex});
      return pageTotal;
    }
    const isImage=['image/jpeg','image/png','image/webp'].includes(file.type)||/\.(jpe?g|png|webp)$/i.test(file.name);
    if(!isImage)throw new Error(file.name+' is not a supported type. Choose a PDF, JPG, PNG or WebP image.');
    if(pages.length+1>MAX_PAGES)throw new Error('The workspace is limited to 500 pages.');
    let photo;
    try{
      photo=await decodePhoto(file);
    }catch(error){
      throw new Error(file.name+' could not be read as an image. Try saving it as JPG or PNG.');
    }
    const source={id,name:file.name,kind:'image',fileSize:file.size,bytes:photo.bytes,previewUrl:photo.previewUrl,width:photo.width,height:photo.height};
    sources.set(id,source);
    pages.push({id:makeId('page',++pageSequence),sourceId:id,pageIndex:0});
    return 1;
  }

  async function addFiles(fileList){
    if(busy)return;
    const files=Array.from(fileList||[]);
    if(!files.length)return;
    invalidateOutput();
    let addedFiles=0;
    let addedPages=0;
    const problems=[];
    for(const file of files){
      try{
        const count=await addOneFile(file);
        addedFiles++;
        addedPages+=count;
      }catch(error){
        problems.push(error.message||('Could not read '+file.name+'.'));
      }
    }
    renderPages();
    if(addedFiles&&problems.length){
      announce('Added '+addedPages+' '+(addedPages===1?'page':'pages')+'. Some files were skipped: '+problems.join(' '),'error');
    }else if(addedFiles){
      announce('Added '+addedPages+' '+(addedPages===1?'page':'pages')+' from '+addedFiles+' '+(addedFiles===1?'file':'files')+'. Drag pages to reorder, or use the arrow buttons.','success');
    }else{
      announce(problems.join(' '),'error');
    }
  }

  function movePage(from,to,focus){
    if(from<0||to<0||from>=pages.length||to>=pages.length||from===to)return;
    const [page]=pages.splice(from,1);
    pages.splice(to,0,page);
    invalidateOutput();
    renderPages(focus);
  }

  function removePage(pageId,focusAction){
    const index=pages.findIndex(page=>page.id===pageId);
    if(index<0)return;
    const sourceId=pages[index].sourceId;
    pages.splice(index,1);
    cleanupEmptySources();
    invalidateOutput();
    const focusPage=pages[Math.min(index,pages.length-1)];
    renderPages(focusPage&&focusAction?{pageId:focusPage.id,action:focusAction}:null);
    announce('Page removed. '+pages.length+' '+(pages.length===1?'page':'pages')+' remain.','success');
  }

  function setBusy(value){
    busy=value;
    createButton.textContent=busy?'Creating PDF…':'Create my PDF';
    renderPages();
  }

  function safeFilename(){
    let value=outputName.value.trim().replace(/[<>:"/\\|?*\u0000-\u001f]/g,'-').replace(/\.pdf$/i,'').trim();
    if(!value)value='sifwaku-combined';
    return value.slice(0,90)+'.pdf';
  }

  outputName.addEventListener('input',()=>{
    if(downloadLink.hidden)return;
    downloadLink.download=safeFilename();
    downloadLink.textContent='Download '+downloadLink.download;
  });

  async function createOutput(){
    if(busy||!pages.length)return;
    invalidateOutput();
    setBusy(true);
    try{
      const output=await PDFDocument.create();
      output.setCreator('SifwakuLab PDF Studio');
      output.setProducer('pdf-lib');
      for(let index=0;index<pages.length;index++){
        const item=pages[index];
        const source=sources.get(item.sourceId);
        announce('Building your PDF · page '+(index+1)+' of '+pages.length+'…');
        if(source.kind==='pdf'){
          const [page]=await output.copyPages(source.document,[item.pageIndex]);
          output.addPage(page);
        }else{
          const image=await output.embedJpg(source.bytes);
          const isLandscape=source.width>source.height;
          const pageWidth=isLandscape?A4_HEIGHT:A4_WIDTH;
          const pageHeight=isLandscape?A4_WIDTH:A4_HEIGHT;
          const margin=28;
          const scale=Math.min((pageWidth-margin*2)/image.width,(pageHeight-margin*2)/image.height);
          const width=image.width*scale;
          const height=image.height*scale;
          const page=output.addPage([pageWidth,pageHeight]);
          page.drawImage(image,{x:(pageWidth-width)/2,y:(pageHeight-height)/2,width,height});
        }
      }
      const bytes=await output.save();
      const blob=new Blob([bytes],{type:'application/pdf'});
      outputUrl=URL.createObjectURL(blob);
      downloadLink.href=outputUrl;
      downloadLink.download=safeFilename();
      downloadLink.textContent='Download '+downloadLink.download+' · '+formatBytes(blob.size);
      downloadLink.hidden=false;
      announce('Your PDF is ready with '+pages.length+' '+(pages.length===1?'page':'pages')+'. Download it to save a copy.','success');
    }catch(error){
      console.error('PDF Studio could not create the document.',error);
      announce('The PDF could not be created. Check that the source files are valid and try again with fewer or smaller files.','error');
    }finally{
      setBusy(false);
    }
  }

  picker.addEventListener('change',event=>{
    const files=event.currentTarget.files;
    addFiles(files);
    event.currentTarget.value='';
  });
  clearButton.addEventListener('click',()=>{
    if(busy)return;
    for(const source of sources.values())if(source.previewUrl)URL.revokeObjectURL(source.previewUrl);
    sources.clear();
    pages=[];
    invalidateOutput();
    renderPages();
    announce('Workspace cleared. Your original files have not been changed.','success');
  });
  outputForm.addEventListener('submit',event=>{
    event.preventDefault();
    createOutput();
  });
  pageList.addEventListener('click',event=>{
    const button=event.target.closest('button[data-action]');
    if(!button||busy)return;
    const card=button.closest('.pdf-page-card');
    const index=pages.findIndex(page=>page.id===card.dataset.pageId);
    const action=button.dataset.action;
    if(action==='up')movePage(index,index-1,{pageId:card.dataset.pageId,action:'up'});
    if(action==='down')movePage(index,index+1,{pageId:card.dataset.pageId,action:'down'});
    if(action==='remove')removePage(card.dataset.pageId,'remove');
  });
  pageList.addEventListener('dragstart',event=>{
    const card=event.target.closest('.pdf-page-card');
    if(!card||busy)return;
    card.classList.add('is-dragging');
    event.dataTransfer.effectAllowed='move';
    event.dataTransfer.setData('text/plain',card.dataset.pageId);
  });
  pageList.addEventListener('dragover',event=>{
    const card=event.target.closest('.pdf-page-card');
    if(!card||busy)return;
    event.preventDefault();
    pageList.querySelectorAll('.is-drop-target').forEach(target=>target.classList.remove('is-drop-target'));
    card.classList.add('is-drop-target');
    event.dataTransfer.dropEffect='move';
  });
  pageList.addEventListener('drop',event=>{
    const target=event.target.closest('.pdf-page-card');
    if(!target||busy)return;
    event.preventDefault();
    const sourceId=event.dataTransfer.getData('text/plain');
    const from=pages.findIndex(page=>page.id===sourceId);
    const targetIndex=pages.findIndex(page=>page.id===target.dataset.pageId);
    const rect=target.getBoundingClientRect();
    const after=event.clientY>rect.top+rect.height/2;
    let to=targetIndex+(after?1:0);
    if(from>=0&&from<to)to--;
    if(from>=0&&to!==from){
      const [page]=pages.splice(from,1);
      pages.splice(to,0,page);
      invalidateOutput();
      renderPages();
      announce('Page order updated.','success');
    }
  });
  pageList.addEventListener('dragend',()=>{
    pageList.querySelectorAll('.is-dragging,.is-drop-target').forEach(card=>card.classList.remove('is-dragging','is-drop-target'));
  });
  ['dragenter','dragover'].forEach(type=>dropzone.addEventListener(type,event=>{
    event.preventDefault();
    if(type==='dragenter')dropzone.classList.add('is-dragging');
  }));
  ['dragleave','drop'].forEach(type=>dropzone.addEventListener(type,event=>{
    event.preventDefault();
    dropzone.classList.remove('is-dragging');
  }));
  dropzone.addEventListener('drop',event=>addFiles(event.dataTransfer.files));
  window.addEventListener('pagehide',()=>{
    invalidateOutput();
    for(const source of sources.values())if(source.previewUrl)URL.revokeObjectURL(source.previewUrl);
  });
  renderPages();
})();
