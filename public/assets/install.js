(() => {
  const button = document.querySelector('#installApp');
  const help = document.querySelector('#installHelp');
  const instructions = document.querySelector('#installInstructions');
  const standalone = window.matchMedia('(display-mode: standalone)');
  const isAppleMobile = /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  let installPrompt;
  let installed = false;

  const updateButton = () => {
    button.hidden = installed || standalone.matches || navigator.standalone === true;
  };

  const showHelp = () => {
    const message = isAppleMobile
      ? 'Open this page in Safari. Tap Share, then Add to Home Screen. If shown, turn on Open as Web App, then tap Add.'
      : 'Open this page in Chrome or your regular browser. In the browser menu, choose Install app or Add to Home screen, then confirm.';
    instructions.textContent = document.documentElement.lang === "ceb"
      ? window.stoninoCebuano.messages[message] : message;
    if (!help.open) help.showModal();
  };

  window.addEventListener('beforeinstallprompt', (event) => {
    event.preventDefault();
    installPrompt = event;
  });

  window.addEventListener('appinstalled', () => {
    installed = true;
    installPrompt = null;
    if (help.open) help.close();
    updateButton();
  });

  button.addEventListener('click', async () => {
    if (!installPrompt) {
      showHelp();
      return;
    }

    const prompt = installPrompt;
    installPrompt = null;
    button.disabled = true;
    try {
      await prompt.prompt();
    } catch {
      showHelp();
    } finally {
      button.disabled = false;
    }
  });

  standalone.addEventListener('change', updateButton);
  updateButton();

  if ('serviceWorker' in navigator && window.isSecureContext) {
    navigator.serviceWorker.register('./sw.js').catch((error) => {
      console.warn('Sto. Niño install service worker registration failed.', error);
    });
  }
})();
