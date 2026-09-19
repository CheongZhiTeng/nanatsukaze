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
let errorSkipCount = 0;
const MAX_ERROR_SKIPS = 5;

// ===== DOM refs =====
const playerView = document.getElementById('playerView');
const miniPlayer = document.getElementById('miniPlayer');
const miniCover = document.getElementById('miniCover');
const miniTitle = document.getElementById('miniTitle');
const miniArtist = document.getElementById('miniArtist');
const miniPlayBtn = document.getElementById('miniPlayBtn');
const searchInput = document.getElementById('searchInput');

// ===== Extract YouTube Video ID (robust URL parser) =====
function extractVideoId(value) {
  if (!value) return null;

  // Already a bare 11-char video ID
  if (/^[\w-]{11}$/.test(value)) return value;

  try {
    const url = new URL(value);

    // youtu.be/VIDEO_ID
    if (url.hostname === 'youtu.be' || url.hostname === 'www.youtu.be') {
      const id = url.pathname.slice(1).match(/^[\w-]{11}/);
      return id ? id[0] : null;
    }

    // youtube.com/watch?v=VIDEO_ID (v may not be first param)
    if (url.searchParams.has('v')) {
      const v = url.searchParams.get('v');
      return /^[\w-]{11}$/.test(v) ? v : null;
    }

    // /embed/VIDEO_ID, /live/VIDEO_ID, /shorts/VIDEO_ID
    const match = url.pathname.match(/\/(?:embed|live|shorts)\/([\w-]{11})/);
    return match ? match[1] : null;
  } catch {
    // Fallback to regex for malformed URLs
    const m = value.match(
      /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/live\/|youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/
    );
    return m ? m[1] : null;
  }
}

// ===== HTML escape helper (defense-in-depth) =====
function escapeHTML(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
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

// ===== Gallery (safe DOM construction) =====
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
    card.setAttribute('role', 'button');
    card.setAttribute('tabindex', videoId ? '0' : '-1');
    card.setAttribute('aria-label', song.title + ' by ' + (song.artist || 'Nanatsukaze'));

    // --- card-cover ---
    const cover = document.createElement('div');
    cover.className = 'card-cover';

    if (videoId) {
      const img = document.createElement('img');
      img.alt = song.title;
      img.loading = 'lazy';
      img.onerror = function () {
        this.onerror = function () {
          // Both maxres and mq failed — show gray placeholder
          this.style.display = 'none';
          cover.classList.add('img-error');
        };
        this.src = buildThumbUrl(videoId, 'mqdefault');
      };
      img.src = buildThumbUrl(videoId, 'maxresdefault');
      cover.appendChild(img);
    }

    const overlay = document.createElement('div');
    overlay.className = 'card-play-overlay';
    overlay.innerHTML =
      '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M8 5.14v13.72c0 .82.88 1.32 1.57.9l10.97-6.86a1.05 1.05 0 0 0 0-1.8L9.57 4.24A1.05 1.05 0 0 0 8 5.14z"/></svg>';
    cover.appendChild(overlay);
    card.appendChild(cover);

    // --- card-info ---
    const info = document.createElement('div');
    info.className = 'card-info';

    const titleEl = document.createElement('div');
    titleEl.className = 'card-title';
    titleEl.textContent = song.title;
    info.appendChild(titleEl);

    const artistEl = document.createElement('div');
    artistEl.className = 'card-artist';
    artistEl.textContent = song.artist || 'Nanatsukaze';
    info.appendChild(artistEl);

    if (!videoId) {
      const badge = document.createElement('div');
      badge.className = 'card-badge';
      badge.textContent = 'No link';
      info.appendChild(badge);
    }

    card.appendChild(info);

    // --- events ---
    if (videoId) {
      card.addEventListener('click', function () {
        openSongFromGallery(i);
      });
      card.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          openSongFromGallery(i);
        }
      });
    }

    grid.appendChild(card);
  });

  if (visibleCount === 0 && q) {
    const msg = document.createElement('div');
    msg.className = 'no-results';
    const strong = document.createElement('strong');
    strong.textContent = 'No songs found';
    msg.appendChild(strong);
    msg.appendChild(document.createTextNode('Try a different search term.'));
    grid.appendChild(msg);
  }
}

