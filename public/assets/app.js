(()=>{'use strict';
const $=id=>document.getElementById(id), config=window.STONINO_CONFIG||{}, prefix='stonino.v1.', store={get(k,f){try{return JSON.parse(localStorage.getItem(prefix+k))??f}catch{return f}},set(k,v){try{localStorage.setItem(prefix+k,JSON.stringify(v))}catch(err){console.warn('Local storage unavailable; using in-memory data',err)}}};
const devotionalKeys = ['completed', 'intentions', 'candles', 'novenaCandles', 'novenaFlowers'];
const state = { language: store.get('language', 'en'), font: store.get('font', 1),
  day: null, meditation: 0, completed: [], intentions: [], candles: [],
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
const translations={en:{navSanctuary:'Sanctuary',navMusic:'Music Prayers',quickMusic:'Listen and pray',navNovena:'Novena & Prayers',navCandles:'Light a Candle',navFlowers:'Offer Flowers',quickFlowers:'Offer a bouquet of roses',navIntentions:'My Intentions',navScripture:'Scripture',navSettings:'Settings & Privacy',welcome:'WELCOME TO THE CHAPEL',heroSub:'Enter a quiet space of prayer before Jesus Christ, the Holy Child. Bring your gratitude, your burdens, and your hopes.',beginPrayer:'Begin Devotion',quickNovena:'Pray one day at a time',quickCandle:'Offer a symbolic flame',quickJournal:'Keep a private prayer journal',quickScripture:'Read and reflect'},ceb:{navSanctuary:'Kapilya',navMusic:'Mga Awit sa Pag-ampo',quickMusic:'Paminaw ug pag-ampo',navNovena:'Nobena ug mga Pag-ampo',navCandles:'Pagdagkot og Kandila',navFlowers:'Paghalad og mga Bulak',quickFlowers:'Paghalad og pungpong sa rosas',navIntentions:'Akong mga Intension',navScripture:'Balaang Kasulatan',navSettings:'Mga Setting ug Pribasidad',welcome:'MALIPAYONG PAG-ABOT SA KAPILYA',heroSub:'Sulod sa malinawon nga dapit sa pag-ampo kang Hesukristo, ang Balaang Bata. Idangop ang imong pasalamat, kabalaka, ug paglaom.',beginPrayer:'Sugdi ang Pag-ampo',quickNovena:'Pag-ampo matag adlaw',quickCandle:'Paghalad og simbolikong kahayag',quickJournal:'Tipigi ang pribadong pag-ampo',quickScripture:'Basaha ug pamalandonga'},fil:{navMusic:'Mga Awit ng Panalangin',quickMusic:'Makinig at manalangin',navSanctuary:'Kapilya',navNovena:'Nobena at mga Panalangin',navCandles:'Magsindi ng Kandila',navFlowers:'Mag-alay ng mga Bulaklak',quickFlowers:'Mag-alay ng pumpon ng rosas',navIntentions:'Aking mga Intensiyon',navScripture:'Banal na Kasulatan',navSettings:'Mga Setting at Privacy',welcome:'MALIGAYANG PAGDATING SA KAPILYA',heroSub:'Pumasok sa tahimik na lugar ng panalangin kay Hesukristo, ang Banal na Sanggol. Dalhin ang iyong pasasalamat, mga pasanin, at pag-asa.',beginPrayer:'Simulan ang Panalangin',quickNovena:'Manalangin bawat araw',quickCandle:'Mag-alay ng simbolikong ilaw',quickJournal:'Itago ang pribadong dasal',quickScripture:'Magbasa at magnilay'}};
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
let toastTimer;function toast(msg){const e=$('toast');e.textContent=tr(msg);e.classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>e.classList.remove('show'),3500)}function html(s){return String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}function nav(name){if(!canUseApp()||!$(name)||(['paymentReview','memberList'].includes(name)&&!paymentAdmin))return;$('prayerPackBar').hidden=['paymentReview','memberList'].includes(name);document.querySelectorAll('.page').forEach(e=>e.classList.toggle('active',e.id===name));document.querySelectorAll('[data-nav]').forEach(e=>e.classList.toggle('active',e.dataset.nav===name));history.replaceState(null,'','#'+name);if(name==='novena')renderNovena();else state.day=null;if(name==='prayerPacks')void refreshPrayerPacks();if(name==='paymentReview')void loadPaymentReview();if(name==='memberList')void loadAdminMembers();window.scrollTo({top:0,behavior:'instant'});$('main').focus({preventScroll:true})}document.querySelectorAll('[data-nav]').forEach(e=>e.addEventListener('click',ev=>{ev.preventDefault();nav(e.dataset.nav)}));
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
    const retry=document.createElement('button');retry.type='button';retry.className='btn outline';retry.textContent=tr('Retry');retry.addEventListener('click',()=>openScripturePassage(ref));
    scriptureDialogBody.append(message,retry);
  }
}
$('dayScripture').addEventListener('click',()=>{if(isNovenaDayOpen(state.day))openScripturePassage(novena[state.day].ref)});
$('scriptureRef').addEventListener('click',()=>openScripturePassage(meditations[state.meditation][0]));
function closeScripturePassage(){scriptureRequestId++;scriptureDialog.close()}
$('closeScriptureDialog').addEventListener('click',closeScripturePassage);
$('closeScriptureBottom').addEventListener('click',closeScripturePassage);
scriptureDialog.addEventListener('close',()=>{scriptureRequestId++});
// Cebu is UTC+08:00. The first in-app cycle is January 2027.
const NOVENA_PREVIEW_ENABLED = true;
const CEBU_OFFSET_MS = 8 * 60 * 60 * 1000;
const getNovenaYear = now => Math.max(2027, new Date(now + CEBU_OFFSET_MS).getUTCFullYear());
function buildNovenaSchedule(year) {
  const januaryFirst = new Date(Date.UTC(year, 0, 1));
  const feastDay = 15 + (7 - januaryFirst.getUTCDay()) % 7;
  return novena.map((_, index) => {
    const date = feastDay - 10 + index;
    const isoDate = new Date(Date.UTC(year, 0, date)).toISOString().slice(0, 10);
    return { isoDate, opensAt: Date.UTC(year, 0, date) - CEBU_OFFSET_MS };
  });
}
let novenaYear = getNovenaYear(Date.now());
let novenaSchedule = buildNovenaSchedule(novenaYear);
const legacyNovenaSchedule = buildNovenaSchedule(2027);
let nextNovenaUpdate = Infinity;

function normalizeCompleted(entries) {
  if (!Array.isArray(entries)) return [];
  return entries.map(entry => {
    if (Number.isInteger(entry)) return legacyNovenaSchedule[entry]?.isoDate;
    return typeof entry === 'string' && /^\d{4,}-01-\d{2}$/.test(entry) ? entry : undefined;
  }).filter(Boolean);
}

function isNovenaDayUnlocked(day, now) {
  return Number.isInteger(day) && Boolean(novenaSchedule[day])
    && getNovenaYear(now) === novenaYear
    && (NOVENA_PREVIEW_ENABLED || hasNovenaDayStarted(day, now))
    && novenaSchedule.slice(0, day).every(({isoDate}) => state.completed.includes(isoDate));
}

function isNovenaDayOpen(day, now = Date.now()) {
  return state.day === day && isNovenaDayUnlocked(day, now);
}

function novenaDateFormatter(options) {
  const locale = { ceb: 'ceb', fil: 'fil-PH' }[state.language] ?? 'en-US';
  return new Intl.DateTimeFormat(locale, {timeZone: 'Asia/Manila', ...options});
}

