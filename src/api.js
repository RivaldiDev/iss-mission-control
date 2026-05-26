// Use Vercel serverless function proxy (works in prod)
// Falls back to Vite proxy (works in dev)
const isDev = import.meta.env?.DEV

const ISS_API = isDev ? '/api/iss-now.json' : '/api/iss?path=now'
const ASTROS_API = isDev ? '/api/astros.json' : '/api/iss?path=astros'

export async function fetchISSPosition() {
  const res = await fetch(ISS_API)
  if (!res.ok) throw new Error(`ISS API failed: ${res.status}`)
  const data = await res.json()
  return {
    latitude: parseFloat(data.iss_position.latitude),
    longitude: parseFloat(data.iss_position.longitude),
    timestamp: data.timestamp
  }
}

export async function fetchAstronauts() {
  const res = await fetch(ASTROS_API)
  if (!res.ok) throw new Error(`Astros API failed: ${res.status}`)
  const data = await res.json()
  return {
    count: data.number,
    people: data.people
  }
}

// Convert lat/lng to 3D position on sphere
export function latLngToVector3(lat, lng, radius = 1) {
  const phi = (90 - lat) * (Math.PI / 180)
  const theta = (lng + 180) * (Math.PI / 180)
  const x = -(radius * Math.sin(phi) * Math.cos(theta))
  const y = radius * Math.cos(phi)
  const z = radius * Math.sin(phi) * Math.sin(theta)
  return { x, y, z }
}

// Smooth lerp between two positions
export function lerpPosition(from, to, t) {
  return {
    latitude: from.latitude + (to.latitude - from.latitude) * t,
    longitude: from.longitude + (to.longitude - from.longitude) * t
  }
}
