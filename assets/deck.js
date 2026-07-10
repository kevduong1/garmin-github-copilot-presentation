/* ============================================================
   SLIDE LOADER — fetches each file listed in slides/manifest.js
   (window.SLIDES) and injects them into the stage in order,
   then boots the deck controller + inline editor.
   Requires an HTTP server (vercel dev / npx serve / python -m
   http.server) — fetch() does not work over file://.
   ============================================================ */
async function loadSlides(){
  const stage=document.getElementById('deckStage');
  const results=await Promise.allSettled(
    window.SLIDES.map(f=>fetch('slides/'+f).then(r=>{
      if(!r.ok)throw new Error(`${f}: HTTP ${r.status}`);
      return r.text();
    }))
  );
  const failed=results.filter(r=>r.status==='rejected');
  if(failed.length){
    const div=document.createElement('div');
    div.className='load-error';
    div.textContent='Failed to load slide(s): '+failed.map(f=>f.reason.message).join(' · ');
    document.body.appendChild(div);
  }
  stage.innerHTML=results.filter(r=>r.status==='fulfilled').map(r=>r.value).join('\n');
  editor.load();
  initFeatureContextViewer();
  initPlanMode();
  initChatHistoryDemo();
  initContextInputsDemo();
  initSkills();
  initAgentsMd();
  initContextDemo();
  initOutputLoopDemo();
  window.deck=new Deck();
  document.getElementById('next').onclick=()=>deck.next();
  document.getElementById('prev').onclick=()=>deck.prev();
}

/* ============================================================
   FULL FEATURE CONTEXT VIEWER — opens the source context file as
   a rendered Markdown document without leaving slide 07F3.
   ============================================================ */
