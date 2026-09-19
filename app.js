// app.js

// ===== State =====
let player = null;
let playerReady = false;
let currentIndex = 0;
let isPlaying = false;
let isShuffle = false;
let repeatMode = 'off'; // 'off' | 'all' | 'one'
let progressInterval = null;
let pendingVideoId = null;
let isSeeking = false;

// ===== Constants =====
const SPLASH_DELAY = 2200;
const SPLASH_FORCE_DISMISS = 5000;
const DEFAULT_VOLUME = 80;
const PROGRESS_INTERVAL = 500;
const STORAGE_KEYS = {
  FAVORITES: 'nanatsukaze_favorites',
  VOLUME: 'nanatsukaze_volume',
  SHUFFLE: 'nanatsukaze_shuffle',
  REPEAT: 'nanatsukaze_repeat',
  LAST_SONG: 'nanatsukaze_last_song'
};

// ===== View elements =====
const playerView = document.getElementById('playerView');

// ===== Local Storage Helpers =====
function getStorage(key, defaultValue) {
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : defaultValue;
  } catch (e) {
    console.warn('读取本地存储失败:', e);
    return defaultValue;
  }
}

function setStorage(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    console.warn('写入本地存储失败:', e);
  }
}

// ===== State from Storage =====
let favorites = getStorage(STORAGE_KEYS.FAVORITES, []);
isShuffle = getStorage(STORAGE_KEYS.SHUFFLE, false);
repeatMode = getStorage(STORAGE_KEYS.REPEAT, 'off');
const lastSongIndex = getStorage(STORAGE_KEYS.LAST_SONG, null);

// ===== Splash Dismiss Logic =====
(function initSplash() {
  let dismissed = false;
  function dismiss() {
    if (dismissed) return;
    dismissed = true;
    const splash = document.getElementById('splash');
    if (splash) {
      splash.classList.add('hide');
      setTimeout(() => splash.remove(), 800);
    }
    const app = document.getElementById('app');
    if (app) app.classList.remove('app-hidden');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => setTimeout(dismiss, SPLASH_DELAY));
  } else {
    setTimeout(dismiss, SPLASH_DELAY);
  }
  setTimeout(dismiss, SPLASH_FORCE_DISMISS);
})();

// ===== Extract YouTube Video ID =====
function extractVideoId(url) {
  if (!url) return null;
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/live\/)([a-zA-Z0-9_-]{11})/,
    /^([a-zA-Z0-9_-]{11})$/
  ];
  for (const p of patterns) {
    const m = url.match(p);
    if (m) return m[1];
  }
  return null;
}

// ===== View Switching =====
function showGallery() {
  playerView.classList.remove('active');
  document.body.classList.remove('player-open');
  if (player && player.pauseVideo) player.pauseVideo();
}

function showPlayer() {
  playerView.classList.add('active');
  document.body.classList.add('player-open');
}

// ===== Thumbnail helper =====
function buildThumbUrl(videoId, quality) {
  return 'https://i.ytimg.com/vi/' + videoId + '/' + quality + '.jpg';
}

// ===== Gallery =====
function renderGallery() {
  const grid = document.getElementById('galleryGrid');
  grid.innerHTML = '';

  songs.forEach((song, i) => {
    const videoId = extractVideoId(song.youtubeLink);
    const card = document.createElement('div');
    card.className = 'gallery-card' + (videoId ? '' : ' no-link');
    card.dataset.index = i; // 用于事件委托

    // 安全创建元素，防止 XSS
    const coverDiv = document.createElement('div');
    coverDiv.className = 'card-cover';
    if (videoId) {
      const img = document.createElement('img');
      img.alt = song.title + ' cover';
      img.loading = 'lazy';
      img.onerror = function () {
        this.onerror = null;
        this.src = buildThumbUrl(videoId, 'mqdefault');
      };
      img.src = buildThumbUrl(videoId, 'maxresdefault');
      coverDiv.appendChild(img);
    }
    const playOverlay = document.createElement('div');
    playOverlay.className = 'card-play-overlay';
    playOverlay.innerHTML = '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M8 5.14v13.72c0 .82.88 1.32 1.57.9l10.97-6.86a1.05 1.05 0 0 0 0-1.8L9.57 4.24A1.05 1.05 0 0 0 8 5.14z"/></svg>';
    coverDiv.appendChild(playOverlay);
    
    const infoDiv = document.createElement('div');
    infoDiv.className = 'card-info';
    
    const titleDiv = document.createElement('div');
    titleDiv.className = 'card-title';
    titleDiv.textContent = song.title; // 安全
    
    const artistDiv = document.createElement('div');
    artistDiv.className = 'card-artist';
    artistDiv.textContent = song.artist || 'Nanatsukaze'; // 安全

    infoDiv.appendChild(titleDiv);
    infoDiv.appendChild(artistDiv);
    
    if (!videoId) {
      const badge = document.createElement('div');
      badge.className = 'card-badge';
      badge.textContent = 'No link';
      infoDiv.appendChild(badge);
    }

    card.appendChild(coverDiv);
    card.appendChild(infoDiv);
    grid.appendChild(card);
  });
}

