(()=>{
const resourceControls=document.getElementById('resource-controls');

if(resourceControls){
  const search=document.getElementById('resource-search');
  const category=document.getElementById('resource-category');
  const clear=document.getElementById('resource-clear');
  const status=document.getElementById('resource-results');
  if(!search||!category||!clear||!status)return;
  const groups=[...document.querySelectorAll('[data-resource-category]')];
  const entrySelector='.resource-card,.repo-grid article,.tool-list a,.tool-matrix a,.opportunity-list a';
  const entries=groups.flatMap(group=>[...group.querySelectorAll(entrySelector)].map(element=>({element,group})));

  const updateResources=()=>{
    const term=search.value.trim().toLocaleLowerCase();
    const selected=category.value;
    let visible=0;

    groups.forEach(group=>{
      const groupEntries=entries.filter(entry=>entry.group===group);
      groupEntries.forEach(({element})=>{
        const matchesCategory=selected==='all'||group.dataset.resourceCategory===selected;
        element.hidden=!(matchesCategory&&element.textContent.toLocaleLowerCase().includes(term));
        if(!element.hidden)visible++;
      });
      if(groupEntries.length)group.hidden=groupEntries.every(({element})=>element.hidden);
    });

    status.textContent=visible
      ?`Showing ${visible} ${visible===1?'resource':'resources'}.`
      :'No matches. Try another search or choose all topics.';
  };

  search.addEventListener('input',updateResources);
  category.addEventListener('change',updateResources);
  document.querySelectorAll('a[href^="#"]').forEach(link=>link.addEventListener('click',()=>{
    const target=document.getElementById(link.getAttribute('href').slice(1));
    const targetGroup=target?.closest('[data-resource-category]');
    if(target&&(target.hidden||targetGroup?.hidden)){
      search.value='';
      category.value='all';
      updateResources();
    }
  }));
  clear.addEventListener('click',()=>{
    search.value='';
    category.value='all';
    updateResources();
    search.focus();
  });

  resourceControls.hidden=false;
  updateResources();
}
})();
