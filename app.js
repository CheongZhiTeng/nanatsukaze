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
let hasActiveSong = false;
let searchQuery = '';

// ===== DOM refs =====
const playerView = document.getElementById('playerView');
const miniPlayer = document.getElementById('miniPlayer');
const miniCover = document.getElementById('miniCover');
const miniTitle = document.getElementById('miniTitle');
const miniArtist = document.getElementById('miniArtist');
const miniPlayBtn = document.getElementById('miniPlayBtn');
const searchInput = document.getElementById('searchInput');

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

// ===== View switching =====
function showGallery() {
  playerView.classList.remove('active');
  document.body.classList.remove('player-open');
  if (hasActiveSong && playerReady && player) {
    showMiniPlayer();
  }
}

function showPlayer() {
  playerView.classList.add('active');
  document.body.classList.add('player-open');
  hideMiniPlayer();
}

// ===== Thumbnail helper =====
function buildThumbUrl(videoId, quality) {
  return 'https://i.ytimg.com/vi/' + videoId + '/' + quality + '.jpg';
}

// ===== Mini player =====
function updateMiniPlayer() {
  const song = songs[currentIndex];
  if (!song) return;

  miniTitle.textContent = song.title;
  miniArtist.textContent = song.artist || 'Nanatsukaze';

  const videoId = extractVideoId(song.youtubeLink);
  if (videoId) {
    miniCover.src = buildThumbUrl(videoId, 'mqdefault');
    miniCover.style.display = '';
  } else {
    miniCover.style.display = 'none';
  }

  miniPlayBtn.classList.toggle('playing', isPlaying);
}

function showMiniPlayer() {
  updateMiniPlayer();
  miniPlayer.classList.add('show');
}

function hideMiniPlayer() {
  miniPlayer.classList.remove('show');
}

// ===== Gallery =====
function renderGallery() {
  const grid = document.getElementById('galleryGrid');
  grid.innerHTML = '';

  const q = searchQuery.trim().toLowerCase();
  let visibleCount = 0;

  songs.forEach(function (song, i) {
    const title = song.title.toLowerCase();
    const artist = (song.artist || '').toLowerCase();
    if (q && !title.includes(q) && !artist.includes(q)) return;

    visibleCount++;
    const videoId = extractVideoId(song.youtubeLink);
    const card = document.createElement('div');
    card.className = 'gallery-card' + (videoId ? '' : ' no-link');

    card.innerHTML =
      '<div class="card-cover">' +
        (videoId ? '<img alt="' + song.title.replace(/"/g, '&quot;') + '" loading="lazy">' : '') +
        '<div class="card-play-overlay">' +
          '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M8 5.14v13.72c0 .82.88 1.32 1.57.9l10.97-6.86a1.05 1.05 0 0 0 0-1.8L9.57 4.24A1.05 1.05 0 0 0 8 5.14z"/></svg>' +
        '</div>' +
      '</div>' +
      '<div class="card-info">' +
        '<div class="card-title">' + song.title + '</div>' +
        '<div class="card-artist">' + (song.artist || 'Nanatsukaze') + '</div>' +
        (videoId ? '' : '<div class="card-badge">No link</div>') +
      '</div>';

    if (videoId) {
      const img = card.querySelector('.card-cover img');
      img.onerror = function () {
        this.onerror = null;
        this.src = buildThumbUrl(videoId, 'mqdefault');
      };
      img.src = buildThumbUrl(videoId, 'maxresdefault');

      card.addEventListener('click', function () {
        openSongFromGallery(i);
      });
    }

    grid.appendChild(card);
  });

  // Show "no results" message when search matches nothing
  if (visibleCount === 0 && q) {
    const msg = document.createElement('div');
    msg.className = 'no-results';
    msg.innerHTML = '<strong>No songs found</strong>Try a different search term.';
    grid.appendChild(msg);
  }
}

function openSongFromGallery(index) {
  const videoId = extractVideoId(songs[index].youtubeLink);
  if (!videoId) return;

  currentIndex = index;
  hasActiveSong = true;
  showPlayer();

  if (!playerReady || !player) {
    pendingVideoId = videoId;
    return;
  }

  player.loadVideoById(videoId);
  updateSongInfo();
  updatePlaylistHighlight();
}

// ===== YouTube API =====
function loadYouTubeAPI() {
  const tag = document.createElement('script');
  tag.src = 'https://www.youtube.com/iframe_api';
  const firstScript = document.getElementsByTagName('script')[0];
  firstScript.parentNode.insertBefore(tag, firstScript);
}

window.onYouTubeIframeAPIReady = function () {
  const firstValid = songs.findIndex(function (s) { return extractVideoId(s.youtubeLink); });
  if (firstValid === -1) {
    document.getElementById('songTitle').textContent = 'No playable songs';
    document.getElementById('songArtist').textContent = 'Add YouTube links in data.js';
    return;
  }
  currentIndex = firstValid;
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
      iv_load_policy: 3,
      fs: 0,
      playsinline: 1,
      enablejsapi: 1
    },
    events: {
      onReady: onPlayerReady,
      onStateChange: onPlayerStateChange,
      onError: onPlayerError
    }
  });
};

function onPlayerReady() {
  playerReady = true;
  player.setVolume(80);
  updateSongInfo();

  if (pendingVideoId) {
    player.loadVideoById(pendingVideoId);
    pendingVideoId = null;
  }
}

function onPlayerError(event) {
  // 2 = invalid param, 5 = HTML5 error, 100 = not found, 101/150 = embed not allowed
  console.warn('YouTube player error:', event.data);
  const song = songs[currentIndex];
  const titleEl = document.getElementById('songTitle');
  if (titleEl && song) titleEl.textContent = song.title + ' — unavailable';
  const artistEl = document.getElementById('songArtist');
  if (artistEl) artistEl.textContent = 'This video cannot be embedded';
}

