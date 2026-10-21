/** Continuous night-sky star field animation.
 * Uses a single canvas layer with a drifting particle system.
 * Lightweight: ~200 stars, no DOM nodes, pure canvas 2D.
 */

function initStarField() {
  const container = document.querySelector('.ambient-bg');
  if (!container || container.querySelector('canvas')) return;

  const canvas = document.createElement('canvas');
  canvas.setAttribute('aria-hidden', 'true');
  container.appendChild(canvas);

  const ctx = canvas.getContext('2d');
  let W = 0, H = 0;
  const STARS = 220;
  const stars = [];

  function resize() {
    W = window.innerWidth;
    H = window.innerHeight;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    canvas.style.width = W + 'px';
    canvas.style.height = H + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function spawn() {
    stars.length = 0;
    for (let i = 0; i < STARS; i++) {
      stars.push({
        x: Math.random() * W,
        y: Math.random() * H,
        r: Math.random() * 1.2 + 0.3,
        speed: Math.random() * 0.35 + 0.1,
        alpha: Math.random() * 0.5 + 0.3,
        twinkle: Math.random() * Math.PI * 2,
      });
    }
  }

  resize();
  spawn();

  let tick = 0;
  let raf = null;

  function draw() {
    tick++;
    ctx.clearRect(0, 0, W, H);
    const time = tick * 0.008;

    for (const s of stars) {
      s.y -= s.speed;
      s.x += Math.sin(time + s.y * 0.003) * 0.15;
      s.twinkle += 0.03;

      // Wrap around
      if (s.y < -2) s.y = H + 2;
      if (s.x < -2) s.x = W + 2;
      if (s.x > W + 2) s.x = -2;

      const alpha = s.alpha * (0.5 + 0.5 * Math.sin(s.twinkle));
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255,255,255,${alpha})`;
      ctx.fill();

      // Soft glow for larger stars
      if (s.r > 0.9) {
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r * 3.5, 0, Math.PI * 2);
        const g = ctx.createRadialGradient(s.x, s.y, 0, s.x, s.y, s.r * 3.5);
        g.addColorStop(0, `rgba(255,255,255,${alpha * 0.35})`);
        g.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.fillStyle = g;
        ctx.fill();
      }
    }

    raf = requestAnimationFrame(draw);
  }

  window.addEventListener('resize', () => {
    resize();
    spawn();
  }, { passive: true });

  draw();

  // Pause when hidden (PerformanceObserver / Page Visibility)
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      if (raf) cancelAnimationFrame(raf);
      raf = null;
    } else {
      if (!raf) draw();
    }
  }, { passive: true });
}

// Auto-start when imported as a module script
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => initStarField());
} else {
  initStarField();
}
