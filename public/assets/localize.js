(() => {
  const messages = { ceb: window.stoninoCebuano.messages, fil: window.stoninoFilipinoPrayers.messages };
  const hasTranslation = text => Object.values(messages).some(dictionary => Object.hasOwn(dictionary, text));
  const entries = [];
  const excluded = 'header, footer, script, style, [data-i18n], [translate="no"]';
  const walker = document.createTreeWalker(document.documentElement, NodeFilter.SHOW_TEXT);
  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    if (node.parentElement.closest(excluded)) continue;
    const original = node.nodeValue;
    const text = original.trim();
    if (!hasTranslation(text)) continue;
    const option = node.parentElement.closest('option');
    if (option && !option.hasAttribute('value')) option.setAttribute('value', option.textContent.trim());
    entries.push(translate => {
      node.nodeValue = original.replace(text, () => translate(text));
    });
  }
  for (const element of document.querySelectorAll('[aria-label], [title], [placeholder], [alt]')) {
    if (element.closest(excluded)) continue;
    for (const attribute of ['aria-label', 'title', 'placeholder', 'alt']) {
      const text = element.getAttribute(attribute);
      if (hasTranslation(text)) {
        entries.push(translate => element.setAttribute(attribute, translate(text)));
      }
    }
  }
  window.stoninoLocalize = language => {
    const dictionary = messages[language];
    const translate = text => dictionary && Object.hasOwn(dictionary, text) ? dictionary[text] : text;
    for (const apply of entries) apply(translate);
  };
  try {
    if (JSON.parse(localStorage.getItem('stonino.v1.language')) === 'ceb') {
      document.documentElement.lang = 'ceb';
      window.stoninoLocalize('ceb');
    }
  } catch {
    // English is the default when preferences are unavailable.
  }
})();
