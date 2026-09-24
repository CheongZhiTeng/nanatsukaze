<div align="center">
  <img src="https://capsule-render.vercel.app/api?type=waving&amp;color=ff4d94,ff3344,a855f7&amp;height=200&amp;section=header&amp;text=Nanatsukaze&amp;fontSize=70&amp;fontColor=ffffff&amp;animation=fadeIn&amp;fontAlignY=38&amp;desc=Music%20Gallery%20%26%20Player&amp;descAlignY=58&amp;descSize=20" />
</div><div align="center">
  <a href="https://git.io/typing-svg">
    <img src="https://readme-typing-svg.demolab.com?font=Michroma&amp;weight=600&amp;size=22&amp;pause=1000&amp;color=FF4D94&amp;center=true&amp;vCenter=true&amp;width=600&amp;lines=A+stylish+music+gallery+and+player.;Built+with+vanilla+HTML%2C+CSS+%26+JS.;Powered+by+YouTube.;Dark+neon+theme%2C+zero+frameworks." alt="Typing SVG" />
  </a>
</div>
<div align="center">
  <img src="https://komarev.com/ghpvc/?username=cheongzhiteng&amp;label=Views&amp;color=ff4d94&amp;style=for-the-badge" alt="Views" />
  <img src="https://img.shields.io/badge/version-1.0-ff4d94?style=for-the-badge" alt="Version" />
  <img src="https://img.shields.io/badge/license-personal%20use-a855f7?style=for-the-badge" alt="License" />
  <img src="https://img.shields.io/badge/status-live-ff3344?style=for-the-badge" alt="Status" />
</div>
<div align="center">
  <h3>🔗 Quick Links</h3>
  <br>
  <a href="https://cheongzhiteng.github.io/nanatsukaze">
    <img src="https://img.shields.io/badge/🎧_Live_Demo-ff4d94?style=for-the-badge&amp;logoColor=white" alt="Live Demo" />
  </a>
  <a href="https://github.com/cheongzhiteng/nanatsukaze">
    <img src="https://img.shields.io/badge/GitHub-181717?style=for-the-badge&amp;logo=github&amp;logoColor=white" alt="GitHub" />
  </a>
  <a href="https://youtube.com/@nanatsukaze_">
    <img src="https://img.shields.io/badge/YouTube-ff3344?style=for-the-badge&amp;logo=youtube&amp;logoColor=white" alt="YouTube" />
  </a>
</div>



<div align="center">
  <h2>🌃 About</h2>
</div>A minimalist, elegant music gallery and player for the Japanese electronic duo Nanatsukaze. Built with pure vanilla HTML, CSS, and JavaScript — no frameworks, no build step, no npm install.

The UI features a dark neon cyberpunk theme with animated particle networks, glowing flame effects, and glassmorphism cards. All playback is powered by the official YouTube IFrame Player API, so the entire song library streams without any backend.


<div align="center">
  <h2>✨ Features</h2>
</div>🎵 Playback

· YouTube-powered — every song streams through the official IFrame API
· Full controls — play/pause, previous/next, seek bar, live progress timer
· Shuffle mode — randomizes without ever repeating the current song
· Repeat modes — Off / All / One
· Auto-skip — unavailable videos are detected and skipped automatically
· Robust URL parser — handles watch, youtu.be, live, shorts, embed, and bare IDs

🔍 Browse & Search

· Gallery grid — responsive cards with YouTube thumbnails
· Real-time search — filters by title or artist as you type
· Keyboard accessible — every card and control reachable via Tab / Enter / Space

🎨 Design

· Dark neon theme — deep purple-black base with pink, crimson and purple accents
· Animated background — flowing neon blobs + drifting flame embers
· Particle network — GPU-optimized canvas of glowing connected dots
· Glassmorphism cards — blurred translucent panels with neon borders
· Michroma display font via Google Fonts
· Fully responsive — desktop, tablet, and mobile layouts

⚡ Performance

· 60fps particle system — spatial grid bucketing + batched canvas calls
· Scroll-aware — background animations pause while scrolling
· Automatic degradation — heavy effects disabled on small screens and reduced-motion setups
· Zero dependencies — one HTML, one CSS, one JS file

♿ Accessibility

· Semantic HTML (<main>, <section>, <aside>, <nav>)
· Visible :focus-visible outlines on all interactive elements
· aria-label and aria-pressed on stateful controls
· Respects prefers-reduced-motion


<div align="center">
  <h2>🛠 Tech Stack</h2>