// 需求1：事件委托，优化性能
function initGalleryEvents() {
  const grid = document.getElementById('galleryGrid');
  grid.addEventListener('click', (e) => {
    const card = e.target.closest('.gallery-card');
    if (!card || card.classList.contains('no-link')) return;
    const index = parseInt(card.dataset.index);
    openSongFromGallery(index);
  });
}

function openSongFromGallery(index) {
  const videoId = extractVideoId(songs[index].youtubeLink);
  if (!videoId) return;

  currentIndex = index;
  showPlayer();

  if (!playerReady || !player) {
    pendingVideoId = videoId;
    return;
  }

  player.loadVideoById(videoId);
  updateSongInfo();
  updatePlaylistHighlight();
  updateCoverBackground(videoId);
}

// ===== YouTube API =====
function loadYouTubeAPI() {
  const tag = document.createElement('script');
  tag.src = 'https://www.youtube.com/iframe_api';
  const firstScript = document.getElementsByTagName('script')[0];
  firstScript.parentNode.insertBefore(tag, firstScript);
}

window.onYouTubeIframeAPIReady = function () {
  const firstValid = songs.findIndex(s => extractVideoId(s.youtubeLink));
  if (firstValid === -1) {
    document.getElementById('songTitle').textContent = 'No playable songs';
    document.getElementById('songArtist').textContent = 'Add YouTube links in data.js';
    return;
  }
  
  // 恢复上次播放的歌曲，如果没有则使用第一首
  let startIndex = firstValid;
  if (lastSongIndex !== null && lastSongIndex >= 0 && lastSongIndex < songs.length) {
    if (extractVideoId(songs[lastSongIndex].youtubeLink)) {
      startIndex = lastSongIndex;
    }
  }
  currentIndex = startIndex;
  const videoId = extractVideoId(songs[currentIndex].youtubeLink);

  player = new YT.Player('player', {
    height: '100%',
    width: '100%',
    videoId: videoId,
    playerVars: {
      autoplay: 0,
      controls: 0,
      modestbranding: 1,
      rel: 0,
      showinfo: 0,
      iv_load_policy: 3,
      fs: 0,
      color: 'white',
      origin: window.location.origin
    },
    events: {
      onReady: onPlayerReady,
      onStateChange: onPlayerStateChange
    }
  });
};

function onPlayerReady() {
  playerReady = true;
  
  // 需求4：从本地存储恢复状态
  const savedVolume = getStorage(STORAGE_KEYS.VOLUME, DEFAULT_VOLUME);
  player.setVolume(savedVolume);
  
  // 恢复 UI 状态
  document.getElementById('shuffleBtn').classList.toggle('active', isShuffle);
  const repeatBtn = document.getElementById('repeatBtn');
  repeatBtn.classList.toggle('active', repeatMode !== 'off');
  repeatBtn.classList.toggle('one', repeatMode === 'one');
  repeatBtn.title = repeatMode === 'one' ? 'Repeat One' : repeatMode === 'all' ? 'Repeat All' : 'Repeat Off';
  
  updateSongInfo();
  updateFavoriteButton();
  updateCoverBackground(extractVideoId(songs[currentIndex].youtubeLink));

  if (pendingVideoId) {
    player.loadVideoById(pendingVideoId);
    pendingVideoId = null;
  }
}

