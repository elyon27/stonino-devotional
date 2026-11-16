(() => {
  const installLink = document.getElementById('installApp');
  let checkingRelease = false;
  installLink?.addEventListener('click', async event => {
    event.preventDefault();
    if (checkingRelease) return;
    checkingRelease = true;
    const download = document.createElement('a');
    download.href = installLink.href;
    download.download = '';
    try {
      const response = await fetch('assets/latest-apk.json', { cache: 'no-store', signal: AbortSignal.timeout(5000) });
      if (response.ok) {
        const { filename } = await response.json();
        if (typeof filename === 'string' && /^sto-nino-devotional-v?\d+\.\d+\.\d+(?:-test)?-signed\.apk$/.test(filename)) {
          download.href = new URL('assets/apk/' + filename, document.baseURI).href;
        }
      }
    } catch {
      // Use the packaged APK link if the release index is temporarily unreachable.
    } finally {
      checkingRelease = false;
    }
    document.body.append(download);
    download.click();
    download.remove();
  });

  if ('serviceWorker' in navigator && window.isSecureContext) {
    navigator.serviceWorker.register('./sw.js').catch((error) => {
      console.warn('Sto. Niño service worker registration failed.', error);
    });
  }
})();
