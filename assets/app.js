(()=>{'use strict';
const $=id=>document.getElementById(id), config=window.STONINO_CONFIG||{}, prefix='stonino.v1.', store={get(k,f){try{return JSON.parse(localStorage.getItem(prefix+k))??f}catch{return f}},set(k,v){try{localStorage.setItem(prefix+k,JSON.stringify(v))}catch(err){console.warn('Local storage unavailable; using in-memory data',err)}}};
const devotionalKeys = ['completed', 'intentions', 'candles', 'novenaCandles', 'novenaFlowers'];
const state = { language: store.get('language', 'en'), font: store.get('font', 1),
  day: 0, meditation: 0, completed: [], intentions: [], candles: [],
  novenaCandles: [], novenaFlowers: [], user: null, supabase: null };
const accountKey = key => 'account.' + state.user.id + '.' + key;
const readAccountData = (key, fallback) => state.user ? store.get(accountKey(key), fallback) : fallback;
const saveAccountData = (key, value) => { if (state.user) store.set(accountKey(key), value); };
let authStatus = 'loading';
let authRevision = 0;
const cebuano = window.stoninoCebuano;
const filipino = window.stoninoFilipinoPrayers;
const isFilipino = () => state.language === 'fil';
const prayerLocale = () => ({ ceb: cebuano, fil: filipino })[state.language];
const isCebuano = () => state.language === 'ceb';
const tr = text => {
  const messages = prayerLocale()?.messages;
  return messages && Object.hasOwn(messages, text) ? messages[text] : text;
};
const localizedError = (error, fallback) =>
  isCebuano() && !Object.hasOwn(cebuano.messages, error.message)
    ? tr(fallback)
    : tr(error.message || fallback);
const offeringPrayers = type => isFilipino() ? filipino.offerings[type] : window.stoninoOfferingPrayers[type];
function offeringPrayer(type, index) {
  return Number.isInteger(index) ? offeringPrayers(type)?.[index] : undefined;
}
function offeringNote({ type, prayerIndex, note }) {
  const prayer = offeringPrayer(type, prayerIndex);
  return prayer ? prayer[isCebuano() ? 3 : 1] + ' Amen.' : note;
}
function updateOfferingPrayer(select) {
  const stem = select.id.slice(0, -'Prayer'.length);
  const choice = select.value;
  const type = $(stem + 'Type').value;
  const prayer = choice === '' ? undefined : offeringPrayer(type, Number(choice));
  const preview = $(stem + 'PrayerPreview');
  preview.textContent = prayer ? offeringNote({ type, prayerIndex: Number(choice) }) : '';
  preview.hidden = !prayer;
  $(stem + 'CustomPrayer').hidden = choice !== 'custom';
}
function renderOfferingPrayers(select) {
  const stem = select.id.slice(0, -'Prayer'.length);
  const type = $(stem + 'Type').value;
  const previous = select.value || '';
  const prayers = offeringPrayers(type);
  select.replaceChildren();
  const appendOption = (value, label) => {
    const option = document.createElement('option');
    option.value = value;
    option.textContent = label;
    select.append(option);
  };
  appendOption('', tr('Choose a prayer (optional)'));
  prayers.forEach((prayer, index) => appendOption(String(index), prayer[isCebuano() ? 2 : 0]));
  appendOption('custom', tr('Write your own prayer'));
  select.value = previous;
  updateOfferingPrayer(select);
}
for (const select of document.querySelectorAll('[data-offering-prayer]')) {
  const type = $(select.id.slice(0, -'Prayer'.length) + 'Type');
  type.addEventListener('change', () => {
    select.value = '';
    renderOfferingPrayers(select);
  });
  select.addEventListener('change', () => updateOfferingPrayer(select));
}
const scriptureLabel = ref => isCebuano()
  ? ref.replace(/^\w+/, book => cebuano.books[book] || book)
  : ref;
const devotionalDate = value => new Date(value).toLocaleDateString(isCebuano() ? 'ceb-PH' : undefined);
let currentPrayer = 'morning';
const translations={en:{navSanctuary:'Sanctuary',navNovena:'Novena & Prayers',navCandles:'Light a Candle',navFlowers:'Offer Flowers',quickFlowers:'Offer a bouquet of roses',navIntentions:'My Intentions',navScripture:'Scripture',navSettings:'Settings & Privacy',welcome:'WELCOME TO THE CHAPEL',heroSub:'Enter a quiet space of prayer before Jesus Christ, the Holy Child. Bring your gratitude, your burdens, and your hopes.',beginPrayer:'Begin Devotion',quickNovena:'Pray one day at a time',quickCandle:'Offer a symbolic flame',quickJournal:'Keep a private prayer journal',quickScripture:'Read and reflect'},ceb:{navSanctuary:'Kapilya',navNovena:'Nobena ug mga Pag-ampo',navCandles:'Pagdagkot og Kandila',navFlowers:'Paghalad og mga Bulak',quickFlowers:'Paghalad og pungpong sa rosas',navIntentions:'Akong mga Intension',navScripture:'Balaang Kasulatan',navSettings:'Mga Setting ug Pribasidad',welcome:'MALIPAYONG PAG-ABOT SA KAPILYA',heroSub:'Sulod sa malinawon nga dapit sa pag-ampo kang Hesukristo, ang Balaang Bata. Idangop ang imong pasalamat, kabalaka, ug paglaom.',beginPrayer:'Sugdi ang Pag-ampo',quickNovena:'Pag-ampo matag adlaw',quickCandle:'Paghalad og simbolikong kahayag',quickJournal:'Tipigi ang pribadong pag-ampo',quickScripture:'Basaha ug pamalandonga'},fil:{navSanctuary:'Kapilya',navNovena:'Nobena at mga Panalangin',navCandles:'Magsindi ng Kandila',navFlowers:'Mag-alay ng mga Bulaklak',quickFlowers:'Mag-alay ng pumpon ng rosas',navIntentions:'Aking mga Intensiyon',navScripture:'Banal na Kasulatan',navSettings:'Mga Setting at Privacy',welcome:'MALIGAYANG PAGDATING SA KAPILYA',heroSub:'Pumasok sa tahimik na lugar ng panalangin kay Hesukristo, ang Banal na Sanggol. Dalhin ang iyong pasasalamat, mga pasanin, at pag-asa.',beginPrayer:'Simulan ang Panalangin',quickNovena:'Manalangin bawat araw',quickCandle:'Mag-alay ng simbolikong ilaw',quickJournal:'Itago ang pribadong dasal',quickScripture:'Magbasa at magnilay'}};
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
const prayers={morning:'Lord Jesus, Holy Child, I offer you this morning. Bless my thoughts, words, and work. May I recognize your presence in each person I meet and honor you in all I do. Amen.',family:'Jesus, Holy Child, look lovingly upon our family. Keep us close in patience, forgiveness, and faith. Protect children, comfort the elderly, and guide every home toward your peace. Amen.',thanks:'Lord Jesus, receive my thanks for blessings seen and unseen. Keep me humble in prosperity, faithful in difficulty, and generous toward those in need. Amen.',departed:'Lord Jesus Christ, in your mercy remember those who have died. Grant them rest according to your holy will, console those who mourn, and strengthen our hope in the resurrection. Amen.',appCreator:'Lord Jesus, Holy Child, bless the person who built this app. Grant them wisdom, humility, and perseverance. May their work help others draw closer to you. Amen.'};
const meditations=[['Matthew 19:13–15','Welcome','Jesus welcomes children. Consider how you can make room for the small, the vulnerable, and the overlooked. In prayer, ask for a heart ready to receive others.'],['Luke 2:1–20','God comes near','The birth of Jesus reveals God’s love in humility. Reflect on the ways you may encounter Christ in ordinary life.'],['Luke 2:41–52','Growth in wisdom','The child Jesus grows in wisdom. Ask God to guide your own growth in understanding, patience, and obedience to truth.'],['Mark 10:13–16','Blessing','Jesus blesses those brought to him. Pray for the children of your community and for all who care for them.'],['John 13:1–17','Humble service','Christ serves his disciples. Choose one practical act of kindness that asks for nothing in return.'],['John 14:27','Peace','Jesus promises his peace. Bring a burden before God and consider one step toward reconciliation.'],['Philippians 2:5–11','Christ’s humility','Christ’s self-giving love invites us to lay aside vanity and follow his example in daily choices.']];
let toastTimer;function toast(msg){const e=$('toast');e.textContent=tr(msg);e.classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>e.classList.remove('show'),3500)}function html(s){return String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}function nav(name){if(!canUseApp()||!$(name))return;document.querySelectorAll('.page').forEach(e=>e.classList.toggle('active',e.id===name));document.querySelectorAll('[data-nav]').forEach(e=>e.classList.toggle('active',e.dataset.nav===name));history.replaceState(null,'','#'+name);window.scrollTo({top:0,behavior:'instant'});$('main').focus({preventScroll:true})}document.querySelectorAll('[data-nav]').forEach(e=>e.addEventListener('click',ev=>{ev.preventDefault();nav(e.dataset.nav)}));
function language(){document.documentElement.lang=state.language;window.stoninoLocalize(state.language);document.querySelectorAll('[data-i18n]').forEach(e=>e.textContent=(translations[state.language]||translations.en)[e.dataset.i18n]||e.textContent);$('language').value=state.language;$('langBtn').textContent=({en:'English',ceb:'Cebuano',fil:'Filipino'})[state.language]+' ▾';store.set('language',state.language);renderNovena();displayPrayer(currentPrayer);renderCandles();renderNovenaCandles();renderFlowers();renderIntentions();renderMeditation();accountView();document.querySelectorAll('[data-offering-prayer]').forEach(renderOfferingPrayers)}$('language').addEventListener('change',e=>{state.language=e.target.value;language()});$('langBtn').addEventListener('click',()=>{const seq=['en','ceb','fil'];state.language=seq[(seq.indexOf(state.language)+1)%3];language();});function setFont(v){state.font=Number(v);document.documentElement.style.setProperty('--scale',state.font);$('textSize').value=String(state.font);store.set('font',state.font)}$('textSize').addEventListener('change',e=>setFont(e.target.value));$('fontBtn').addEventListener('click',()=>{const opts=[1,1.12,1.25];setFont(opts[(opts.indexOf(state.font)+1)%3])});
// Appearance preference is independent of prayer data and survives page reloads.
function applyAppearance(mode){
  const selected=mode==='dark'?'dark':'light';
  document.documentElement.dataset.theme=selected;
  $('appearance').value=selected;
  $('themeBtn').textContent=selected==='dark'?'☀ Light':'☾ Dark';
  $('themeBtn').setAttribute('aria-label',selected==='dark'?'Switch to light mode':'Switch to dark mode');
  $('themeBtn').setAttribute('aria-pressed',String(selected==='dark'));
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content','#8B1E2D');
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
  if (!canUseApp()) return;
  // Explicit reference prevents confusing the novena with the meditation currently on screen.
  if(typeof ref!=='string')ref=novena[state.day].ref;
  const requestId=++scriptureRequestId;
  $('scriptureDialogTitle').textContent=scriptureLabel(ref);
  const attribution = $('scriptureTranslation');
  attribution.replaceChildren();
  if (isCebuano() && cebuano.passages[ref]) {
    attribution.append($('cebuanoScriptureCredit').content.cloneNode(true));
    if (!scriptureDialog.open) scriptureDialog.showModal();
    showScriptureText(cebuano.passages[ref]);
    return;
  }
  attribution.textContent = 'King James Version (KJV) · Public domain';
  scriptureDialogBody.textContent=tr('Loading Scripture verses…');
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
    message.textContent=tr('Unable to load the full passage. Please check your internet connection and try again. Successfully opened passages remain available offline in this browser.');
    const retry=document.createElement('button');retry.type='button';retry.className='btn outline';retry.textContent=tr('Retry');retry.addEventListener('click',openScripturePassage);
    scriptureDialogBody.append(message,retry);
  }
}
$('dayScripture').addEventListener('click',()=>{if(isNovenaDayOpen(state.day))openScripturePassage(novena[state.day].ref)});
$('scriptureRef').addEventListener('click',()=>openScripturePassage(meditations[state.meditation][0]));
function closeScripturePassage(){scriptureRequestId++;scriptureDialog.close()}
$('closeScriptureDialog').addEventListener('click',closeScripturePassage);
$('closeScriptureBottom').addEventListener('click',closeScripturePassage);
scriptureDialog.addEventListener('close',()=>{scriptureRequestId++});
// Midnight in Cebu (UTC+08:00), regardless of the visitor's time zone.
const novenaSchedule = novena.map((_, index) => {
  const date = 7 + index;
  const isoDate = '2027-01-' + String(date).padStart(2, '0');
  return { date, isoDate, opensAt: Date.parse(isoDate + 'T00:00:00+08:00') };
});
let nextNovenaUnlock = Infinity;

