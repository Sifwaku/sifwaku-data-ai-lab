const b=document.getElementById('menu'),n=document.getElementById('nav'),root=document.documentElement,header=document.querySelector('header');
const savedTheme=localStorage.getItem('sifwaku-theme');
if(savedTheme==='dim') root.dataset.theme='dim';
const themeToggle=document.createElement('button');
themeToggle.id='theme-toggle';
themeToggle.type='button';
themeToggle.setAttribute('aria-label','Toggle low-light mode');
themeToggle.title='Toggle low-light mode';
header?.insertBefore(themeToggle,b);
const updateThemeToggle=()=>{const isDim=root.dataset.theme==='dim';themeToggle.textContent=isDim?'☼':'◐';themeToggle.setAttribute('aria-pressed',String(isDim));};
updateThemeToggle();
themeToggle.addEventListener('click',()=>{const isDim=root.dataset.theme==='dim';if(isDim) delete root.dataset.theme;else root.dataset.theme='dim';localStorage.setItem('sifwaku-theme',isDim?'paper':'dim');updateThemeToggle();});
b?.addEventListener('click',()=>n.classList.toggle('open'));n?.querySelectorAll('a').forEach(x=>x.addEventListener('click',()=>n.classList.remove('open')));

const assistantShowcase=document.getElementById('assistant-showcase');
const aiLauncher=document.getElementById('ai-launcher');
const chatForm=document.getElementById('chat-form');
const chatInput=document.getElementById('chat-input');
const chatWindow=document.getElementById('chat-window');
const voiceToggle=document.getElementById('voice-toggle');
const SpeechRecognition=window.SpeechRecognition || window.webkitSpeechRecognition;
let recognition=null;
let voiceModeEnabled=false;
let voiceSessionActive=false;

const setAssistantState=(isOpen)=>{
  assistantShowcase?.classList.toggle('is-open',isOpen);
  aiLauncher?.setAttribute('aria-expanded',String(isOpen));
  if(aiLauncher){ aiLauncher.textContent=isOpen ? 'Close AI' : 'Ask the AI'; }
};

aiLauncher?.addEventListener('click',(event)=>{
  event.stopPropagation();
  setAssistantState(!assistantShowcase?.classList.contains('is-open'));
});

document.addEventListener('click',(event)=>{
  if(!assistantShowcase || assistantShowcase.contains(event.target)) return;
  setAssistantState(false);
});

document.querySelector('a[href="#assistant-showcase"]')?.addEventListener('click',(event)=>{
  event.preventDefault();
  setAssistantState(true);
});

const appendInlineMarkdown=(container,value)=>{
  const pattern=/(`[^`]+`|\*\*[^*]+\*\*|__[^_]+__|\*[^*]+\*|_[^_]+_|\[([^\]]+)\]\((https?:\/\/[^\s)]+)\))/g;
  let lastIndex=0;
  let match;
  while((match=pattern.exec(value))){
    container.appendChild(document.createTextNode(value.slice(lastIndex,match.index)));
    const token=match[0];
    if(token.startsWith('`')){
      const code=document.createElement('code');
      code.textContent=token.slice(1,-1);
      container.appendChild(code);
    }else if(token.startsWith('[')){
      const link=document.createElement('a');
      link.href=match[3];
      link.target='_blank';
      link.rel='noreferrer';
      link.textContent=match[2];
      container.appendChild(link);
    }else{
      const emphasis=document.createElement('strong');
      emphasis.textContent=token.replace(/^\*\*|^__|^\*|^_|\*\*$|__$/g,'');
      container.appendChild(emphasis);
    }
    lastIndex=pattern.lastIndex;
  }
  container.appendChild(document.createTextNode(value.slice(lastIndex)));
};

