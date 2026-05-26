export default async function handler(req, res) {
  const { path = '' } = req.query
  
  const endpoints = {
    'now': 'http://api.open-notify.org/iss-now.json',
    'astros': 'http://api.open-notify.org/astros.json',
  }
  
  const targetUrl = endpoints[path]
  if (!targetUrl) {
    return res.status(404).json({ error: 'Unknown endpoint. Use ?path=now or ?path=astros' })
  }
  
  try {
    const response = await fetch(targetUrl)
    const data = await response.json()
    res.setHeader('Access-Control-Allow-Origin', '*')
    res.setHeader('Cache-Control', 's-maxage=5, stale-while-revalidate')
    return res.status(200).json(data)
  } catch (err) {
    return res.status(502).json({ error: 'API fetch failed', message: err.message })
  }
}
