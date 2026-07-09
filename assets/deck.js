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
  window.deck=new Deck();
  document.getElementById('next').onclick=()=>deck.next();
  document.getElementById('prev').onclick=()=>deck.prev();
}

/* ============================================================
   SLIDE CONTROLLER  (fixed 16:9 stage scaling + nav)
   ============================================================ */
class Deck{
  constructor(){
    this.slides=[...document.querySelectorAll('.slide')];
    this.stage=document.getElementById('deckStage');
    this.i=0;this.buildDots();this.scale();
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
  go(n){
    this.i=Math.max(0,Math.min(n,this.slides.length-1));
    this.slides.forEach((s,k)=>{s.classList.toggle('active',k===this.i);s.classList.toggle('visible',k===this.i)});
    this.dots.forEach((d,k)=>d.classList.toggle('on',k===this.i));
    document.getElementById('counter').innerHTML=`<b>${String(this.i+1).padStart(2,'0')}</b> / ${String(this.slides.length).padStart(2,'0')}`;
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
