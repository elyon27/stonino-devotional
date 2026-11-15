(() => {
  const tracks = window.stoninoMusicTracks;
  const track = document.getElementById('musicTrack');
  const player = document.getElementById('musicPlayer');
  const repeat = document.getElementById('musicRepeat');
  const controls = document.getElementById('musicControls');
  const title = document.getElementById('musicTrackTitle');
  const status = document.getElementById('musicStatus');

  if (!tracks.length) return;

  function selectTrack() {
    const selected = tracks[Number(track.value)];
    player.pause();
    title.textContent = selected.title;
    status.hidden = true;
    player.src = selected.src;
  }

  track.replaceChildren(...tracks.map(({ title }, index) => new Option(title, String(index))));
  track.addEventListener('change', selectTrack);
  repeat.addEventListener('change', () => { player.loop = repeat.checked; });
  player.addEventListener('error', () => { status.hidden = false; });
  document.getElementById('musicEmpty').hidden = true;
  controls.hidden = false;
  selectTrack();
})();