function hasNovenaDayStarted(day, now = Date.now()) {
  return getNovenaYear(now) === novenaYear && now >= (novenaSchedule[day]?.opensAt ?? Infinity);
}

const bookletPetitions = [
  ["Oh, most-loving Jesus, You have said, “there will be more rejoicing in Heaven for one sinner who repents than over ninety nine who don’t need repentance”, we beseech you to grant us the grace of repentance so that we may repent our sins and live for you alone. This we ask in Your Holy Name. Amen."],
  ["Oh, most-loving Jesus, who has shown your love to us by dying for us on the Cross and by giving yourself to us in the sacrament of the Holy Eucharist, we beseech you to share with us Your love so that we may always love You with all our heart, with all our soul and all our strength, and also so that we may always love our neighbors as ourselves. This we ask in Your Holy Name. Amen."],
  ["Oh, my Jesus, who has said, “learn from me because I am meek and humble of heart”, grants us the virtues of meekness and humility so that we may progress in our spiritual life, and so that our neighbor may see your Image in us. We ask you this in your Holy Name. Amen"],
  ["Oh, merciful Jesus, you had forgiven those who crucified you; we implore you to give us a forgiving heart so that we may always pardon those who will hurt us in words or in deeds. This we ask you in Your Holy Name. Amen."],
  ["Oh, most-loving Jesus, You have said, “there will be more rejoicing in Heaven for one sinner who repents than over ninety nine who don’t need repentance”, we beseech you to grant us the grace of repentance so that we may repent our sins and live for you alone. This we ask in Your Holy Name. Amen."],
  ["Oh, most-loving Jesus, You gave us the example of a chaste life while you were on earth; we implore you to grant us the virtue of chastity so that we may always live a chaste life in whatever state of life we have chosen. This we ask of you in Your Holy Name. Amen."],
  ["Oh, most merciful Jesus, You had been always obedient to your heavenly Father even unto death; we beseech you to grant us the grace of being always docile to the promptings of the Holy Spirit so that we will always glorify your Father in Heaven. This we ask in Your Holy Name. Amen."],
  ["Oh, merciful Jesus, You opened the gates of Heaven for us through your death and resurrection; we implore you to grant us eternal life after our journey on earth. We ask you this in Your Holy Name. Amen."],
  ["Oh, merciful Jesus, You said, “I am the Way, the Truth and the Life”, We beseech you to guide us in our way to Heaven so that we may be able to surmount all the difficulties and obstacles we encounter in this deceptive world.", "Grant us also the virtue of hope so that we always thirst for the heavenly things and for your glory. We ask you this in Your Holy Name. Amen."],
];

function renderNovena() {
  const now = Date.now();
  const year = getNovenaYear(now);
  if (year !== novenaYear) {
    novenaYear = year;
    novenaSchedule = buildNovenaSchedule(year);
    state.day = null;
  }
  const nextDay = novenaSchedule.find(day => day.opensAt > now);
  nextNovenaUpdate = nextDay?.opensAt ?? Date.UTC(year + 1, 0, 1) - CEBU_OFFSET_MS;
  if (!isNovenaDayOpen(state.day, now)) state.day = null;
  const available = state.day !== null;

  const formatter = novenaDateFormatter({month: 'long', day: 'numeric', year: 'numeric'});
  const shortDate = novenaDateFormatter({month: 'short', day: 'numeric'});
  const first = novenaSchedule[0].opensAt;
  const last = novenaSchedule.at(-1).opensAt;
  const dayLabel = tr('Day');
  const scheduleHint = tr('Mark each day complete to unlock the next. You can offer novena candles and flowers at any time.');
  $('novenaScheduleHint').textContent = `${shortDate.format(first)} – ${formatter.format(last)} · ${scheduleHint}`;
  $('novenaScheduleStatus').textContent = isNovenaDayUnlocked(0, now)
    ? tr('Select a day to open its prayers.')
    : tr('Day 1 opens {date}.').replace('{date}', formatter.format(first));
  $('dayTitle').textContent = tr('{year} Novena Schedule').replace('{year}', year);
  const completedCount = novenaSchedule.filter(({isoDate}) => state.completed.includes(isoDate)).length;
  $('dayProgress').textContent = `${completedCount} ${tr('of 9 completed')}`;
  $('novenaScheduleStatus').hidden = available;
  $('novenaDayContent').hidden = !available;

  if (available) {
    const day = novena[state.day];
    const selectedDate = novenaSchedule[state.day];
    const [theme, reflection, prayer] = prayerLocale()?.novena[state.day] ?? [day.theme, day.reflection, day.prayer];
    $('dayTitle').textContent = `${dayLabel} ${state.day + 1} — ${formatter.format(selectedDate.opensAt)} · ${theme}`;
    $('bookletPetitionTitle').textContent = tr('Day {day} Petition').replace('{day}', state.day + 1);
    $('bookletPetition').replaceChildren(...bookletPetitions[state.day].map(text => {
      const paragraph = document.createElement('p');
      paragraph.textContent = tr(text);
      return paragraph;
    }));
    $('dayScripture').textContent = `${isCebuano() ? 'Balaang Kasulatan' : 'Scripture'}: ${scriptureLabel(day.ref)} ↗`;
    $('dayReflection').textContent = reflection;
    $('dayPrayer').textContent = prayer;
    $('completeDay').textContent = state.completed.includes(selectedDate.isoDate) ? tr('✓ Day completed') : tr('Mark day complete');
  }

  $('completeDay').disabled = !available;
  $('prevDay').disabled = !available || !isNovenaDayUnlocked(state.day - 1, now);
  $('nextDay').disabled = !available || !isNovenaDayUnlocked(state.day + 1, now);
  $('dayGrid').innerHTML = novenaSchedule.map(({isoDate, opensAt}, index) => {
    const unlocked = isNovenaDayUnlocked(index, now);
    const selected = available && index === state.day;
    const completed = state.completed.includes(isoDate);
    return `<button type="button" data-day="${index}" class="${selected ? 'selected ' : ''}${completed ? 'completed' : ''}" aria-pressed="${selected}" ${unlocked ? '' : 'disabled'}><span>${dayLabel} ${index + 1}</span><time datetime="${isoDate}">${shortDate.format(opensAt)}</time></button>`;
  }).join('');
}

function selectNovenaDay(day) {
  const now = Date.now();
  if (!canUseApp() || !isNovenaDayUnlocked(day, now)) return;
  if (day === state.day) return;
  if (!hasNovenaDayStarted(day, now)) {
    const formatter = novenaDateFormatter({month: 'long', day: 'numeric', year: 'numeric'});
    const date = formatter.format(novenaSchedule[day].opensAt);
    const message = tr('Day {day} is scheduled for {date} (Cebu time). Do you want to open it early?');
    if (!confirm(message.replace('{day}', day + 1).replace('{date}', date))) return;
  }
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
  if (!state.completed.includes(novenaSchedule[state.day].isoDate)) {
    state.completed.push(novenaSchedule[state.day].isoDate);
    saveAccountData('completed', state.completed);
    toast('Novena day completed');
    syncCloud('completed');
  }
  renderNovena();
};

