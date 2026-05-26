import Alpine from 'alpinejs'
import { animate, scroll, inView, stagger, spring } from 'motion'
import { initGlobe, updateISSPosition, destroyGlobe } from './globe.js'
import { fetchISSPosition, fetchAstronauts, lerpPosition } from './api.js'
import './style.css'

// Alpine store for ISS data
Alpine.store('iss', {
  latitude: 0,
  longitude: 0,
  speed: '27,600',
  altitude: '408',
  timestamp: null,
  people: [],
  crewCount: 0,
  loading: true,
  error: null,
  orbitCount: 0,

  get latDisplay() {
    return this.latitude.toFixed(4) + '°' + (this.latitude >= 0 ? 'N' : 'S')
  },
  get lngDisplay() {
    return this.longitude.toFixed(4) + '°' + (this.longitude >= 0 ? 'E' : 'W')
  }
})

// Motion One animation controller
function initAnimations() {
  // === HERO ENTRANCE ===
  animate(
    '[data-animate="hero"]',
    { opacity: [0, 1], y: [40, 0] },
    { duration: 1, easing: [0.22, 1, 0.36, 1] }
  )

  // === STATS — staggered entrance ===
  animate(
    '[data-animate="stat"]',
    { opacity: [0, 1], y: [30, 0] },
    { duration: 0.8, delay: stagger(0.15, { start: 0.3 }), easing: [0.22, 1, 0.36, 1] }
  )

  // === GLOBE — spring scale entrance ===
  animate(
    '[data-animate="globe"]',
    { opacity: [0, 1], scale: [0.85, 1] },
    { duration: 0.8, easing: spring(0.6, 0.15) }
  )

  // === CREW CARDS — staggered ===
  animate(
    '[data-animate="crew"]',
    { opacity: [0, 1], y: [20, 0] },
    { duration: 0.6, delay: stagger(0.1, { start: 0.8 }), easing: [0.22, 1, 0.36, 1] }
  )

  // === SCROLL-TRIGGERED: About section ===
  inView('[data-animate="about"]', (info) => {
    animate(
      info.target,
      { opacity: [0, 1], y: [50, 0] },
      { duration: 0.8, easing: [0.22, 1, 0.36, 1] }
    )
  }, { amount: 0.3 })

  // === SCROLL-TRIGGERED: Orbit info ===
  inView('[data-animate="orbit-info"]', (info) => {
    animate(
      info.target.querySelectorAll('.orbit-detail'),
      { opacity: [0, 1], x: [-20, 0] },
      { duration: 0.6, delay: stagger(0.12), easing: [0.22, 1, 0.36, 1] }
    )
  }, { amount: 0.2 })

  // === SCROLL-LINKED: Parallax on hero background ===
  const heroBg = document.querySelector('[data-parallax]')
  if (heroBg) {
    scroll(
      animate(heroBg, { y: [-50, 50] }),
      { target: heroBg, offset: ['start end', 'end start'] }
    )
  }

  // === SCROLL-LINKED: Progress bar ===
  const progressBar = document.querySelector('[data-scroll-progress]')
  if (progressBar) {
    scroll(animate(progressBar, { scaleX: [0, 1] }))
  }
}

// ISS tracking controller
Alpine.data('issTracker', () => ({
  interval: null,
  lastPos: null,
  targetPos: null,
  lerpProgress: 1,
  globeReady: false,

  async init() {
    const store = Alpine.store('iss')

    try {
      const [issData, astroData] = await Promise.all([
        fetchISSPosition(),
        fetchAstronauts()
      ])

      store.latitude = issData.latitude
      store.longitude = issData.longitude
      store.timestamp = issData.timestamp
      store.people = astroData.people
      store.crewCount = astroData.count
      store.loading = false

      this.lastPos = { latitude: issData.latitude, longitude: issData.longitude }

      // Init globe (non-fatal — WebGL may not be available)
      try {
        const container = document.getElementById('globe-container')
        if (container) {
          initGlobe(container)
          updateISSPosition(issData.latitude, issData.longitude)
          this.globeReady = true
        }
      } catch (globeErr) {
        console.warn('Globe init failed:', globeErr.message)
      }

      // Animate entrance with Motion One
      initAnimations()

      // Start polling every 5 seconds
      this.interval = setInterval(() => this.pollISS(), 5000)

    } catch (err) {
      console.error('ISS init error:', err.message)
      store.error = err.message
      store.loading = false
    }
  },

  async pollISS() {
    try {
      const data = await fetchISSPosition()
      const store = Alpine.store('iss')

      this.lastPos = { latitude: store.latitude, longitude: store.longitude }
      this.targetPos = { latitude: data.latitude, longitude: data.longitude }
      this.lerpProgress = 0

      const lerpInterval = setInterval(() => {
        this.lerpProgress += 0.02
        if (this.lerpProgress >= 1) {
          this.lerpProgress = 1
          clearInterval(lerpInterval)
        }
        const pos = lerpPosition(this.lastPos, this.targetPos, this.lerpProgress)
        store.latitude = pos.latitude
        store.longitude = pos.longitude

        if (this.globeReady) {
          updateISSPosition(pos.latitude, pos.longitude)
        }
      }, 100)

    } catch (err) {
      console.error('ISS poll error:', err)
    }
  },

  destroy() {
    clearInterval(this.interval)
    destroyGlobe()
  }
}))

// Start Alpine
Alpine.start()