const renderMarkdown=(container,content)=>{
  const lines=String(content).replace(/\r/g,'').split('\n');
  let paragraph=[];
  let list=null;
  let codeLines=null;
  let codeLanguage='';
  const flushParagraph=()=>{
    if(!paragraph.length) return;
    const element=document.createElement('p');
    element.style.whiteSpace='pre-wrap';
    appendInlineMarkdown(element,paragraph.join('\n').trim());
    if(element.textContent.trim()) container.appendChild(element);
    paragraph=[];
  };
  const flushList=()=>{ list=null; };
  lines.forEach((line)=>{
    const fence=line.match(/^```\s*([^\s]*)\s*$/);
    if(fence){
      flushParagraph();
      if(codeLines){
        const pre=document.createElement('pre');
        pre.className='assistant-code-block';
        const code=document.createElement('code');
        code.className=codeLanguage ? `language-${codeLanguage}` : '';
        code.textContent=codeLines.join('\n').trimEnd();
        pre.appendChild(code);
        container.appendChild(pre);
        codeLines=null;
        codeLanguage='';
      }else{
        flushList();
        codeLines=[];
        codeLanguage=fence[1];
      }
      return;
    }
    if(codeLines){ codeLines.push(line); return; }
    if(!line.trim()){ flushParagraph(); flushList(); return; }
    const heading=line.match(/^#{1,3}\s+(.+)$/);
    if(heading){
      flushParagraph(); flushList();
      const element=document.createElement('h4');
      appendInlineMarkdown(element,heading[1]);
      container.appendChild(element);
      return;
    }
    const bullet=line.match(/^\s*[-*]\s+(.+)$/);
    const number=line.match(/^\s*\d+[.)]\s+(.+)$/);
    if(bullet || number){
      flushParagraph();
      const type=bullet ? 'ul' : 'ol';
      if(!list || list.tagName.toLowerCase()!==type){ flushList(); list=document.createElement(type); container.appendChild(list); }
      const item=document.createElement('li');
      appendInlineMarkdown(item,(bullet || number)[1]);
      list.appendChild(item);
      return;
    }
    flushList();
    paragraph.push(line);
  });
  flushParagraph();
  if(codeLines){
    const pre=document.createElement('pre');
    pre.className='assistant-code-block';
    const code=document.createElement('code');
    code.textContent=codeLines.join('\n').trimEnd();
    pre.appendChild(code);
    container.appendChild(pre);
  }
};

const makeMessage=(content,from='bot',isTyping=false)=>{
  const div=document.createElement('div');
  div.className=`message ${from}${isTyping ? ' typing' : ''}`;
  const label=document.createElement('strong');
  label.textContent=from==='bot' ? 'Sifwaku AI' : 'You';
  div.appendChild(label);
  if(from==='bot' && !isTyping){
    renderMarkdown(div,content);
  }else{
    const text=document.createElement('p');
    text.textContent=content;
    div.appendChild(text);
  }
  chatWindow?.appendChild(div);
  chatWindow?.scrollTo({top:chatWindow.scrollHeight,behavior:'smooth'});
  return div;
};

const addTypingIndicator=()=>{
  const typingMessage=makeMessage('Sifwaku AI is thinking…','bot',true);
  typingMessage.dataset.typing='true';
  return typingMessage;
};

const removeTypingIndicator=()=>{
  const typingMessage=chatWindow?.querySelector('.message.typing');
  typingMessage?.remove();
};

const speakReply=(reply)=>{
  if(!voiceSessionActive || !('speechSynthesis' in window)){
    if(voiceSessionActive) recognition?.start();
    return;
  }
  window.speechSynthesis.cancel();
  const spokenText=String(reply).replace(/```[\s\S]*?```/g,'Code was included in the chat.').replace(/[*_#`]/g,'');
  const utterance=new SpeechSynthesisUtterance(spokenText);
  utterance.rate=1;
  utterance.pitch=1;
  utterance.onend=()=>{
    if(voiceSessionActive) recognition?.start();
  };
  window.speechSynthesis.speak(utterance);
};

const setVoiceState=(isListening)=>{
  voiceToggle?.classList.toggle('is-listening',isListening);
  if(voiceToggle){
    voiceToggle.textContent=isListening ? 'Listening' : 'Live voice';
    voiceToggle.setAttribute('aria-label',isListening ? 'Stop live voice chat' : 'Start live voice chat');
    voiceToggle.title=isListening ? 'Stop live voice chat' : 'Start live voice chat';
  }
};

if(SpeechRecognition && voiceToggle){
  recognition=new SpeechRecognition();
  recognition.continuous=false;
  recognition.interimResults=true;
  recognition.lang='en-US';
  recognition.onstart=()=>setVoiceState(true);
  recognition.onresult=(event)=>{
    const transcript=Array.from(event.results).map((result)=>result[0].transcript).join(' ');
    chatInput.value=transcript;
  };
  recognition.onerror=(event)=>{
    console.error('Voice recognition error:',event.error);
    voiceSessionActive=false;
    voiceModeEnabled=false;
    setVoiceState(false);
    const message=event.error==='not-allowed'
      ? 'Microphone access is blocked. Open this site at http://localhost:3000, click the lock icon in the address bar, set Microphone to Allow, then refresh.'
      : 'Voice chat could not access the microphone. Check your microphone connection and browser permissions, then try again.';
    makeMessage(message,'bot');
  };
  recognition.onend=()=>{
    setVoiceState(false);
    if(voiceSessionActive && chatInput.value.trim()) chatForm?.dispatchEvent(new Event('submit',{bubbles:true,cancelable:true}));
  };
  voiceToggle.addEventListener('click',()=>{
    if(voiceSessionActive){
      voiceSessionActive=false;
      voiceModeEnabled=false;
      window.speechSynthesis?.cancel();
      if(voiceToggle.classList.contains('is-listening')) recognition.stop();
      return;
    }
    voiceSessionActive=true;
    voiceModeEnabled=true;
    try{ recognition.start(); }catch(error){ console.error('Unable to start voice chat:',error); }
  });
  setVoiceState(false);
}else if(voiceToggle){
  voiceToggle.disabled=true;
  voiceToggle.title='Live voice chat is not supported in this browser';
  voiceToggle.setAttribute('aria-label','Live voice chat is not supported in this browser');
}

const getGeminiProxyUrl=()=>{
  const configuredUrl=window.SIFWAKU_GEMINI_ENDPOINT || localStorage.getItem('sifwaku-gemini-proxy-url') || '';
  return configuredUrl.trim();
};

const callGemini=async(question)=>{
  const proxyUrl=getGeminiProxyUrl();
  if(!proxyUrl) return generateReply(question);

  try {
    const controller=new AbortController();
    const timeoutId=setTimeout(()=>controller.abort(),8000);
    const response=await fetch(proxyUrl,{
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body:JSON.stringify({ question }),
      signal:controller.signal
    });
    clearTimeout(timeoutId);

    if(!response.ok) {
      const errorText=await response.text();
      console.error('Gemini proxy request failed:', errorText);
      return generateReply(question);
    }

    const data=await response.json();
    const text=data?.reply || data?.answer || data?.text;
    if(typeof text === 'string' && text.trim()) return text.trim();
    return generateReply(question);
  } catch (error) {
    console.error('Gemini request error:', error);
    return generateReply(question);
  }
};

const generateReply=(question)=>{
  const q=question.toLowerCase();

  if(q.includes('what is this website')||q.includes('what is sifwaku')||q.includes('website')||q.includes('site')||q.includes('who are you')) {
    return 'Sifwaku Lab is a practical learning website for evidence-based thinking, data analysis, research, and digital protection. It helps learners move from curiosity to capability by making study more hands-on, realistic, and connected to real decisions.';
  }

  if(q.includes('your role')||q.includes('what do you do')||q.includes('help me')) {
    return 'I am Sifwaku AI, a practical learning assistant. I help with data analysis, evidence-based thinking, research, and digital protection, and I can explain concepts or help you plan your next learning step.';
  }

  if(q.includes('how do i learn')||q.includes('how to learn')||q.includes('learning path')||q.includes('start learning')||q.includes('learn data')) {
    return 'Start with one question, then follow a small loop: define the problem, gather evidence, interpret what the data says, and test your assumptions. The best learning is active: read a concept, practice with one example, and reflect on what you would do differently next time.';
  }

  if(q.includes('data analysis')||q.includes('statistics')||q.includes('mean')||q.includes('median')||q.includes('analyse')||q.includes('analysis')) {
    return 'Data analysis starts with a clear question and a clean definition of the variable. Then you check the distribution, look for outliers, compare patterns, and explain context before drawing conclusions. A good analysis is honest about uncertainty, not just confident about a trend.';
  }

  if(q.includes('cyber law')||q.includes('digital protection')||q.includes('cybersecurity')||q.includes('data protection')||q.includes('privacy')||q.includes('zambia cyber')) {
    return 'Cyber Law & Digital Protection covers the legal, practical, and ethical safeguards that protect people, institutions, and information. In Zambia, this includes understanding privacy, digital risk, secure systems, responsible use, and how to respond when something goes wrong.';
  }

  if(q.includes('research')||q.includes('question')) {
    return 'Good research begins with a narrow, testable question. Ask: what am I trying to explain, what evidence would support or challenge it, and what alternatives should I consider? Strong research is not about sounding certain—it is about making a claim that can be checked.';
  }

  if(q.includes('advantage')||q.includes('benefit')||q.includes('why use')||q.includes('why this')||q.includes('value')) {
    return 'The value of this lab is that it combines reasoning, practical data work, and digital safety in one place. Instead of memorising abstract theory, you practice using evidence to make better decisions and build confidence with real-world skills.';
  }

  if(q.includes('evidence')||q.includes('assumption')) {
    return 'Evidence is what supports a claim; assumptions are beliefs we accept without checking. A stronger decision happens when you separate observation, evidence, interpretation, and conclusion. Ask: what do I know, what am I inferring, and what would change my mind?';
  }

  if(q.includes('course')||q.includes('method')||q.includes('study')||q.includes('learn')) {
    return 'The method is simple but effective: start with a question, study the idea, test your understanding, and revise using evidence. That loop makes learning real because you are not just reading—you are applying and checking your own reasoning.';
  }

  if(q.includes('code')||q.includes('python')||q.includes('javascript')||q.includes('sql')) {
    return 'Good code starts by naming the problem clearly. Define the goal, test the data inputs, and validate the logic one step at a time. A small example usually reveals the issue faster than a large block of code because it makes the pattern easier to inspect.';
  }

  if(q.includes('thank')) {
    return 'You are welcome. If you want, I can help you choose the next learning step, explain a concept, or turn a rough idea into a clean research question.';
  }

  return 'A strong first step is to define the problem precisely and look for evidence before deciding. Ask: what exactly is being claimed, what supports it, and what alternative explanation could fit? I can help you turn that into a better question, a research plan, or a learning path.';
};

const handleChatSubmit=async(event)=>{
  event.preventDefault();
  const value=chatInput.value.trim();
  if(!value) return;

  makeMessage(value,'user');
  chatInput.value='';

  const typingIndicator=addTypingIndicator();
  try {
    const reply=await callGemini(value);
    typingIndicator.remove();
    makeMessage(reply,'bot');
    speakReply(reply);
  } catch (error) {
    typingIndicator.remove();
    makeMessage(generateReply(value),'bot');
  }
};

chatForm?.addEventListener('submit',handleChatSubmit);
document.querySelectorAll('.suggestion-chip').forEach((chip)=>{
  chip.addEventListener('click',()=>{
    const question=chip.dataset.question;
    if(!question) return;
    chatInput.value=question;
    chatInput.focus();
    chatForm?.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
  });
});

const regressionData=document.getElementById('regression-data');
const regressionCanvas=document.getElementById('regression-chart');
const plotRegression=document.getElementById('plot-regression');
const downloadRegression=document.getElementById('download-regression');
const regressionResult=document.getElementById('regression-result');

const drawRegression=()=>{
  const points=regressionData.value.split(/\n|;/).map((row)=>row.split(',').map(Number)).filter(([x,y])=>Number.isFinite(x)&&Number.isFinite(y));
  if(points.length<2){
    regressionResult.textContent='Add at least two valid x,y pairs.';
    downloadRegression.disabled=true;
    return;
  }

  const xMean=points.reduce((sum,[x])=>sum+x,0)/points.length;
  const yMean=points.reduce((sum,[,y])=>sum+y,0)/points.length;
  const denominator=points.reduce((sum,[x])=>sum+(x-xMean)**2,0);
  if(denominator===0){
    regressionResult.textContent='The x values must not all be the same.';
    downloadRegression.disabled=true;
    return;
  }
  const slope=points.reduce((sum,[x,y])=>sum+(x-xMean)*(y-yMean),0)/denominator;
  const intercept=yMean-slope*xMean;
  const totalVariation=points.reduce((sum,[,y])=>sum+(y-yMean)**2,0);
  const residualVariation=points.reduce((sum,[x,y])=>sum+(y-(slope*x+intercept))**2,0);
  const rSquared=totalVariation===0 ? 1 : 1-residualVariation/totalVariation;
  const context=regressionCanvas.getContext('2d');
  const width=regressionCanvas.width;
  const height=regressionCanvas.height;
  const padding={top:24,right:18,bottom:40,left:48};
  const xValues=points.map(([x])=>x);
  const yValues=points.map(([,y])=>y).concat(xValues.map((x)=>slope*x+intercept));
  const minX=Math.min(...xValues), maxX=Math.max(...xValues), minY=Math.min(...yValues), maxY=Math.max(...yValues);
  const xRange=maxX-minX||1, yRange=maxY-minY||1;
  const toCanvas=([x,y])=>[
    padding.left+((x-minX)/xRange)*(width-padding.left-padding.right),
    height-padding.bottom-((y-minY)/yRange)*(height-padding.top-padding.bottom)
  ];
  context.clearRect(0,0,width,height);
  context.fillStyle='#ffffff';
  context.fillRect(0,0,width,height);
  context.strokeStyle='#d6e1ed';
  context.lineWidth=1;
  context.beginPath();
  context.moveTo(padding.left,padding.top);
  context.lineTo(padding.left,height-padding.bottom);
  context.lineTo(width-padding.right,height-padding.bottom);
  context.stroke();
  const lineStart=toCanvas([minX,slope*minX+intercept]);
  const lineEnd=toCanvas([maxX,slope*maxX+intercept]);
  context.strokeStyle='#ef6b4f';
  context.lineWidth=3;
  context.beginPath();
  context.moveTo(...lineStart);
  context.lineTo(...lineEnd);
  context.stroke();
  context.fillStyle='#075ca8';
  points.forEach((point)=>{
    const [x,y]=toCanvas(point);
    context.beginPath();
    context.arc(x,y,5,0,Math.PI*2);
    context.fill();
  });
  context.fillStyle='#122b4a';
  context.font='12px monospace';
  context.fillText('Observed values',padding.left,16);
  context.fillStyle='#ef6b4f';
  context.fillText('Regression line',padding.left+120,16);
  regressionResult.textContent=`y = ${slope.toFixed(3)}x ${intercept<0?'-':'+'} ${Math.abs(intercept).toFixed(3)} | R² = ${rSquared.toFixed(3)}`;
  downloadRegression.disabled=false;
};

plotRegression?.addEventListener('click',drawRegression);
downloadRegression?.addEventListener('click',()=>{
  const link=document.createElement('a');
  link.download='sifwaku-regression.png';
  link.href=regressionCanvas.toDataURL('image/png');
  link.click();
});
drawRegression();