function openSongFromGallery(index) {
  const videoId = extractVideoId(songs[index].youtubeLink);
  if (!videoId) return;

  currentIndex = index;
  hasActiveSong = true;
  errorSkipCount = 0;
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

// ===== Player error: skip unavailable videos automatically =====
function onPlayerError(event) {
  console.warn('YouTube player error:', event.data);
  const song = songs[currentIndex];

  // Show error text briefly
  const titleEl = document.getElementById('songTitle');
  if (titleEl && song) titleEl.textContent = song.title + ' — unavailable';
  const artistEl = document.getElementById('songArtist');
  if (artistEl) artistEl.textContent = 'Skipping...';

  errorSkipCount++;

  // Auto-advance after a short delay (prevents infinite loop)
  if (errorSkipCount < MAX_ERROR_SKIPS) {
    setTimeout(function () {
      const next = findNextPlayable(currentIndex, 1, false);
      if (next !== -1) {
        playSong(next);
      } else {
        isPlaying = false;
        updatePlayButton();
      }
    }, 1200);
  } else {
    errorSkipCount = 0;
    isPlaying = false;
    updatePlayButton();
  }
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
    const next = findNextPlayable(index, 1, true);
    if (next !== -1 && next !== index) playSong(next);
    return;
  }
  currentIndex = index;
  hasActiveSong = true;
  errorSkipCount = 0;

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
  const next = findNextPlayable(currentIndex, 1, true);
  if (next !== -1) playSong(next);
}

function prevSong() {
  const prev = findNextPlayable(currentIndex, -1, true);
  if (prev !== -1) playSong(prev);
}

// ===== findNextPlayable — explicit wrap control, no self-selection in shuffle =====
function findNextPlayable(from, direction, allowWrap) {
  const playable = [];
  for (let i = 0; i < songs.length; i++) {
    if (i === from) continue; // never pick current song
    if (extractVideoId(songs[i].youtubeLink)) playable.push(i);
  }

  if (!playable.length) return -1;

  if (isShuffle) {
    return playable[Math.floor(Math.random() * playable.length)];
  }

  // Sequential: find the next index in the given direction
  const len = songs.length;
  for (let step = 1; step <= len; step++) {
    const idx = (from + direction * step + len) % len;
    if (idx === from) break; // wrapped all the way around
    if (extractVideoId(songs[idx].youtubeLink)) return idx;
  }

  // If allowWrap is true and we didn't find one going forward,
  // try from the other end (for manual "next" button)
  if (allowWrap) {
    for (let step = 1; step <= len; step++) {
      const idx = (from + direction * step + len) % len;
      if (extractVideoId(songs[idx].youtubeLink)) return idx;
    }
  }

  return -1;
}

