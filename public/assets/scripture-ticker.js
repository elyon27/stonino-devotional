(() => {
  const translations = {
    en: { verses: window.stoninoNewTestament, label: 'New Testament · World English Bible' },
    ceb: { verses: window.stoninoNewTestamentCebuano, label: 'Bag-ong Kasabotan · Biblica® Open Ang Pulong sa Dios™' },
    fil: { verses: window.stoninoNewTestamentTagalog, label: 'Bagong Tipan · Ang Dating Biblia (1905)' }
  };
  const viewport = document.getElementById('scriptureTickerViewport');
  const line = document.getElementById('scriptureTickerVerse');
  const button = document.getElementById('scriptureTickerToggle');
  const previousButton = document.getElementById('scriptureTickerPrevious');
  const nextButton = document.getElementById('scriptureTickerNext');
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
  let finished = false;
  let animation;
  let language;
  let verses;
  let books;
  let bookIndex;
  let nextVerse;

  function fillLine() {
    const end = books[bookIndex].end;
    const width = viewport.clientWidth;
    while (nextVerse < end &&
      (line.children.length < 2 || line.scrollWidth < width + line.children[1].offsetLeft)) {
      const [reference, text] = verses[nextVerse];
      const verse = document.createElement('span');
      verse.dataset.index = nextVerse;
      verse.textContent = `${reference} — ${text}`;
      line.append(verse);
      nextVerse++;
    }
  }

  function currentIndex() {
    return Number(line.firstElementChild?.dataset.index);
  }

  function savePosition() {
    const reference = verses?.[currentIndex()]?.[0];
    if (!reference) return;
    const duration = animation?.effect.getTiming().duration;
    const progress = duration > 0 ? (animation.currentTime ?? 0) / duration : 0;
    savedPositions[language] = {
      reference,
      progress: Math.min(1, Math.max(0, progress)),
      finished
    };
    try {
      localStorage.setItem(storageKey, JSON.stringify(savedPositions));
    } catch {
      // Storage limits do not interrupt the scroll.
    }
  }

  function updateControls() {
    button.disabled = finished;
    button.textContent = paused || finished ? '▶' : 'Ⅱ';
    button.title = finished ? 'End of book' : paused ? 'Play Scripture scroll' : 'Pause Scripture scroll';
    button.setAttribute('aria-label', button.title);
    previousButton.disabled = bookIndex === 0;
    nextButton.disabled = bookIndex === books.length - 1;
  }

  function lastVerseDistance() {
    return Math.max(0, line.scrollWidth - viewport.clientWidth);
  }

  function finishBook() {
    finished = true;
    line.style.transform = `translateX(-${lastVerseDistance()}px)`;
    updateControls();
    savePosition();
  }

  function scrollLine(progress = 0) {
    fillLine();
    const followingVerse = line.children[1];
    const distance = followingVerse ? followingVerse.offsetLeft : lastVerseDistance();
    if (!distance) {
      finishBook();
      return;
    }

    const scroll = line.animate(
      [{ transform: 'translateX(0)' }, { transform: `translateX(-${distance}px)` }],
      { duration: distance / 38 * 1000, easing: 'linear', fill: 'both' }
    );
    animation = scroll;
    scroll.currentTime = progress * scroll.effect.getTiming().duration;
    if (paused || document.hidden) scroll.pause();
    scroll.onfinish = () => {
      if (animation !== scroll) return;
      scroll.cancel();
      animation = null;
      if (followingVerse) {
        line.firstElementChild.remove();
        scrollLine();
        savePosition();
      } else {
        finishBook();
      }
    };
  }

  function showBook(selectedBook, verseIndex = books[selectedBook].start, progress = 0, atEnd = false) {
    animation?.cancel();
    animation = null;
    line.style.transform = '';
    line.replaceChildren();
    bookIndex = selectedBook;
    nextVerse = verseIndex;
    finished = false;
    fillLine();
    if (atEnd) finishBook();
    else scrollLine(progress);
    updateControls();
    savePosition();
  }

  function changeBook(offset) {
    const selectedBook = bookIndex + offset;
    if (selectedBook >= 0 && selectedBook < books.length) showBook(selectedBook);
  }

  previousButton.addEventListener('click', () => changeBook(-1));
  nextButton.addEventListener('click', () => changeBook(1));
  button.addEventListener('click', () => {
    if (finished) return;
    paused = !paused;
    if (paused) animation?.pause();
    else if (!document.hidden) animation?.play();
    savePosition();
    updateControls();
  });

  function updateTranslation() {
    const selected = document.documentElement.lang;
    const next = Object.hasOwn(translations, selected) ? selected : 'en';
    if (next === language) return;
    const previousBook = bookIndex;
    const previousReference = verses?.[currentIndex()]?.[0];
    const previousFinished = finished;
    if (language) savePosition();
    language = next;
    const translation = translations[language];
    verses = translation.verses;
    viewport.parentElement.setAttribute('aria-label', translation.label);

    books = [];
    verses.forEach(([reference], index) => {
      const name = reference.replace(/ \d+:\d+$/, '');
      if (books.at(-1)?.name !== name) books.push({ name, start: index, end: index + 1 });
      else books.at(-1).end = index + 1;
    });

    if (previousReference) {
      // The translations use the same book order and different book names.
      const book = books[previousBook];
      const chapterVerse = previousReference.split(' ').at(-1);
      const corresponding = verses.findIndex(([reference]) => reference === `${book.name} ${chapterVerse}`);
      const verseIndex = previousFinished ? book.end - 1 : corresponding;
      showBook(previousBook, verseIndex === -1 ? book.start : verseIndex, 0, previousFinished);
      return;
    }

    const saved = savedPositions[language];
    const savedIndex = verses.findIndex(([reference]) => reference === saved?.reference);
    if (savedIndex === -1) {
      showBook(0);
      return;
    }
    const savedBook = books.findIndex(book => savedIndex < book.end);
    const progress = Number.isFinite(saved.progress) ? Math.min(.999999, Math.max(0, saved.progress)) : 0;
    showBook(savedBook, savedIndex, progress, saved.finished === true && savedIndex === books[savedBook].end - 1);
  }

  reducedMotion.addEventListener('change', event => {
    if (event.matches && !paused) button.click();
  });
  new ResizeObserver(() => {
    if (finished) line.style.transform = `translateX(-${lastVerseDistance()}px)`;
    else fillLine();
  }).observe(viewport);
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
    if (!finished && !paused && !document.hidden) savePosition();
  }, 1000);
  updateTranslation();
})();