function displayPrayer(key){currentPrayer=key;$('extraPrayer').textContent=prayerLocale()?.prayers[key] ?? prayers[key];document.querySelectorAll('[data-prayer]').forEach(e=>e.classList.toggle('selected',e.dataset.prayer===key))}document.querySelectorAll('[data-prayer]').forEach(e=>e.onclick=()=>displayPrayer(e.dataset.prayer));
// One immutable timestamp per offering is the source of truth. The GIF supplies
// only flame flicker; the wax level is derived from wall-clock time (not frame rate).
const CANDLE_LIFETIME_MS=7*60*60*1000;
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
function candleVisual() {
  return `<div class="photo-candle" role="img" aria-label="${html(tr('Flickering devotional candle'))}">
      <div class="photo-candle-glow" aria-hidden="true"></div>
      <img class="photo-candle-wax" src="assets/candle-wax.png" alt="" draggable="false">
      <img class="photo-candle-flame" src="assets/candle-flame.gif" alt="" draggable="false">
    </div>`;
}
function candleMarkup(c){
  const started=Date.parse(c.created_at);
  return `<div class="candle-item" data-started="${started}" title="${html(tr(c.type))}">
    ${candleVisual()}
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
  renderSanctuaryOfferings();
  updateCandleClock();
}
function renderCandles(){renderCandleCollection('main')}
function renderNovenaCandles(){renderCandleCollection('novena')}
function updateCandleClock(){
  const now=Date.now();
  let sanctuaryChanged = false;
  for(const kind of ['main','novena']){
    const key=kind==='novena'?'novenaCandles':'candles';
    const grid=kind==='novena'?'novenaCandleGrid':'candleGrid';
    let expired=false;
    $(grid).querySelectorAll('.candle-item[data-started]').forEach(el=>{
      const started=Number(el.dataset.started);
      const remaining=Number.isFinite(started)?Math.max(0,CANDLE_LIFETIME_MS-(now-started)):0;
      if(remaining<=0){expired=true;return;}
      const fraction = updateCandleWax(el.querySelector('.photo-candle'), remaining);
      el.querySelector('.remaining').textContent=candleTimeLabel(remaining);
      el.querySelector('.photo-candle').setAttribute('aria-label',`${tr('Flickering devotional candle')} · ${Math.round(fraction*100)}% ${isCebuano() ? 'ang nahibilin' : 'remaining'}`);
    });
    if(expired){
      sanctuaryChanged = true;
      state[key]=state[key].filter(c=>candleRemaining(c.created_at,now)>0);
      saveAccountData(key,state[key]);
      $(grid).innerHTML=state[key].map(candleMarkup).join('');
      $(kind==='novena'?'novenaCandleEmpty':'candleEmpty').hidden=!!state[key].length;
    }
  }
  if (sanctuaryChanged) renderSanctuaryOfferings();
  updateSanctuaryOfferings(now);
}
function updateCandleWax(candle, remaining) {
  const fraction = remaining / CANDLE_LIFETIME_MS;
  const height = CANDLE_WAX_END_HEIGHT + (CANDLE_WAX_FULL_HEIGHT - CANDLE_WAX_END_HEIGHT) * fraction;
  candle.style.setProperty('--wax-height', `${height.toFixed(3)}px`);
  return fraction;
}

const FLOWER_WILT_MS = 7 * 60 * 60 * 1000;
function bouquetVisual(flower) {
  return `<img data-bouquet-started="${Date.parse(flower.created_at)}" src="assets/novena-rose-bouquet.png" alt="${html(tr('Bouquet of red roses offered in prayer'))}" loading="lazy">`;
}
function renderSanctuaryOfferings() {
  const tray = $('sanctuaryOfferings');
  const now = Date.now();
  const candles = [...state.candles, ...state.novenaCandles]
    .filter(candle => candleRemaining(candle.created_at, now) > 0);
  tray.innerHTML = candles.map(candle => `<div class="mini-candle" data-started="${Date.parse(candle.created_at)}">${candleVisual()}</div>`).join('')
    + state.novenaFlowers.map(flower => `<div class="mini-bouquet">${bouquetVisual(flower)}</div>`).join('');
  updateSanctuaryOfferings(now);
}
function updateSanctuaryOfferings(now) {
  const tray = $('sanctuaryOfferings');
  for (const candle of tray.querySelectorAll('.mini-candle')) {
    const remaining = Math.max(0, CANDLE_LIFETIME_MS - (now - Number(candle.dataset.started)));
    updateCandleWax(candle.firstElementChild, remaining);
  }
  for (const bouquet of document.querySelectorAll('[data-bouquet-started]')) {
    const started = Number(bouquet.dataset.bouquetStarted);
    const wilt = Number.isFinite(started) ? Math.max(0, Math.min(1, (now - started) / FLOWER_WILT_MS)) : 0;
    if (wilt >= 1) {
      bouquet.closest('.mini-bouquet, .flower-offering').remove();
    } else {
      bouquet.style.setProperty('--wilt', wilt.toFixed(4));
    }
  }
  $('sanctuaryOfferingPanel').hidden = !tray.childElementCount;
  $('flowerEmpty').hidden = Boolean($('flowerGrid').childElementCount);
  $('novenaFlowerEmpty').hidden = Boolean($('novenaFlowerGrid').childElementCount);
}
function uid(){return globalThis.crypto?.randomUUID?.()||`${Date.now()}-${Math.random().toString(36).slice(2)}`}
// Main and novena bouquets share storage but appear in their own displays.
function flowerOfferings(novena) {
  return state.novenaFlowers.filter(flower => (flower.offering_kind === 'novena-flowers' || Number.isInteger(flower.novena_day)) === novena);
}
function renderFlowers() {
  for (const [novena, grid] of [
    [false, 'flowerGrid'],
    [true, 'novenaFlowerGrid']
  ]) {
    const flowers = flowerOfferings(novena);
    $(grid).innerHTML = flowers.map(flower => `<article class="flower-offering">
      ${bouquetVisual(flower)}
      ${Number.isInteger(flower.novena_day) ? `<div class="novena-day-tag">${isCebuano() ? 'Adlaw sa Nobena' : 'Novena Day'} ${flower.novena_day + 1}</div>` : ''}
      ${flower.type && !novena ? `<div class="novena-day-tag">${html(tr(flower.type))}</div>` : ''}
      ${offeringNote(flower) ? `<p class="flower-intention">${html(offeringNote(flower))}</p>` : ''}
      <time datetime="${html(flower.created_at)}">${html(devotionalDate(flower.created_at))}</time>
    </article>`).join('');
  }
  renderSanctuaryOfferings();
}
function renderIntentions(){$('intentionEmpty').hidden=!!state.intentions.length;$('intentionList').innerHTML=state.intentions.map(x=>`<article class="journal-entry"><h4>${html(x.title)}</h4><time>${html(devotionalDate(x.created_at))}</time><p>${html(x.body)}</p><button type="button" data-delete="${html(x.id)}">${tr('Delete intention')}</button></article>`).join('')}$('intentionForm').onsubmit=async e=>{e.preventDefault();if(!canUseApp())return;const title=$('intentionName').value.trim(),body=$('intentionBody').value.trim();if(!title||!body)return;state.intentions.unshift({id:uid(),title,body,created_at:new Date().toISOString()});saveAccountData('intentions',state.intentions);renderIntentions();e.target.reset();toast('Private intention saved');await syncCloud('intentions')};$('intentionList').addEventListener('click',async e=>{const b=e.target.closest('[data-delete]');if(!b||!confirm(tr('Delete this prayer intention permanently?')))return;state.intentions=state.intentions.filter(x=>x.id!==b.dataset.delete);saveAccountData('intentions',state.intentions);renderIntentions();await syncCloud('intentions');toast('Intention deleted')});
function renderMeditation(){const m=meditations[state.meditation];$('scriptureCount').textContent=`${isCebuano()?'Pamalandong':'Meditation'} ${state.meditation+1} ${isCebuano()?'sa':'of'} ${meditations.length}`;$('scriptureRef').textContent=scriptureLabel(m[0])+' ↗';$('scriptureTheme').textContent=isCebuano()?cebuano.meditations[state.meditation][0]:m[1];$('scriptureReflection').textContent=isCebuano()?cebuano.meditations[state.meditation][1]:m[2]}$('prevMeditation').onclick=()=>{state.meditation=(state.meditation+meditations.length-1)%meditations.length;renderMeditation()};$('nextMeditation').onclick=()=>{state.meditation=(state.meditation+1)%meditations.length;renderMeditation()};
function exportData(){if(!canUseApp())return;const payload={exported_at:new Date().toISOString(),format:'stonino-v1',candles:state.candles,novenaCandles:state.novenaCandles,novenaFlowers:state.novenaFlowers,intentions:state.intentions,completed:state.completed};const a=document.createElement('a');const u=URL.createObjectURL(new Blob([JSON.stringify(payload,null,2)],{type:'application/json'}));a.href=u;a.download='sto-nino-private-data.json';a.click();setTimeout(()=>URL.revokeObjectURL(u),5000)}$('exportData').onclick=exportData;
let registering = false;
const registrationPreference = prefix + 'openRegistration';
function setPasswordVisibility(visible) {
  $('password').type = visible ? 'text' : 'password';
  $('togglePassword').setAttribute('aria-label', tr(visible ? 'Hide password' : 'Show password'));
}
$('togglePassword').onclick = () => setPasswordVisibility($('password').type === 'password');
$('accountDialog').addEventListener('close', () => setPasswordVisibility(false));

function setRegistrationMode(enabled) {
  setPasswordVisibility(false);
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
  $('togglePassword').setAttribute('aria-label', tr($('password').type === 'text' ? 'Hide password' : 'Show password'));
  const name = displayName();
  const unlocked = canUseApp();
  const signedIn = Boolean(state.user);
  for (const id of ['devotionalContent', 'devotionalMobileNav']) {
    $(id).hidden = $(id).inert = !unlocked;
  }
  if (!unlocked) $('musicPlayer').pause();
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
function showPaymentReviewEntry(show) {
  document.querySelectorAll('[data-payment-review-entry]').forEach(button => { button.hidden = !show; });
}
let paymentAdmin = false;
async function setAccountUser(user) {
  const changed = state.user?.id !== user?.id;
  const revision = ++authRevision;
  state.user = user?.is_anonymous ? null : user;
  if (changed) {
    paymentAdmin = false;
    showPaymentAwaitingNotice(false);
    $('adminMembersList').replaceChildren();
    $('adminMembersStatus').textContent = '';
    $('previousAdminMembers').hidden = $('nextAdminMembers').hidden = true;
    showPaymentReviewEntry(false);
    $('paymentReviewList').replaceChildren();
    $('paymentReviewStatus').textContent = '';
    $('paymentConfirmedNotice').textContent = '';
    $('paymentConfirmedNotice').hidden = true;
    showPaymentDeclineNotices([]);
    $('nextPaymentReview').hidden = true;
    for (const page of ['paymentReview', 'memberList']) {
      if ($(page).classList.contains('active')) {
        $(page).classList.remove('active');
        $('sanctuary').classList.add('active');
        $('prayerPackBar').hidden = false;
      }
    }
    packBalance = null;
    clearPrayerPackQr();
    $('prayerPackPersonalQr').hidden = true;
    $('prayerPackTransfer').hidden = true;
    $('prayerPackTransfer').reset();
    $('prayerPackSelection').hidden = true;
    packBusy = false;
    packAvailable = false;
    packMessage = '';
    packRevision++;
    renderPrayerPacks();
    for (const key of devotionalKeys) {
      const saved = readAccountData(key, []);
      state[key] = key === 'completed' ? normalizeCompleted(saved) : Array.isArray(saved) ? saved : [];
    }
    state.day = null;
    $('accountDisplayName').value = displayName();
    for (const id of ['scriptureDialog', 'prayerPackInstructions']) {
      if ($(id).open) $(id).close();
    }
    for (const id of ['candleForm', 'novenaCandleForm', 'flowerForm', 'novenaFlowerForm', 'intentionForm']) $(id).reset();
  }
  authStatus = 'ready';
  language();
  if (changed && state.user) {
    void refreshPrayerPacks();
    await loadCloud();
  }
  if (revision !== authRevision) return;
  if (canUseApp() && state.user?.email?.toLowerCase() === 'leuneib01@gmail.com') {
    const paymentAdminWasVisible = paymentAdmin;
    // The email only controls navigation. The server authorizes every review request.
    paymentAdmin = true;
    showPaymentReviewEntry(true);
    void refreshPaymentAwaitingNotice();
    if (changed || !paymentAdminWasVisible) {
      nav('sanctuary');
      return;
    }
  } else {
    paymentAdmin = false;
    showPaymentReviewEntry(false);
  }
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
const cloudColumns = { intentions: 'intentions', completed: 'completed' };
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
    state.completed = [...new Set([...state.completed, ...normalizeCompleted(data.completed)])];
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
  if (!state.user || !state.supabase || deletingDevotionalData) return;
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

async function deleteAllOfferings() {
  if (!canUseApp() || deletingDevotionalData || clearingOfferings || spendingCredit || packBusy) return;
  if (!confirm(tr('Permanently delete all your candles and flowers, including novena offerings? Used credits will stay spent.'))) return;

  const userId = state.user.id;
  const buttons = [$('deleteOfferings'), $('deleteSanctuaryOfferings')];
  clearingOfferings = true;
  for (const button of buttons) button.disabled = true;
  offeringRevision++;
  try {
    await Promise.allSettled(activeDevotionalSaves);
    if (state.user?.id !== userId) return;
    const { error } = await state.supabase.rpc('stonino_clear_offerings');
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
    clearingOfferings = false;
    for (const button of buttons) button.disabled = false;
  }
}
$('deleteOfferings').onclick = deleteAllOfferings;
$('deleteSanctuaryOfferings').onclick = deleteAllOfferings;
async function accountAction(mode){if(authStatus!=='ready'||!state.supabase)return;const email=$('email').value.trim(),password=$('password').value;if(!email||!password){toast('Enter your email and password');return}const name = $('displayName').value.trim();
if (mode === 'signUp' && (!name || name.length > 80)) {
  toast('Enter your name using up to 80 characters.');
  $('displayName').focus();
  return;
}
try{const r=mode==='signUp'?await state.supabase.auth.signUp({email,password,options:{data:{stonino_display_name:name}}}):await state.supabase.auth.signInWithPassword({email,password});if(r.error)throw r.error;localStorage.removeItem(registrationPreference);if(r.data?.user&&r.data?.session)await setAccountUser(r.data.user);accountView();toast(mode==='signUp'?'Account request submitted. Confirm email if required.':'Signed in');if(state.user)$('accountDialog').close()}catch(e){toast(localizedError(e,'Unable to authenticate'))}}$('signIn').onclick=()=>accountAction('signIn');$('signUp').onclick=()=>{if(registering)return accountAction('signUp');setRegistrationMode(true);$('displayName').focus()};$('resetPassword').onclick=async()=>{const email=$('email').value.trim();if(!email||!state.supabase)return toast('Configure cloud access and enter your email');try{const {error}=await state.supabase.auth.resetPasswordForEmail(email,{redirectTo:location.origin+location.pathname});if(error)throw error;toast('If the address is registered, a reset email will be sent.')}catch(e){toast(localizedError(e,'Unable to complete the request. Please try again.'))}};$('signOut').onclick=async()=>{const {error}=await state.supabase.auth.signOut({scope:'local'});if(error)return toast(localizedError(error,'Unable to complete the request. Please try again.'));await setAccountUser(null);$('accountDialog').close();toast('Signed out')};$('deleteAccount').onclick = async () => {
  if (!state.user || !state.supabase || deletingDevotionalData || clearingOfferings || spendingCredit || packBusy) return;
  if (!confirm(tr('Delete your Sto. Niño Devotional profile, devotional data and unused credits, and sign out of this app? Your CrownMind login and access to other apps will be preserved.'))) return;

  const userId = state.user.id;
  const button = $('deleteAccount');
  deletingDevotionalData = button.disabled = true;
  try {
    await Promise.all(activeDevotionalSaves);
    if (state.user?.id !== userId) throw Error('Please sign in again.');
    const { error } = await state.supabase.rpc('stonino_delete_devotional_profile');
    if (error) throw error;

    state.day = null;
    for (const key of ['earlyNovenaYear', 'selectedDay', packOrderKey, 'pendingOffering.candle', 'pendingOffering.flowers', 'pendingOffering.novena-candle', 'pendingOffering.novena-flowers']) {
      localStorage.removeItem(prefix + accountKey(key));
    }
    for (const key of ['candles', 'novenaCandles', 'novenaFlowers', 'intentions', 'completed']) {
      state[key] = [];
      localStorage.removeItem(prefix + accountKey(key));
    }
    renderCandles();
    renderNovenaCandles();
    renderFlowers();
    renderIntentions();
    renderNovena();
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

let packBalance = null;
let packAvailable = false;
let packBusy = false;
let packMessage = '';
let packRevision = 0;
const packEndpoint = '/.netlify/functions/prayer-packs';
const packButtons = [...document.querySelectorAll('[data-prayer-pack]')];
const packOrderKey = 'pendingPrayerPack';
const paymentDeclineMessage = 'Payment Transaction Reference Does Not Match';
const packReturnOrder = new URL(location.href).searchParams.get('prayerPackOrder');
let returnOrderChecked = false;
let packRefreshTimer;
let packQrExpiry = 0;

function clearPrayerPackQr() {
  clearTimeout(packRefreshTimer);
  packQrExpiry = 0;
  $('prayerPackQr').hidden = true;
  $('prayerPackQrImage').removeAttribute('src');
  $('prayerPackQrDownload').removeAttribute('href');
  $('prayerPackHosted').removeAttribute('href');
}

function watchPrayerPackQr() {
  clearTimeout(packRefreshTimer);
  if (!packQrExpiry) return;
  if (Date.now() >= packQrExpiry) {
    clearPrayerPackQr();
    packMessage = 'The QR code expired. Check the payment status before trying again.';
    renderPrayerPacks();
    return;
  }
  packRefreshTimer = setTimeout(() => {
    if (document.hidden || location.hash !== '#prayerPacks') watchPrayerPackQr();
    else void refreshPrayerPacks();
  }, Math.min(8000, packQrExpiry - Date.now()));
}

function showPaymentDeclineNotices(notices) {
  const list = $('paymentDeclineNotices');
  const existing = new Map([...list.children].map(card => [card.dataset.orderId, card]));
  list.hidden = notices.length === 0;
  list.replaceChildren(...notices.map(notice => {
    if (existing.has(notice.orderId)) return existing.get(notice.orderId);
    const card = $('paymentDeclineTemplate').content.firstElementChild.cloneNode(true);
    card.dataset.orderId = notice.orderId;
    card.querySelector('[data-decline-reference]').textContent = `Reference ${notice.reference} · ₱${notice.credits} Prayer Pack`;
    const form = card.querySelector('form');
    const input = form.elements.reference;
    card.querySelector('[data-correct-reference]').onclick = () => {
      form.hidden = false;
      input.focus();
    };
    card.querySelector('[data-cancel-reference]').onclick = () => {
      void resolvePaymentReference(card, 'cancel-reference');
    };
    form.onsubmit = event => {
      event.preventDefault();
      void resolvePaymentReference(card, 'correct-reference', input.value.trim());
    };
    return card;
  }));
}

function clearPrayerPackCheckout() {
  saveAccountData(packOrderKey, null);
  clearPrayerPackQr();
  $('prayerPackTransfer').hidden = true;
  $('prayerPackTransfer').reset();
  $('prayerPackTransfer').dataset.ready = 'false';
  $('prayerPackSelection').hidden = true;
  $('prayerPackPersonalQr').hidden = true;
  returnOrderChecked = true;
  const url = new URL(location.href);
  if (url.searchParams.has('prayerPackOrder')) {
    url.searchParams.delete('prayerPackOrder');
    history.replaceState(null, '', url);
  }
}

async function cancelPrayerPack() {
  const pending = readAccountData(packOrderKey, null);
  if (!canUseApp() || !pending?.orderId || pending.status === 'review' || packBusy || deletingDevotionalData) return;
  if (!confirm('Cancel this Prayer Pack selection? If you already sent a GCash payment, keep this selection so you can finish the payment process.')) return;
  const userId = state.user.id;
  packBusy = true;
  packMessage = 'Cancelling your Prayer Pack selection…';
  renderPrayerPacks();
  try {
    const result = await packRequest('cancel-checkout', { orderId: pending.orderId });
    if (state.user?.id !== userId) return;
    if (!['cancelled', 'left'].includes(result.status)) throw Error('Could not cancel the selection. Check your payment status.');
    clearPrayerPackCheckout();
    packMessage = result.status === 'left'
      ? 'Selection cleared. The previous QR may still be active with GCash. Choose another Prayer Pack.'
      : 'Selection cancelled. Choose another Prayer Pack.';
  } catch (error) {
    if (state.user?.id === userId) packMessage = error.message || 'Could not cancel the selection. Please try again.';
  } finally {
    if (state.user?.id === userId) {
      packBusy = false;
      renderPrayerPacks();
      if (!readAccountData(packOrderKey, null)) packButtons[0]?.focus();
      watchPrayerPackQr();
    }
  }
}

async function resolvePaymentReference(card, action, reference) {
  if (!canUseApp() || packBusy || deletingDevotionalData) return;
  const userId = state.user.id;
  const orderId = card.dataset.orderId;
  const status = card.querySelector('[data-decline-status]');
  const correcting = action === 'correct-reference';
  packBusy = true;
  status.textContent = correcting ? 'Submitting corrected reference…' : 'Cancelling claim…';
  renderPrayerPacks();
  try {
    const result = await packRequest(action, { orderId, reference });
    if (state.user?.id !== userId) return;
    if (result.status !== (correcting ? 'review' : 'cancelled')) throw Error('Could not verify the change. Please try again.');
    if (readAccountData(packOrderKey, null)?.orderId === orderId) clearPrayerPackCheckout();
    card.remove();
    $('paymentDeclineNotices').hidden = !$('paymentDeclineNotices').childElementCount;
    packMessage = correcting ? 'Corrected reference submitted for admin review.' : '';
    $('prayerPackStatus').tabIndex = -1;
    $('prayerPackStatus').focus();
  } catch (error) {
    if (state.user?.id === userId) status.textContent = error.message || 'Could not update the reference. Please try again.';
  } finally {
    if (state.user?.id === userId) {
      packBusy = false;
      renderPrayerPacks();
    }
  }
}

function renderPrayerPacks() {
  $('prayerPackBadge').textContent = packBalance === null ? 'View balance' : `${packBalance} credit${packBalance === 1 ? '' : 's'}`;
  $('prayerPackBalance').textContent = `Remaining Balance ${packBalance ?? 0}`;
  const pending = readAccountData(packOrderKey, null);
  $('prayerPackStatus').textContent = packMessage || (pending ? 'You have a checkout in progress.' : 'Choose a Prayer Pack.');
  const canResume = Boolean(pending?.credits) && pending.status !== 'review';
  $('continuePrayerPack').hidden = !canResume;
  $('continuePrayerPack').disabled = deletingDevotionalData;
  $('cancelPrayerPack').hidden = !canResume;
  $('cancelPrayerPack').disabled = packBusy || deletingDevotionalData;
  $('refreshPrayerPacks').disabled = packBusy;
  $('submitPrayerPackReference').disabled = packBusy || $('prayerPackTransfer').dataset.ready !== 'true';
  $('deleteAccount').disabled = packBusy || deletingDevotionalData;
  $('deleteAccount').title = packBusy ? 'Checking Prayer Packs…' : '';
  for (const control of $('paymentDeclineNotices').querySelectorAll('button, input')) {
    control.disabled = packBusy || deletingDevotionalData;
  }
  for (const button of packButtons) button.disabled = packBusy || Boolean(pending);
}

async function packRequest(action, body) {
  const userId = state.user?.id;
  const { data } = await state.supabase.auth.getSession();
  if (data.session?.user.id !== userId || state.user?.id !== userId) throw Error('Please sign in again.');
  const response = await fetch(`${packEndpoint}?action=${action}`, {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + data.session.access_token, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(20000)
  });
  const result = await response.json().catch(() => null);
  if (!result) throw Error(action.startsWith('admin-')
    ? 'Payment Review could not reach the server. Open the deployed Netlify app and try again.'
    : 'Checkout could not reach the server. Please try again.');
  if (!response.ok) throw Object.assign(Error(result.error || 'Checkout is unavailable.'), { status: response.status });
  return result;
}

let paymentReviewRevision = 0;
let paymentReviewOffset = 0;
let paymentReviewSnapshot = '';
let paymentReviewLoading = false;
async function loadPaymentReview(offset = 0, background = false) {
  if (!paymentAdmin) return;
  const userId = state.user.id;
  const list = $('paymentReviewList');
  if (background && (paymentReviewLoading || list.contains(document.activeElement) ||
      list.querySelector('button:disabled'))) return;
  const revision = ++paymentReviewRevision;
  const current = () => state.user?.id === userId && paymentReviewRevision === revision && paymentAdmin;
  const status = $('paymentReviewStatus');
  const next = $('nextPaymentReview');
  paymentReviewLoading = true;
  if (!background) {
    list.replaceChildren();
    next.hidden = true;
    status.textContent = 'Loading payments…';
  }
  try {
    const result = await packRequest('admin-list', { offset });
    if (!current()) return;
    const snapshot = JSON.stringify(result);
    if (background && snapshot === paymentReviewSnapshot) return;
    paymentReviewSnapshot = snapshot;
    list.replaceChildren();
    paymentReviewOffset = offset;
    status.textContent = result.payments.length ? '' : 'No payment references are awaiting review.';
    next.hidden = !result.more;
    for (const payment of result.payments) {
      const item = document.createElement('article');
      item.className = 'panel';
      const heading = document.createElement('h3');
      heading.textContent = payment.email;
      const details = document.createElement('p');
      const date = new Date(payment.submitted_at).toLocaleString('en-PH', { timeZone: 'Asia/Manila' });
      details.textContent = `${date} (Philippine time) · ₱${payment.credits} · Reference ${payment.payment_reference}`;
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'btn gold';
      button.textContent = 'Confirm payment';
      const decline = document.createElement('button');
      decline.type = 'button';
      decline.className = 'btn outline';
      decline.textContent = 'Decline';
      const actions = document.createElement('div');
      actions.className = 'button-row';
      actions.append(button, decline);
      const review = async (isDecline) => {
        if (state.user?.id !== userId || !paymentAdmin || !list.contains(item) || button.disabled || decline.disabled) return;
        const prompt = isDecline
          ? `Decline payment reference ${payment.payment_reference}? The member will see “${paymentDeclineMessage}” on their Payment page.`
          : `Confirm that you received ₱${payment.credits} in GCash with reference ${payment.payment_reference}?`;
        if (!confirm(prompt)) return;
        const notice = $('paymentConfirmedNotice');
        notice.hidden = true;
        button.disabled = decline.disabled = true;
        try {
          const result = isDecline
            ? await packRequest('admin-decline', { orderId: payment.id })
            : await packRequest('admin-confirm', { orderId: payment.id, verifiedCentavos: payment.credits * 100 });
          if (result.status !== (isDecline ? 'declined' : 'paid')) throw Error('Could not verify the review outcome.');
          if (state.user?.id === userId && paymentAdmin) {
            notice.classList.toggle('payment-review-declined', isDecline);
            notice.textContent = isDecline
              ? `Payment declined · Reference ${payment.payment_reference}. No module points were credited. The notice is available on the member’s Payment page.`
              : `✓ Payment confirmed · ₱${payment.credits} · Reference ${payment.payment_reference}. Credits added.`;
            notice.hidden = false;
            void refreshPaymentAwaitingNotice();
            if (location.hash === '#paymentReview') await loadPaymentReview();
          }
        } catch (error) {
          if (state.user?.id === userId && paymentAdmin && list.contains(item)) status.textContent = error.message;
        } finally {
          button.disabled = decline.disabled = false;
        }
      };
      button.onclick = () => void review(false);
      decline.onclick = () => void review(true);
      item.append(heading, details, actions);
      list.append(item);
    }
  } catch (error) {
    if (!background && current()) status.textContent = location.protocol === 'file:'
      ? 'Open the deployed Netlify app to load and confirm payments.'
      : error.message;
  } finally {
    if (revision === paymentReviewRevision) paymentReviewLoading = false;
  }
}
$('refreshPaymentReview').onclick = () => void loadPaymentReview();
$('nextPaymentReview').onclick = () => void loadPaymentReview(paymentReviewOffset + 50);
let memberRequest = 0;
let memberOffset = 0;
async function loadAdminMembers(offset = 0) {
  if (!paymentAdmin) return;
  const userId = state.user.id;
  const request = ++memberRequest;
  const current = () => paymentAdmin && state.user?.id === userId && request === memberRequest;
  const list = $('adminMembersList');
  const status = $('adminMembersStatus');
  const previous = $('previousAdminMembers');
  const next = $('nextAdminMembers');
  status.textContent = 'Loading members…';
  previous.hidden = next.hidden = true;
  try {
    const result = await packRequest('admin-members', { offset });
    if (!current()) return;
    memberOffset = offset;
    list.replaceChildren();
    for (const member of result.members) {
      const entry = document.createElement('li');
      const date = new Date(member.enrolled_at).toLocaleDateString('en-PH', { timeZone: 'Asia/Manila' });
      entry.textContent = `${member.email} · Enrolled ${date}`;
      list.append(entry);
    }
    status.textContent = result.members.length ? '' : 'No members found.';
    previous.hidden = offset === 0;
    next.hidden = !result.more;
  } catch (error) {
    if (current()) status.textContent = error.status === 401 || error.status === 403
      ? error.message
      : 'Could not load the Member List. Please try again.';
  }
}
$('refreshAdminMembers').onclick = () => void loadAdminMembers();
$('previousAdminMembers').onclick = () => void loadAdminMembers(Math.max(0, memberOffset - 50));
$('nextAdminMembers').onclick = () => void loadAdminMembers(memberOffset + 50);

function showPaymentAwaitingNotice(awaiting) {
  const button = $('paymentAwaitingNotice');
  if (button.hidden === !awaiting) return;
  button.hidden = !awaiting;
  $('paymentAwaitingStatus').textContent = awaiting ? button.textContent : '';
}

let awaitingRequest = 0;
async function refreshPaymentAwaitingNotice() {
  if (!paymentAdmin || document.hidden) return;
  const userId = state.user.id;
  const request = ++awaitingRequest;
  try {
    const result = await packRequest('admin-awaiting', {});
    if (paymentAdmin && state.user?.id === userId && request === awaitingRequest) {
      showPaymentAwaitingNotice(result.awaiting === true);
    }
  } catch {
    // Keep the last verified state until the next refresh.
  }
}
setInterval(refreshPaymentAwaitingNotice, 10000);

function refreshVisiblePaymentReview() {
  if (!document.hidden && location.hash === '#paymentReview' && paymentReviewOffset === 0) {
    void loadPaymentReview(0, true);
  }
}
setInterval(refreshVisiblePaymentReview, 10000);

async function readPrayerBalance() {
  const userId = state.user?.id;
  const revision = ++packRevision;
  if (!userId) return;
  try {
    const { data, error } = await state.supabase.from('stonino_prayer_wallets')
      .select('balance').eq('user_id', userId).maybeSingle();
    if (error) throw error;
    if (state.user?.id === userId && revision === packRevision) packBalance = data?.balance ?? 0;
  } catch {
    // Keep the last confirmed balance when a refresh fails.
  }
  if (state.user?.id === userId && revision === packRevision) renderPrayerPacks();
}

async function refreshPrayerPacks() {
  const userId = state.user?.id;
  if (!userId || packBusy || deletingDevotionalData) return;
  packBusy = true;
  packMessage = 'Checking your balance and checkout…';
  renderPrayerPacks();
  try {
    const readiness = await fetch(packEndpoint + '?action=ready', { cache: 'no-store', signal: AbortSignal.timeout(6000) })
      .then(response => response.ok ? response.json() : null).catch(() => null);
    const notice = await packRequest('decline-notice', {}).catch(() => null);
    if (state.user?.id !== userId) return;
    if (Array.isArray(notice?.notices)) showPaymentDeclineNotices(notice.notices);
    else if (!notice) packMessage = 'Could not check declined payment references. Refresh to try again.';
    packAvailable = readiness?.available === true;
    const pending = readAccountData(packOrderKey, null);
    const returnOrder = !returnOrderChecked && packAvailable ? packReturnOrder : null;
    const orderId = returnOrder || pending?.orderId;
    if (notice) packMessage = '';
    if (orderId) {
      if (returnOrder && !pending) saveAccountData(packOrderKey, { orderId });
      const result = await packRequest('status', { orderId });
      if (state.user?.id !== userId) return;
      returnOrderChecked = true;
      if (['paid', 'expired', 'declined', 'resolved', 'cancelled'].includes(result.status)) {
        if (!pending || pending.orderId === orderId) {
          clearPrayerPackCheckout();
        }
        packMessage = {
          paid: 'Payment confirmed. Your credits are ready.',
          expired: 'Checkout expired. Choose a pack to try again.',
          declined: notice?.reference ? '' : paymentDeclineMessage,
          resolved: '',
          cancelled: 'Selection cancelled. Choose another Prayer Pack.'
        }[result.status];
      } else {
        if (result.status === 'review') {
          if (pending?.orderId === orderId) saveAccountData(packOrderKey, { ...pending, status: 'review' });
          $('prayerPackTransfer').hidden = true;
          $('prayerPackPersonalQr').hidden = true;
        }
        packMessage = result.status === 'review' ? 'Payment reference submitted. Your GCash payment is awaiting admin review.' : 'Waiting for payment confirmation.';
      }
    }
  } catch (error) {
    if (state.user?.id === userId) {
      if (error.status === 404) {
        const pending = readAccountData(packOrderKey, null);
        returnOrderChecked = true;
        if (!pending?.credits) saveAccountData(packOrderKey, null);
      }
      packMessage = error.message || 'Could not check checkout.';
    }
  } finally {
    if (state.user?.id === userId) {
      await readPrayerBalance();
      if (state.user?.id === userId) {
        packBusy = false;
        renderPrayerPacks();
        watchPrayerPackQr();
      }
    }
  }
}

function showPersonalPackQr(credits) {
  const panel = $('prayerPackPersonalQr');
  const qr = config.prayerPackReceiveQr[credits] ?? config.prayerPackOpenAmountQr;
  panel.hidden = !qr;
  if (panel.hidden) return;

  const amount = '₱' + credits;
  const image = $('prayerPackPersonalQrImage');
  image.alt = amount + ' Prayer Pack GCash payment QR';
  image.src = qr.image;
  $('prayerPackPersonalQrAmount').textContent = qr.amountEncoded
    ? `Confirm the recipient and the ${amount} amount in GCash before sending.`
    : `Enter ${amount} in GCash and confirm the recipient before sending.`;
  const download = $('prayerPackPersonalQrDownload');
  download.href = qr.image;
  download.download = qr.image.split('/').at(-1);
}

async function startPrayerPack(credits) {
  if (!canUseApp() || packBusy || deletingDevotionalData) return;
  const userId = state.user.id;
  const savedOrder = readAccountData(packOrderKey, null);
  const selectedCredits = savedOrder?.credits ?? credits;
  if (!selectedCredits || savedOrder?.status === 'review') return;
  const pack = packButtons.find(button => Number(button.dataset.prayerPack) === selectedCredits);
  const price = pack ? `$${pack.dataset.priceUsd} USD` : `₱${selectedCredits}`;
  $('prayerPackSelectionTitle').textContent = `${price} · ${selectedCredits} credits`;
  $('prayerPackSelection').hidden = false;
  $('prayerPackTransfer').dataset.ready = 'false';
  $('submitPrayerPackReference').disabled = true;
  $('prayerPackTransfer').hidden = true;
  $('prayerPackPersonalQr').hidden = true;
  if (!packAvailable) {
    await refreshPrayerPacks();
    if (state.user?.id !== userId) return;
    if (!packAvailable) {
      packMessage = 'Open the deployed app to place your order and submit the payment reference.';
      renderPrayerPacks();
      return;
    }
  }
  const pending = readAccountData(packOrderKey, null) || { orderId: crypto.randomUUID(), credits: selectedCredits };
  saveAccountData(packOrderKey, pending);
  packBusy = true;
  packMessage = 'Preparing your GCash payment…';
  renderPrayerPacks();
  try {
    const result = await packRequest('checkout', pending);
    if (state.user?.id !== userId) return;
    if (result.paymentMethod === 'gcash-qr' || result.receivingNumber) {
      clearPrayerPackQr();
      showPersonalPackQr(result.credits);
      $('prayerPackTransfer').dataset.ready = 'true';
      $('prayerPackTransfer').hidden = false;
      packMessage = 'Your payment instructions are ready.';
      return;
    }
    if (['declined', 'resolved'].includes(result.status)) {
      packBusy = false;
      await refreshPrayerPacks();
      return;
    }
    if (result.status === 'review') {
      saveAccountData(packOrderKey, { ...pending, status: 'review' });
      $('prayerPackPersonalQr').hidden = true;
      $('prayerPackTransfer').hidden = true;
      packMessage = 'Payment reference submitted. Your GCash payment is awaiting admin review.';
      return;
    }
    if (result.qrPngBase64) {
      $('prayerPackPersonalQr').hidden = true;
      const image = 'data:image/png;base64,' + result.qrPngBase64;
      packQrExpiry = Date.parse(result.expiresAt);
      $('prayerPackQrImage').src = image;
      $('prayerPackQrDownload').href = image;
      $('prayerPackHosted').href = result.checkoutUrl;
      $('prayerPackQrTitle').textContent = `Pay ₱${result.credits} with GCash`;
      $('prayerPackQrExpiry').textContent = 'QR expires at ' + new Date(packQrExpiry).toLocaleTimeString([], {
        hour: 'numeric', minute: '2-digit', timeZone: 'Asia/Manila'
      }) + ' Philippine time.';
      $('prayerPackQr').hidden = false;
      packMessage = 'Waiting for payment confirmation.';
      watchPrayerPackQr();
      return;
    }
    clearPrayerPackQr();
    $('prayerPackSelection').hidden = true;
    if (result.status === 'expired') {
      packMessage = 'The QR code expired. Refresh to check whether payment went through.';
      return;
    }
    if (result.status !== 'paid') throw Error('Could not prepare the payment QR.');
    clearPrayerPackCheckout();
    await readPrayerBalance();
    if (state.user?.id === userId) packMessage = 'Payment confirmed. Your credits are ready.';
  } catch (error) {
    if (state.user?.id === userId) packMessage = error.message || 'Could not open checkout.';
  } finally {
    if (state.user?.id === userId) {
      packBusy = false;
      renderPrayerPacks();
    }
  }
}

$('prayerPackTransfer').onsubmit = async event => {
  event.preventDefault();
  const pending = readAccountData(packOrderKey, null);
  if (!canUseApp() || !pending?.orderId || packBusy || deletingDevotionalData || event.currentTarget.dataset.ready !== 'true') return;
  const userId = state.user.id;
  packBusy = true;
  renderPrayerPacks();
  try {
    const result = await packRequest('claim', { orderId: pending.orderId, reference: $('prayerPackReference').value.trim() });
    if (state.user?.id !== userId) return;
    if (['declined', 'resolved'].includes(result.status)) {
      packBusy = false;
      await refreshPrayerPacks();
      return;
    }
    if (result.status !== 'review' && result.status !== 'paid') throw Error('Could not verify that the reference was submitted.');
    $('prayerPackTransfer').hidden = true;
    $('prayerPackTransfer').reset();
    $('prayerPackPersonalQr').hidden = true;
    if (result.status === 'paid') {
      clearPrayerPackCheckout();
      packMessage = 'Payment already confirmed. Your credits are ready.';
      await readPrayerBalance();
    } else {
      saveAccountData(packOrderKey, { ...pending, status: 'review' });
      packMessage = 'Payment reference submitted. Your GCash payment is awaiting admin review.';
    }
    if (state.user?.id === userId) toast(packMessage);
  } catch (error) {
    if (state.user?.id === userId) packMessage = error.message || 'Could not submit your payment reference.';
  } finally {
    if (state.user?.id === userId) {
      packBusy = false;
      renderPrayerPacks();
    }
  }
};

$('refreshPrayerPacks').onclick = () => void refreshPrayerPacks();
$('continuePrayerPack').onclick = () => {
  const instructions = $('prayerPackInstructions');
  if (!instructions.open) instructions.showModal();
  if ($('prayerPackPersonalQr').hidden && $('prayerPackQr').hidden) void startPrayerPack();
};
$('cancelPrayerPack').onclick = () => void cancelPrayerPack();
for (const button of packButtons) button.onclick = () => void startPrayerPack(Number(button.dataset.prayerPack));

let spendingCredit = false;
language();setFont(state.font);if(location.hash&&$(location.hash.slice(1))?.classList.contains('page'))nav(location.hash.slice(1));initCloud();function refreshDevotionalClock() {
  updateCandleClock();
  const now = Date.now();
  if (getNovenaYear(now) !== novenaYear || now >= nextNovenaUpdate) renderNovena();
}
setInterval(refreshDevotionalClock, 1000);
document.addEventListener('visibilitychange', () => {
  if (!document.hidden) {
    refreshDevotionalClock();
    refreshVisiblePaymentReview();
    void refreshPaymentAwaitingNotice();
    if (location.hash === '#prayerPacks') void refreshPrayerPacks();
    else if (state.user) void readPrayerBalance();
  }
});
(() => {
  const offerings = {
    candle: { form: 'candleForm', field: 'candleFor', type: 'candleType' },
    flowers: { form: 'flowerForm', field: 'flowerFor', type: 'flowerType' },
    'novena-candle': { novena: true, form: 'novenaCandleForm', field: 'novenaCandleFor', type: 'novenaCandleType' },
    'novena-flowers': { novena: true, form: 'novenaFlowerForm', field: 'novenaFlowerFor', type: 'novenaFlowerType' }
  };
  for (const [kind, settings] of Object.entries(offerings)) {
    $(settings.form).onsubmit = async event => {
      event.preventDefault();
      if (!canUseApp() || deletingDevotionalData || clearingOfferings || spendingCredit) return;
      const userId = state.user.id;
      const form = event.currentTarget;
      const button = form.querySelector('button[type="submit"]');
      const select = form.querySelector('[data-offering-prayer]');
      const pendingKey = 'pendingOffering.' + kind;
      const pending = readAccountData(pendingKey, null);
      const choice = select.value;
      const type = $(settings.type).value;
      const prayerIndex = choice === '' || choice === 'custom' ? null : Number(choice);
      const args = pending || {
        request_id: crypto.randomUUID(),
        offering_kind: kind,
        prayer_type: type,
        prayer_index: prayerIndex,
        note: choice === 'custom' ? $(settings.field).value.trim() : '',
        novena_day: settings.novena ? state.day : null
      };
      saveAccountData(pendingKey, args);
      spendingCredit = button.disabled = true;
      offeringRevision++;
      try {
        const { error } = await state.supabase.rpc('stonino_spend_prayer_credit', args);
        if (state.user?.id !== userId) return;
        if (error) {
          if (error.code === 'P0001') saveAccountData(pendingKey, null);
          if (error.message === 'prayer_pack_empty') {
            packBalance = 0;
            renderPrayerPacks();
            nav('prayerPacks');
            void refreshPrayerPacks();
            toast('Your Prayer Pack is empty.');
            return;
          }
          throw error;
        }
        saveAccountData(pendingKey, null);
        offeringRevision++;
        form.reset();
        renderOfferingPrayers(select);
        await Promise.all([loadCloud(), readPrayerBalance()]);
        if (state.user?.id === userId) toast('Your offering was placed. One credit used.');
      } catch {
        if (state.user?.id === userId) toast('Could not confirm the offering. Submit again to retry.');
      } finally {
        spendingCredit = false;
        button.disabled = false;
      }
    };
  }
})();
})();