function renderFeatureMarkdown(source){
  const escape=value=>value.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  const inline=value=>escape(value)
    .replace(/`([^`]+)`/g,'<code>$1</code>')
    .replace(/\*\*([^*]+)\*\*/g,'<strong>$1</strong>');
  const lines=source.replace(/\r/g,'').split('\n');
  const html=[];
  let paragraph=[];
  let list=[];
  let quote=[];
  const flushParagraph=()=>{if(paragraph.length){html.push(`<p>${inline(paragraph.join(' '))}</p>`);paragraph=[]}};
  const flushQuote=()=>{if(quote.length){html.push(`<blockquote>${quote.map(inline).join('<br>')}</blockquote>`);quote=[]}};
  const flushList=()=>{
    if(!list.length)return;
    html.push('<div class="md-list">'+list.map(item=>`<div class="md-li" style="--depth:${item.depth}"><span class="md-marker">${item.marker}</span><span class="md-text">${inline(item.text)}</span></div>`).join('')+'</div>');
    list=[];
  };
  const flushAll=()=>{flushParagraph();flushQuote();flushList()};
  lines.forEach(line=>{
    const heading=line.match(/^(#{1,3})\s+(.+)$/);
    const item=line.match(/^(\s*)([-*]|\d+\.)\s+(.+)$/);
    const blockquote=line.match(/^>\s?(.*)$/);
    if(!line.trim()){flushAll();return}
    if(heading){flushAll();const level=heading[1].length;html.push(`<h${level}>${inline(heading[2])}</h${level}>`);return}
    if(blockquote){flushParagraph();flushList();quote.push(blockquote[1]);return}
    if(item){flushParagraph();flushQuote();list.push({depth:Math.min(3,Math.floor(item[1].length/2)),marker:/\d/.test(item[2])?item[2]:'•',text:item[3]});return}
    flushQuote();flushList();paragraph.push(line.trim());
  });
  flushAll();
  return html.join('');
}

function initFeatureContextViewer(){
  document.querySelectorAll('[data-feature-context]').forEach(slide=>{
    const open=slide.querySelector('[data-context-open]');
    const close=slide.querySelector('[data-context-close]');
    const overlay=slide.querySelector('[data-context-overlay]');
    const body=slide.querySelector('[data-context-body]');
    let loaded=false;
    const hide=()=>{overlay.classList.remove('show');overlay.setAttribute('aria-hidden','true');open.focus()};
    const show=async()=>{
      overlay.classList.add('show');overlay.setAttribute('aria-hidden','false');close.focus();
      if(loaded)return;
      try{
        const response=await fetch('assets/initial-context-gather.md');
        if(!response.ok)throw new Error(`HTTP ${response.status}`);
        body.innerHTML=renderFeatureMarkdown(await response.text());
        loaded=true;
      }catch(error){body.innerHTML='<p>Unable to load the context document.</p>'}
    };
    open.addEventListener('click',show);
    close.addEventListener('click',hide);
    overlay.addEventListener('click',event=>{if(event.target===overlay)hide()});
    overlay.addEventListener('wheel',event=>event.stopPropagation());
    overlay.addEventListener('keydown',event=>{
      if(event.key==='Escape'){event.preventDefault();hide();return}
      if(['ArrowLeft','ArrowRight','PageUp','PageDown','Home','End',' '].includes(event.key))event.stopPropagation();
    });
    slide.resetFeatureContextViewer=()=>{overlay.classList.remove('show');overlay.setAttribute('aria-hidden','true')};
  });
}

/* ============================================================
   SKILLS DEMO — the first bullet shows the skill's file tree;
   the remaining bullets highlight matching SKILL.md sections.
   ============================================================ */
function initSkills(){
  document.querySelectorAll('.s-skills').forEach(slide=>{
    const points=[...slide.querySelectorAll('[data-skill-point]')];
    const views=[...slide.querySelectorAll('[data-skill-view]')];
    const sections=[...slide.querySelectorAll('[data-skill-section]')];
    const captions=[...slide.querySelectorAll('[data-skill-caption]')];
    const select=key=>{
      points.forEach(point=>{
        const selected=point.dataset.skillPoint===key;
        point.classList.toggle('selected',selected);
        point.setAttribute('aria-pressed',String(selected));
      });
      views.forEach(view=>view.classList.toggle('show',view.dataset.skillView===(key==='file'?'tree':'content')));
      sections.forEach(section=>section.classList.toggle('skill-focus',section.dataset.skillSection===key));
      captions.forEach(caption=>caption.classList.toggle('show',caption.dataset.skillCaption===(key==='file'?'tree':'content')));
    };
    points.forEach(point=>point.addEventListener('click',()=>select(point.dataset.skillPoint)));
    select(points[0]?.dataset.skillPoint);
  });
}

/* ============================================================
   PLAN MODE DEMO — interactive example panels for slide 08.
   Slide fragments are injected as HTML, so the behavior lives here.
   ============================================================ */
function initPlanMode(){
  document.querySelectorAll('.s-plan').forEach(slide=>{
    const points=[...slide.querySelectorAll('[data-plan-panel]')];
    const panels=[...slide.querySelectorAll('[data-plan-demo]')];
    const demo=slide.querySelector('.demo');
    const select=key=>{
      points.forEach(point=>{
        const selected=point.dataset.planPanel===key;
        point.classList.toggle('selected',selected);
        point.setAttribute('aria-pressed',String(selected));
      });
      panels.forEach(panel=>panel.classList.toggle('show',panel.dataset.planDemo===key));
      demo.classList.toggle('video-active',key==='video');
    };
    points.forEach(point=>point.addEventListener('click',()=>select(point.dataset.planPanel)));
    select(points[0]?.dataset.planPanel);

    slide.querySelectorAll('[data-plan-demo="questions"]').forEach(questionDemo=>{
      const steps=[...questionDemo.querySelectorAll('[data-question-step]')];
      const sets=[...questionDemo.querySelectorAll('[data-question-set]')];
      const next=questionDemo.querySelector('[data-question-next]');
      const status=questionDemo.querySelector('.question-status');
      const answered=sets.map(()=>false);
      const answers=sets.map(()=>"");
      let current=0;
      let complete=false;
      const syncPlan=()=>sets.forEach((set,index)=>{
        const target=slide.querySelector(`[data-plan-answer="${set.dataset.planKey}"]`);
        if(target)target.textContent=answers[index]||'Awaiting answer';
      });
      const render=()=>{
        steps.forEach((step,index)=>{
          const active=index===current;
          step.classList.toggle('active',active);
          step.setAttribute('aria-selected',String(active));
        });
        sets.forEach((set,index)=>set.classList.toggle('show',index===current));
        const finalQuestion=current===sets.length-1;
        next.disabled=!answered[current]||(complete&&finalQuestion);
        next.textContent=finalQuestion?(complete?'Answers saved':'Done'):'Next question';
        status.textContent=complete&&finalQuestion
          ?'Answers sent to the plan'
          :answered[current]
          ?(finalQuestion?'Plan mode has enough detail':'Answer saved')
          :'Choose an answer to continue';
      };
      const goTo=index=>{current=(index+steps.length)%steps.length;render();steps[current].focus()};
      steps.forEach((step,index)=>{
        step.addEventListener('click',()=>{current=index;render()});
        step.addEventListener('keydown',event=>{
          if(event.key==='ArrowRight'||event.key==='ArrowDown'){event.preventDefault();goTo(index+1)}
          if(event.key==='ArrowLeft'||event.key==='ArrowUp'){event.preventDefault();goTo(index-1)}
          if(event.key==='Home'){event.preventDefault();goTo(0)}
          if(event.key==='End'){event.preventDefault();goTo(steps.length-1)}
        });
      });
      sets.forEach((set,index)=>{
        set.querySelectorAll('.option').forEach(option=>option.addEventListener('click',()=>{
          set.querySelectorAll('.option').forEach(item=>item.classList.toggle('selected',item===option));
          const input=set.querySelector('.input');
          if(input)input.value='';
          answers[index]=option.dataset.answer||option.textContent.trim();
          answered[index]=true;
          syncPlan();
          render();
        }));
        set.querySelector('.input')?.addEventListener('input',event=>{
          const value=event.target.value.trim();
          if(value)set.querySelectorAll('.option').forEach(option=>option.classList.remove('selected'));
          const selected=set.querySelector('.option.selected');
          answers[index]=value||(selected?.dataset.answer||'');
          answered[index]=Boolean(answers[index]);
          syncPlan();
          render();
        });
      });
      next.addEventListener('click',()=>{
        if(current<sets.length-1)goTo(current+1);
        else {complete=true;render();select('steer')}
      });
      syncPlan();
      render();
    });
  });
}

/* ============================================================
   CHAT HISTORY DEMO — select a point to compare a new session
   with a previously opened conversation on slide 07C.
   ============================================================ */
function initChatHistoryDemo(){
  document.querySelectorAll('[data-chat-history-demo]').forEach(slide=>{
    const points=[...slide.querySelectorAll('[data-chat-history-panel]')];
    const panels=[...slide.querySelectorAll('[data-chat-history-image]')];
    const select=key=>{
      points.forEach(point=>{
        const selected=point.dataset.chatHistoryPanel===key;
        point.classList.toggle('selected',selected);
        point.setAttribute('aria-pressed',String(selected));
      });
      panels.forEach(panel=>panel.classList.toggle('show',panel.dataset.chatHistoryImage===key));
    };
    points.forEach(point=>point.addEventListener('click',()=>select(point.dataset.chatHistoryPanel)));
    slide.resetChatHistoryDemo=()=>select('new');
    slide.resetChatHistoryDemo();
  });
}

/* ============================================================
   CONTEXT INPUTS DEMO — compare direct prompts, attachments,
   and selected code on slide 07C2.
   ============================================================ */
function initContextInputsDemo(){
  document.querySelectorAll('[data-context-inputs-demo]').forEach(slide=>{
    const points=[...slide.querySelectorAll('[data-context-input-panel]')];
    const panels=[...slide.querySelectorAll('[data-context-input-image]')];
    const select=key=>{
      points.forEach(point=>{
        const selected=point.dataset.contextInputPanel===key;
        point.classList.toggle('selected',selected);
        point.setAttribute('aria-pressed',String(selected));
      });
      panels.forEach(panel=>panel.classList.toggle('show',panel.dataset.contextInputImage===key));
    };
    points.forEach(point=>point.addEventListener('click',()=>select(point.dataset.contextInputPanel)));
    slide.resetContextInputsDemo=()=>select('typing');
    slide.resetContextInputsDemo();
  });
}

/* ============================================================
   AGENTS.MD DEMO — points on slide 09 reveal contextual examples.
   ============================================================ */
function initAgentsMd(){
  document.querySelectorAll('.s-agents-md').forEach(slide=>{
    const popup=slide.querySelector('[data-agents-popup]');
    const popupTitle=slide.querySelector('[data-agents-popup-title]');
    const popupCode=slide.querySelector('[data-agents-popup-code]');
    slide.querySelectorAll('[data-agents-file]').forEach(file=>file.addEventListener('click',()=>{
      popupTitle.textContent=file.dataset.agentsTitle;
      popupCode.textContent=file.dataset.agentsCode;
      popup.classList.add('show');
    }));
    slide.querySelector('[data-agents-popup-close]')?.addEventListener('click',()=>popup.classList.remove('show'));
  });
}

/* ============================================================
   CONTEXT DEMO — adding input tokens reshapes the illustrative
   next-token probability distribution on slide 06C.
   ============================================================ */
function initContextDemo(){
  document.querySelectorAll('[data-context-demo]').forEach(demo=>{
    const toggle=demo.querySelector('[data-context-toggle]');
    const action=demo.querySelector('[data-toggle-action]');
    const rows=[...demo.querySelectorAll('.prob-row')];
    let hasContext=false;
    const render=()=>{
      demo.classList.toggle('with-context',hasContext);
      toggle.setAttribute('aria-pressed',String(hasContext));
      action.textContent=hasContext?'Remove context':'Add context';
      rows.forEach(row=>{
        const value=Number(row.dataset[hasContext?'context':'base']);
        row.querySelector('.fill').style.setProperty('--p',value+'%');
        row.querySelector('.percent').textContent=value+'%';
      });
    };
    toggle.addEventListener('click',()=>{hasContext=!hasContext;render()});
    demo.resetContextDemo=()=>{hasContext=false;render()};
    render();
  });
}

/* ============================================================
   OUTPUT LOOP DEMO — each click makes a fresh conceptual model
   call, appends one token, and grows the resent context metrics.
   ============================================================ */
function initOutputLoopDemo(){
  document.querySelectorAll('[data-output-loop]').forEach(demo=>{
    const stream=demo.querySelector('[data-context-stream]');
    const generate=demo.querySelector('[data-generate-token]');
    const reset=demo.querySelector('[data-reset-loop]');
    const nextInput=demo.querySelector('[data-next-input]');
    const generatedCount=demo.querySelector('[data-generated-count]');
    const cumulativeEl=demo.querySelector('[data-cumulative]');
    const outputs=demo.dataset.outputTokens.split('|');
    const baseCount=stream.children.length;
    let step=0,cumulative=0;
    const tokenLabel=n=>n+' token'+(n===1?'':'s');
    const render=()=>{
      nextInput.textContent=tokenLabel(baseCount+step);
      generatedCount.textContent=tokenLabel(step);
      cumulativeEl.textContent=tokenLabel(cumulative);
      generate.disabled=step>=outputs.length;
      generate.textContent=step>=outputs.length?'Sequence complete':'Generate next token';
    };
    const resetDemo=()=>{
      stream.querySelectorAll('.generated').forEach(token=>token.remove());
      step=0;cumulative=0;render();
    };
    generate.addEventListener('click',()=>{
      if(step>=outputs.length)return;
      cumulative+=baseCount+step;
      const token=document.createElement('span');
      token.className='context-token generated';
      token.textContent=outputs[step];
      stream.appendChild(token);
      step+=1;render();
    });
    reset.addEventListener('click',resetDemo);
    demo.resetOutputLoopDemo=resetDemo;
    resetDemo();
  });
}

/* ============================================================
   SLIDE CONTROLLER  (fixed 16:9 stage scaling + nav)
   ============================================================ */
class Deck{
  constructor(){
    this.slides=[...document.querySelectorAll('.slide')];
    this.stage=document.getElementById('deckStage');
    this.i=0;this.transitioning=false;this.buildDots();this.scale();
    addEventListener('resize',()=>this.scale());
    this.keys();this.wheel();this.touch();this.go(0);
  }
  scale(){
    const f=Math.min(innerWidth/1920,innerHeight/1080);
    this.stage.style.transform=`translate(${(innerWidth-1920*f)/2}px,${(innerHeight-1080*f)/2}px) scale(${f})`;
  }
  buildDots(){
    const c=document.getElementById('dots');
    this.slides.forEach((_,n)=>{const b=document.createElement('button');
      b.setAttribute('aria-label','Go to slide '+(n+1));b.onclick=()=>this.go(n);c.appendChild(b)});
    this.dots=[...c.children];
  }
  commit(n){
    this.i=n;
    this.slides[this.i].resetContextDemo?.();
    this.slides[this.i].resetOutputLoopDemo?.();
    this.slides[this.i].resetChatHistoryDemo?.();
    this.slides[this.i].resetContextInputsDemo?.();
    this.slides[this.i].resetFeatureContextViewer?.();
    this.slides.forEach((s,k)=>{s.classList.toggle('active',k===this.i);s.classList.toggle('visible',k===this.i)});
    this.dots.forEach((d,k)=>d.classList.toggle('on',k===this.i));
    document.getElementById('counter').innerHTML=`<b>${String(this.i+1).padStart(2,'0')}</b> / ${String(this.slides.length).padStart(2,'0')}`;
  }
  go(n){
    const next=Math.max(0,Math.min(n,this.slides.length-1));
    if(this.transitioning)return;
    const current=this.slides[this.i],incoming=this.slides[next];
    const group=current?.dataset.continuation;
    const isContinuation=current!==incoming&&group&&group===incoming?.dataset.continuation;
    if(!isContinuation){this.commit(next);return}
    this.transitioning=true;
    current.classList.add('sequence-leaving');
    setTimeout(()=>{
      incoming.classList.add('sequence-entering');
      this.commit(next);
      current.classList.remove('sequence-leaving');
      requestAnimationFrame(()=>requestAnimationFrame(()=>{
        incoming.classList.remove('sequence-entering');
        setTimeout(()=>this.transitioning=false,360);
      }));
    },260);
  }
  next(){this.go(this.i+1)} prev(){this.go(this.i-1)}
  keys(){addEventListener('keydown',e=>{
    if(e.target.getAttribute&&e.target.getAttribute('contenteditable'))return;
    if(['ArrowRight',' ','PageDown'].includes(e.key)){e.preventDefault();this.next()}
    else if(['ArrowLeft','PageUp'].includes(e.key)){e.preventDefault();this.prev()}
    else if(e.key==='Home')this.go(0); else if(e.key==='End')this.go(this.slides.length-1);
  })}
  wheel(){let lock=false;addEventListener('wheel',e=>{
    if(lock||Math.abs(e.deltaY)<24)return;lock=true;e.deltaY>0?this.next():this.prev();
    setTimeout(()=>lock=false,650);},{passive:true})}
  touch(){let x0=0,y0=0;
    addEventListener('touchstart',e=>{x0=e.touches[0].clientX;y0=e.touches[0].clientY},{passive:true});
    addEventListener('touchend',e=>{const dx=e.changedTouches[0].clientX-x0,dy=e.changedTouches[0].clientY-y0;
      if(Math.abs(dx)>60&&Math.abs(dx)>Math.abs(dy))dx<0?this.next():this.prev();},{passive:true})}
}

/* ============================================================
   INLINE EDITING  (E / hover hotzone / click) + localStorage
   Note: edits live only in the presenter's browser. The slide
   files in slides/ are the source of truth — copy changes back
   into the file to share them.
   ============================================================ */
const editor={
  isActive:false,key:'garmin-copilot-deck-v3-starter',
  toggle(){
    this.isActive=!this.isActive;
    document.body.classList.toggle('editing',this.isActive);
    document.getElementById('editToggle').classList.toggle('active',this.isActive);
    document.getElementById('editHint').classList.toggle('show',this.isActive);
    document.querySelectorAll('.slide h1,.slide h2,.slide p,.slide span,.slide .t,.slide .d')
      .forEach(el=>el.contentEditable=this.isActive);
    if(!this.isActive)this.save();
  },
  save(){const d={};document.querySelectorAll('.slide').forEach((s,i)=>d[i]=s.innerHTML);
    try{localStorage.setItem(this.key,JSON.stringify(d))}catch(e){}},
  load(){try{const d=JSON.parse(localStorage.getItem(this.key)||'null');if(!d)return;
    document.querySelectorAll('.slide').forEach((s,i)=>{if(d[i])s.innerHTML=d[i]})}catch(e){}}
};
const hz=document.getElementById('editHotzone'),tg=document.getElementById('editToggle');let ht=null;
const show=()=>{clearTimeout(ht);tg.classList.add('show')};
const hide=()=>{ht=setTimeout(()=>{if(!editor.isActive)tg.classList.remove('show')},400)};
hz.addEventListener('mouseenter',show);hz.addEventListener('mouseleave',hide);
tg.addEventListener('mouseenter',show);tg.addEventListener('mouseleave',hide);
hz.addEventListener('click',()=>editor.toggle());tg.addEventListener('click',()=>editor.toggle());
addEventListener('keydown',e=>{
  if((e.key==='e'||e.key==='E')&&!e.target.getAttribute('contenteditable'))editor.toggle();
  if((e.ctrlKey||e.metaKey)&&e.key==='s'){e.preventDefault();editor.save();
    const h=document.getElementById('editHint');h.textContent='Saved ✓';h.classList.add('show');
    setTimeout(()=>{h.textContent='Click text to edit · Ctrl/⌘+S to save';if(!editor.isActive)h.classList.remove('show')},1200)}
});

loadSlides();