function isNovenaDayOpen(day, now = Date.now()) {
  return now >= (novenaSchedule[day]?.opensAt ?? Infinity);
}

function renderNovena() {
  const now = Date.now();
  const nextDay = novenaSchedule.find(day => day.opensAt > now);
  nextNovenaUnlock = nextDay?.opensAt ?? Infinity;
  if (!isNovenaDayOpen(state.day, now)) state.day = 0;
  const available = isNovenaDayOpen(state.day, now);
  const day = novena[state.day];
  const date = novenaSchedule[state.day].date;
  const [theme, reflection, prayer] = prayerLocale()?.novena[state.day] ?? [day.theme, day.reflection, day.prayer];

  $('dayTitle').textContent = available ? `${isCebuano() ? 'Adlaw' : 'Day'} ${state.day + 1} — ${isCebuano() ? 'Enero' : 'January'} ${date}, 2027 · ${theme}` : tr('2027 Novena Schedule');
  $('dayProgress').textContent = `${state.completed.filter(index => isNovenaDayOpen(index, now)).length} ${isCebuano() ? 'sa 9 ang nahuman' : 'of 9 completed'}`;
  $('novenaScheduleStatus').hidden = available;
  $('novenaDayContent').hidden = !available;
  $('dayScripture').textContent = `${isCebuano() ? 'Balaang Kasulatan' : 'Scripture'}: ${scriptureLabel(day.ref)} ↗`;
  $('dayReflection').textContent = reflection;
  $('dayPrayer').textContent = prayer;
  $('completeDay').textContent = state.completed.includes(state.day) ? tr('✓ Day completed') : tr('Mark day complete');
  $('completeDay').disabled = !available;
  $('prevDay').disabled = !isNovenaDayOpen(state.day - 1, now);
  $('nextDay').disabled = !available || !isNovenaDayOpen(state.day + 1, now);
  for (const form of ['novenaCandleForm', 'novenaFlowerForm']) {
    $(form).querySelector('button[type="submit"]').disabled = !available;
  }
  $('dayGrid').innerHTML = novenaSchedule.map(({date, isoDate}, index) => {
    const open = isNovenaDayOpen(index, now);
    const selected = open && index === state.day;
    const completed = open && state.completed.includes(index);
    return `<button type="button" data-day="${index}" class="${selected ? 'selected ' : ''}${completed ? 'completed' : ''}" aria-pressed="${selected}" ${open ? '' : 'disabled'}><span>${isCebuano() ? 'Adlaw' : 'Day'} ${index + 1}</span><time datetime="${isoDate}">${isCebuano() ? 'Ene' : 'Jan'} ${date}</time></button>`;
  }).join('');
  if (available) saveAccountData('selectedDay', state.day);
}

