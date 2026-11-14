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
    const width = viewport.clientWidth;
    while (line.children.length < 2 || line.scrollWidth < width + line.children[1].offsetLeft) {
      appendVerse();
    }
  }

  function scrollLine() {
    fillLine();
    const distance = line.children[1].offsetLeft;
    animation = line.animate(
      [{ transform: 'translateX(0)' }, { transform: `translateX(-${distance}px)` }],
      { duration: distance / 38 * 1000, easing: 'linear', fill: 'both' }
    );
    animation.onfinish = () => {
      animation.cancel();
      animation = null;
      line.firstElementChild.remove();
      if (paused) fillLine();
      else scrollLine();
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
    else if (animation) animation.play();
    else scrollLine();
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
    } else index = 0;
    if (paused) fillLine();
    else scrollLine();
  }

  new MutationObserver(updateTranslation).observe(document.documentElement, {
    attributes: true, attributeFilter: ['lang']
  });
  updateButton();
  updateTranslation();
})();
