import { readFile, readdir, writeFile } from 'node:fs/promises';

const apkDirectory = new URL('../public/assets/apk/', import.meta.url);
const indexFile = new URL('../public/index.html', import.meta.url);
const releaseName = /^sto-nino-devotional-v?(\d+)\.(\d+)\.(\d+)(-test)?-signed\.apk$/;
const entries = await readdir(apkDirectory, { withFileTypes: true });
const releases = entries.flatMap(entry => {
  const match = entry.isFile() && releaseName.exec(entry.name);
  return match ? [{
    name: entry.name,
    version: match.slice(1, 4).map(Number),
    test: Boolean(match[4])
  }] : [];
});

releases.sort((a, b) => b.version[0] - a.version[0]
  || b.version[1] - a.version[1]
  || b.version[2] - a.version[2]
  || Number(a.test) - Number(b.test)
  || a.name.localeCompare(b.name));

const latest = releases[0];
if (!latest) throw new Error('No signed Sto. Niño Devotional APK found in public/assets/apk.');

const page = await readFile(indexFile, 'utf8');
const installLink = /(<a\b[^>]*\bid="installApp"[^>]*\bhref=")[^"]*(")/g;
if ([...page.matchAll(installLink)].length !== 1) {
  throw new Error('Expected one Install App link with an href in public/index.html.');
}
const updated = page.replace(installLink, (_, start, end) => start + 'assets/apk/' + latest.name + end);
if (updated !== page) await writeFile(indexFile, updated);
console.log('Install App points to ' + latest.name);
