import * as THREE from 'three'
import { latLngToVector3 } from './api.js'

const GLOBE_RADIUS = 1
const ISS_ALTITUDE = 0.15

let scene, camera, renderer, globe, issMarker, orbitTrail
let trailPoints = []
let animationId
let targetRotation = { x: 0.3, y: 0 }
let isDragging = false
let lastMouse = { x: 0, y: 0 }
let autoRotate = true

export function initGlobe(container) {
  const width = container.clientWidth
  const height = container.clientHeight

  scene = new THREE.Scene()

  camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100)
  camera.position.z = 2.8

  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
  if (!renderer.getContext()) {
    throw new Error('WebGL context not available')
  }
  renderer.setSize(width, height)
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
  container.appendChild(renderer.domElement)

  // Sun light from the side for day/night effect
  const sunLight = new THREE.DirectionalLight(0xffffff, 2.5)
  sunLight.position.set(5, 3, 5)
  scene.add(sunLight)

  const ambientLight = new THREE.AmbientLight(0x404060, 0.8)
  scene.add(ambientLight)

  // Earth textures from three-globe package (NASA Blue Marble)
  const textureLoader = new THREE.TextureLoader()
  const earthMap = textureLoader.load('https://unpkg.com/three-globe@2.35.1/example/img/earth-blue-marble.jpg')
  const bumpMap = textureLoader.load('https://unpkg.com/three-globe@2.35.1/example/img/earth-topology.png')
  const cloudsMap = textureLoader.load('https://unpkg.com/three-globe@2.35.1/example/img/earth-clouds.png')

  // Earth sphere with realistic texture
  const globeGeo = new THREE.SphereGeometry(GLOBE_RADIUS, 64, 64)
  const earthMaterial = new THREE.MeshPhongMaterial({
    map: earthMap,
    bumpMap: bumpMap,
    bumpScale: 0.03,
    specular: new THREE.Color(0x333333),
    shininess: 15,
  })
  globe = new THREE.Mesh(globeGeo, earthMaterial)
  scene.add(globe)

  // Clouds layer
  const cloudsGeo = new THREE.SphereGeometry(GLOBE_RADIUS * 1.008, 64, 64)
  const cloudsMat = new THREE.MeshPhongMaterial({
    map: cloudsMap,
    transparent: true,
    opacity: 0.35,
    depthWrite: false,
  })
  const clouds = new THREE.Mesh(cloudsGeo, cloudsMat)
  globe.add(clouds)

  // Atmosphere edge glow
  const glowGeo = new THREE.SphereGeometry(GLOBE_RADIUS * 1.15, 64, 64)
  const glowMat = new THREE.ShaderMaterial({
    uniforms: {
      glowColor: { value: new THREE.Color(0x4a90d9) },
      viewVector: { value: camera.position },
    },
    vertexShader: `
      uniform vec3 viewVector;
      varying float intensity;
      void main() {
        vec3 vNormal = normalize(normalMatrix * normal);
        vec3 vNormel = normalize(normalMatrix * viewVector);
        intensity = pow(0.65 - dot(vNormal, vec3(0, 0, 1.0)), 2.0);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform vec3 glowColor;
      varying float intensity;
      void main() {
        vec3 glow = glowColor * intensity;
        gl_FragColor = vec4(glow, intensity * 0.6);
      }
    `,
    side: THREE.BackSide,
    blending: THREE.AdditiveBlending,
    transparent: true,
  })
  const glow = new THREE.Mesh(glowGeo, glowMat)
  scene.add(glow)

  // ISS Marker - red dot, child of globe so it rotates with Earth
  const issGeo = new THREE.SphereGeometry(0.018, 16, 16)
  const issMat = new THREE.MeshBasicMaterial({ color: 0xff4444 })
  issMarker = new THREE.Mesh(issGeo, issMat)
  globe.add(issMarker)

  // ISS pulsing ring
  const ringGeo = new THREE.RingGeometry(0.025, 0.045, 32)
  const ringMat = new THREE.MeshBasicMaterial({
    color: 0xff4444,
    transparent: true,
    opacity: 0.5,
    side: THREE.DoubleSide
  })
  const ring = new THREE.Mesh(ringGeo, ringMat)
  issMarker.add(ring)

  // Orbit trail
  const trailMat = new THREE.LineBasicMaterial({
    color: 0xff6644,
    transparent: true,
    opacity: 0.6
  })
  const trailGeo = new THREE.BufferGeometry()
  orbitTrail = new THREE.Line(trailGeo, trailMat)
  globe.add(orbitTrail)

  // Stars
  addStars(2000)

  // Controls
  setupControls(container)

  // Resize
  const resizeObserver = new ResizeObserver(() => {
    const w = container.clientWidth
    const h = container.clientHeight
    camera.aspect = w / h
    camera.updateProjectionMatrix()
    renderer.setSize(w, h)
  })
  resizeObserver.observe(container)

  animate()

  return { scene, camera, renderer, globe, issMarker }
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
  const mat = new THREE.PointsMaterial({ color: 0xffffff, size: 0.06, transparent: true, opacity: 0.8 })
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

  trailPoints.push(new THREE.Vector3(pos.x, pos.y, pos.z))
  if (trailPoints.length > 300) trailPoints.shift()

  const trailGeo = new THREE.BufferGeometry().setFromPoints(trailPoints)
  orbitTrail.geometry.dispose()
  orbitTrail.geometry = trailGeo
}

function animate() {
  animationId = requestAnimationFrame(animate)

  if (autoRotate) {
    targetRotation.y += 0.001
  }

  globe.rotation.x += (targetRotation.x - globe.rotation.x) * 0.05
  globe.rotation.y += (targetRotation.y - globe.rotation.y) * 0.05

  const pulse = 1 + Math.sin(Date.now() * 0.003) * 0.3
  issMarker.scale.setScalar(pulse)

  renderer.render(scene, camera)
}

export function destroyGlobe() {
  cancelAnimationFrame(animationId)
  renderer?.dispose()
}