</div><div align="center">Layer Technology
Markup Semantic HTML5
Styling Vanilla CSS — custom properties, grid, flexbox, keyframes
Logic Vanilla JavaScript (ES2017+)
Audio YouTube IFrame Player API
Background Canvas 2D with spatial grid optimization
Fonts Google Fonts (Michroma)
Hosting GitHub Pages

</div>
<div align="center">
  <h2>📁 File Structure</h2>
</div>```
nanatsukaze/
├── index.html          # Page structure
├── style.css           # All styling (dark neon theme)
├── app.js              # Player logic, gallery, search, background
├── data.js             # Song list (edit this to add/remove songs)
├── README.md
└── pictures/
    ├── logo.png        # Splash screen logo
    └── IMG_0703.png    # Header logo
```


<div align="center">
  <h2>🚀 Getting Started</h2>
</div>Run locally

```bash
git clone https://github.com/cheongzhiteng/nanatsukaze.git
cd nanatsukaze
```

Then just open index.html in your browser. No server required.

For consistent behaviour from the YouTube iframe API, serve it locally:

```bash
python3 -m http.server 8000
# open http://localhost:8000
```

Deploy

· GitHub Pages — push → Settings → Pages → Source: main / root
· Netlify / Vercel — drag the folder onto the dashboard, done.


<div align="center">
  <h2>🎼 Adding Songs</h2>
</div>All song data lives in data.js. Each entry has three fields:

```javascript
{ title: "Song Name", artist: "Nanatsukaze", youtubeLink: "https://youtu.be/VIDEO_ID" }
```

Supported YouTube URL formats

Format Example
Standard watch https://www.youtube.com/watch?v=VIDEO_ID
Short link https://youtu.be/VIDEO_ID
Live link https://www.youtube.com/live/VIDEO_ID
Shorts https://www.youtube.com/shorts/VIDEO_ID
Embed https://www.youtube.com/embed/VIDEO_ID
Bare ID VIDEO_ID

Extra query parameters (timestamps, tracking) are automatically stripped.

Songs with an empty youtubeLink show a "No link" badge and are skipped during playback.


<div align="center">
  <h2>⌨️ Keyboard Shortcuts</h2>
</div><div align="center">Key Action
Tab Navigate between controls
Enter / Space Activate focused card, button, or playlist item
Enter (in search) Close the mobile keyboard
Esc Close player, return to gallery

</div>
<div align="center">
  <h2>⚠️ Known Limitations</h2>
</div>· Background playback on iOS / iPadOS — browsers pause iframe audio when the tab is minimized or the screen locks. OS-level restriction, cannot be bypassed while using the YouTube IFrame API.
· Embedding restrictions — some videos have embedding disabled by their uploader. The player detects this via onError and auto-skips.
· Region-locked content — shows as unavailable if YouTube blocks access in your region.


<div align="center">
  <h2>📜 Credits</h2>
</div>· Music — Nanatsukaze (PIKASONIC × nakotanmaru)
· Font — Michroma by Vernon Adams
· Icons — Custom inline SVGs
· Player — YouTube IFrame Player API

Follow Nanatsukaze

<div align="center">
  <a href="https://x.com/Nanatsukaze_ofc">
    <img src="https://img.shields.io/badge/X-000000?style=for-the-badge&amp;logo=x&amp;logoColor=white" alt="X" />
  </a>
  <a href="https://www.instagram.com/nanatsukaze_">
    <img src="https://img.shields.io/badge/Instagram-E4405F?style=for-the-badge&amp;logo=instagram&amp;logoColor=white" alt="Instagram" />
  </a>
  <a href="https://youtube.com/@nanatsukaze_">
    <img src="https://img.shields.io/badge/YouTube-FF0000?style=for-the-badge&amp;logo=youtube&amp;logoColor=white" alt="YouTube" />
  </a>
</div>
<div align="center">
  <h2>📄 License</h2>
</div>The code in this repository is provided as-is for personal and educational use.

All music, artwork, and trademarks belong to their respective owners — Nanatsukaze, PIKASONIC, and nakotanmaru. This project is an unofficial fan-made music player and is not affiliated with or endorsed by Nanatsukaze.


<div align="center">
  <img src="https://capsule-render.vercel.app/api?type=waving&amp;color=ff4d94,ff3344,a855f7&amp;height=120&amp;section=footer" />
  <p>Made with 💜 for Nanatsukaze fans</p>
</div>---