// ===== Player state =====
function onPlayerStateChange(event) {
  if (event.data === YT.PlayerState.PLAYING) {
    isPlaying = true;
    updatePlayButton();
    startProgressTimer();
    // 需求4：保存当前播放的歌曲到本地存储
    setStorage(STORAGE_KEYS.LAST_SONG, currentIndex);
  } else if (event.data === YT.PlayerState.PAUSED) {
    isPlaying = false;
    updatePlayButton();
    stopProgressTimer();
  } else if (event.data === YT.PlayerState.ENDED) {
    stopProgressTimer();
    handleSongEnd();
  }
  updatePlaylistHighlight();
}

// ===== Playback control =====
function playSong(index) {
  if (index < 0 || index >= songs.length) return;
  const videoId = extractVideoId(songs[index].youtubeLink);
  if (!videoId) {
    const next = findNextPlayable(index, 1);
    if (next !== -1 && next !== index) playSong(next);
    return;
  }
  currentIndex = index;

  if (playerReady && player) {
    player.loadVideoById(videoId);
    updateSongInfo();
    updatePlaylistHighlight();
    updateCoverBackground(videoId);
    updateFavoriteButton();
  } else {
    pendingVideoId = videoId;
  }
}

function togglePlay() {
  if (!player || !playerReady) return;
  const data = player.getVideoData();
  if (!data || !data.video_id) return;

  if (isPlaying) {
    player.pauseVideo();
  } else {
    player.playVideo();
  }
}

function nextSong() {
  const next = findNextPlayable(currentIndex, 1);
  if (next !== -1) playSong(next);
}

function prevSong() {
  const prev = findNextPlayable(currentIndex, -1);
  if (prev !== -1) playSong(prev);
}

function findNextPlayable(from, direction) {
  const len = songs.length;
  for (let step = 1; step <= len; step++) {
    let idx;
    if (isShuffle) {
      idx = Math.floor(Math.random() * len);
    } else {
      idx = (from + direction * step + len) % len;
    }
    if (idx === from && step > 0) {
      if (extractVideoId(songs[idx].youtubeLink)) return idx;
      continue;
    }
    if (extractVideoId(songs[idx].youtubeLink)) return idx;
  }
  return -1;
}

function handleSongEnd() {
  if (repeatMode === 'one') {
    player.seekTo(0);
    player.playVideo();
    return;
  }
  const next = findNextPlayable(currentIndex, 1);
  if (next !== -1) {
    playSong(next);
  } else {
    isPlaying = false;
    updatePlayButton();
  }
}

// ===== UI updates =====
function updatePlayButton() {
  const btn = document.getElementById('playBtn');
  if (!btn) return;
  btn.classList.toggle('playing', isPlaying);
  btn.setAttribute('aria-label', isPlaying ? 'Pause' : 'Play');
}

function updateSongInfo() {
  const song = songs[currentIndex];
  if (!song) return;
  document.getElementById('songTitle').textContent = song.title;
  document.getElementById('songArtist {
').textContent = song.artist || 'Nanatsukaze';
   }

function updatePlaylistHighlight() {
  clear document.querySelectorAll('.playlist-item').forEachInterval((el, i) => {
    el.classList.toggle('(active', i === currentIndex);
  });
progress}

// 需求4：收藏功能
function toggleFavorite() {
  const song = songs[currentIndex];
  if (!song) return;
  // 使用 youtubeLink 或 title 作为唯一标识
  const songKey = song.youtubeLink || song.title;
  const index = favorites.indexOf(songKey);
  if (index === -1) {
    favorites.push(songKey);
  } else {
    favorites.splice(index, 1);
  }
  setStorage(STORAGE_KEYS.FAVORITES, favorites);
  updateFavoriteButton();
}

function updateFavoriteButton() {
  const btn = document.getElementById('favoriteBtn');
  if (!btn) return;
  const song = songs[currentIndex];
  if (!song) return;
  const songKey = song.youtubeLink || song.title;
  btn.classList.toggle('active', favorites.includes(songKey));
}

// 需求7：更新封面背景模糊
function updateCoverBackground(videoId) {
  const coverWrap = document.querySelector('.cover-wrap');
  if (coverWrap && videoId) {
    const thumbUrl = `https://i.ytimg.com/vi/${videoId}/maxresdefault.jpg`;
    coverWrap.style.setProperty('--current-cover', `url(${thumbUrl})`);
  }
}

function formatTime(seconds) {
  if (!seconds || isNaN(seconds)) return '0:00';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return m + ':' + (s < 10 ? '0' : '') + s;
}

// ===== Progress bar =====
function startProgressTimer() {
  stopProgressTimer();
  progressInterval = setInterval(() => {
    if (!player || !playerReady || !player.getCurrentTime) return;
    const cur = player.getCurrentTime();
    const dur = player.getDuration();
    if (dur > 0) {
      document.getElementById('progressBar').value = (cur / dur) * 100;
      document.getElementById('currentTime').textContent = formatTime(cur);
      document.getElementById('totalTime').textContent = formatTime(dur);
    }
  }, PROGRESS_INTERVAL);
}

function stopProgressTimer() {
  if (progressInterval)Interval);
    progressInterval = null;
  }
}