function selectNovenaDay(day) {
  if (!isNovenaDayOpen(day)) return;
  state.day = day;
  renderNovena();
}

$('dayGrid').addEventListener('click', event => {
  const button = event.target.closest('[data-day]');
  if (button) selectNovenaDay(Number(button.dataset.day));
});
$('prevDay').onclick = () => selectNovenaDay(state.day - 1);
$('nextDay').onclick = () => selectNovenaDay(state.day + 1);
$('completeDay').onclick = () => {
  if (!canUseApp() || !isNovenaDayOpen(state.day)) return;
  if (!state.completed.includes(state.day)) {
    state.completed.push(state.day);
    saveAccountData('completed', state.completed);
    toast('Novena day completed');
    syncCloud('completed');
  }
  renderNovena();
};

function displayPrayer(key){currentPrayer=key;$('extraPrayer').textContent=prayerLocale()?.prayers[key] ?? prayers[key];document.querySelectorAll('[data-prayer]').forEach(e=>e.classList.toggle('selected',e.dataset.prayer===key))}document.querySelectorAll('[data-prayer]').forEach(e=>e.onclick=()=>displayPrayer(e.dataset.prayer));
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
  return `${h}h ${String(m).padStart(2,'0')}m ${String(sec).padStart(2,'0')}s ${isCebuano() ? 'ang nahibilin' : 'remaining'}`;
}
function candleMarkup(c){
  const started=Date.parse(c.created_at);
  return `<div class="candle-item" data-started="${started}" title="${html(tr(c.type))}">
    <div class="photo-candle" role="img" aria-label="${html(tr('Flickering devotional candle'))}">
      <div class="photo-candle-glow" aria-hidden="true"></div>
      <img class="photo-candle-wax" src="assets/candle-wax.png" alt="" draggable="false">
      <img class="photo-candle-flame" src="assets/candle-flame.gif" alt="" draggable="false">
    </div>
    <div class="candle-label">${html(offeringNote(c)||tr(c.type))}</div>
    ${Number.isInteger(c.novena_day)?`<div class="novena-day-tag">${isCebuano() ? 'Adlaw sa Nobena' : 'Novena Day'} ${c.novena_day+1}</div>`:''}
    <div class="remaining" aria-live="off"></div>
  </div>`;
}
function renderCandleCollection(kind){
  const now=Date.now();
  const key=kind==='novena'?'novenaCandles':'candles';
  const grid=kind==='novena'?'novenaCandleGrid':'candleGrid';
  const empty=kind==='novena'?'novenaCandleEmpty':'candleEmpty';
  state[key]=state[key].filter(c=>candleRemaining(c.created_at,now)>0);
  saveAccountData(key,state[key]);
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
      el.querySelector('.photo-candle').setAttribute('aria-label',`${tr('Flickering devotional candle')} · ${Math.round(fraction*100)}% ${isCebuano() ? 'ang nahibilin' : 'remaining'}`);
    });
    if(expired){
      state[key]=state[key].filter(c=>candleRemaining(c.created_at,now)>0);
      saveAccountData(key,state[key]);
      $(grid).innerHTML=state[key].map(candleMarkup).join('');
      $(kind==='novena'?'novenaCandleEmpty':'candleEmpty').hidden=!!state[key].length;
      if(state.user)syncCloud(key);
    }
  }
}
function uid(){return globalThis.crypto?.randomUUID?.()||`${Date.now()}-${Math.random().toString(36).slice(2)}`}
// Main and novena bouquets share storage but appear in their own displays.
function flowerOfferings(novena) {
  return state.novenaFlowers.filter(flower => (flower.novena_day != null) === novena);
}
function renderFlowers() {
  for (const [novena, grid, empty] of [
    [false, 'flowerGrid', 'flowerEmpty'],
    [true, 'novenaFlowerGrid', 'novenaFlowerEmpty']
  ]) {
    const flowers = flowerOfferings(novena);
    $(empty).hidden = flowers.length > 0;
    $(grid).innerHTML = flowers.map(flower => `<article class="flower-offering">
      <img src="assets/novena-rose-bouquet.png" alt="${html(tr('Bouquet of red roses offered in prayer'))}" loading="lazy">
      ${novena ? `<div class="novena-day-tag">${isCebuano() ? 'Adlaw sa Nobena' : 'Novena Day'} ${Number(flower.novena_day) + 1}</div>` : ''}
      ${flower.type && !novena ? `<div class="novena-day-tag">${html(tr(flower.type))}</div>` : ''}
      ${offeringNote(flower) ? `<p class="flower-intention">${html(offeringNote(flower))}</p>` : ''}
      <time datetime="${html(flower.created_at)}">${html(devotionalDate(flower.created_at))}</time>
    </article>`).join('');
  }
}
function renderIntentions(){$('intentionEmpty').hidden=!!state.intentions.length;$('intentionList').innerHTML=state.intentions.map(x=>`<article class="journal-entry"><h4>${html(x.title)}</h4><time>${html(devotionalDate(x.created_at))}</time><p>${html(x.body)}</p><button type="button" data-delete="${html(x.id)}">${tr('Delete intention')}</button></article>`).join('')}$('intentionForm').onsubmit=async e=>{e.preventDefault();if(!canUseApp())return;const title=$('intentionName').value.trim(),body=$('intentionBody').value.trim();if(!title||!body)return;state.intentions.unshift({id:uid(),title,body,created_at:new Date().toISOString()});saveAccountData('intentions',state.intentions);renderIntentions();e.target.reset();toast('Private intention saved');await syncCloud('intentions')};$('intentionList').addEventListener('click',async e=>{const b=e.target.closest('[data-delete]');if(!b||!confirm(tr('Delete this prayer intention permanently?')))return;state.intentions=state.intentions.filter(x=>x.id!==b.dataset.delete);saveAccountData('intentions',state.intentions);renderIntentions();await syncCloud('intentions');toast('Intention deleted')});
function renderMeditation(){const m=meditations[state.meditation];$('scriptureCount').textContent=`${isCebuano()?'Pamalandong':'Meditation'} ${state.meditation+1} ${isCebuano()?'sa':'of'} ${meditations.length}`;$('scriptureRef').textContent=scriptureLabel(m[0])+' ↗';$('scriptureTheme').textContent=isCebuano()?cebuano.meditations[state.meditation][0]:m[1];$('scriptureReflection').textContent=isCebuano()?cebuano.meditations[state.meditation][1]:m[2]}$('prevMeditation').onclick=()=>{state.meditation=(state.meditation+meditations.length-1)%meditations.length;renderMeditation()};$('nextMeditation').onclick=()=>{state.meditation=(state.meditation+1)%meditations.length;renderMeditation()};
function exportData(){if(!canUseApp())return;const payload={exported_at:new Date().toISOString(),format:'stonino-v1',candles:state.candles,novenaCandles:state.novenaCandles,novenaFlowers:state.novenaFlowers,intentions:state.intentions,completed:state.completed};const a=document.createElement('a');const u=URL.createObjectURL(new Blob([JSON.stringify(payload,null,2)],{type:'application/json'}));a.href=u;a.download='sto-nino-private-data.json';a.click();setTimeout(()=>URL.revokeObjectURL(u),5000)}$('exportData').onclick=exportData;
let registering = false;
const registrationPreference = prefix + 'openRegistration';
function setRegistrationMode(enabled) {
  registering = enabled;
  $('accountTitle').textContent = enabled ? tr('Create account') : tr('My Account');
  $('displayName').required = enabled;
  $('registrationName').hidden = !enabled;
  $('backToSignIn').hidden = !enabled;
  $('signIn').hidden = enabled;
  $('resetPassword').hidden = enabled;
  $('password').autocomplete = enabled ? 'new-password' : 'current-password';
}
$('backToSignIn').onclick = () => {
  localStorage.removeItem(registrationPreference);
  setRegistrationMode(false);
};
function openAccount(register) {
  setRegistrationMode(register);

  $('accountDialog').showModal();
  if (registering) $('displayName').focus();
}
$('authBtn').onclick = () => openAccount(!state.user && localStorage.getItem(registrationPreference) === 'yes');
$('gateSignIn').onclick = () => openAccount(false);
$('gateRegister').onclick = () => openAccount(true);
$('gateSaveName').onclick = () => { openAccount(false); $('accountDisplayName').focus(); };
$('gateRetry').onclick = () => void initCloud();
$('closeDialog').onclick=()=>$('accountDialog').close();$('accountDialog').addEventListener('click',e=>{if(e.target===$('accountDialog'))$('accountDialog').close()});
function displayName() {
  const name = state.user?.user_metadata?.stonino_display_name;
  return typeof name === 'string' ? name.trim().slice(0, 80) : '';
}
function canUseApp() {
  return authStatus === 'ready' && Boolean(state.user && displayName());
}
function accountView() {
  const name = displayName();
  const unlocked = canUseApp();
  const signedIn = Boolean(state.user);
  for (const id of ['devotionalContent', 'devotionalMobileNav']) {
    $(id).hidden = $(id).inert = !unlocked;
  }
  $('accountGate').hidden = unlocked;
  $('gateSignIn').hidden = $('gateRegister').hidden = authStatus !== 'ready' || signedIn;
  $('gateSaveName').hidden = authStatus !== 'ready' || !signedIn || Boolean(name);
  $('gateRetry').hidden = authStatus !== 'unavailable';
  $('accountGateStatus').textContent = tr(authStatus === 'loading' ? 'Checking your account…' :
    authStatus === 'unavailable' ? 'Account service is unavailable. Please retry.' :
    signedIn ? 'Set your name to enter the chapel.' : 'Sign in or create an account to use the app.');
  $('accountTitle').textContent = tr(registering ? 'Create account' : 'My Account');
  $('accountLoggedOut').hidden = signedIn;
  $('accountLoggedIn').hidden = !signedIn;
  $('accountInfo').textContent = tr(signedIn ? 'Your devotional data can be synchronized to your private cloud account.' : 'Sign in or create an account to use the app.');
  $('userEmail').textContent = state.user?.email || '';
  const headerName = $('devotionalUserName');
  headerName.textContent = headerName.title = name;
  headerName.hidden = !unlocked;
  $('authBtn').disabled = authStatus !== 'ready';
}
async function setAccountUser(user) {
  const changed = state.user?.id !== user?.id;
  const revision = ++authRevision;
  state.user = user?.is_anonymous ? null : user;
  if (changed) {
    for (const key of devotionalKeys) {
      const saved = readAccountData(key, []);
      state[key] = Array.isArray(saved) ? saved : [];
    }
    const day = readAccountData('selectedDay', 0);
    state.day = Number.isInteger(day) && day >= 0 && day < 9 ? day : 0;
    $('accountDisplayName').value = displayName();
    for (const id of ['scriptureDialog', 'installHelp']) {
      if ($(id).open) $(id).close();
    }
    for (const id of ['candleForm', 'novenaCandleForm', 'flowerForm', 'novenaFlowerForm', 'intentionForm']) $(id).reset();
  }
  authStatus = 'ready';
  language();
  if (changed && state.user) await loadCloud();
  if (revision !== authRevision) return;
  const page = location.hash.slice(1);
  if (changed && canUseApp() && $(page)?.classList.contains('page')) nav(page);
}
async function initCloud() {
  authStatus = 'loading';
  accountView();
  try {
    if (!config.supabaseUrl || !config.supabaseAnonKey) throw new Error('Supabase is not configured');
    if (!window.supabase?.createClient) {
      await new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.js';
        script.onload = resolve;
        script.onerror = reject;
        document.head.appendChild(script);
      });
    }
    state.supabase ??= window.supabase.createClient(config.supabaseUrl, config.supabaseAnonKey);
    const { data, error } = await state.supabase.auth.getUser();
    if (error && error.name !== 'AuthSessionMissingError') throw error;
    await setAccountUser(data?.user ?? null);
    state.supabase.auth.onAuthStateChange((event, session) => {
      if (event !== 'INITIAL_SESSION' && (session?.user?.id !== state.user?.id || event === 'USER_UPDATED')) {
        setTimeout(() => { void setAccountUser(session?.user ?? null); }, 0);
      }
    });
  } catch (error) {
    console.warn('Account initialization failed', error);
    authStatus = 'unavailable';
    accountView();
  }
}
$('accountNameForm').onsubmit = async event => {
  event.preventDefault();
  const name = $('accountDisplayName').value.trim();
  if (!state.user || !name || name.length > 80) return;
  const { data, error } = await state.supabase.auth.updateUser({ data: { stonino_display_name: name } });
  if (error) return toast(localizedError(error, 'Unable to complete the request. Please try again.'));
  await setAccountUser(data.user);
  $('accountDialog').close();
  toast('Name saved.');
};
let deletingDevotionalData = false;
let clearingOfferings = false;
let offeringRevision = 0;
const offeringColumns = {
  candles: 'candles',
  novenaCandles: 'novena_candles',
  novenaFlowers: 'novena_flowers'
};
const cloudColumns = { ...offeringColumns, intentions: 'intentions', completed: 'completed' };
const activeDevotionalSaves = new Set();
async function loadCloud() {
  if (!state.user || !state.supabase) return;
  const userId = state.user.id;
  const revision = offeringRevision;
  try {
    const { data, error } = await state.supabase.from('stonino_profiles')
      .select('candles,novena_candles,novena_flowers,intentions,completed')
      .eq('user_id', userId).maybeSingle();
    if (deletingDevotionalData || state.user?.id !== userId) return;
    if (error) throw error;
    if (!data) return;

    // The cloud copy takes precedence so another device's deletion survives sign-in.
    if (!clearingOfferings && revision === offeringRevision) {
      for (const [key, column] of Object.entries(offeringColumns)) {
        state[key] = Array.isArray(data[column]) ? data[column] : [];
        saveAccountData(key, state[key]);
      }
    }
    const intentions = Array.isArray(data.intentions) ? data.intentions : [];
    state.intentions = [...new Map([...intentions, ...state.intentions].map(item => [item.id, item])).values()];
    const completed = Array.isArray(data.completed) ? data.completed : [];
    state.completed = [...new Set([...state.completed, ...completed].map(Number)
      .filter(day => Number.isInteger(day) && day >= 0 && day < 9))];
    saveAccountData('intentions', state.intentions);
    saveAccountData('completed', state.completed);
    renderCandles();
    renderNovenaCandles();
    renderFlowers();
    renderIntentions();
    renderNovena();
  } catch (error) {
    console.warn(error);
    toast('Cloud sync unavailable; data remains in this browser');
  }
}
async function syncCloud(key) {
  if (!state.user || !state.supabase || deletingDevotionalData ||
      (clearingOfferings && Object.hasOwn(offeringColumns, key))) return;
  const save = Promise.resolve(state.supabase.from('stonino_profiles').upsert({
    user_id: state.user.id,
    [cloudColumns[key]]: state[key],
    updated_at: new Date().toISOString()
  }, { onConflict: 'user_id' }));
  activeDevotionalSaves.add(save);
  try {
    const { error } = await save;
    if (error) throw error;
  } catch (error) {
    console.warn(error);
    toast('Saved locally. Cloud sync needs attention.');
  } finally {
    activeDevotionalSaves.delete(save);
  }
}

