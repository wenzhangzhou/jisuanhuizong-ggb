(() => {
  const canvas = document.getElementById('petal-canvas')
  if (!canvas) return
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

  const ctx = canvas.getContext('2d')
  const petals = []
  const MAX = 72
  let mx = -9999
  let my = -9999
  let last = 0
  let raf = 0
  let ambientAcc = 0

  function resize() {
    canvas.width = window.innerWidth * devicePixelRatio
    canvas.height = window.innerHeight * devicePixelRatio
    canvas.style.width = window.innerWidth + 'px'
    canvas.style.height = window.innerHeight + 'px'
    ctx.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0)
  }

  function spawnAt(x, y, opts = {}) {
    if (petals.length >= MAX) petals.shift()
    const drift = opts.drift || 0
    const angle = opts.angle != null ? opts.angle : Math.random() * Math.PI * 2
    const speed = opts.speed != null ? opts.speed : (0.4 + Math.random() * 1.4)
    petals.push({
      x: x + (Math.random() - 0.5) * (opts.jitter || 10),
      y: y + (Math.random() - 0.5) * (opts.jitter || 10),
      vx: Math.cos(angle) * speed * 0.35 + drift + (Math.random() - 0.5) * 0.35,
      vy: (opts.vy != null ? opts.vy : (0.35 + Math.random() * 1.1)),
      r: opts.r || (4 + Math.random() * 7),
      rot: Math.random() * Math.PI * 2,
      vr: (Math.random() - 0.5) * 0.06,
      life: 1,
      decay: opts.decay || (0.0035 + Math.random() * 0.006),
      hue: 330 + Math.random() * 28,
      wobble: Math.random() * Math.PI * 2
    })
  }

  function spawnTrail(x, y, burst = 1) {
    for (let i = 0; i < burst; i++) spawnAt(x, y)
  }

  /** Ambient petals: top-left band → drift toward bottom-right */
  function spawnAmbient() {
    const w = window.innerWidth
    const h = window.innerHeight
    const along = Math.random()
    // start near top-left diagonal corridor
    const x = -20 + along * w * 0.55 + Math.random() * 40
    const y = -30 + along * h * 0.25 + Math.random() * 30
    spawnAt(x, y, {
      angle: Math.PI * 0.22 + Math.random() * 0.35,
      speed: 0.2 + Math.random() * 0.5,
      drift: 0.45 + Math.random() * 0.55,
      vy: 0.55 + Math.random() * 0.85,
      r: 5 + Math.random() * 9,
      decay: 0.0018 + Math.random() * 0.0025,
      jitter: 24
    })
  }

  function drawPetal(p) {
    ctx.save()
    ctx.translate(p.x, p.y)
    ctx.rotate(p.rot)
    ctx.globalAlpha = Math.max(0, p.life) * 0.85
    const g = ctx.createRadialGradient(0, 0, 0, 0, 0, p.r)
    g.addColorStop(0, `hsla(${p.hue}, 90%, 88%, 1)`)
    g.addColorStop(0.55, `hsla(${p.hue}, 78%, 72%, 0.95)`)
    g.addColorStop(1, `hsla(${p.hue}, 70%, 62%, 0)`)
    ctx.fillStyle = g
    ctx.beginPath()
    ctx.moveTo(0, -p.r)
    ctx.bezierCurveTo(p.r * 0.75, -p.r * 0.35, p.r * 0.75, p.r * 0.45, 0, p.r)
    ctx.bezierCurveTo(-p.r * 0.75, p.r * 0.45, -p.r * 0.75, -p.r * 0.35, 0, -p.r)
    ctx.fill()
    ctx.restore()
  }

  function tick(t) {
    const dt = Math.min(32, t - last || 16)
    last = t
    ctx.clearRect(0, 0, window.innerWidth, window.innerHeight)

    ambientAcc += dt
    // every ~900–1600ms drop 1–3 petals
    const interval = 900 + Math.sin(t * 0.0004) * 200 + 300
    if (ambientAcc > interval) {
      ambientAcc = 0
      const n = 1 + (Math.random() < 0.45 ? 1 : 0) + (Math.random() < 0.2 ? 1 : 0)
      for (let i = 0; i < n; i++) spawnAmbient()
    }

    for (let i = petals.length - 1; i >= 0; i--) {
      const p = petals[i]
      p.wobble += 0.035
      p.vx += Math.sin(p.wobble) * 0.025 + 0.008
      p.vy += 0.01 * (dt / 16)
      p.x += p.vx * (dt / 16) * 2.1
      p.y += p.vy * (dt / 16) * 2.3
      p.rot += p.vr
      p.life -= p.decay * (dt / 16)
      if (p.life <= 0 || p.y > window.innerHeight + 50 || p.x > window.innerWidth + 60) {
        petals.splice(i, 1)
        continue
      }
      drawPetal(p)
    }
    raf = requestAnimationFrame(tick)
  }

  window.addEventListener('pointermove', (e) => {
    const dx = e.clientX - mx
    const dy = e.clientY - my
    const dist = Math.hypot(dx, dy)
    mx = e.clientX
    my = e.clientY
    if (dist > 6) spawnTrail(mx, my, dist > 28 ? 2 : 1)
  }, { passive: true })

  window.addEventListener('pointerdown', (e) => {
    spawnTrail(e.clientX, e.clientY, 5)
  }, { passive: true })

  window.addEventListener('resize', resize)
  resize()
  for (let i = 0; i < 6; i++) spawnAmbient()
  raf = requestAnimationFrame(tick)

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) cancelAnimationFrame(raf)
    else {
      last = performance.now()
      raf = requestAnimationFrame(tick)
    }
  })
})()
