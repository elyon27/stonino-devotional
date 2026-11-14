import { readdir, writeFile } from 'node:fs/promises';

const folder = new URL('./assets/music/', import.meta.url);
const audio = /\.(mp3|m4a|aac|wav|ogg|oga|opus|flac|webm)$/i;
const files = await readdir(folder, { withFileTypes: true });
const tracks = files.filter(file => file.isFile() && audio.test(file.name))
  .map(({ name }) => name)
  .sort((a, b) => a.localeCompare(b, 'en', { numeric: true }))
  .map(name => ({
    title: name.replace(audio, '').replace(/_/g, ' '),
    src: 'assets/music/' + encodeURIComponent(name)
  }));
await writeFile(new URL('tracks.js', folder), 'window.stoninoMusicTracks = ' + JSON.stringify(tracks, null, 2) + ';\n');
