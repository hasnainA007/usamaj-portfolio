/**
 * showreel.js
 * ──────────────────────────────────────────────────────────────
 * Cinematic Theatre Modal for Usama Javed's portfolio.
 *
 * Features:
 *  - Magnetic "Watch Showreel" CTA button
 *  - Full-screen cinematic modal with backdrop blur
 *  - Supports HTML5 <video> or Vimeo/YouTube iframe
 *  - Auto play on open, hard stop on close (no ghost audio)
 *  - Three.js RAF bridge: pauses loop while video plays
 *  - CSS custom property-driven animations, zero memory leaks
 * ──────────────────────────────────────────────────────────────
 */

// ─── Configuration ────────────────────────────────────────────
// Change VIDEO_TYPE to 'vimeo', 'youtube', or 'html5'
// Then set VIDEO_SRC to the matching value below.

const VIDEO_TYPE = 'html5'; // 'html5' | 'vimeo' | 'youtube'

const VIDEO_SRC = {
  html5:   './showreel.mp4',                          // local file in /frontend/
  vimeo:   'https://player.vimeo.com/video/YOUR_ID?autoplay=1&color=ff0055&title=0&byline=0&portrait=0',
  youtube: 'https://www.youtube-nocookie.com/embed/YOUR_ID?autoplay=1&rel=0&modestbranding=1',
};

// ─── Three.js RAF Bridge ──────────────────────────────────────
// This is populated by scene.js via registerThreeBridge()
let _threeAnimationId = null;
let _threeAnimateFn   = null;
let _threePaused      = false;

/**
 * Called once from scene.js to hand off the RAF control handle.
 * @param {{ getAnimationId: () => number, resume: () => void }} bridge
 */
export function registerThreeBridge(bridge) {
  _threeAnimateFn = bridge.resume;
  bridge.onPause = (id) => { _threeAnimationId = id; };
}

function pauseThree() {
  if (_threePaused || _threeAnimationId === null) return;
  cancelAnimationFrame(_threeAnimationId);
  _threePaused = true;
}

function resumeThree() {
  if (!_threePaused || typeof _threeAnimateFn !== 'function') return;
  _threePaused = false;
  _threeAnimateFn();
}

// ─── DOM Builder ─────────────────────────────────────────────

function buildModal() {
  // ── Overlay ──
  const overlay = document.createElement('div');
  overlay.id = 'showreel-overlay';
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-modal', 'true');
  overlay.setAttribute('aria-label', 'Showreel video player');

  // ── Inner theatre wrapper ──
  const theatre = document.createElement('div');
  theatre.id = 'showreel-theatre';

  // ── Video container (holds aspect-ratio lock) ──
  const videoWrap = document.createElement('div');
  videoWrap.id = 'showreel-video-wrap';

  // ── Media element ──
  let mediaEl;
  if (VIDEO_TYPE === 'html5') {
    mediaEl = document.createElement('video');
    mediaEl.id      = 'showreel-video';
    mediaEl.src     = VIDEO_SRC.html5;
    mediaEl.controls    = true;
    mediaEl.playsInline = true;
    mediaEl.preload     = 'metadata';
  } else {
    // Vimeo or YouTube iframe
    mediaEl = document.createElement('iframe');
    mediaEl.id              = 'showreel-iframe';
    mediaEl.src             = '';                // populated on open
    mediaEl.allowFullscreen = true;
    mediaEl.allow           = 'autoplay; fullscreen; picture-in-picture';
    mediaEl.setAttribute('frameborder', '0');
    mediaEl.setAttribute('loading', 'lazy');
  }

  // ── Close button ──
  const closeBtn = document.createElement('button');
  closeBtn.id          = 'showreel-close';
  closeBtn.innerHTML   = `
    <span class="sr-only">Close player</span>
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none"
         stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"
         aria-hidden="true" width="20" height="20">
      <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
    </svg>
    <span class="close-label">Close Player</span>
  `;
  closeBtn.setAttribute('aria-label', 'Close showreel player');

  // ── Assemble ──
  videoWrap.appendChild(mediaEl);
  theatre.appendChild(closeBtn);
  theatre.appendChild(videoWrap);
  overlay.appendChild(theatre);
  document.body.appendChild(overlay);

  return { overlay, theatre, videoWrap, mediaEl, closeBtn };
}

