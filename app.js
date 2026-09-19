// app.js
let player;
let currentIndex = 0;
let isPlaying = false;
let isShuffle = false;
let repeatMode = 'off'; // 'off' | 'all' | 'one'
let progressInterval;

// ===== 提取 YouTube Video ID =====
function extractVideoId(url) {
  if (!url) return null;
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
    /^([a-zA-Z0-9_-]{11})$/
  ];
  for (const p of patterns) {
    const m = url.match(p);
    if (m) return m[1];
  }
  return null;
}

// ===== 初始化 YouTube IFrame API =====
function loadYouTubeAPI() {
  const tag = document.createElement('script');
  tag.src = 'https://www.youtube.com/iframe_api';
  const firstScript = document.getElementsByTagName('script')[0];
  firstScript.parentNode.insertBefore(tag, firstScript);
}

window.onYouTubeIframeAPIReady = function () {
  const firstValid = songs.findIndex(s => extractVideoId(s.youtubeLink));
  if (firstValid === -1) {
    document.getElementById('songTitle').textContent = '暂无可播放歌曲';
    document.getElementById('songArtist').textContent = '请在 data.js 中填入 YouTube 链接';
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
      showinfo: 0,
      iv_load_policy: 3,
      fs: 0,
      color: 'white'
    },
    events: {
      'onReady': onPlayerReady,
      'onStateChange': onPlayerStateChange
    }
  });
  renderPlaylist();
  updateSongInfo();
};

function onPlayerReady() {
  player.setVolume(80);
  updateSongInfo();
}

// ===== 状态变化 =====
function onPlayerStateChange(event) {
  if (event.data === YT.PlayerState.PLAYING) {
    isPlaying = true;
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

// ===== 播放控制 =====
function playSong(index) {
  if (index < 0 || index >= songs.length) return;
  const videoId = extractVideoId(songs[index].youtubeLink);
  if (!videoId) {
    // 跳过无链接的歌曲
    const next = findNextPlayable(index, 1);
    if (next !== -1 && next !== index) playSong(next);
    return;
  }
  currentIndex = index;
  player.loadVideoById(videoId);
  updateSongInfo();
  updatePlaylistHighlight();
}

function togglePlay() {
  if (!player || !player.getVideoData || !player.getVideoData().video_id) return;
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
      // 只有一首可播放
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

// ===== UI 更新 =====
function updatePlayButton() {
  document.getElementById('playBtn').textContent = isPlaying ? '⏸' : '▶';
}

function updateSongInfo() {
  const song = songs[currentIndex];
  if (!song) return;
  document.getElementById('songTitle').textContent = song.title;
  document.getElementById('songArtist').textContent = song.artist || 'Nanatsukaze';
}

function updatePlaylistHighlight() {
  document.querySelectorAll('.playlist-item').forEach((el, i) => {
    el.classList.toggle('active', i === currentIndex);
  });
}

function formatTime(seconds) {
  if (!seconds || isNaN(seconds)) return '0:00';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

// ===== 进度条 =====
function startProgressTimer() {
  stopProgressTimer();
  progressInterval = setInterval(() => {
    if (!player || !player.getCurrentTime) return;
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

// ===== 播放列表渲染 =====
function renderPlaylist() {
  const ul = document.getElementById('playlist');
  ul.innerHTML = '';
  songs.forEach((song, i) => {
    const li = document.createElement('li');
    li.className = 'playlist-item';
    const hasLink = !!extractVideoId(song.youtubeLink);
    li.innerHTML = `
      <span class="item-index">${i + 1}</span>
      <div class="item-info">
        <div class="item-title">${song.title}${!hasLink ? ' <span style="font-size:0.7rem;color:var(--gray-300);">(无链接)</span>' : ''}</div>
        <div class="item-artist">${song.artist || 'Nanatsukaze'}</div>
      </div>
      <div class="playing-bar"><span></span><span></span><span></span></div>
    `;
    li.addEventListener('click', () => {
      if (hasLink) {
        playSong(i);
      }
    });
    ul.appendChild(li);
  });
}

// ===== 事件绑定 =====
function bindEvents() {
  document.getElementById('playBtn').addEventListener('click', togglePlay);
  document.getElementById('nextBtn').addEventListener('click', nextSong);
  document.getElementById('prevBtn').addEventListener('click', prevSong);

  // 进度条拖拽
  document.getElementById('progressBar').addEventListener('input', (e) => {
    if (!player || !player.getDuration) return;
    const dur = player.getDuration();
    if (dur > 0) {
      const seekTo = (e.target.value / 100) * dur;
      player.seekTo(seekTo, true);
    }
  });

  // 音量
  document.getElementById('volumeBar').addEventListener('input', (e) => {
    if (player && player.setVolume) {
      player.setVolume(parseInt(e.target.value));
    }
  });

  // 随机播放
  document.getElementById('shuffleBtn').addEventListener('click', function () {
    isShuffle = !isShuffle;
    this.classList.toggle('active', isShuffle);
  });

  // 循环模式
  document.getElementById('repeatBtn').addEventListener('click', function () {
    const modes = ['off', 'all', 'one'];
    const idx = modes.indexOf(repeatMode);
    repeatMode = modes[(idx + 1) % modes.length];
    this.classList.toggle('active', repeatMode !== 'off');
    this.textContent = repeatMode === 'one' ? '🔂' : '🔁';
    this.title = repeatMode === 'one' ? '单曲循环' : repeatMode === 'all' ? '列表循环' : '循环关闭';
  });
}

// ===== 启动 =====
loadYouTubeAPI();
bindEvents();

// ===== 开场 Logo 动画控制 =====
// 进入页面后：logo 淡入 (1.2s) → 停留 (1s) → 淡出 (0.8s) → 移除
window.addEventListener('load', () => {
  setTimeout(() => {
    const splash = document.getElementById('splash');
    if (splash) {
      splash.classList.add('hide');
      // 淡出动画结束后从 DOM 中移除，避免遮挡
      setTimeout(() => splash.remove(), 800);
    }
  }, 2200); // 1.2s 淡入 + 1s 停留
});