$('deleteOfferings').onclick = async () => {
  if (!canUseApp() || deletingDevotionalData || clearingOfferings) return;
  if (!confirm(tr('Permanently delete all your candles and flowers, including novena offerings?'))) return;

  const userId = state.user.id;
  const button = $('deleteOfferings');
  clearingOfferings = button.disabled = true;
  offeringRevision++;
  try {
    await Promise.allSettled(activeDevotionalSaves);
    if (state.user?.id !== userId) return;
    const { error } = await state.supabase.from('stonino_profiles')
      .update({ candles: [], novena_candles: [], novena_flowers: [], updated_at: new Date().toISOString() })
      .eq('user_id', userId);
    if (error) throw error;
    for (const key of Object.keys(offeringColumns)) {
      store.set('account.' + userId + '.' + key, []);
    }
    if (state.user?.id !== userId) return;
    for (const key of Object.keys(offeringColumns)) state[key] = [];
    renderCandles();
    renderNovenaCandles();
    renderFlowers();
    toast('All candles and flowers were deleted.');
  } catch (error) {
    console.warn(error);
    toast('Could not delete offerings. Please try again.');
  } finally {
    clearingOfferings = button.disabled = false;
  }
};
async function accountAction(mode){if(authStatus!=='ready'||!state.supabase)return;const email=$('email').value.trim(),password=$('password').value;if(!email||!password){toast('Enter your email and password');return}const name = $('displayName').value.trim();
if (mode === 'signUp' && (!name || name.length > 80)) {
  toast('Enter your name using up to 80 characters.');
  $('displayName').focus();
  return;
}
try{const r=mode==='signUp'?await state.supabase.auth.signUp({email,password,options:{data:{stonino_display_name:name}}}):await state.supabase.auth.signInWithPassword({email,password});if(r.error)throw r.error;localStorage.removeItem(registrationPreference);if(r.data?.user&&r.data?.session)await setAccountUser(r.data.user);accountView();toast(mode==='signUp'?'Account request submitted. Confirm email if required.':'Signed in');if(state.user)$('accountDialog').close()}catch(e){toast(localizedError(e,'Unable to authenticate'))}}$('signIn').onclick=()=>accountAction('signIn');$('signUp').onclick=()=>{if(registering)return accountAction('signUp');setRegistrationMode(true);$('displayName').focus()};$('resetPassword').onclick=async()=>{const email=$('email').value.trim();if(!email||!state.supabase)return toast('Configure cloud access and enter your email');try{const {error}=await state.supabase.auth.resetPasswordForEmail(email,{redirectTo:location.origin+location.pathname});if(error)throw error;toast('If the address is registered, a reset email will be sent.')}catch(e){toast(localizedError(e,'Unable to complete the request. Please try again.'))}};$('signOut').onclick=async()=>{const {error}=await state.supabase.auth.signOut({scope:'local'});if(error)return toast(localizedError(error,'Unable to complete the request. Please try again.'));await setAccountUser(null);$('accountDialog').close();toast('Signed out')};$('deleteAccount').onclick = async () => {
  if (!state.user || !state.supabase || deletingDevotionalData || clearingOfferings) return;
  if (!confirm(tr('Delete your Sto. Niño Devotional profile and devotional data, and sign out of this app? Your CrownMind login and access to other apps will be preserved.'))) return;

  const userId = state.user.id;
  const button = $('deleteAccount');
  deletingDevotionalData = button.disabled = true;
  try {
    await Promise.all(activeDevotionalSaves);
    if (state.user?.id !== userId) throw Error('Please sign in again.');
    const { error } = await state.supabase.from('stonino_profiles').delete().eq('user_id', userId);
    if (error) throw error;

    for (const key of ['candles', 'novenaCandles', 'novenaFlowers', 'intentions', 'completed']) {
      state[key] = [];
      localStorage.removeItem(prefix + accountKey(key));
    }
    renderCandles();
    renderNovenaCandles();
    renderFlowers();
    renderIntentions();
    renderNovena();
    localStorage.removeItem(prefix + accountKey('selectedDay'));
    localStorage.setItem(registrationPreference, 'yes');
    const { error: signOutError } = await state.supabase.auth.signOut({ scope: 'local' });
    if (signOutError) {
      toast('Your Sto. Niño profile was deleted. Use Sign out to clear this browser session.');
      return;
    }
    await setAccountUser(null);
    for (const field of ['displayName', 'email', 'password']) $(field).value = '';
    accountView();
    $('accountDialog').close();
    toast('Your Sto. Niño profile was deleted and you were signed out.');
  } catch (error) {
    toast(localizedError(error,'Account deletion failed.'));
  } finally {
    deletingDevotionalData = button.disabled = false;
  }
};