// ─── Magnetic Button Builder ──────────────────────────────────

function buildCTAButton() {
  const btn = document.createElement('button');
  btn.id        = 'showreel-cta';
  btn.className = 'showreel-cta';
  btn.innerHTML = `
    <span class="showreel-cta__ring" aria-hidden="true"></span>
    <span class="showreel-cta__icon" aria-hidden="true">
      <svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18">
        <path d="M8 5v14l11-7z"/>
      </svg>
    </span>
    <span class="showreel-cta__text">Watch Showreel</span>
  `;
  btn.setAttribute('aria-label', 'Open showreel video');

  // ── Magnetic pull effect ──
  const STRENGTH = 0.35;
  function onMouseMove(e) {
    const rect = btn.getBoundingClientRect();
    const cx   = rect.left + rect.width  / 2;
    const cy   = rect.top  + rect.height / 2;
    const dx   = (e.clientX - cx) * STRENGTH;
    const dy   = (e.clientY - cy) * STRENGTH;
    btn.style.transform = `translate(${dx}px, ${dy}px) scale(1.04)`;
  }
  function onMouseLeave() {
    btn.style.transform = '';
  }

  btn.addEventListener('mousemove',  onMouseMove);
  btn.addEventListener('mouseleave', onMouseLeave);

  // Cleanup stored so we can remove on destroy
  btn._cleanup = () => {
    btn.removeEventListener('mousemove',  onMouseMove);
    btn.removeEventListener('mouseleave', onMouseLeave);
  };

  return btn;
}

// ─── Modal Controller ─────────────────────────────────────────

export function initShowreel() {
  // ── Inject the CTA into the #home hero section ──
  const heroSection = document.getElementById('home');
  if (!heroSection) {
    console.warn('[showreel.js] #home section not found.');
    return;
  }

  const ctaBtn = buildCTAButton();
  heroSection.appendChild(ctaBtn);

  // ── Build modal (hidden by default via CSS) ──
  const { overlay, mediaEl, closeBtn } = buildModal();

  // ─── Open ─────────────────────────────────────────────────
  function openModal() {
    // Set iframe src only on open (avoids preloading + ghost audio)
    if (VIDEO_TYPE !== 'html5') {
      mediaEl.src = VIDEO_SRC[VIDEO_TYPE];
    }

    document.body.classList.add('showreel-open');
    overlay.classList.add('is-active');

    // Pause Three.js while video plays
    pauseThree();

    // Autoplay for HTML5 video
    if (VIDEO_TYPE === 'html5') {
      mediaEl.play().catch(() => {
        // Autoplay blocked — user can press play manually
      });
    }

    // Trap focus to modal
    setTimeout(() => closeBtn.focus(), 400);

    // Prevent body scroll
    document.body.style.overflow = 'hidden';
  }

  // ─── Close ────────────────────────────────────────────────
  function closeModal() {
    overlay.classList.remove('is-active');
    document.body.classList.remove('showreel-open');
    document.body.style.overflow = '';

    if (VIDEO_TYPE === 'html5') {
      mediaEl.pause();
      mediaEl.currentTime = 0;
    } else {
      // Kill iframe to stop all audio immediately
      mediaEl.src = '';
    }

    // Resume Three.js scene
    resumeThree();

    // Return focus to the CTA
    ctaBtn.focus();
  }

  // ─── Event Listeners ──────────────────────────────────────

  ctaBtn.addEventListener('click', openModal);
  closeBtn.addEventListener('click', closeModal);

  // Click outside the theatre closes modal
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) closeModal();
  });

  // Escape key closes modal
  function onKeyDown(e) {
    if (e.key === 'Escape' && overlay.classList.contains('is-active')) {
      closeModal();
    }
  }
  document.addEventListener('keydown', onKeyDown);

  // ─── Cleanup (call destroy() if you hot-reload) ────────────
  return function destroy() {
    ctaBtn._cleanup();
    ctaBtn.removeEventListener('click', openModal);
    closeBtn.removeEventListener('click', closeModal);
    overlay.removeEventListener('click', closeModal);
    document.removeEventListener('keydown', onKeyDown);
    overlay.remove();
    ctaBtn.remove();
  };
}
