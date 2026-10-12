const audioFadeTimers = new Set();
let musicTitleTimer = null;

function cancelAudioFades() {
  audioFadeTimers.forEach(id => clearInterval(id));
  audioFadeTimers.clear();
}

function fadeInBGM(audio, duration = 1000) {
  cancelAudioFades();
  Object.values(bgm).forEach(other => { if (other !== audio) other.pause(); });
  const target = Number(audio.dataset.targetVolume || 0.8);
  audio.volume = 0;
  audio.currentTime = 0;
  currentBGM = audio;
  audio.play().catch(error => console.warn('BGM再生失敗:', error));
  const started = performance.now();
  const id = setInterval(() => {
    const progress = Math.min(1, (performance.now() - started) / duration);
    audio.volume = target * progress;
    if (progress >= 1) {
      clearInterval(id);
      audioFadeTimers.delete(id);
    }
  }, 50);
  audioFadeTimers.add(id);
}

function crossfadeBGM(fromAudio, toAudio, duration = 1500) {
  if (!fromAudio || !toAudio || fromAudio === toAudio) return;
  cancelAudioFades();
  Object.values(bgm).forEach(other => {
    if (other !== fromAudio && other !== toAudio) other.pause();
  });
  const fromVolume = fromAudio.volume;
  const target = Number(toAudio.dataset.targetVolume || 0.8);
  toAudio.volume = 0;
  toAudio.currentTime = 0;
  currentBGM = toAudio;
  toAudio.play().catch(error => console.warn('BGM切替失敗:', error));
  const started = performance.now();
  const id = setInterval(() => {
    const progress = Math.min(1, (performance.now() - started) / duration);
    fromAudio.volume = fromVolume * (1 - progress);
    toAudio.volume = target * progress;
    if (progress >= 1) {
      clearInterval(id);
      audioFadeTimers.delete(id);
      fromAudio.pause();
      fromAudio.volume = Number(fromAudio.dataset.targetVolume || 0.8);
    }
  }, 50);
  audioFadeTimers.add(id);
}

function showMusicTitle(text) {
  const title = document.getElementById('musicTitle');
  clearGameTimer(musicTitleTimer);
  title.textContent = text;
  title.style.opacity = 1;
  musicTitleTimer = setGameTimeout(() => { title.style.opacity = 0; }, 5000);
}

function playSound(audio, overlap = false) {
  if (!audio) return;
  const sound = overlap ? audio.cloneNode(true) : audio;
  sound.volume = audio.volume;
  sound.currentTime = 0;
  sound.play().catch(error => console.warn('SE再生失敗:', error));
}
