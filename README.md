# Nanatsukaze · Music

A minimal, elegant music player and gallery for the Japanese electronic duo Nanatsukaze. Built with vanilla HTML, CSS, and JavaScript — no frameworks, no build step.

🎧 [Live Demo](https://CheongZhiTeng.github.io/nanatsukaze/)

---

## ✨ Features

### Music Playback
* **YouTube-powered playback** — every song streams via the official YouTube IFrame API
* **Full playback controls** — play/pause, previous/next, seek bar, progress timer
* **Shuffle mode** — randomizes playback, never repeats the current song
* **Repeat modes** — Off / All / One
* **Auto-skip** — if a video is unavailable or blocks embedding, the player moves to the next playable song automatically
* **Error handling** — clear feedback when a video can't be embedded

### Browse & Search
* **Gallery view** — responsive grid of song cards with YouTube thumbnails
* **Real-time search** — filter by title or artist as you type (no submit button)
* **Enter key blurs input** — closes the on-screen keyboard on mobile and iPad
* **Keyboard accessible** — every card and control is focusable and reachable via Tab/Enter/Space

### User Experience
* **Splash screen** — logo animation on first load, fades out automatically
* **Slide-up player** — smooth sheet-style transition between gallery and player
* **Mini-player** — floating bottom-right card keeps music playing while you browse the gallery
* **Vibrant background** — animated particle network + HUD grid, all GPU-composited
* **Persistent state** — playback continues when switching views (music is never interrupted)

### Design
* Clean white theme with purple/pink accent gradients
* Michroma display font via Google Fonts
* Fully responsive — optimized for desktop, tablet, and mobile
* Reduced motion support — all animations respect `prefers-reduced-motion`
* Accessible focus styles — visible outlines on every interactive element

---

## 🛠 Tech Stack

| Layer | Technology |
| :--- | :--- |
| **Markup** | Semantic HTML5 |
| **Styling** | Vanilla CSS (custom properties, grid, flexbox, animations) |
| **Logic** | Vanilla JavaScript (ES2017+) |
| **Audio** | YouTube IFrame Player API |
| **Background** | Canvas 2D with spatial grid optimization |
| **Fonts** | Google Fonts (Michroma) |
| **Hosting** | GitHub Pages |

No build tools. No dependencies. No `npm install`. Just three files and a folder of images.

---

## 📁 File Structure

    nanatsukaze/
    ├── index.html          # Page structure
    ├── style.css           # All styling
    ├── app.js              # Player logic, gallery, search, background
    ├── data.js             # Song list (edit this to add/remove songs)
    ├── README.md
    └── pictures/
        ├── logo.png        # Splash screen logo
        └── IMG_0703.png    # Header logo

---

## 🚀 Getting Started

### Local Development

1. Clone the repository

    git clone https://github.com/CheongZhiTeng/nanatsukaze.git
    cd nanatsukaze

2. Open `index.html` in your browser.
   That's it. No server, no build step, no dependencies.

   *Note: Because the project loads `data.js` and `app.js` as local scripts, opening via `file://` works in most browsers. For the YouTube iframe API to behave consistently, you may want to serve it locally:*

    python3 -m http.server 8000
    # then open http://localhost:8000

---

## 🎵 Adding Songs

All song data lives in `data.js`. Each entry needs three fields:

    { title: "Song Name", artist: "Nanatsukaze", youtubeLink: "https://youtu.be/VIDEO_ID" }

### Supported YouTube URL formats

The player's URL parser handles all of these:

| Format | Example |
| :--- | :--- |
| Standard watch link | `https://www.youtube.com/watch?v=VIDEO_ID` |
| Short link | `https://youtu.be/VIDEO_ID` |
| Live link | `https://www.youtube.com/live/VIDEO_ID` |
| Shorts | `https://www.youtube.com/shorts/VIDEO_ID` |
| Embed link | `https://www.youtube.com/embed/VIDEO_ID` |
| Bare ID | `VIDEO_ID` (11 characters) |

Extra query parameters (timestamps, tracking, playlists) are automatically ignored.

### Example

    const songs = [
      { title: "Connect the World", artist: "Nanatsukaze", youtubeLink: "https://youtu.be/M-IayQIR0XA" },
      { title: "Harumeku", artist: "Nanatsukaze", youtubeLink: "https://www.youtube.com/live/vCDCepKTQ-Q" },
      { title: "Aria", artist: "Nanatsukaze", youtubeLink: "" }, // no link → shows as unavailable
    ];

Songs with an empty `youtubeLink` appear in the gallery with a "No link" badge and are skipped during playback.

---

## 🌐 Deployment

### GitHub Pages (recommended)

1. Push the repository to GitHub
2. Go to **Settings → Pages**
3. Set **Source** to `Deploy from a branch`
4. Choose `main` branch and `/ (root)` folder
5. Save — the site goes live at `https://<username>.github.io/<repo>/`

### Netlify / Vercel

Drag the project folder onto Netlify Drop or import the repo into Vercel. Both work without configuration.

---

## ⌨️ Keyboard Shortcuts

| Key | Action |
| :--- | :--- |
| `Tab` | Move focus between controls |
| `Enter` / `Space` | Activate focused card, button, or playlist item |
| `Enter` (in search) | Close mobile keyboard |
| `Esc` | Close player, return to gallery |

---

## 🔒 Security Notes

* All dynamic song data (titles, artists) is inserted via `textContent`, never `innerHTML`
* An `escapeHTML()` helper is available for defense-in-depth
* No external tracking, no analytics, no cookies

---

## ♿ Accessibility

* All interactive elements are keyboard reachable
* Visible `:focus-visible` outlines on buttons, cards, links, and inputs
* `aria-label` and `aria-pressed` on stateful controls
* `prefers-reduced-motion` disables all animations for users who request it
* Semantic HTML (`<main>`, `<section>`, `<aside>`, `<nav>`, `<header>`)
* Live regions announce player errors and skips

---

## ⚠️ Known Limitations

* **Background playback on iOS/iPadOS** — browsers pause iframe audio when the tab is minimized or the screen locks. This is an OS-level restriction that cannot be worked around while using the YouTube IFrame API.
* **Embedding restrictions** — some YouTube videos have embedding disabled by their uploader. The player detects these via the `onError` event and automatically skips to the next song.
* **Private/region-locked videos** — will show as unavailable if YouTube blocks access.

---

## 🎨 Customization

### Change the accent color

Edit the CSS variable in `style.css`:

    :root {
      --accent: #6366f1;        /* Primary purple */
      --accent-purple: #a855f7; /* Secondary purple */
      --accent-pink: #ec4899;   /* Pink accent */
    }

### Tune the background particles

In `app.js`, look for `initBackgroundParticles()`:

    const target = Math.min(Math.max(20, Math.floor((w * h) / 22000)), 80);
    //                                ↑ minimum           ↑ density divisor  ↑ maximum

* Lower the divisor (e.g. `18000`) → more particles
* Higher the divisor (e.g. `30000`) → fewer particles

### Adjust animation speed

In `style.css`:

    .bg-grid {
      animation: gridDrift 24s linear infinite; /* ← seconds per full cycle */
    }

---

## 🤝 Contributing

Found a bug or want to add a song link? Pull requests are welcome.

1. Fork the repository
2. Create a branch: `git checkout -b feature/your-feature`
3. Commit your changes: `git commit -m 'Add feature'`
4. Push: `git push origin feature/your-feature`
5. Open a pull request

---

## 📜 Credits

* **Music** — Nanatsukaze (PIKASONIC × nakotanmaru)
* **Font** — Michroma by Vernon Adams (Google Fonts)
* **Icons** — Custom inline SVGs
* **Player** — Built with the YouTube IFrame Player API

**Follow Nanatsukaze**
* 🐦 [X (Twitter)](#)
* 📸 [Instagram](#)
* ▶️ [YouTube](#)

---

## 📄 License

The code in this repository is provided as-is for personal and educational use.

All music, artwork, and trademarks belong to their respective owners — Nanatsukaze, PIKASONIC, and nakotomaruo. This project is an unofficial fan-made music player and is not affiliated with or endorsed by Nanatsukaze.

---

<p align="center">
  <sub>Made with 💜 for Nanatsukaze fans</sub>
</p>
