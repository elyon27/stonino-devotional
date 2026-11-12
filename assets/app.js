(()=>{'use strict';
const $=id=>document.getElementById(id), config=window.STONINO_CONFIG||{}, prefix='stonino.v1.', store={get(k,f){try{return JSON.parse(localStorage.getItem(prefix+k))??f}catch{return f}},set(k,v){try{localStorage.setItem(prefix+k,JSON.stringify(v))}catch(err){console.warn('Local storage unavailable; continuing in guest session',err)}}};
const state={language:store.get('language','en'),font:store.get('font',1),day:store.get('selectedDay',0),meditation:0,completed:store.get('completed',[]),intentions:store.get('intentions',[]),candles:store.get('candles',[]),novenaCandles:store.get('novenaCandles',[]),novenaFlowers:store.get('novenaFlowers',[]),user:null,supabase:null};
// Guard against stale or malformed local data from earlier app versions.
state.day=Number.isInteger(Number(state.day))&&Number(state.day)>=0&&Number(state.day)<9?Number(state.day):0;
for(const key of ['completed','intentions','candles','novenaCandles','novenaFlowers']){
  if(!Array.isArray(state[key]))state[key]=[];
}
state.completed=[...new Set(state.completed.map(Number).filter(n=>Number.isInteger(n)&&n>=0&&n<9))];
const translations={en:{navSanctuary:'Sanctuary',navNovena:'Novena & Prayers',navCandles:'Light a Candle',navIntentions:'My Intentions',navScripture:'Scripture',navSettings:'Settings & Privacy',welcome:'WELCOME TO THE CHAPEL',heroSub:'Enter a quiet space of prayer before Jesus Christ, the Holy Child. Bring your gratitude, your burdens, and your hopes.',beginPrayer:'Begin Devotion',quickNovena:'Pray one day at a time',quickCandle:'Offer a symbolic flame',quickJournal:'Keep a private prayer journal',quickScripture:'Read and reflect'},ceb:{navSanctuary:'Kapilya',navNovena:'Nobena ug mga Pag-ampo',navCandles:'Pagdagkot og Kandila',navIntentions:'Akong mga Intension',navScripture:'Balaang Kasulatan',navSettings:'Mga Setting ug Pribasidad',welcome:'MALIPAYONG PAG-ABOT SA KAPILYA',heroSub:'Sulod sa malinawon nga dapit sa pag-ampo kang Hesukristo, ang Balaang Bata. Idangop ang imong pasalamat, kabalaka, ug paglaom.',beginPrayer:'Sugdi ang Pag-ampo',quickNovena:'Pag-ampo matag adlaw',quickCandle:'Paghalad og simbolikong kahayag',quickJournal:'Tipigi ang pribadong pag-ampo',quickScripture:'Basaha ug pamalandonga'},fil:{navSanctuary:'Kapilya',navNovena:'Nobena at mga Panalangin',navCandles:'Magsindi ng Kandila',navIntentions:'Aking mga Intensiyon',navScripture:'Banal na Kasulatan',navSettings:'Mga Setting at Privacy',welcome:'MALIGAYANG PAGDATING SA KAPILYA',heroSub:'Pumasok sa tahimik na lugar ng panalangin kay Hesukristo, ang Banal na Sanggol. Dalhin ang iyong pasasalamat, mga pasanin, at pag-asa.',beginPrayer:'Simulan ang Panalangin',quickNovena:'Manalangin bawat araw',quickCandle:'Mag-alay ng simbolikong ilaw',quickJournal:'Itago ang pribadong dasal',quickScripture:'Magbasa at magnilay'}};
const novena=[
{theme:'Trust',ref:'Matthew 18:3–4',reflection:'Jesus calls us to receive the Kingdom with a childlike heart. Humility makes room for grace; trust turns us toward our heavenly Father.',prayer:'Lord Jesus, Holy Child, teach me to trust you with an open heart. Help me release pride and fear, and follow you in humility. May I become attentive to your will today. Amen.'},
{theme:'Gratitude',ref:'Luke 17:11–19',reflection:'The thankful leper returned to Jesus. Gratitude helps us see God’s generosity even in ordinary moments.',prayer:'Holy Child Jesus, I thank you for the gift of life, for those who love me, and for the blessings I too easily overlook. Make gratitude the language of my heart. Amen.'},
{theme:'Mercy',ref:'Luke 15:11–32',reflection:'The Father welcomes home the one who has wandered. Christ invites repentance, mercy, and reconciliation.',prayer:'Lord Jesus, turn my heart away from resentment. Grant me courage to seek forgiveness and grace to forgive others. Let your mercy remake my life. Amen.'},
{theme:'Family',ref:'Luke 2:41–52',reflection:'Jesus grew in the Holy Family at Nazareth. The home becomes a place of love when we practice patience and service.',prayer:'Holy Child Jesus, bless my family and all who care for children. Bring healing where there is conflict, comfort where there is loss, and tenderness in every home. Amen.'},
{theme:'Courage',ref:'Mark 4:35–41',reflection:'In the storm, the disciples turned to Jesus. Faith does not deny fear; it teaches us whom to trust through it.',prayer:'Lord Jesus, when my mind is troubled and the way ahead is uncertain, steady me in your presence. Help me act with wisdom, patience, and courage. Amen.'},
{theme:'Service',ref:'John 13:12–17',reflection:'Jesus washed his disciples’ feet. Love takes shape in concrete care for those most easily forgotten.',prayer:'Holy Child Jesus, open my eyes to my neighbor’s needs. Let me serve without seeking applause and offer kindness without expecting a reward. Amen.'},
{theme:'Hope',ref:'Romans 8:38–39',reflection:'Nothing can separate us from the love of God in Christ Jesus. Hope holds us near to God even when outcomes remain unknown.',prayer:'Lord Jesus, remain close to those who grieve, worry, or feel alone. Renew my hope and help me become a gentle sign of your steadfast love. Amen.'},
{theme:'Peace',ref:'John 14:27',reflection:'The peace of Christ is a gift deeper than comfort or favorable circumstances. We are invited to carry that peace into our relationships.',prayer:'Holy Child Jesus, place your peace in my heart. Quiet anger and needless fear; guide my words and actions so that I may become a peacemaker. Amen.'},
{theme:'Dedication',ref:'Matthew 6:33',reflection:'To seek the Kingdom first is to order our daily choices toward God. Every ending can become a new beginning of discipleship.',prayer:'Lord Jesus, Holy Child of Cebu, I entrust my days to you. Lead me closer to the Father through the Holy Spirit, and teach me to love as you have loved us. Amen.'}
];
const prayers={morning:'Lord Jesus, Holy Child, I offer you this morning. Bless my thoughts, words, and work. May I recognize your presence in each person I meet and honor you in all I do. Amen.',family:'Jesus, Holy Child, look lovingly upon our family. Keep us close in patience, forgiveness, and faith. Protect children, comfort the elderly, and guide every home toward your peace. Amen.',thanks:'Lord Jesus, receive my thanks for blessings seen and unseen. Keep me humble in prosperity, faithful in difficulty, and generous toward those in need. Amen.',departed:'Lord Jesus Christ, in your mercy remember those who have died. Grant them rest according to your holy will, console those who mourn, and strengthen our hope in the resurrection. Amen.'};
const meditations=[['Matthew 19:13–15','Welcome','Jesus welcomes children. Consider how you can make room for the small, the vulnerable, and the overlooked. In prayer, ask for a heart ready to receive others.'],['Luke 2:1–20','God comes near','The birth of Jesus reveals God’s love in humility. Reflect on the ways you may encounter Christ in ordinary life.'],['Luke 2:41–52','Growth in wisdom','The child Jesus grows in wisdom. Ask God to guide your own growth in understanding, patience, and obedience to truth.'],['Mark 10:13–16','Blessing','Jesus blesses those brought to him. Pray for the children of your community and for all who care for them.'],['John 13:1–17','Humble service','Christ serves his disciples. Choose one practical act of kindness that asks for nothing in return.'],['John 14:27','Peace','Jesus promises his peace. Bring a burden before God and consider one step toward reconciliation.'],['Philippians 2:5–11','Christ’s humility','Christ’s self-giving love invites us to lay aside vanity and follow his example in daily choices.']];
let toastTimer;function toast(msg){const e=$('toast');e.textContent=msg;e.classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>e.classList.remove('show'),3500)}function html(s){return String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}function nav(name){if(!$(name))return;document.querySelectorAll('.page').forEach(e=>e.classList.toggle('active',e.id===name));document.querySelectorAll('[data-nav]').forEach(e=>e.classList.toggle('active',e.dataset.nav===name));history.replaceState(null,'','#'+name);window.scrollTo({top:0,behavior:'instant'});$('main').focus({preventScroll:true})}document.querySelectorAll('[data-nav]').forEach(e=>e.addEventListener('click',ev=>{ev.preventDefault();nav(e.dataset.nav)}));
function language(){document.documentElement.lang=state.language;document.querySelectorAll('[data-i18n]').forEach(e=>e.textContent=(translations[state.language]||translations.en)[e.dataset.i18n]||e.textContent);$('language').value=state.language;$('langBtn').textContent=({en:'English',ceb:'Cebuano',fil:'Filipino'})[state.language]+' ▾';store.set('language',state.language)}$('language').addEventListener('change',e=>{state.language=e.target.value;language()});$('langBtn').addEventListener('click',()=>{const seq=['en','ceb','fil'];state.language=seq[(seq.indexOf(state.language)+1)%3];language();toast('Navigation language updated')});function setFont(v){state.font=Number(v);document.documentElement.style.setProperty('--scale',state.font);$('textSize').value=String(state.font);store.set('font',state.font)}$('textSize').addEventListener('change',e=>setFont(e.target.value));$('fontBtn').addEventListener('click',()=>{const opts=[1,1.12,1.25];setFont(opts[(opts.indexOf(state.font)+1)%3])});
// Appearance preference is independent of prayer data and survives page reloads.
function applyAppearance(mode){
  const selected=mode==='dark'?'dark':'light';
  document.documentElement.dataset.theme=selected;
  $('appearance').value=selected;
  $('themeBtn').textContent=selected==='dark'?'☀ Light':'☾ Dark';
  $('themeBtn').setAttribute('aria-label',selected==='dark'?'Switch to light mode':'Switch to dark mode');
  $('themeBtn').setAttribute('aria-pressed',String(selected==='dark'));
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content',selected==='dark'?'#18120f':'#231914');
  store.set('appearance',selected);
}
$('appearance').addEventListener('change',e=>applyAppearance(e.target.value));
$('themeBtn').addEventListener('click',()=>applyAppearance(document.documentElement.dataset.theme==='dark'?'light':'dark'));
applyAppearance(store.get('appearance','light'));
// Each novena Scripture label opens the full KJV passage. The verse data is fetched
// from bible-api.com and cached for subsequent visits. No API key is necessary.
const SCRIPTURE_API='https://bible-api.com/';
const scriptureDialog=$('scriptureDialog');
const scriptureDialogBody=$('scriptureDialogBody');
let scriptureRequestId=0;
function scriptureCacheKey(ref){return 'kjv.'+ref.replace(/\s+/g,' ').trim().toLowerCase()}
function showScriptureText(data){
  scriptureDialogBody.replaceChildren();
  const verses=Array.isArray(data.verses)?data.verses:[];
  if(!verses.length)throw Error('No verses were returned for this passage.');
  let lastChapter=null;
  for(const v of verses){
    if(v.chapter!==lastChapter){
      const h=document.createElement('h3');h.className='scripture-chapter';h.textContent=`${v.book_name} ${v.chapter}`;scriptureDialogBody.append(h);lastChapter=v.chapter;
    }
    const line=document.createElement('p');line.className='scripture-verse';
    const num=document.createElement('sup');num.textContent=String(v.verse);num.className='scripture-verse-number';
    line.append(num,document.createTextNode(' '+String(v.text||'').trim()));scriptureDialogBody.append(line);
  }
}
async function openScripturePassage(ref){
  // Explicit reference prevents confusing the novena with the meditation currently on screen.
  if(typeof ref!=='string')ref=novena[state.day].ref;
  const requestId=++scriptureRequestId;
  $('scriptureDialogTitle').textContent=ref;
  scriptureDialogBody.textContent='Loading Scripture verses…';
  if(!scriptureDialog.open)scriptureDialog.showModal();
  const cacheKey=scriptureCacheKey(ref);
  const cached=store.get(cacheKey,null);
  if(cached?.verses?.length){if(requestId===scriptureRequestId && scriptureDialog.open)showScriptureText(cached);return;}
  try{
    const query=ref.replace(/[–—]/g,'-');
    const response=await fetch(`${SCRIPTURE_API}${encodeURIComponent(query)}?translation=kjv`);
    if(!response.ok)throw Error('The Scripture service is unavailable.');
    const data=await response.json();
    if(data.error || !Array.isArray(data.verses) || !data.verses.length)throw Error(data.error||'Passage not found.');
    if(requestId!==scriptureRequestId || !scriptureDialog.open)return;
    showScriptureText(data);
    try{store.set(cacheKey,data)}catch{} // Browser storage may be full or disabled.
  }catch(err){
    if(requestId!==scriptureRequestId || !scriptureDialog.open)return;
    scriptureDialogBody.replaceChildren();
    const message=document.createElement('p');
    message.textContent='Unable to load the full passage. Please check your internet connection and try again. Successfully opened passages remain available offline in this browser.';
    const retry=document.createElement('button');retry.type='button';retry.className='btn outline';retry.textContent='Retry';retry.addEventListener('click',openScripturePassage);
    scriptureDialogBody.append(message,retry);
  }
}
$('dayScripture').addEventListener('click',()=>openScripturePassage(novena[state.day].ref));
$('scriptureRef').addEventListener('click',()=>openScripturePassage(meditations[state.meditation][0]));
function closeScripturePassage(){scriptureRequestId++;scriptureDialog.close()}
$('closeScriptureDialog').addEventListener('click',closeScripturePassage);
$('closeScriptureBottom').addEventListener('click',closeScripturePassage);
scriptureDialog.addEventListener('close',()=>{scriptureRequestId++});
function renderNovena(){$('dayTitle').textContent=`Day ${state.day+1} — ${novena[state.day].theme}`;$('dayProgress').textContent=`${state.completed.length} of 9 completed`;$('dayScripture').textContent=`Scripture: ${novena[state.day].ref} ↗`;$('dayReflection').textContent=novena[state.day].reflection;$('dayPrayer').textContent=novena[state.day].prayer;$('completeDay').textContent=state.completed.includes(state.day)?'✓ Day completed':'Mark day complete';$('dayGrid').innerHTML=novena.map((x,i)=>`<button type="button" data-day="${i}" class="${i===state.day?'selected ':''}${state.completed.includes(i)?'completed':''}" title="Day ${i+1}: ${html(x.theme)}" aria-label="Day ${i+1}: ${html(x.theme)}" aria-pressed="${i===state.day}">${i+1}</button>`).join('');store.set('selectedDay',state.day)}$('dayGrid').addEventListener('click',e=>{const b=e.target.closest('[data-day]');if(b){state.day=Number(b.dataset.day);renderNovena()}});$('prevDay').onclick=()=>{state.day=Math.max(0,state.day-1);renderNovena()};$('nextDay').onclick=()=>{state.day=Math.min(8,state.day+1);renderNovena()};$('completeDay').onclick=()=>{if(!state.completed.includes(state.day)){state.completed.push(state.day);store.set('completed',state.completed);toast('Novena day completed');syncCloud('progress')}renderNovena()};function displayPrayer(key){$('extraPrayer').textContent=prayers[key];document.querySelectorAll('[data-prayer]').forEach(e=>e.classList.toggle('selected',e.dataset.prayer===key))}document.querySelectorAll('[data-prayer]').forEach(e=>e.onclick=()=>displayPrayer(e.dataset.prayer));
// One immutable timestamp per offering is the source of truth. The GIF supplies
// only flame flicker; the wax level is derived from wall-clock time (not frame rate).
const CANDLE_LIFETIME_MS=24*60*60*1000;
const CANDLE_WAX_FULL_HEIGHT=172; // Visual pixels of wax at the start.
const CANDLE_WAX_END_HEIGHT=18; // The fixed wax puddle remains at the base.
function candleRemaining(createdAt,now=Date.now()){
  const started=Date.parse(createdAt);
  if(!Number.isFinite(started)||started>now)return 0;
  return Math.max(0,CANDLE_LIFETIME_MS-(now-started));
}
function candleTimeLabel(ms){
  const totalSeconds=Math.ceil(ms/1000);
  const h=Math.floor(totalSeconds/3600);
  const m=Math.floor((totalSeconds%3600)/60);
  const sec=totalSeconds%60;
  return `${h}h ${String(m).padStart(2,'0')}m ${String(sec).padStart(2,'0')}s remaining`;
}
function candleMarkup(c){
  const started=Date.parse(c.created_at);
  return `<div class="candle-item" data-started="${started}" title="${html(c.type)}">
    <div class="photo-candle" role="img" aria-label="Flickering devotional candle">
      <div class="photo-candle-glow" aria-hidden="true"></div>
      <img class="photo-candle-wax" src="assets/candle-wax.png" alt="" draggable="false">
      <img class="photo-candle-flame" src="assets/candle-flame.gif" alt="" draggable="false">
    </div>
    <div class="candle-label">${html(c.note||c.type)}</div>
    ${Number.isInteger(c.novena_day)?`<div class="novena-day-tag">Novena Day ${c.novena_day+1}</div>`:''}
    <div class="remaining" aria-live="off"></div>
  </div>`;
}
function renderCandleCollection(kind){
  const now=Date.now();
  const key=kind==='novena'?'novenaCandles':'candles';
  const grid=kind==='novena'?'novenaCandleGrid':'candleGrid';
  const empty=kind==='novena'?'novenaCandleEmpty':'candleEmpty';
  state[key]=state[key].filter(c=>candleRemaining(c.created_at,now)>0);
  store.set(key,state[key]);
  $(empty).hidden=!!state[key].length;
  $(grid).innerHTML=state[key].map(candleMarkup).join('');
  updateCandleClock();
}
function renderCandles(){renderCandleCollection('main')}
function renderNovenaCandles(){renderCandleCollection('novena')}
function updateCandleClock(){
  const now=Date.now();
  for(const kind of ['main','novena']){
    const key=kind==='novena'?'novenaCandles':'candles';
    const grid=kind==='novena'?'novenaCandleGrid':'candleGrid';
    let expired=false;
    $(grid).querySelectorAll('.candle-item[data-started]').forEach(el=>{
      const started=Number(el.dataset.started);
      const remaining=Number.isFinite(started)?Math.max(0,CANDLE_LIFETIME_MS-(now-started)):0;
      if(remaining<=0){expired=true;return;}
      const fraction=remaining/CANDLE_LIFETIME_MS;
      const waxHeight=CANDLE_WAX_END_HEIGHT+(CANDLE_WAX_FULL_HEIGHT-CANDLE_WAX_END_HEIGHT)*fraction;
      el.style.setProperty('--wax-height',`${waxHeight.toFixed(3)}px`);
      el.querySelector('.remaining').textContent=candleTimeLabel(remaining);
      el.querySelector('.photo-candle').setAttribute('aria-label',`Flickering candle; ${Math.round(fraction*100)} percent of burn time remaining`);
    });
    if(expired){
      state[key]=state[key].filter(c=>candleRemaining(c.created_at,now)>0);
      store.set(key,state[key]);
      $(grid).innerHTML=state[key].map(candleMarkup).join('');
      $(kind==='novena'?'novenaCandleEmpty':'candleEmpty').hidden=!!state[key].length;
      if(state.user)syncCloud(key);
    }
  }
}
function uid(){return globalThis.crypto?.randomUUID?.()||`${Date.now()}-${Math.random().toString(36).slice(2)}`}
// Floral offerings have their own collection, independent of candle timers.
function renderNovenaFlowers(){
  const list=Array.isArray(state.novenaFlowers)?state.novenaFlowers:[];
  $('novenaFlowerEmpty').hidden=list.length>0;
  $('novenaFlowerGrid').innerHTML=list.map(f=>`<article class="flower-offering">
    <img src="assets/novena-rose-bouquet.png" alt="Bouquet of red roses offered in prayer" loading="lazy">
    <div class="novena-day-tag">Novena Day ${Number(f.novena_day)+1}</div>
    ${f.note?`<p class="flower-intention">${html(f.note)}</p>`:''}
    <time datetime="${html(f.created_at)}">${html(new Date(f.created_at).toLocaleDateString())}</time>
  </article>`).join('');
}
function renderIntentions(){$('intentionEmpty').hidden=!!state.intentions.length;$('intentionList').innerHTML=state.intentions.map(x=>`<article class="journal-entry"><h4>${html(x.title)}</h4><time>${html(new Date(x.created_at).toLocaleDateString())}</time><p>${html(x.body)}</p><button type="button" data-delete="${html(x.id)}">Delete intention</button></article>`).join('')}$('intentionForm').onsubmit=async e=>{e.preventDefault();const title=$('intentionName').value.trim(),body=$('intentionBody').value.trim();if(!title||!body)return;state.intentions.unshift({id:uid(),title,body,created_at:new Date().toISOString()});store.set('intentions',state.intentions);renderIntentions();e.target.reset();toast('Private intention saved');await syncCloud('intentions')};$('intentionList').addEventListener('click',async e=>{const b=e.target.closest('[data-delete]');if(!b||!confirm('Delete this prayer intention permanently?'))return;state.intentions=state.intentions.filter(x=>x.id!==b.dataset.delete);store.set('intentions',state.intentions);renderIntentions();await syncCloud('intentions');toast('Intention deleted')});
function renderMeditation(){const m=meditations[state.meditation];$('scriptureCount').textContent=`Meditation ${state.meditation+1} of ${meditations.length}`;$('scriptureRef').textContent=m[0]+' ↗';$('scriptureTheme').textContent=m[1];$('scriptureReflection').textContent=m[2]}$('prevMeditation').onclick=()=>{state.meditation=(state.meditation+meditations.length-1)%meditations.length;renderMeditation()};$('nextMeditation').onclick=()=>{state.meditation=(state.meditation+1)%meditations.length;renderMeditation()};
function exportData(){const payload={exported_at:new Date().toISOString(),format:'stonino-v1',candles:state.candles,novenaCandles:state.novenaCandles,novenaFlowers:state.novenaFlowers,intentions:state.intentions,completed:state.completed};const a=document.createElement('a');const u=URL.createObjectURL(new Blob([JSON.stringify(payload,null,2)],{type:'application/json'}));a.href=u;a.download='sto-nino-private-data.json';a.click();setTimeout(()=>URL.revokeObjectURL(u),5000)}$('exportData').onclick=exportData;$('clearData').onclick=async()=>{if(!confirm('Delete ALL guest candles, novena candles, intentions, and novena progress from this browser?'))return;state.candles=[];state.novenaCandles=[];state.novenaFlowers=[];state.intentions=[];state.completed=[];['candles','novenaCandles','novenaFlowers','intentions','completed','selectedDay'].forEach(k=>localStorage.removeItem(prefix+k));state.day=0;renderCandles();renderNovenaCandles();renderNovenaFlowers();renderIntentions();renderNovena();if(state.user)await syncCloud('all');toast('Local devotional data deleted')};
$('authBtn').onclick=()=>$('accountDialog').showModal();$('closeDialog').onclick=()=>$('accountDialog').close();$('accountDialog').addEventListener('click',e=>{if(e.target===$('accountDialog'))$('accountDialog').close()});
function accountView(){$('accountLoggedOut').hidden=!!state.user;$('accountLoggedIn').hidden=!state.user;$('accountInfo').textContent=state.user?'Your devotional data can be synchronized to your private cloud account.':'You are browsing as a guest. Your intentions and candles are saved only in this browser.';$('userEmail').textContent=state.user?.email||''}
async function initCloud(){
  // IMPORTANT: Guest novena and flower offerings must never wait for an online CDN.
  if(!config.supabaseUrl||!config.supabaseAnonKey)return;
  try{
    if(!window.supabase?.createClient){
      await new Promise((resolve,reject)=>{
        const script=document.createElement('script');
        script.src='https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.js';
        script.onload=resolve;
        script.onerror=()=>reject(new Error('Supabase library could not load'));
        document.head.appendChild(script);
      });
    }
    if(!window.supabase?.createClient)throw new Error('Supabase library unavailable');
    state.supabase=window.supabase.createClient(config.supabaseUrl,config.supabaseAnonKey);const {data,error}=await state.supabase.auth.getUser();if(error&&error.name!=='AuthSessionMissingError')console.warn('Auth:',error.message);state.user=data?.user||null;state.supabase.auth.onAuthStateChange((_event,session)=>{state.user=session?.user||null;accountView()});if(state.user)await loadCloud();accountView()}catch(e){console.warn('Cloud init failed',e);toast('Cloud unavailable; guest data remains on this device')}}
async function loadCloud(){if(!state.user||!state.supabase)return;try{const {data,error}=await state.supabase.from('stonino_profiles').select('candles,novena_candles,novena_flowers,intentions,completed').eq('user_id',state.user.id).maybeSingle();if(error)throw error;if(data){/* Preserve local guest data on sign-in by merging, not silently overwriting. */const merge=(a,b)=>[...new Map([...b,...a].map(x=>[x.id,x])).values()];state.candles=merge(state.candles,Array.isArray(data.candles)?data.candles:[]);state.novenaCandles=merge(state.novenaCandles,Array.isArray(data.novena_candles)?data.novena_candles:[]);state.novenaFlowers=merge(state.novenaFlowers,Array.isArray(data.novena_flowers)?data.novena_flowers:[]);state.intentions=merge(state.intentions,Array.isArray(data.intentions)?data.intentions:[]);state.completed=[...new Set([...state.completed,...(Array.isArray(data.completed)?data.completed:[])].map(Number).filter(n=>Number.isInteger(n)&&n>=0&&n<9))];store.set('candles',state.candles);store.set('novenaCandles',state.novenaCandles);store.set('novenaFlowers',state.novenaFlowers);store.set('intentions',state.intentions);store.set('completed',state.completed);renderCandles();renderNovenaCandles();renderNovenaFlowers();renderIntentions();renderNovena()}await syncCloud('all')}catch(e){console.warn(e);toast('Cloud sync unavailable; data remains in this browser')}}
async function syncCloud(){if(!state.user||!state.supabase)return;try{const {error}=await state.supabase.from('stonino_profiles').upsert({user_id:state.user.id,candles:state.candles,novena_candles:state.novenaCandles,novena_flowers:state.novenaFlowers,intentions:state.intentions,completed:state.completed,updated_at:new Date().toISOString()},{onConflict:'user_id'});if(error)throw error}catch(e){console.warn(e);toast('Saved locally. Cloud sync needs attention.')}}
async function accountAction(mode){if(!state.supabase){toast('Set up Supabase first. Guest access is already available.');return}const email=$('email').value.trim(),password=$('password').value;if(!email||!password){toast('Enter your email and password');return}try{const r=mode==='signUp'?await state.supabase.auth.signUp({email,password}):await state.supabase.auth.signInWithPassword({email,password});if(r.error)throw r.error;if(r.data?.user&&r.data?.session){state.user=r.data.user;await loadCloud()}accountView();toast(mode==='signUp'?'Account request submitted. Confirm email if required.':'Signed in');if(state.user)$('accountDialog').close()}catch(e){toast(e.message||'Unable to authenticate')}}$('signIn').onclick=()=>accountAction('signIn');$('signUp').onclick=()=>accountAction('signUp');$('resetPassword').onclick=async()=>{const email=$('email').value.trim();if(!email||!state.supabase)return toast('Configure cloud access and enter your email');try{const {error}=await state.supabase.auth.resetPasswordForEmail(email,{redirectTo:location.origin+location.pathname});if(error)throw error;toast('If the address is registered, a reset email will be sent.')}catch(e){toast(e.message)}};$('signOut').onclick=async()=>{await state.supabase?.auth.signOut();state.user=null;accountView();toast('Signed out')};$('deleteAccount').onclick=async()=>{if(!state.user||!state.supabase)return;if(!confirm('Permanently delete your cloud account and ALL its devotional data? This cannot be undone.'))return;try{const {data}=await state.supabase.auth.getSession();const token=data?.session?.access_token;if(!token)throw Error('Please sign in again');const response=await fetch(config.deleteAccountEndpoint||'/.netlify/functions/delete-account',{method:'POST',headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json'},body:JSON.stringify({confirm:true})});if(!response.ok){let msg='Account deletion failed';try{msg=(await response.json()).error||msg}catch{}throw Error(msg)}await state.supabase.auth.signOut();state.user=null;state.candles=[];state.novenaCandles=[];state.novenaFlowers=[];state.intentions=[];state.completed=[];['candles','novenaCandles','novenaFlowers','intentions','completed'].forEach(k=>localStorage.removeItem(prefix+k));renderCandles();renderNovenaCandles();renderNovenaFlowers();renderIntentions();renderNovena();accountView();$('accountDialog').close();toast('Your account and its data have been deleted')}catch(e){toast(e.message||'Account deletion failed')}};
language();setFont(state.font);renderNovena();displayPrayer('morning');renderCandles();renderNovenaCandles();renderNovenaFlowers();renderIntentions();renderMeditation();accountView();if(location.hash&&$(location.hash.slice(1))?.classList.contains('page'))nav(location.hash.slice(1));initCloud();setInterval(updateCandleClock,1000);document.addEventListener('visibilitychange',()=>{if(!document.hidden)updateCandleClock()});
(() => {
  const pendingKey = prefix + 'pendingGCashOffering';
  const dialog = $('offeringDialog');
  const status = $('offeringStatus');
  const showPayment = $('startOfferingPayment');
  const checkButton = $('checkOfferingPayment');
  const resume = $('resumeOffering');
  const paymentPanel = $('offeringPaymentPanel');
  const kinds = {
    candle: { form: 'candleForm', field: 'candleFor', type: 'candleType',
      collection: 'candles', label: 'Virtual candle', cap: 24, render: renderCandles },
    'novena-candle': { form: 'novenaCandleForm', field: 'novenaCandleFor', type: 'novenaCandleType',
      collection: 'novenaCandles', label: 'Novena candle', cap: 24, render: renderNovenaCandles },
    'novena-flowers': { form: 'novenaFlowerForm', field: 'novenaFlowerFor',
      collection: 'novenaFlowers', label: 'Novena flower bouquet', cap: 36, render: renderNovenaFlowers }
  };
  let draft;
  let busy = false;

  function pending() {
    try { return JSON.parse(localStorage.getItem(pendingKey)); }
    catch { return null; }
  }

  function open(order) {
    draft = order;
    $('offeringSummary').textContent = kinds[order.kind].label +
      (order.day === undefined ? '' : ' · Day ' + (order.day + 1)) + (order.reference ? '' : ' · ₱5');
    paymentPanel.hidden = true;
    showPayment.hidden = Boolean(order.reference);
    checkButton.hidden = !order.reference;
    status.textContent = order.reference ? 'Your GCash payment is awaiting review. Return here to check its status.' :
      'Your offering will appear after your GCash payment is verified.';
    if (!dialog.open) dialog.showModal();
  }

  const endpoint = '/.netlify/functions/offering-payment';

  async function request(order, method) {
    const details = { id: order.id, kind: order.kind, reference: order.reference };
    const response = await fetch(endpoint, {
      method: 'POST', cache: 'no-store', signal: AbortSignal.timeout(12000),
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...details, action: method === 'GET' ? 'status' : 'submit' })
    });
    const result = await response.json();
    if (response.status === 404 && method === 'GET') return { status: 'not-created' };
    if (!response.ok) throw new Error(result.error || 'Checkout is unavailable. Keep your GCash reference and try again.');
    return result;
  }

  async function verify(order) {
    const result = await request(order, 'GET');
    if (result.status === 'pending') {
      status.textContent = 'Awaiting manual review. You can close this window and check again later.';
      return;
    }
    if (result.status === 'not-created') {
      await request(order, 'POST');
      status.textContent = 'Reference submitted. Your payment is awaiting manual review.';
      return;
    }
    if (result.status === 'paid') {
      const { collection, render } = kinds[order.kind];
      const saved = store.get(collection, []);
      const item = { id: order.id, note: order.note, type: order.type,
        novena_day: order.day, created_at: result.paidAt };
      const items = [...new Map([item, ...state[collection], ...saved].map(x => [x.id, x])).values()];
      localStorage.setItem(prefix + collection, JSON.stringify(items));
      state[collection] = items;
      render();
      $(kinds[order.kind].form).reset();
      toast('Payment confirmed. Your offering has been placed.');
      void syncCloud(collection);

    } else {
      throw new Error('Payment status is unavailable.');
    }
    if (pending()?.id === order.id) localStorage.removeItem(pendingKey);
    resume.hidden = !pending();
    if (dialog.open) dialog.close();
  }

  async function run(task) {
    if (busy || !dialog.open) return;
    busy = showPayment.disabled = checkButton.disabled = true;
    try { await task(); }
    catch (error) { status.textContent = error.message || 'Try checking payment again.'; }
    finally { busy = showPayment.disabled = checkButton.disabled = false; }
  }

  for (const [kind, settings] of Object.entries(kinds)) {
    $(settings.form).onsubmit = event => {
      event.preventDefault();
      const existing = pending();
      if (existing) return open(existing);
      if (settings.type) settings.render();
      if (state[settings.collection].length >= settings.cap) {
        return toast('Your offering display has reached its limit of ' + settings.cap + '.');
      }
      open({ kind, note: $(settings.field).value.trim(),
        ...(settings.type && { type: $(settings.type).value }),
        ...(kind !== 'candle' && { day: state.day }) });
    };
  }

  showPayment.onclick = () => run(async () => {
    const response = await fetch(endpoint + '?ready=1', { cache: 'no-store', signal: AbortSignal.timeout(10000) });
    if (!response.ok) throw new Error('GCash checkout is unavailable. Please try again later.');
    draft = pending() || { ...draft, id: crypto.randomUUID() };
    localStorage.setItem(pendingKey, JSON.stringify(draft));
    resume.hidden = false;
    $('gcashReference').value = '';
    paymentPanel.hidden = false;
    showPayment.hidden = true;
    status.textContent = 'Send ₱5 through GCash Express Send, then enter your transaction reference.';
  });
  $('copyGCashRecipient').onclick = async () => {
    const recipient = $('gcashRecipient');
    try {
      await navigator.clipboard.writeText(recipient.value);
      status.textContent = 'Number copied. Open GCash and choose Express Send.';
    } catch {
      recipient.focus();
      recipient.select();
      status.textContent = 'Copy the selected number, then open GCash and choose Express Send.';
    }
  };
  $('gcashReferenceForm').onsubmit = event => {
    event.preventDefault();
    void run(async () => {
      const order = { ...draft, reference: $('gcashReference').value.trim().toUpperCase() };
      // Save before posting so a reload or a lost response can recover the same request.
      localStorage.setItem(pendingKey, JSON.stringify(order));
      draft = order;
      try {
        await request(order, 'POST');
      } catch (error) {
        checkButton.hidden = false;
        throw error;
      }
      paymentPanel.hidden = true;
      checkButton.hidden = false;
      status.textContent = 'Reference submitted. Your payment is awaiting manual review.';
    });
  };
  checkButton.onclick = () => run(() => verify(draft));
  $('closeOffering').onclick = () => dialog.close();
  resume.onclick = () => { const order = pending(); if (order) open(order); };
  resume.hidden = !pending();
  window.addEventListener('storage', event => {
    if (event.key === pendingKey) resume.hidden = !pending();
  });
})();
})();