// ===== handleSongEnd — respects repeat mode =====
function handleSongEnd() {
  if (repeatMode === 'one') {
    player.seekTo(0);
    player.playVideo();
    return;
  }

  // For repeat 'all', allow wrap. For 'off', don't wrap.
  const allowWrap = repeatMode === 'all';
  const next = findNextPlayable(currentIndex, 1, allowWrap);

  if (next === -1) {
    isPlaying = false;
    updatePlayButton();
    return;
  }

  playSong(next);
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

// ===== Playlist (safe DOM construction) =====
function renderPlaylist() {
  const ul = document.getElementById('playlist');
  ul.innerHTML = '';
  songs.forEach(function (song, i) {
    const li = document.createElement('li');
    li.className = 'playlist-item';
    li.setAttribute('role', 'button');
    li.setAttribute('tabindex', '0');
    const hasLink = !!extractVideoId(song.youtubeLink);

    // index
    const idx = document.createElement('span');
    idx.className = 'item-index';
    idx.textContent = i + 1;
    li.appendChild(idx);

    // info
    const info = document.createElement('div');
    info.className = 'item-info';

    const title = document.createElement('div');
    title.className = 'item-title';
    title.textContent = song.title;
    if (!hasLink) {
      const badge = document.createElement('span');
      badge.style.cssText = 'font-size:0.7rem;color:var(--gray-300);';
      badge.textContent = ' (no link)';
      title.appendChild(badge);
    }
    info.appendChild(title);

    const artist = document.createElement('div');
    artist.className = 'item-artist';
    artist.textContent = song.artist || 'Nanatsukaze';
    info.appendChild(artist);

    li.appendChild(info);

    // playing bar
    const bar = document.createElement('div');
    bar.className = 'playing-bar';
    bar.innerHTML = '<span></span><span></span><span></span>';
    li.appendChild(bar);

    li.addEventListener('click', function () {
      if (hasLink) playSong(i);
    });
    li.addEventListener('keydown', function (e) {
      if ((e.key === 'Enter' || e.key === ' ') && hasLink) {
        e.preventDefault();
        playSong(i);
      }
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
    this.setAttribute('aria-pressed', isShuffle);
  });

  document.getElementById('repeatBtn').addEventListener('click', function () {
    const modes = ['off', 'all', 'one'];
    const idx = modes.indexOf(repeatMode);
    repeatMode = modes[(idx + 1) % modes.length];
    this.classList.toggle('active', repeatMode !== 'off');
    this.classList.toggle('one', repeatMode === 'one');
    this.setAttribute('aria-pressed', repeatMode !== 'off');
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

  searchInput.addEventListener('keydown', function (e) {
    if (e.key === 'Enter' || e.keyCode === 13) {
      e.preventDefault();
      this.blur();
    }
  });

  // ===== Mini-player (single interactive button) =====
  miniPlayBtn.addEventListener('click', function (e) {
    e.stopPropagation();
    togglePlay();
  });

  // Open-player button (the outer wrapper is now a container, not a button)
  const openPlayerBtn = document.getElementById('openPlayerBtn');
  if (openPlayerBtn) {
    openPlayerBtn.addEventListener('click', function (e) {
      e.stopPropagation();
      showPlayer();
    });
  }

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

// =================================================================
// Futuristic animated background — full effects, optimized pipeline
// =================================================================
(function initBackgroundParticles() {
  const canvas = document.getElementById('bgCanvas');
  if (!canvas) return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const ctx = canvas.getContext('2d', { alpha: true, desynchronized: true });

  let particles = [];
  let w = 0, h = 0, dpr = 1;
  let rafId = null;
  let running = false;
  let lastFrameTime = 0;
  let lastTimestamp = 0;

  const FRAME_INTERVAL = 1000 / 60;
  const MAX_DIST = 140;
  const MAX_DIST_SQ = MAX_DIST * MAX_DIST;
  const CELL = MAX_DIST;
  const ALPHA_BUCKETS = 6;

  const grid = new Map();

  const NEIGHBOR_OFFSETS = [];
  for (let dx = -1; dx <= 1; dx++) {
    for (let dy = -1; dy <= 1; dy++) {
      NEIGHBOR_OFFSETS.push([dx, dy]);
    }
  }

  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    w = window.innerWidth;
    h = window.innerHeight;
    canvas.width = Math.floor(w * dpr);
    canvas.height = Math.floor(h * dpr);
    canvas.style.width = w + 'px';
    canvas.style.height = h + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const target = Math.min(Math.max(20, Math.floor((w * h) / 22000)), 80);
    particles = [];
    for (let i = 0; i < target; i++) {
      particles.push({
        x: Math.random() * w,
        y: Math.random() * h,
        vx: (Math.random() - 0.5) * 0.35,
        vy: (Math.random() - 0.5) * 0.35,
        r: Math.random() * 1.6 + 0.7,
        hue: [260, 220, 330][(Math.random() * 3) | 0],
        alpha: Math.random() * 0.4 + 0.35
      });
    }
  }

  function draw(timestamp) {
    if (!running) return;

    if (timestamp - lastFrameTime < FRAME_INTERVAL) {
      rafId = requestAnimationFrame(draw);
      return;
    }
    const dt = lastTimestamp
      ? Math.min((timestamp - lastTimestamp) / 16.667, 3)
      : 1;
    lastFrameTime = timestamp;
    lastTimestamp = timestamp;

    ctx.clearRect(0, 0, w, h);

    // Move particles + build spatial grid
    grid.clear();
    for (let i = 0; i < particles.length; i++) {
      const p 