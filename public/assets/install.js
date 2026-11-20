(() => {
  const installLink = document.getElementById('installApp');
  const panel = document.getElementById('apkInstallProgress');
  const meter = document.getElementById('apkDownloadProgress');
  const status = document.getElementById('apkInstallStatus');
  const saveLink = document.getElementById('apkSaveLink');
  const close = document.getElementById('apkInstallClose');
  const releasePattern = /^sto-nino-devotional-v?\d+\.\d+\.\d+(?:-test)?-signed\.apk$/;
  const isAndroid = /Android/i.test(navigator.userAgent) || navigator.userAgentData?.platform === 'Android';
  let downloading = false;
  let objectUrl;

  async function latestRelease() {
    try {
      const response = await fetch('assets/latest-apk.json', { cache: 'no-store', signal: AbortSignal.timeout(5000) });
      if (response.ok) {
        const { filename } = await response.json();
        if (typeof filename === 'string' && releasePattern.test(filename)) {
          return new URL('assets/apk/' + filename, document.baseURI);
        }
      }
    } catch {
      // Fall back to the signed release linked in the page.
    }
    return new URL(installLink.href);
  }

  close?.addEventListener('click', () => { panel.hidden = true; });
  installLink?.addEventListener('click', async event => {
    event.preventDefault();
    if (downloading) return;
    downloading = true;
    installLink.setAttribute('aria-busy', 'true');
    if (isAndroid && panel) {
      panel.hidden = false;
      meter.hidden = false;
      meter.removeAttribute('value');
      close.hidden = true;
      saveLink.hidden = true;
      status.textContent = 'Finding the latest APK…';
    }

    const url = await latestRelease();
    const filename = url.pathname.split('/').pop();
    try {
      if (!isAndroid || !panel) {
        const download = document.createElement('a');
        download.href = url.href;
        download.download = filename;
        document.body.append(download);
        download.click();
        download.remove();
        return;
      }

      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
        objectUrl = undefined;
      }
      status.textContent = 'Downloading the app…';
      const response = await fetch(url);
      if (!response.ok || !response.body || response.headers.get('Content-Type')?.includes('text/html')) {
        throw new Error('APK download unavailable');
      }
      const total = response.headers.get('Content-Encoding') ? 0 : Number(response.headers.get('Content-Length'));
      const reader = response.body.getReader();
      const chunks = [];
      let received = 0;
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        chunks.push(value);
        received += value.byteLength;
        if (total > 0) meter.value = Math.min(99, Math.floor(100 * received / total));
      }
      if (!received || (total > 0 && total !== received)) throw new Error('Incomplete APK download');

      objectUrl = URL.createObjectURL(new Blob(chunks, { type: 'application/vnd.android.package-archive' }));
      saveLink.href = objectUrl;
      saveLink.download = filename;
      saveLink.textContent = 'Save APK';
      saveLink.hidden = false;
      meter.value = 100;
      status.textContent = 'Download complete. Open the APK from Downloads and tap Install. Android will show installation progress.';
      saveLink.click();
    } catch {
      meter.hidden = true;
      status.textContent = 'The in-page download did not finish. Try downloading through your browser.';
      saveLink.href = url.href;
      saveLink.download = filename;
      saveLink.textContent = 'Download APK';
      saveLink.hidden = false;
    } finally {
      downloading = false;
      installLink.removeAttribute('aria-busy');
      if (close) close.hidden = false;
    }
  });

  if ('serviceWorker' in navigator && window.isSecureContext) {
    navigator.serviceWorker.register('./sw.js').catch((error) => {
      console.warn('Sto. Niño service worker registration failed.', error);
    });
  }
})();
