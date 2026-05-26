import * as THREE from 'three'
import { latLngToVector3 } from './api.js'

const GLOBE_RADIUS = 1
const ISS_ALTITUDE = 0.15

let scene, camera, renderer, globe, issMarker, orbitTrail
let trailPoints = []
let animationId
let targetRotation = { x: 0, y: 0 }
let isDragging = false
let lastMouse = { x: 0, y: 0 }
let autoRotate = true

export function initGlobe(container) {
  const width = container.clientWidth
  const height = container.clientHeight

  // Scene
  scene = new THREE.Scene()
  scene.background = null // transparent, starfield shows through

  // Camera
  camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100)
  camera.position.z = 3

  // Renderer — fail explicitly if WebGL unavailable
  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
  if (!renderer.getContext()) {
    throw new Error('WebGL context not available')
  }
  renderer.setSize(width, height)
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
  container.appendChild(renderer.domElement)

  // Globe (wireframe sphere)
  const globeGeo = new THREE.SphereGeometry(GLOBE_RADIUS, 48, 48)
  const globeMat = new THREE.MeshBasicMaterial({
    color: 0x2d3a2e,
    wireframe: true,
    transparent: true,
    opacity: 0.15
  })
  globe = new THREE.Mesh(globeGeo, globeMat)
  scene.add(globe)

  // Atmosphere glow
  const glowGeo = new THREE.SphereGeometry(GLOBE_RADIUS * 1.05, 48, 48)
  const glowMat = new THREE.MeshBasicMaterial({
    color: 0xc47a50,
    transparent: true,
    opacity: 0.05,
    side: THREE.BackSide
  })
  const glow = new THREE.Mesh(glowGeo, glowMat)
  globe.add(glow)

  // Grid lines (equator, tropics)
  addGridLine(0, 0xc47a50, 0.1) // equator
  addGridLine(23.5, 0xc47a50, 0.04) // tropic of cancer
  addGridLine(-23.5, 0xc47a50, 0.04) // tropic of capricorn

  // ISS Marker (glowing dot) — child of globe so it rotates with it
  const issGeo = new THREE.SphereGeometry(0.025, 16, 16)
  const issMat = new THREE.MeshBasicMaterial({ color: 0xc47a50 })
  issMarker = new THREE.Mesh(issGeo, issMat)
  globe.add(issMarker)

  // ISS glow ring
  const ringGeo = new THREE.RingGeometry(0.03, 0.05, 32)
  const ringMat = new THREE.MeshBasicMaterial({
    color: 0xc47a50,
    transparent: true,
    opacity: 0.4,
    side: THREE.DoubleSide
  })
  const ring = new THREE.Mesh(ringGeo, ringMat)
  issMarker.add(ring)

  // Orbit trail — also child of globe
  const trailMat = new THREE.LineBasicMaterial({
    color: 0xc47a50,
    transparent: true,
    opacity: 0.3
  })
  const trailGeo = new THREE.BufferGeometry()
  orbitTrail = new THREE.Line(trailGeo, trailMat)
  globe.add(orbitTrail)

  // Stars
  addStars(1500)

  // Mouse/touch controls
  setupControls(container)

  // Resize handler
  const resizeObserver = new ResizeObserver(() => {
    const w = container.clientWidth
    const h = container.clientHeight
    camera.aspect = w / h
    camera.updateProjectionMatrix()
    renderer.setSize(w, h)
  })
  resizeObserver.observe(container)

  // Start render loop
  animate()

  return { scene, camera, renderer, globe, issMarker }
}

function addGridLine(lat, color, opacity) {
  const segments = 128
  const points = []
  const phi = (90 - lat) * (Math.PI / 180)
  for (let i = 0; i <= segments; i++) {
    const theta = (i / segments) * Math.PI * 2
    const r = GLOBE_RADIUS * 1.001
    points.push(new THREE.Vector3(
      -(r * Math.sin(phi) * Math.cos(theta)),
      r * Math.cos(phi),
      r * Math.sin(phi) * Math.sin(theta)
    ))
  }
  const geo = new THREE.BufferGeometry().setFromPoints(points)
  const mat = new THREE.LineBasicMaterial({ color, transparent: true, opacity })
  globe.add(new THREE.Line(geo, mat))
}

function addStars(count) {
  const positions = new Float32Array(count * 3)
  for (let i = 0; i < count; i++) {
    const r = 15 + Math.random() * 35
    const theta = Math.random() * Math.PI * 2
    const phi = Math.acos(2 * Math.random() - 1)
    positions[i * 3] = r * Math.sin(phi) * Math.cos(theta)
    positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta)
    positions[i * 3 + 2] = r * Math.cos(phi)
  }
  const geo = new THREE.BufferGeometry()
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3))
  const mat = new THREE.PointsMaterial({ color: 0xffffff, size: 0.08, transparent: true, opacity: 0.7 })
  scene.add(new THREE.Points(geo, mat))
}

function setupControls(container) {
  container.addEventListener('mousedown', (e) => {
    isDragging = true
    autoRotate = false
    lastMouse = { x: e.clientX, y: e.clientY }
  })

  container.addEventListener('mousemove', (e) => {
    if (!isDragging) return
    const dx = e.clientX - lastMouse.x
    const dy = e.clientY - lastMouse.y
    targetRotation.y += dx * 0.005
    targetRotation.x += dy * 0.005
    targetRotation.x = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, targetRotation.x))
    lastMouse = { x: e.clientX, y: e.clientY }
  })

  container.addEventListener('mouseup', () => {
    isDragging = false
    setTimeout(() => { autoRotate = true }, 3000)
  })

  container.addEventListener('mouseleave', () => {
    isDragging = false
  })

  // Touch support
  container.addEventListener('touchstart', (e) => {
    isDragging = true
    autoRotate = false
    lastMouse = { x: e.touches[0].clientX, y: e.touches[0].clientY }
  }, { passive: true })

  container.addEventListener('touchmove', (e) => {
    if (!isDragging) return
    const dx = e.touches[0].clientX - lastMouse.x
    const dy = e.touches[0].clientY - lastMouse.y
    targetRotation.y += dx * 0.005
    targetRotation.x += dy * 0.005
    targetRotation.x = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, targetRotation.x))
    lastMouse = { x: e.touches[0].clientX, y: e.touches[0].clientY }
  }, { passive: true })

  container.addEventListener('touchend', () => {
    isDragging = false
    setTimeout(() => { autoRotate = true }, 3000)
  })
}

export function updateISSPosition(lat, lng) {
  const pos = latLngToVector3(lat, lng, GLOBE_RADIUS + ISS_ALTITUDE)
  issMarker.position.set(pos.x, pos.y, pos.z)

  // Add to trail
  trailPoints.push(new THREE.Vector3(pos.x, pos.y, pos.z))
  if (trailPoints.length > 200) trailPoints.shift()

  const trailGeo = new THREE.BufferGeometry().setFromPoints(trailPoints)
  orbitTrail.geometry.dispose()
  orbitTrail.geometry = trailGeo
}

function animate() {
  animationId = requestAnimationFrame(animate)

  if (autoRotate) {
    targetRotation.y += 0.002
  }

  globe.rotation.x += (targetRotation.x - globe.rotation.x) * 0.05
  globe.rotation.y += (targetRotation.y - globe.rotation.y) * 0.05

  // Pulse ISS marker
  const pulse = 1 + Math.sin(Date.now() * 0.003) * 0.3
  issMarker.scale.setScalar(pulse)

  renderer.render(scene, camera)
}

export function destroyGlobe() {
  cancelAnimationFrame(animationId)
  renderer?.dispose()
}
