import axios from 'axios'

const api = axios.create({
  baseURL: 'http://localhost:8000',
  timeout: 10000,
})

export async function createEmergency(payload) {
  const res = await api.post('/api/emergencies', payload)
  return res.data
}

export async function fetchResponders() {
  const res = await api.get('/api/responders')
  return res.data
}

export async function fetchEmergency(id) {
  const res = await api.get(`/api/emergencies/${id}`)
  return res.data
}

export async function createUser(payload) {
  const res = await api.post('/api/users', payload)
  return res.data
}

export async function fetchUser(id) {
  const res = await api.get(`/api/users/${id}`)
  return res.data
}

export async function addContact(userId, payload) {
  const res = await api.post(`/api/users/${userId}/contacts`, payload)
  return res.data
}

export async function fetchEmergencies() {
  const res = await api.get('/api/emergencies')
  return res.data
}

export async function updateEmergencyStatus(id, status) {
  const res = await api.patch(`/api/emergencies/${id}/status`, { status })
  return res.data
}

export async function assignResponder(id, responderId) {
  const res = await api.post(`/api/emergencies/${id}/assign`, null, {
    params: responderId ? { responder_id: responderId } : {},
  })
  return res.data
}

export async function fetchNearbyResponders(lat, lng, severity) {
  const res = await api.get('/api/responders/nearby', { params: { lat, lng, severity } })
  return res.data
}

export default api
