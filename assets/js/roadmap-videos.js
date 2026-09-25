const roadmapVideoLinks=[
  'https://www.youtube.com/results?search_query=metacognition+thinking+about+thinking+lesson',
  'https://www.youtube.com/results?search_query=observation+vs+interpretation+critical+thinking',
  'https://www.youtube.com/results?search_query=problem+framing+problem+definition+critical+thinking',
  'https://www.youtube.com/watch?v=vNDYUlxNIAA',
  'https://www.youtube.com/results?search_query=problem+decomposition+problem+solving',
  'https://www.youtube.com/results?search_query=identifying+assumptions+critical+thinking',
  'https://www.youtube.com/results?search_query=critical+thinking+university+introduction+course',
  'https://www.coursera.org/search?query=Introduction%20to%20Logic%20and%20Critical%20Thinking',
  'https://www.youtube.com/results?search_query=evaluating+evidence+sources+critical+thinking',
  'https://www.youtube.com/results?search_query=correlation+vs+causation+lesson+statistics',
  'https://www.youtube.com/results?search_query=systems+thinking+introduction+lesson',
  'https://www.coursera.org/learn/critical-thinking-science',
  'https://www.coursera.org/learn/mindware',
  'https://www.youtube.com/results?search_query=decision+making+critical+thinking+course',
  'https://www.youtube.com/results?search_query=Julia+Galef+Scout+Mindset+TED+video'
];

const videoModal=document.createElement('dialog');
videoModal.className='video-modal';
videoModal.innerHTML='<button class="video-modal-close" aria-label="Close video">×</button><div class="video-modal-frame"><iframe title="Sifwaku Method topic video" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen></iframe></div><a class="video-modal-external" target="_blank" rel="noreferrer">Open on YouTube ↗</a>';
document.body.appendChild(videoModal);
const modalFrame=videoModal.querySelector('iframe');
const modalExternal=videoModal.querySelector('.video-modal-external');
function getVideoId(url){const match=url.match(/[?&]v=([^&]+)/);return match?match[1]:null;}
function openVideo(url){const id=getVideoId(url);modalExternal.href=url;if(id){modalFrame.src=`https://www.youtube.com/embed/${id}?rel=0&modestbranding=1`;videoModal.showModal();}else{window.open(url,'_blank','noopener,noreferrer');}}
videoModal.querySelector('.video-modal-close').addEventListener('click',()=>{modalFrame.src='';videoModal.close();});
videoModal.addEventListener('click',event=>{if(event.target===videoModal){modalFrame.src='';videoModal.close();}});
document.querySelectorAll('.roadmap-definitions article').forEach((article,index)=>{
  const resource=document.createElement('div');
  resource.className='topic-video';
  const link=document.createElement('a');
  link.href=roadmapVideoLinks[index];
  link.target='_blank';
  link.rel='noreferrer';
  link.textContent='Watch on YouTube ↗';
  resource.append('VIDEO TO WATCH',link);
  if(getVideoId(roadmapVideoLinks[index])){
    const here=document.createElement('button');
    here.type='button';
    here.textContent='Watch here';
    here.addEventListener('click',()=>openVideo(roadmapVideoLinks[index]));
    resource.append(here);
  }
  article.appendChild(resource);
});
