(() => {
  const messages = window.stoninoCebuano.messages;
  const entries = [];
  const excluded = 'header, footer, script, style, [data-i18n], [translate="no"]';
  const walker = document.createTreeWalker(document.documentElement, NodeFilter.SHOW_TEXT);
  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    if (node.parentElement.closest(excluded)) continue;
    const original = node.nodeValue;
    const text = original.trim();
    if (!Object.hasOwn(messages, text)) continue;
    const option = node.parentElement.closest('option');
    if (option && !option.hasAttribute('value')) option.setAttribute('value', option.textContent.trim());
    entries.push(cebuano => {
      node.nodeValue = cebuano ? original.replace(text, () => messages[text]) : original;
    });
  }
  for (const element of document.querySelectorAll('[aria-label], [title], [placeholder], [alt]')) {
    if (element.closest(excluded)) continue;
    for (const attribute of ['aria-label', 'title', 'placeholder', 'alt']) {
      const text = element.getAttribute(attribute);
      if (Object.hasOwn(messages, text)) {
        entries.push(cebuano => element.setAttribute(attribute, cebuano ? messages[text] : text));
      }
    }
  }
  window.stoninoLocalize = language => {
    for (const apply of entries) apply(language === 'ceb');
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