// ===== Playlist =====
function renderPlaylist() {
  const ul = document.getElementById('playlist');
  ul.innerHTML = '';
  songs.forEach((song, i) => {
    const li = document.createElement('li');
    li.className = 'playlist-item';
    li.dataset.index = i; // 用于事件委托
    const hasLink = !!extractVideoId(song.youtubeLink);
    
    li.innerHTML = `
      <span class="item-index">${i + 1}</span>
      <div class="item-info">
        <div class="item-title"></div>
        <div class="item-artist"></div>
      </div>
      <div class="playing-bar"><span></span><span></span><span></span></div>
    `;
    
    // 安全填充文本
    const titleEl = li.querySelector('.item-title');
    titleEl.textContent = song.title + (hasLink ? '' : ' (no link)');
    li.querySelector('.item-artist').textContent = song.artist || 'Nanatsukaze';

    ul.appendChild(li);
  });
}

// 需求1：事件委托优化播放列表
function initPlaylistEvents() {
  const ul = document.getElementById('playlist');
  ul.addEventListener('click', (e) => {
    const li = e.target.closest('.playlist-item');
    if (!li) return;
    const index = parseInt(li.dataset.index);
    const hasLink = !!extractVideoId(songs[index].youtubeLink);
    if (hasLink) playSong(index);
  });
}

// ===== Event binding =====
function bindEvents() {
  document.getElementById('playBtn').addEventListener('click', togglePlay);
  document.getElementById('nextBtn').addEventListener('click', nextSong);
  document.getElementById('prevBtn').addEventListener('click', prevSong);
  document.getElementById('favoriteBtn').addEventListener('click', toggleFavorite);

  // 需求1：进度条输入节流优化
  document.getElementById('progressBar').addEventListener('input', (e) => {
    if (!player || !playerReady || !player.getDuration) return;
    if (isSeeking) return;
    isSeeking = true;
    requestAnimationFrame(() => {
      const dur = player.getDuration();
      if (dur > 0) {
        player.seekTo((e.target.value / 100) * dur, true);
      }
      isSeeking = false;
    });
  });

  // 需求8：音量滑块逻辑已移除

  document.getElementById('shuffleBtn').addEventListener('click', function () {
    isShuffle = !isShuffle;
    this.classList.toggle('active', isShuffle);
    setStorage(STORAGE_KEYS.SHUFFLE, isShuffle); // 需求4：保存状态
  });

  document.getElementById('repeatBtn').addEventListener('click', function () {
    const modes = ['off', 'all', 'one'];
    const idx = modes.indexOf(repeatMode);
    repeatMode = modes[(idx + 1) % modes.length];
    this.classList.toggle('active', repeatMode !== 'off');
    this.classList.toggle('one', repeatMode === 'one');
    this.title = repeatMode === 'one' ? 'Repeat One'
               : repeatMode === 'all' ? 'Repeat All'
               : 'Repeat Off';
    setStorage(STORAGE_KEYS.REPEAT, repeatMode); // 需求4：保存状态
  });

  document.getElementById('backToGalleryBtn').addEventListener('click', () => {
    showGallery();
  });

  // 需求4：键盘快捷键
  document.addEventListener('keydown', (e) => {
    // 如果在输入框中，不触发快捷键
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

    switch(e.key) {
      case ' ':
        e.preventDefault();
        togglePlay();
        break;
      case 'ArrowRight':
        nextSong();
        break;
      case 'ArrowLeft':
        prevSong();
        break;
      case 'Escape':
        if (playerView.classList.contains('active')) showGallery();
        break;
    }
  });
}

// ===== Init =====
loadYouTubeAPI();
initGalleryEvents();
initPlaylistEvents();
bindEvents();
renderGallery();
renderPlaylist();
updateSongInfo();
updateFavoriteButton();
