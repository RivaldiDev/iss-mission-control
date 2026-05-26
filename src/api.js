const ISS_API = 'https://api.open-notify.org/iss-now.json'
const ASTROS_API = 'https://api.open-notify.org/astros.json'

export async function fetchISSPosition() {
  const res = await fetch(ISS_API)
  const data = await res.json()
  return {
    latitude: parseFloat(data.iss_position.latitude),
    longitude: parseFloat(data.iss_position.longitude),
    timestamp: data.timestamp
  }
}

export async function fetchAstronauts() {
  const res = await fetch(ASTROS_API)
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