// ===== Player state =====
function onPlayerStateChange(event) {
  if (event.data === YT.PlayerState.PLAYING) {
    isPlaying = true;
    hasActiveSong = true;
    updatePlayButton();
    startProgressTimer();
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

// ===== Playback =====
function playSong(index) {
  if (index < 0 || index >= songs.length) return;
  const videoId = extractVideoId(songs[index].youtubeLink);
  if (!videoId) {
    const next = findNextPlayable(index, 1);
    if (next !== -1 && next !== index) playSong(next);
    return;
  }
  currentIndex = index;
  hasActiveSong = true;

  if (playerReady && player) {
    player.loadVideoById(videoId);
    updateSongInfo();
    updatePlaylistHighlight();
  } else {
    pendingVideoId = videoId;
  }
}

function togglePlay() {
  if (!player || !playerReady) return;
  const data = player.getVideoData();
  if (!data || !data.video_id) return;

  if (isPlaying) player.pauseVideo();
  else player.playVideo();
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
  if (next !== -1) playSong(next);
  else {
    isPlaying = false;
    updatePlayButton();
  }
}

// ===== UI =====
function updatePlayButton() {
  const btn = document.getElementById('playBtn');
  if (btn) {
    btn.classList.toggle('playing', isPlaying);
    btn.setAttribute('aria-label', isPlaying ? 'Pause' : 'Play');
  }
  if (miniPlayBtn) {
    miniPlayBtn.classList.toggle('playing', isPlaying);
  }
}

function updateSongInfo() {
  const song = songs[currentIndex];
  if (!song) return;
  document.getElementById('songTitle').textContent = song.title;
  document.getElementById('songArtist').textContent = song.artist || 'Nanatsukaze';
  updateMiniPlayer();
}

function updatePlaylistHighlight() {
  document.querySelectorAll('.playlist-item').forEach(function (el, i) {
    el.classList.toggle('active', i === currentIndex);
  });
}

function formatTime(seconds) {
  if (!seconds || isNaN(seconds)) return '0:00';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return m + ':' + (s < 10 ? '0' : '') + s;
}

// ===== Progress =====
function startProgressTimer() {
  stopProgressTimer();
  progressInterval = setInterval(function () {
    if (!player || !playerReady || !player.getCurrentTime) return;
    const cur = player.getCurrentTime();
    const dur = player.getDuration();
    if (dur > 0) {
      document.getElementById('progressBar').value = (cur / dur) * 100;
      document.getElementById('currentTime').textContent = formatTime(cur);
      document.getElementById('totalTime').textContent = formatTime(dur);
    }
  }, 500);
}

function stopProgressTimer() {
  if (progressInterval) {
    clearInterval(progressInterval);
    progressInterval = null;
  }
}

// ===== Playlist =====
function renderPlaylist() {
  const ul = document.getElementById('playlist');
  ul.innerHTML = '';
  songs.forEach(function (song, i) {
    const li = document.createElement('li');
    li.className = 'playlist-item';
    const hasLink = !!extractVideoId(song.youtubeLink);
    li.innerHTML =
      '<span class="item-index">' + (i + 1) + '</span>' +
      '<div class="item-info">' +
        '<div class="item-title">' + song.title + (hasLink ? '' : ' <span style="font-size:0.7rem;color:var(--gray-300);">(no link)</span>') + '</div>' +
        '<div class="item-artist">' + (song.artist || 'Nanatsukaze') + '</div>' +
      '</div>' +
      '<div class="playing-bar"><span></span><span></span><span></span></div>';

    li.addEventListener('click', function () {
      if (hasLink) playSong(i);
    });
    ul.appendChild(li);
  });
}

// ===== Events =====
function bindEvents() {
  document.getElementById('playBtn').addEventListener('click', togglePlay);
  document.getElementById('nextBtn').addEventListener('click', nextSong);
  document.getElementById('prevBtn').addEventListener('click', prevSong);

  document.getElementById('progressBar').addEventListener('input', function (e) {
    if (!player || !playerReady || !player.getDuration) return;
    const dur = player.getDuration();
    if (dur > 0) {
      player.seekTo((e.target.value / 100) * dur, true);
    }
  });

  document.getElementById('shuffleBtn').addEventListener('click', function () {
    isShuffle = !isShuffle;
    this.classList.toggle('active', isShuffle);
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
  });

  document.getElementById('backToGalleryBtn').addEventListener('click', function () {
    showGallery();
  });

  // ===== Search bar =====
  searchInput.addEventListener('input', function () {
    searchQuery = this.value;
    renderGallery();
  });

  // Press Enter → blur input to close the on-screen keyboard (mobile/iPad)
  searchInput.addEventListener('keydown', function (e) {
    if (e.key === 'Enter' || e.keyCode === 13) {
      e.preventDefault();
      this.blur();
    }
  });

  // ===== Mini-player interactions =====
  miniPlayer.addEventListener('click', function (e) {
    if (e.target.closest('#miniPlayBtn')) return;
    showPlayer();
  });

  miniPlayer.addEventListener('keydown', function (e) {
    if (e.key === 'Enter' && e.target === miniPlayer) {
      e.preventDefault();
      showPlayer();
    }
  });

  miniPlayBtn.addEventListener('click', function (e) {
    e.stopPropagation();
    togglePlay();
  });

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && playerView.classList.contains('active')) {
      showGallery();
    }
  });
}

// ===== Init =====
loadYouTubeAPI();
bindEvents();
renderGallery();
renderPlaylist();
updateSongInfo();
