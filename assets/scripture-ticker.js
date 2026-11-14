(() => {
  const translations = {
    en: { verses: window.stoninoNewTestament, label: 'New Testament · World English Bible' },
    ceb: { verses: window.stoninoNewTestamentCebuano, label: 'Bag-ong Kasabotan · Biblica® Open Ang Pulong sa Dios™' },
    fil: { verses: window.stoninoNewTestamentTagalog, label: 'Bagong Tipan · Ang Dating Biblia (1905)' }
  };
  const viewport = document.getElementById('scriptureTickerViewport');
  const line = document.getElementById('scriptureTickerVerse');
  const button = document.getElementById('scriptureTickerToggle');
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  const storageKey = 'stonino.scriptureTicker.position.v1';
  let savedPositions = {};
  try {
    const saved = JSON.parse(localStorage.getItem(storageKey));
    if (saved && typeof saved === 'object' && !Array.isArray(saved)) savedPositions = saved;
  } catch {
    // The ticker still works when storage is unavailable.
  }
  let paused = reducedMotion.matches;
  let animation;
  let index = 0;
  let language;
  let verses;

  function appendVerse() {
    const [reference, text] = verses[index];
    const verse = document.createElement('span');
    verse.dataset.index = index;
    verse.textContent = `${reference} — ${text}`;
    line.append(verse);
    index = (index + 1) % verses.length;
  }

  function fillLine() {
    // Keep the viewport covered even after the first verse has moved offscreen.
    if (!verses?.length) return;
    const width = viewport.clientWidth;
    while (line.children.length < 2 || line.scrollWidth < width + line.children[1].offsetLeft) {
      appendVerse();
    }
  }

  function savePosition() {
    const verseIndex = Number(line.firstElementChild?.dataset.index);
    if (!language || !verses?.[verseIndex]) return;
    const duration = animation?.effect.getTiming().duration;
    const progress = duration > 0 ? (animation.currentTime ?? 0) / duration : 0;
    savedPositions[language] = {
      reference: verses[verseIndex][0],
      progress: Math.min(0.999999, Math.max(0, progress))
    };
    try {
      localStorage.setItem(storageKey, JSON.stringify(savedPositions));
    } catch {
      // Storage limits do not interrupt the scroll.
    }
  }

  function scrollLine(progress = 0) {
    fillLine();
    const distance = line.children[1].offsetLeft;
    animation = line.animate(
      [{ transform: 'translateX(0)' }, { transform: `translateX(-${distance}px)` }],
      { duration: distance / 38 * 1000, easing: 'linear', fill: 'both' }
    );
    animation.currentTime = progress * animation.effect.getTiming().duration;
    if (paused || document.hidden) animation.pause();
    animation.onfinish = () => {
      animation.cancel();
      animation = null;
      line.firstElementChild.remove();
      scrollLine();
      savePosition();
    };
  }

  function updateButton() {
    button.textContent = paused ? '▶' : 'Ⅱ';
    button.title = paused ? 'Play Scripture scroll' : 'Pause Scripture scroll';
    button.setAttribute('aria-label', button.title);
  }

  button.addEventListener('click', () => {
    paused = !paused;
    if (paused) animation?.pause();
    else if (animation && !document.hidden) animation.play();
    else if (!animation) scrollLine();
    savePosition();
    updateButton();
  });

  reducedMotion.addEventListener('change', event => {
    if (event.matches && !paused) button.click();
  });
  new ResizeObserver(fillLine).observe(viewport);
  function updateTranslation() {
    const selected = document.documentElement.lang;
    const next = Object.hasOwn(translations, selected) ? selected : 'en';
    if (next === language) return;
    const previousLanguage = language;
    const previousIndex = Number(line.firstElementChild?.dataset.index);
    const previousVerse = verses?.[previousIndex];
    if (previousLanguage) savePosition();
    language = next;
    const translation = translations[language];
    verses = translation.verses;
    viewport.parentElement.setAttribute('aria-label', translation.label);
    animation?.cancel();
    animation = null;
    line.replaceChildren();
    // Match the chapter and verse within the same book. Book names vary by language.
    const [book, chapterVerse] = previousVerse?.[0].match(/^(.*) (\d+:\d+)$/)?.slice(1) ?? [];
    if (book) {
      const previous = translations[previousLanguage].verses;
      const bookIndex = new Set(previous.slice(0, Number(previousIndex) + 1).map(([ref]) => ref.replace(/ \d+:\d+$/, ''))).size - 1;
      const books = [...new Set(verses.map(([ref]) => ref.replace(/ \d+:\d+$/, '')))];
      const corresponding = verses.findIndex(([ref]) => ref === `${books[bookIndex]} ${chapterVerse}`);
      const firstInBook = verses.findIndex(([ref]) => ref.startsWith(books[bookIndex] + ' '));
      index = Math.max(0, corresponding === -1 ? firstInBook : corresponding);
    } else {
      const saved = savedPositions[language];
      index = Math.max(0, verses.findIndex(([reference]) => reference === saved?.reference));
      const progress = index >= 0 && verses[index]?.[0] === saved?.reference && Number.isFinite(saved?.progress)
        ? Math.min(0.999999, Math.max(0, saved.progress))
        : 0;
      scrollLine(progress);
      return;
    }
    scrollLine();
  }

  new MutationObserver(updateTranslation).observe(document.documentElement, {
    attributes: true, attributeFilter: ['lang']
  });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      animation?.pause();
      savePosition();
    } else if (!paused) animation?.play();
  });
  window.addEventListener('pagehide', savePosition);
  window.addEventListener('pageshow', () => {
    if (!paused && !document.hidden) animation?.play();
  });
  setInterval(() => {
    if (!paused && !document.hidden) savePosition();
  }, 1000);
  updateButton();
  updateTranslation();
})();
