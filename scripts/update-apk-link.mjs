import { createHash } from 'node:crypto';
import { copyFile, mkdir, readFile, readdir, writeFile } from 'node:fs/promises';

const sourceDirectory = new URL('../assets/apk/', import.meta.url);
const apkDirectory = new URL('../public/assets/apk/', import.meta.url);
const releaseIndex = new URL('../public/assets/latest-apk.json', import.meta.url);
const indexFile = new URL('../public/index.html', import.meta.url);
const releaseName = /^sto-nino-devotional-v?(\d+)\.(\d+)\.(\d+)(-test)?-signed\.apk$/;
const releases = [];
for (const directory of [sourceDirectory, apkDirectory]) {
  const entries = await readdir(directory, { withFileTypes: true }).catch(error => {
    if (error.code === 'ENOENT') return [];
    throw error;
  });
  for (const entry of entries) {
    const match = entry.isFile() && releaseName.exec(entry.name);
    if (!match) continue;
    releases.push({
      directory,
      name: entry.name,
      version: match.slice(1, 4).map(Number),
      test: Boolean(match[4])
    });
  }
}

releases.sort((a, b) => b.version[0] - a.version[0]
  || b.version[1] - a.version[1]
  || b.version[2] - a.version[2]
  || Number(a.test) - Number(b.test)
  || a.name.localeCompare(b.name));

const releaseVersion = [1, 2, 35];
const releaseFile = 'sto-nino-devotional-1.2.35-signed.apk';
let latest = releases[0];
const versionDelta = latest && (latest.version[0] - releaseVersion[0]
  || latest.version[1] - releaseVersion[1] || latest.version[2] - releaseVersion[2]);

if (!latest || versionDelta < 0 || (versionDelta === 0 && latest.test)) {
  const releaseUrl = 'https://github.com/elyon27/stonino-devotional/releases/download/v1.2.35/' + releaseFile;
  const response = await fetch(releaseUrl, { signal: AbortSignal.timeout(90000) });
  if (!response.ok) throw new Error('Could not download the signed v1.2.35 APK: ' + response.status);
  const apk = Buffer.from(await response.arrayBuffer());
  const hash = createHash('sha256').update(apk).digest('hex');
  if (hash !== '7e41204940470187211bc96e9eabe8b43cb92dee6bed129cc7f8eb0331e0c162') {
    throw new Error('Signed v1.2.35 APK checksum mismatch.');
  }
  await mkdir(apkDirectory, { recursive: true });
  await writeFile(new URL(releaseFile, apkDirectory), apk);
  latest = { name: releaseFile, directory: apkDirectory };
}

const page = await readFile(indexFile, 'utf8');
const installLink = /(<a\b[^>]*\bid="installApp"[^>]*\bhref=")[^"]*(")/g;
if ([...page.matchAll(installLink)].length !== 1) {
  throw new Error('Expected one Install App link with an href in public/index.html.');
}
if (latest.directory === sourceDirectory) {
  await mkdir(apkDirectory, { recursive: true });
  await copyFile(new URL(latest.name, sourceDirectory), new URL(latest.name, apkDirectory));
}

const updated = page.replace(installLink, (_, start, end) => start + 'assets/apk/' + latest.name + end);
if (updated !== page) await writeFile(indexFile, updated);
await writeFile(releaseIndex, JSON.stringify({ filename: latest.name }) + '\n');
console.log('Install App points to ' + latest.name);