language();setFont(state.font);if(location.hash&&$(location.hash.slice(1))?.classList.contains('page'))nav(location.hash.slice(1));initCloud();function refreshDevotionalClock() {
  updateCandleClock();
  if (Date.now() >= nextNovenaUnlock) renderNovena();
}
setInterval(refreshDevotionalClock, 1000);
document.addEventListener('visibilitychange', () => {
  if (!document.hidden) refreshDevotionalClock();
});
(() => {
  const kinds = {
    candle: { form: 'candleForm', field: 'candleFor', type: 'candleType',
      collection: 'candles', cap: 24, render: renderCandles },
    flowers: { form: 'flowerForm', field: 'flowerFor', type: 'flowerType',
      collection: 'novenaFlowers', cap: 36, render: renderFlowers },
    'novena-candle': { novena: true, form: 'novenaCandleForm', field: 'novenaCandleFor', type: 'novenaCandleType',
      collection: 'novenaCandles', cap: 24, render: renderNovenaCandles },
    'novena-flowers': { novena: true, form: 'novenaFlowerForm', field: 'novenaFlowerFor', type: 'novenaFlowerType',
      collection: 'novenaFlowers', cap: 36, render: renderFlowers }
  };
  for (const settings of Object.values(kinds)) {
    $(settings.form).onsubmit = event => {
      event.preventDefault();
      if (!canUseApp() || deletingDevotionalData || clearingOfferings) return;
      if (settings.novena && !isNovenaDayOpen(state.day)) return;
      settings.render();
      const display = settings.collection === 'novenaFlowers'
        ? flowerOfferings(Boolean(settings.novena))
        : state[settings.collection];
      if (display.length >= settings.cap) {
        return toast(isCebuano() ? `Naabot na ang kinutoban nga ${settings.cap} ka halad.` : 'Your offering display has reached its limit of ' + settings.cap + '.');
      }
      const choice = event.currentTarget.querySelector('[data-offering-prayer]').value;
      const type = $(settings.type).value;
      const prayerIndex = choice === '' || choice === 'custom' ? undefined : Number(choice);
      const note = choice === 'custom'
        ? $(settings.field).value.trim()
        : offeringNote({ type, prayerIndex }) || '';
      const { collection } = settings;
      offeringRevision++;
      state[collection].unshift({
        id: uid(), note, type, prayerIndex, created_at: new Date().toISOString(),
        ...(settings.novena && { novena_day: state.day })
      });
      saveAccountData(collection, state[collection]);
      settings.render();
      event.currentTarget.reset();
      renderOfferingPrayers(event.currentTarget.querySelector('[data-offering-prayer]'));
      toast('Your offering has been placed.');
      void syncCloud(collection);
    };
  }

})();
})();
