import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from './supabase.js'

// ─── HELPERS ─────────────────────────────────────────────────
const todayStr = () => new Date().toISOString().split('T')[0]
const fmtDate = (d) => new Date(d + 'T00:00:00').toLocaleDateString('fr-CH', { weekday: 'short', day: 'numeric', month: 'short' })
const fmtTime = (d) => new Date(d).toLocaleTimeString('fr-CH', { hour: '2-digit', minute: '2-digit' })
const timeAgo = (d) => {
  if (!d) return ''
  const s = Math.floor((Date.now() - new Date(d)) / 1000)
  if (s < 60) return "à l'instant"
  if (s < 3600) return `il y a ${Math.floor(s / 60)} min`
  if (s < 86400) return `il y a ${Math.floor(s / 3600)}h`
  return fmtDate(new Date(d).toISOString().split('T')[0])
}

function downloadCSV(filename, rows) {
  const BOM = '\uFEFF'
  const csv = BOM + rows.map(r => r.map(c => `"${String(c ?? '').replace(/"/g, '""')}"`).join(';')).join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = filename
  a.click()
}

// Get week days starting from a date
function getWeekDays(baseDate) {
  const d = new Date(baseDate)
  const day = d.getDay()
  const monday = new Date(d)
  monday.setDate(d.getDate() - (day === 0 ? 6 : day - 1))
  const days = []
  for (let i = 0; i < 7; i++) {
    const dd = new Date(monday)
    dd.setDate(monday.getDate() + i)
    days.push(dd.toISOString().split('T')[0])
  }
  return days
}

// ─── ICONS ───────────────────────────────────────────────────
const Icon = ({ d, size = 20, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d={d} />
  </svg>
)
const I = {
  truck: 'M1 3h15v13H1zM16 8h4l3 3v5h-7V8zM5.5 18.5a2.5 2.5 0 100-5 2.5 2.5 0 000 5zM18.5 18.5a2.5 2.5 0 100-5 2.5 2.5 0 000 5z',
  users: 'M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M9 11a4 4 0 100-8 4 4 0 000 8zM23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75',
  chart: 'M18 20V10M12 20V4M6 20v-6',
  check: 'M20 6L9 17l-5-5',
  plus: 'M12 5v14M5 12h14',
  phone: 'M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72 12.84 12.84 0 00.7 2.81 2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45 12.84 12.84 0 002.81.7A2 2 0 0122 16.92z',
  map: 'M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0zM12 13a3 3 0 100-6 3 3 0 000 6z',
  back: 'M19 12H5M12 19l-7-7 7-7',
  save: 'M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2zM17 21v-8H7v8M7 3v5h8',
  download: 'M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3',
  refresh: 'M23 4v6h-6M1 20v-6h6M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15',
  trash: 'M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2',
  settings: 'M12 15a3 3 0 100-6 3 3 0 000 6zM19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z',
  image: 'M5 3h14a2 2 0 012 2v14a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2zM8.5 10a1.5 1.5 0 100-3 1.5 1.5 0 000 3zM21 15l-5-5L5 21',
  calendar: 'M19 4H5a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2V6a2 2 0 00-2-2zM16 2v4M8 2v4M3 10h18',
  wifi: 'M1 1l22 22M16.72 11.06A10.94 10.94 0 015 12c-1.18 0-2.31-.19-3.38-.53M5 12.55a10.94 10.94 0 0112.6 1.64M8.53 16.11a6 6 0 016.95 0M12 20h.01',
  wifiOn: 'M5 12.55a11 11 0 0114.08 0M1.42 9a16 16 0 0121.16 0M8.53 16.11a6 6 0 016.95 0M12 20h.01',
  copy: 'M20 9h-9a2 2 0 00-2 2v9a2 2 0 002 2h9a2 2 0 002-2v-9a2 2 0 00-2-2zM5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1',
  chevL: 'M15 18l-6-6 6-6',
  chevR: 'M9 18l6-6-6-6',
}

// ─── COLORS & STYLES ─────────────────────────────────────────
const C = {
  bg: '#0f1115', card: '#1a1d24', cardHover: '#22262f',
  accent: '#e8593c', accentSoft: 'rgba(232,89,60,0.12)',
  green: '#34d399', greenSoft: 'rgba(52,211,153,0.12)',
  yellow: '#fbbf24', yellowSoft: 'rgba(251,191,36,0.12)',
  blue: '#60a5fa', blueSoft: 'rgba(96,165,250,0.12)',
  text: '#e8e8ec', muted: '#8b8d97',
  border: '#2a2d36', input: '#14161b',
}

const S = {
  app: { background: C.bg, color: C.text, minHeight: '100vh', fontFamily: "'DM Sans', sans-serif", fontSize: 14 },
  header: {
    background: 'linear-gradient(135deg, #1a1d24 0%, #0f1115 100%)',
    borderBottom: `1px solid ${C.border}`, padding: '12px 16px',
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    position: 'sticky', top: 0, zIndex: 50,
  },
  logo: { display: 'flex', alignItems: 'center', gap: 8 },
  logoText: { fontSize: 16, fontWeight: 700, letterSpacing: '-0.02em' },
  logoSub: { fontSize: 10, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.08em' },
  nav: { display: 'flex', gap: 2, background: C.input, borderRadius: 10, padding: 3, flexWrap: 'wrap' },
  navBtn: (a) => ({
    padding: '7px 10px', borderRadius: 8, border: 'none', cursor: 'pointer',
    fontSize: 11, fontWeight: 600, transition: 'all 0.2s',
    background: a ? C.accent : 'transparent', color: a ? '#fff' : C.muted,
    display: 'flex', alignItems: 'center', gap: 4,
  }),
  page: { padding: '16px', maxWidth: 700, margin: '0 auto', paddingBottom: 80 },
  section: { fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: C.muted, marginBottom: 10 },
  card: { background: C.card, borderRadius: 12, padding: 14, marginBottom: 8, border: `1px solid ${C.border}` },
  badge: (color, bg) => ({
    display: 'inline-flex', alignItems: 'center', gap: 3,
    padding: '2px 8px', borderRadius: 20, fontSize: 11, fontWeight: 600, color, background: bg,
  }),
  btn: (v = 'primary') => ({
    padding: '10px 18px', borderRadius: 10, border: 'none', cursor: 'pointer',
    fontSize: 13, fontWeight: 600, transition: 'all 0.2s',
    display: 'inline-flex', alignItems: 'center', gap: 5,
    ...(v === 'primary' ? { background: C.accent, color: '#fff' } :
      v === 'ghost' ? { background: 'transparent', color: C.muted, padding: '8px 12px' } :
      v === 'green' ? { background: C.green, color: '#000' } :
      v === 'danger' ? { background: '#ef4444', color: '#fff' } :
      { background: C.input, color: C.text, border: `1px solid ${C.border}` }),
  }),
  bigBtn: (v = 'primary') => ({
    padding: '14px 24px', borderRadius: 12, border: 'none', cursor: 'pointer',
    fontSize: 15, fontWeight: 700, transition: 'all 0.2s', width: '100%',
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
    ...(v === 'primary' ? { background: C.accent, color: '#fff' } :
      v === 'green' ? { background: C.green, color: '#000' } :
      { background: C.input, color: C.text, border: `1px solid ${C.border}` }),
  }),
  input: {
    width: '100%', padding: '11px 14px', borderRadius: 10, boxSizing: 'border-box',
    border: `1px solid ${C.border}`, background: C.input, color: C.text, fontSize: 15, outline: 'none',
  },
  select: {
    width: '100%', padding: '11px 14px', borderRadius: 10, boxSizing: 'border-box',
    border: `1px solid ${C.border}`, background: C.input, color: C.text, fontSize: 15, outline: 'none',
  },
  label: { fontSize: 12, fontWeight: 600, color: C.muted, marginBottom: 4, display: 'block' },
  stat: { background: C.card, borderRadius: 12, padding: 14, border: `1px solid ${C.border}`, textAlign: 'center', flex: 1 },
  statN: { fontSize: 26, fontWeight: 800, letterSpacing: '-0.02em' },
  statL: { fontSize: 10, color: C.muted, marginTop: 2 },
  th: {
    textAlign: 'left', padding: '8px 10px', borderBottom: `2px solid ${C.border}`,
    fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: C.muted,
  },
  td: { padding: '8px 10px', borderBottom: `1px solid ${C.border}`, fontSize: 13 },
  modal: {
    position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)',
    display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: 16,
  },
  modalC: {
    background: C.card, borderRadius: 16, padding: 20, width: '100%', maxWidth: 420,
    maxHeight: '85vh', overflowY: 'auto', border: `1px solid ${C.border}`,
  },
}

// ─── TOAST NOTIFICATION ──────────────────────────────────────
function Toast({ message, type = 'info', onClose }) {
  useEffect(() => {
    const t = setTimeout(onClose, 4000)
    return () => clearTimeout(t)
  }, [onClose])
  const bg = type === 'success' ? C.green : type === 'error' ? '#ef4444' : type === 'new' ? C.blue : C.yellow
  return (
    <div style={{
      position: 'fixed', top: 70, left: '50%', transform: 'translateX(-50%)',
      background: bg, color: type === 'success' || type === 'new' ? '#000' : '#fff',
      padding: '12px 24px', borderRadius: 12, fontSize: 14, fontWeight: 600,
      zIndex: 200, boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
      animation: 'slideDown 0.3s ease-out',
      maxWidth: '90vw', textAlign: 'center',
    }}>
      {message}
      <style>{`@keyframes slideDown { from { opacity:0; transform: translateX(-50%) translateY(-20px); } to { opacity:1; transform: translateX(-50%) translateY(0); } }`}</style>
    </div>
  )
}

// ─── CONNECTION STATUS ───────────────────────────────────────
function ConnectionStatus({ lastUpdate }) {
  const [online, setOnline] = useState(navigator.onLine)
  useEffect(() => {
    const on = () => setOnline(true)
    const off = () => setOnline(false)
    window.addEventListener('online', on)
    window.addEventListener('offline', off)
    return () => { window.removeEventListener('online', on); window.removeEventListener('offline', off) }
  }, [])
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: C.muted, padding: '4px 0' }}>
      <div style={{ width: 8, height: 8, borderRadius: '50%', background: online ? C.green : '#ef4444' }} />
      {online ? 'Connecté' : 'Hors ligne'}
      {lastUpdate && <span> · Mis à jour {timeAgo(lastUpdate)}</span>}
    </div>
  )
}

// ─── IMAGE UPLOAD ────────────────────────────────────────────
async function uploadImage(file, clientId) {
  const ext = file.name.split('.').pop()
  const path = `${clientId}/${Date.now()}.${ext}`
  const { data, error } = await supabase.storage
    .from('client-images')
    .upload(path, file, { cacheControl: '3600', upsert: false })
  if (error) throw error
  const { data: urlData } = supabase.storage.from('client-images').getPublicUrl(path)
  return urlData.publicUrl
}

// ─── DATA HOOK ───────────────────────────────────────────────
function useSupabase() {
  const [clients, setClients] = useState([])
  const [drivers, setDrivers] = useState([])
  const [deliveries, setDeliveries] = useState([])
  const [sections, setSections] = useState([])
  const [clientImages, setClientImages] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [lastUpdate, setLastUpdate] = useState(null)
  const [toast, setToast] = useState(null)
  const prevDeliveryCount = useRef(0)

  const fetchAll = useCallback(async () => {
    try {
      setError(null)
      const [cRes, dRes, delRes, sRes, imgRes] = await Promise.all([
        supabase.from('clients').select('*').eq('active', true).order('name'),
        supabase.from('drivers').select('*').eq('active', true).order('name'),
        supabase.from('deliveries').select('*').order('date', { ascending: false }),
        supabase.from('sections').select('*').eq('active', true).order('name'),
        supabase.from('client_images').select('*').order('created_at', { ascending: false }),
      ])
      if (cRes.error) throw cRes.error
      if (dRes.error) throw dRes.error
      if (delRes.error) throw delRes.error
      setClients(cRes.data)
      setDrivers(dRes.data)
      setDeliveries(delRes.data)
      setSections(sRes.error ? [] : sRes.data)
      setClientImages(imgRes.error ? [] : imgRes.data)
      setLastUpdate(new Date().toISOString())

      // Notification for new deliveries
      const todayDel = delRes.data.filter(d => d.date === todayStr())
      if (prevDeliveryCount.current > 0 && todayDel.length > prevDeliveryCount.current) {
        setToast({ message: '📦 Nouvelle livraison ajoutée !', type: 'new' })
      }
      prevDeliveryCount.current = todayDel.length
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchAll() }, [fetchAll])

  useEffect(() => {
    const channel = supabase
      .channel('cotting-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'deliveries' }, () => fetchAll())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'clients' }, () => fetchAll())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'drivers' }, () => fetchAll())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'sections' }, () => fetchAll())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'client_images' }, () => fetchAll())
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [fetchAll])

  const showToast = useCallback((message, type = 'success') => setToast({ message, type }), [])

  return { clients, drivers, deliveries, sections, clientImages, loading, error, lastUpdate, toast, setToast, showToast, refresh: fetchAll }
}

// ─── MAIN APP ────────────────────────────────────────────────
export default function App() {
  const [view, setView] = useState('driver')
  const db = useSupabase()

  if (db.loading) return (
    <div style={{ ...S.app, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 48, marginBottom: 12 }}>🐷</div>
        <div style={{ color: C.muted, fontSize: 15 }}>Chargement...</div>
      </div>
    </div>
  )

  if (db.error) return (
    <div style={{ ...S.app, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ textAlign: 'center', padding: 24 }}>
        <div style={{ fontSize: 48, marginBottom: 12 }}>⚠️</div>
        <div style={{ color: C.accent, marginBottom: 8, fontSize: 16, fontWeight: 700 }}>Pas de connexion</div>
        <div style={{ color: C.muted, fontSize: 13, marginBottom: 20 }}>Vérifiez votre connexion internet</div>
        <button style={S.bigBtn()} onClick={db.refresh}>🔄 Réessayer</button>
      </div>
    </div>
  )

  return (
    <div style={S.app}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
      {db.toast && <Toast {...db.toast} onClose={() => db.setToast(null)} />}
      <div style={S.header}>
        <div style={S.logo}>
          <span style={{ fontSize: 22 }}>🐷</span>
          <div>
            <div style={S.logoText}>Cotting SA</div>
            <div style={S.logoSub}>Transport</div>
          </div>
        </div>
        <div style={S.nav}>
          {[['admin', '⚙️', I.settings], ['patron', '📋', I.calendar], ['driver', '🚛', I.truck], ['secretary', '📊', I.chart]].map(([k, emoji]) => (
            <button key={k} style={S.navBtn(view === k)} onClick={() => setView(k)}>
              {emoji} {k === 'admin' ? 'Admin' : k === 'patron' ? 'Patron' : k === 'driver' ? 'Chauffeur' : 'Bureau'}
            </button>
          ))}
        </div>
      </div>
      {view === 'admin' && <AdminView {...db} />}
      {view === 'patron' && <PatronView {...db} />}
      {view === 'driver' && <DriverView {...db} />}
      {view === 'secretary' && <SecretaryView {...db} />}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════
// ADMIN VIEW
// ═══════════════════════════════════════════════════════════════
function AdminView({ clients, drivers, sections, clientImages, refresh, showToast }) {
  const [tab, setTab] = useState('drivers')
  const [editDriver, setEditDriver] = useState(null)
  const [showNewDriver, setShowNewDriver] = useState(false)
  const [editSection, setEditSection] = useState(null)
  const [showNewSection, setShowNewSection] = useState(false)
  const [editClient, setEditClient] = useState(null)
  const [showNewClient, setShowNewClient] = useState(false)
  const [viewImages, setViewImages] = useState(null)

  async function saveDriver(data) {
    if (data.id) {
      await supabase.from('drivers').update({ name: data.name, phone: data.phone }).eq('id', data.id)
      showToast('✅ Chauffeur modifié')
    } else {
      await supabase.from('drivers').insert({ name: data.name, phone: data.phone })
      showToast('✅ Chauffeur ajouté')
    }
    refresh(); setEditDriver(null); setShowNewDriver(false)
  }
  async function deleteDriver(id) {
    if (confirm('Désactiver ce chauffeur ?')) {
      await supabase.from('drivers').update({ active: false }).eq('id', id)
      showToast('Chauffeur désactivé', 'info')
      refresh()
    }
  }
  async function saveSection(data) {
    if (data.id) {
      await supabase.from('sections').update({ name: data.name, icon: data.icon, color: data.color }).eq('id', data.id)
    } else {
      await supabase.from('sections').insert({ name: data.name, icon: data.icon, color: data.color })
    }
    showToast('✅ Section enregistrée')
    refresh(); setEditSection(null); setShowNewSection(false)
  }
  async function deleteSection(id) {
    if (confirm('Désactiver cette section ?')) {
      await supabase.from('sections').update({ active: false }).eq('id', id)
      refresh()
    }
  }
  async function saveClient(data) {
    const payload = {
      name: data.name, address: data.address, contact: data.contact,
      phone: data.phone, notes: data.notes, default_qty: data.default_qty,
      section_id: data.section_id || null, default_unit: data.default_unit || 'porcs',
    }
    if (data.id) {
      await supabase.from('clients').update(payload).eq('id', data.id)
    } else {
      await supabase.from('clients').insert(payload)
    }
    showToast('✅ Client enregistré')
    refresh(); setEditClient(null); setShowNewClient(false)
  }
  async function addImage(clientId, file, caption) {
    try {
      const url = await uploadImage(file, clientId)
      await supabase.from('client_images').insert({ client_id: clientId, image_url: url, caption })
      showToast('✅ Photo ajoutée')
      refresh()
    } catch (e) { showToast('❌ Erreur: ' + e.message, 'error') }
  }
  async function deleteImage(id) {
    if (confirm('Supprimer cette photo ?')) {
      await supabase.from('client_images').delete().eq('id', id)
      refresh()
    }
  }

  return (
    <div style={S.page}>
      <div style={{ fontSize: 20, fontWeight: 800, marginBottom: 16 }}>⚙️ Administration</div>
      <div style={{ display: 'flex', gap: 6, marginBottom: 14, flexWrap: 'wrap' }}>
        {[['drivers', '🚛 Chauffeurs', drivers.length], ['sections', '🏷️ Sections', sections.length], ['clients', '👥 Clients', clients.length]].map(([k, l, n]) => (
          <button key={k} style={S.btn(tab === k ? 'primary' : 'outline')} onClick={() => setTab(k)}>
            {l} ({n})
          </button>
        ))}
      </div>

      {tab === 'drivers' && (
        <>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <div style={S.section}>Chauffeurs</div>
            <button style={S.btn()} onClick={() => setShowNewDriver(true)}><Icon d={I.plus} size={13} /> Ajouter</button>
          </div>
          {drivers.map(d => (
            <div key={d.id} style={S.card}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 15 }}>{d.name}</div>
                  <div style={{ fontSize: 13, color: C.muted, marginTop: 2 }}>{d.phone || 'Pas de téléphone'}</div>
                </div>
                <div style={{ display: 'flex', gap: 6 }}>
                  <button style={S.btn('outline')} onClick={() => setEditDriver(d)}>Modifier</button>
                  <button style={{ ...S.btn('ghost'), padding: 6 }} onClick={() => deleteDriver(d.id)}>
                    <Icon d={I.trash} size={15} color="#ef4444" />
                  </button>
                </div>
              </div>
            </div>
          ))}
          {!drivers.length && <EmptyState text="Aucun chauffeur" action="Ajouter un chauffeur" onClick={() => setShowNewDriver(true)} />}
        </>
      )}

      {tab === 'sections' && (
        <>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <div style={S.section}>Sections</div>
            <button style={S.btn()} onClick={() => setShowNewSection(true)}><Icon d={I.plus} size={13} /> Ajouter</button>
          </div>
          <div style={{ fontSize: 13, color: C.muted, marginBottom: 12, background: C.input, padding: 10, borderRadius: 8 }}>
            💡 Les sections servent à classer vos clients par type d'activité : cochons, petit-lait, biogaz, etc.
          </div>
          {sections.map(s => (
            <div key={s.id} style={{ ...S.card, borderLeft: `4px solid ${s.color}` }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontSize: 24 }}>{s.icon}</span>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 15 }}>{s.name}</div>
                    <div style={{ fontSize: 12, color: C.muted }}>{clients.filter(c => c.section_id === s.id).length} client(s)</div>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 6 }}>
                  <button style={S.btn('outline')} onClick={() => setEditSection(s)}>Modifier</button>
                  <button style={{ ...S.btn('ghost'), padding: 6 }} onClick={() => deleteSection(s.id)}>
                    <Icon d={I.trash} size={15} color="#ef4444" />
                  </button>
                </div>
              </div>
            </div>
          ))}
          {!sections.length && <EmptyState text="Aucune section" action="Créer une section" onClick={() => setShowNewSection(true)} />}
        </>
      )}

      {tab === 'clients' && (
        <>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <div style={S.section}>Clients</div>
            <button style={S.btn()} onClick={() => setShowNewClient(true)}><Icon d={I.plus} size={13} /> Ajouter</button>
          </div>
          {sections.map(sec => {
            const sc = clients.filter(c => c.section_id === sec.id)
            if (!sc.length) return null
            return (
              <div key={sec.id} style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
                  {sec.icon} {sec.name} <span style={S.badge(C.muted, C.input)}>{sc.length}</span>
                </div>
                {sc.map(c => <ClientCardAdmin key={c.id} client={c} sec={sec} imgCount={clientImages.filter(i => i.client_id === c.id).length}
                  onEdit={() => setEditClient(c)} onImages={() => setViewImages(c.id)} />)}
              </div>
            )
          })}
          {(() => {
            const noSec = clients.filter(c => !c.section_id)
            if (!noSec.length) return null
            return (
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 6, color: C.muted }}>📦 Sans section</div>
                {noSec.map(c => <ClientCardAdmin key={c.id} client={c} sec={null} imgCount={clientImages.filter(i => i.client_id === c.id).length}
                  onEdit={() => setEditClient(c)} onImages={() => setViewImages(c.id)} />)}
              </div>
            )
          })()}
          {!clients.length && <EmptyState text="Aucun client" action="Ajouter un client" onClick={() => setShowNewClient(true)} />}
        </>
      )}

      {(showNewDriver || editDriver) && <DriverModal driver={editDriver} onSave={saveDriver} onClose={() => { setEditDriver(null); setShowNewDriver(false) }} />}
      {(showNewSection || editSection) && <SectionModal section={editSection} onSave={saveSection} onClose={() => { setEditSection(null); setShowNewSection(false) }} />}
      {(showNewClient || editClient) && <ClientModal client={editClient} sections={sections} onSave={saveClient} onClose={() => { setEditClient(null); setShowNewClient(false) }} />}
      {viewImages && <ImageGalleryModal clientId={viewImages} images={clientImages.filter(i => i.client_id === viewImages)}
        client={clients.find(c => c.id === viewImages)} onAdd={addImage} onDelete={deleteImage} onClose={() => setViewImages(null)} />}
    </div>
  )
}

function ClientCardAdmin({ client, sec, imgCount, onEdit, onImages }) {
  return (
    <div style={S.card}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 700, fontSize: 14 }}>{client.name}</div>
          <div style={{ fontSize: 12, color: C.muted, marginTop: 2 }}>{client.address}</div>
          <div style={{ fontSize: 12, color: C.muted }}>{client.contact} — {client.phone}</div>
          {client.notes && <div style={{ fontSize: 12, color: C.yellow, marginTop: 3 }}>💡 {client.notes}</div>}
        </div>
        <span style={S.badge(C.accent, C.accentSoft)}>{client.default_qty} {client.default_unit || 'porcs'}</span>
      </div>
      <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
        <button style={S.btn('outline')} onClick={onEdit}>✏️ Modifier</button>
        <button style={S.btn('outline')} onClick={onImages}>📷 Photos ({imgCount})</button>
      </div>
    </div>
  )
}

function EmptyState({ text, action, onClick }) {
  return (
    <div style={{ textAlign: 'center', padding: 40, color: C.muted }}>
      <div style={{ fontSize: 14, marginBottom: 12 }}>{text}</div>
      <button style={S.btn()} onClick={onClick}><Icon d={I.plus} size={13} /> {action}</button>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════
// PATRON VIEW — with calendar
// ═══════════════════════════════════════════════════════════════
function PatronView({ clients, drivers, deliveries, sections, refresh, showToast, lastUpdate }) {
  const [selectedDate, setSelectedDate] = useState(todayStr())
  const [weekStart, setWeekStart] = useState(todayStr())
  const [showNewDel, setShowNewDel] = useState(false)
  const weekDays = getWeekDays(weekStart)
  const today = todayStr()

  const dateDel = deliveries.filter(d => d.date === selectedDate)
  const done = dateDel.filter(d => d.status === 'delivered').length

  async function addDelivery(data) {
    const client = clients.find(c => c.id === data.clientId)
    await supabase.from('deliveries').insert({
      date: selectedDate, driver_id: data.driverId, client_id: data.clientId,
      qty_planned: data.qtyPlanned, status: 'pending',
      section_id: client?.section_id || null, unit: client?.default_unit || 'porcs',
    })
    showToast('✅ Livraison ajoutée')
    refresh(); setShowNewDel(false)
  }

  async function deleteDelivery(id) {
    if (confirm('Supprimer cette livraison ?')) {
      await supabase.from('deliveries').delete().eq('id', id)
      showToast('Livraison supprimée', 'info')
      refresh()
    }
  }

  function shiftWeek(dir) {
    const d = new Date(weekStart)
    d.setDate(d.getDate() + dir * 7)
    setWeekStart(d.toISOString().split('T')[0])
  }

  return (
    <div style={S.page}>
      <ConnectionStatus lastUpdate={lastUpdate} />

      {/* Calendar week view */}
      <div style={{ ...S.card, padding: 12, marginBottom: 14 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
          <button style={S.btn('ghost')} onClick={() => shiftWeek(-1)}><Icon d={I.chevL} size={18} /></button>
          <div style={{ fontSize: 13, fontWeight: 700 }}>
            {new Date(weekDays[0] + 'T00:00:00').toLocaleDateString('fr-CH', { month: 'long', year: 'numeric' })}
          </div>
          <button style={S.btn('ghost')} onClick={() => shiftWeek(1)}><Icon d={I.chevR} size={18} /></button>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4 }}>
          {weekDays.map(day => {
            const dayDel = deliveries.filter(d => d.date === day)
            const isToday = day === today
            const isSelected = day === selectedDate
            const dayDate = new Date(day + 'T00:00:00')
            const doneDel = dayDel.filter(d => d.status === 'delivered').length
            return (
              <button key={day} onClick={() => setSelectedDate(day)} style={{
                padding: '8px 4px', borderRadius: 10, border: 'none', cursor: 'pointer',
                background: isSelected ? C.accent : isToday ? C.accentSoft : 'transparent',
                color: isSelected ? '#fff' : C.text, textAlign: 'center',
                transition: 'all 0.15s',
              }}>
                <div style={{ fontSize: 10, fontWeight: 600, color: isSelected ? '#fff' : C.muted }}>
                  {dayDate.toLocaleDateString('fr-CH', { weekday: 'short' }).slice(0, 2)}
                </div>
                <div style={{ fontSize: 16, fontWeight: 800, margin: '2px 0' }}>
                  {dayDate.getDate()}
                </div>
                {dayDel.length > 0 && (
                  <div style={{ fontSize: 9, fontWeight: 700, color: isSelected ? '#fff' : doneDel === dayDel.length ? C.green : C.yellow }}>
                    {doneDel}/{dayDel.length}
                  </div>
                )}
              </button>
            )
          })}
        </div>
        {selectedDate !== today && (
          <button style={{ ...S.btn('ghost'), width: '100%', justifyContent: 'center', marginTop: 8, fontSize: 12 }}
            onClick={() => { setSelectedDate(today); setWeekStart(today) }}>
            ↩️ Revenir à aujourd'hui
          </button>
        )}
      </div>

      {/* Stats */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
        <div style={S.stat}><div style={{ ...S.statN, color: C.accent }}>{dateDel.length}</div><div style={S.statL}>Livraisons</div></div>
        <div style={S.stat}><div style={{ ...S.statN, color: C.green }}>{done}</div><div style={S.statL}>Effectuées</div></div>
        <div style={S.stat}><div style={{ ...S.statN, color: C.yellow }}>{dateDel.length - done}</div><div style={S.statL}>En attente</div></div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
        <div style={S.section}>{selectedDate === today ? "Aujourd'hui" : fmtDate(selectedDate)}</div>
        <button style={S.btn()} onClick={() => setShowNewDel(true)}><Icon d={I.plus} size={13} /> Ajouter</button>
      </div>

      {drivers.map(driver => {
        const dDel = dateDel.filter(d => d.driver_id === driver.id)
        if (!dDel.length) return null
        return (
          <div key={driver.id} style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 6, display: 'flex', alignItems: 'center', gap: 5 }}>
              🚛 {driver.name} <span style={S.badge(C.muted, C.input)}>{dDel.length}</span>
            </div>
            {dDel.map(del => {
              const client = clients.find(c => c.id === del.client_id)
              const sec = sections.find(s => s.id === del.section_id)
              return (
                <div key={del.id} style={{ ...S.card, borderLeft: `3px solid ${sec?.color || C.accent}` }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 14 }}>{sec?.icon} {client?.name}</div>
                      <div style={{ fontSize: 12, color: C.muted }}>{client?.address}</div>
                      <div style={{ fontSize: 12, marginTop: 3 }}>
                        {del.qty_planned} {del.unit || 'porcs'}
                        {del.qty_delivered != null && <span style={{ color: C.green }}> → {del.qty_delivered} livrés</span>}
                      </div>
                      {del.notes && <div style={{ fontSize: 12, color: C.yellow, marginTop: 2 }}>📝 {del.notes}</div>}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <StatusBadge status={del.status} />
                      {del.status === 'pending' && (
                        <button style={{ ...S.btn('ghost'), padding: 6 }} onClick={() => deleteDelivery(del.id)}>
                          <Icon d={I.trash} size={15} color="#ef4444" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )
      })}
      {dateDel.length === 0 && (
        <EmptyState text={`Aucune livraison le ${fmtDate(selectedDate)}`} action="Planifier une livraison" onClick={() => setShowNewDel(true)} />
      )}

      {showNewDel && <NewDeliveryModal clients={clients} drivers={drivers} sections={sections} date={selectedDate}
        onSave={addDelivery} onClose={() => setShowNewDel(false)} />}
    </div>
  )
}

function StatusBadge({ status }) {
  if (status === 'delivered') return <span style={S.badge(C.green, C.greenSoft)}>✅ Livré</span>
  if (status === 'issue') return <span style={S.badge(C.yellow, C.yellowSoft)}>⚠️ Problème</span>
  return <span style={S.badge(C.muted, C.input)}>⏳ En attente</span>
}

// ═══════════════════════════════════════════════════════════════
// DRIVER VIEW
// ═══════════════════════════════════════════════════════════════
function DriverView({ clients, drivers, deliveries, sections, clientImages, refresh, showToast, lastUpdate }) {
  const [driverId, setDriverId] = useState(() => localStorage.getItem('cotting-driver') || null)
  const [confirmDel, setConfirmDel] = useState(null)
  const [showClientImages, setShowClientImages] = useState(null)
  const [successAnim, setSuccessAnim] = useState(null)

  const today = todayStr()

  function selectDriver(id) {
    setDriverId(id); localStorage.setItem('cotting-driver', id)
  }

  if (!driverId) return (
    <div style={S.page}>
      <div style={{ fontSize: 20, fontWeight: 800, marginBottom: 4 }}>Bonjour ! 👋</div>
      <div style={{ color: C.muted, fontSize: 14, marginBottom: 20 }}>Sélectionnez votre nom :</div>
      {drivers.map(d => {
        const myDel = deliveries.filter(del => del.driver_id === d.id && del.date === today)
        const done = myDel.filter(del => del.status === 'delivered').length
        return (
          <button key={d.id} style={{ ...S.card, cursor: 'pointer', textAlign: 'left', width: '100%', padding: 18 }}
            onClick={() => selectDriver(d.id)}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: 17 }}>{d.name}</div>
                <div style={{ fontSize: 13, color: C.muted, marginTop: 2 }}>{myDel.length} livraison{myDel.length !== 1 ? 's' : ''} aujourd'hui</div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                {myDel.length > 0 && <span style={S.badge(done === myDel.length ? C.green : C.yellow, done === myDel.length ? C.greenSoft : C.yellowSoft)}>{done}/{myDel.length}</span>}
                <span style={{ color: C.accent, fontSize: 24 }}>→</span>
              </div>
            </div>
          </button>
        )
      })}
    </div>
  )

  const driver = drivers.find(d => d.id === driverId)
  const myDel = deliveries.filter(d => d.driver_id === driverId && d.date === today)
  const done = myDel.filter(d => d.status === 'delivered').length
  const allDone = myDel.length > 0 && done === myDel.length

  async function confirmDelivery(data) {
    await supabase.from('deliveries').update({
      qty_delivered: data.qty, status: data.status,
      notes: data.notes, return_time: new Date().toISOString(),
    }).eq('id', data.id)
    setSuccessAnim(data.id)
    setTimeout(() => setSuccessAnim(null), 2000)
    showToast(data.status === 'delivered' ? '✅ Livraison confirmée !' : '⚠️ Problème signalé', data.status === 'delivered' ? 'success' : 'info')
    refresh(); setConfirmDel(null)
  }

  return (
    <div style={S.page}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <button style={S.btn('ghost')} onClick={() => { setDriverId(null); localStorage.removeItem('cotting-driver') }}>
          <Icon d={I.back} size={16} /> Changer
        </button>
        <ConnectionStatus lastUpdate={lastUpdate} />
      </div>

      <div style={{ marginTop: 10, marginBottom: 16 }}>
        <div style={{ fontSize: 22, fontWeight: 800 }}>
          {allDone ? '🎉 Bravo' : 'Salut'} {driver?.name?.split(' ')[0]} !
        </div>
        <div style={{ color: C.muted, fontSize: 14, marginTop: 4 }}>
          {allDone ? 'Toutes les livraisons sont faites !' : `${myDel.length - done} livraison${myDel.length - done > 1 ? 's' : ''} restante${myDel.length - done > 1 ? 's' : ''}`}
        </div>
        <div style={{ background: C.input, borderRadius: 10, height: 8, marginTop: 10, overflow: 'hidden' }}>
          <div style={{
            background: allDone ? C.green : `linear-gradient(90deg, ${C.accent}, ${C.green})`,
            height: '100%', borderRadius: 10, transition: 'width 0.6s ease',
            width: myDel.length ? `${(done / myDel.length) * 100}%` : '0%',
          }} />
        </div>
      </div>

      {/* Refresh button */}
      <button style={{ ...S.btn('outline'), width: '100%', justifyContent: 'center', marginBottom: 14 }} onClick={refresh}>
        🔄 Rafraîchir les livraisons
      </button>

      {myDel.map(del => {
        const client = clients.find(c => c.id === del.client_id)
        const sec = sections.find(s => s.id === del.section_id)
        const imgs = clientImages.filter(i => i.client_id === del.client_id)
        const isDone = del.status === 'delivered'
        const isIssue = del.status === 'issue'
        const justDone = successAnim === del.id
        return (
          <div key={del.id} style={{
            ...S.card, padding: 16,
            opacity: isDone && !justDone ? 0.5 : 1,
            borderLeft: `4px solid ${isDone ? C.green : isIssue ? C.yellow : sec?.color || C.accent}`,
            background: justDone ? C.greenSoft : S.card.background,
            transition: 'all 0.5s ease',
          }}>
            <div style={{ fontWeight: 700, fontSize: 16, display: 'flex', alignItems: 'center', gap: 6 }}>
              {sec && <span>{sec.icon}</span>}
              {client?.name}
              {isDone && <span style={{ marginLeft: 'auto' }}>✅</span>}
              {isIssue && <span style={{ marginLeft: 'auto' }}>⚠️</span>}
            </div>

            <div style={{ fontSize: 13, color: C.muted, marginTop: 6 }}>
              📍 {client?.address}
            </div>

            {client?.phone && (
              <a href={`tel:${client.phone}`} style={{
                display: 'flex', alignItems: 'center', gap: 6, fontSize: 14,
                color: C.accent, marginTop: 6, textDecoration: 'none',
                padding: '8px 12px', background: C.accentSoft, borderRadius: 8,
              }}>
                📞 Appeler {client.contact || client.phone}
              </a>
            )}

            {client?.notes && (
              <div style={{ fontSize: 13, color: C.yellow, marginTop: 8, padding: '8px 10px', background: C.yellowSoft, borderRadius: 8 }}>
                💡 {client.notes}
              </div>
            )}

            {imgs.length > 0 && (
              <button style={{ ...S.btn('outline'), marginTop: 8, width: '100%', justifyContent: 'center' }}
                onClick={() => setShowClientImages(del.client_id)}>
                📷 Voir {imgs.length} photo{imgs.length > 1 ? 's' : ''} du lieu
              </button>
            )}

            <div style={{ marginTop: 10, fontSize: 15, fontWeight: 700 }}>
              📦 {del.qty_planned} {del.unit || 'porcs'}
              {isDone && <span style={{ color: C.green }}> → {del.qty_delivered} livrés</span>}
            </div>
            {del.notes && isDone && <div style={{ fontSize: 13, color: C.muted, marginTop: 2 }}>Note: {del.notes}</div>}

            {!isDone && !isIssue && (
              <button style={{ ...S.bigBtn(), marginTop: 12 }} onClick={() => setConfirmDel(del)}>
                ✅ Confirmer la livraison
              </button>
            )}
          </div>
        )
      })}

      {myDel.length === 0 && (
        <div style={{ textAlign: 'center', padding: 50 }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>🎉</div>
          <div style={{ fontSize: 16, fontWeight: 700 }}>Pas de livraison aujourd'hui</div>
          <div style={{ color: C.muted, marginTop: 4 }}>Profitez bien !</div>
        </div>
      )}

      {confirmDel && <ConfirmModal delivery={confirmDel} client={clients.find(c => c.id === confirmDel.client_id)}
        onSave={confirmDelivery} onClose={() => setConfirmDel(null)} />}
      {showClientImages && <ImageViewModal images={clientImages.filter(i => i.client_id === showClientImages)}
        client={clients.find(c => c.id === showClientImages)} onClose={() => setShowClientImages(null)} />}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════
// SECRETARY VIEW
// ═══════════════════════════════════════════════════════════════
function SecretaryView({ clients, drivers, deliveries, sections }) {
  const [monthOffset, setMonthOffset] = useState(0)
  const now = new Date()
  const target = new Date(now.getFullYear(), now.getMonth() + monthOffset, 1)
  const monthLabel = target.toLocaleDateString('fr-CH', { month: 'long', year: 'numeric' })

  const monthDel = deliveries.filter(d => {
    const dd = new Date(d.date)
    return dd.getMonth() === target.getMonth() && dd.getFullYear() === target.getFullYear()
  })
  const delivered = monthDel.filter(d => d.status === 'delivered')
  const totalQty = delivered.reduce((s, d) => s + (d.qty_delivered || 0), 0)
  const issues = monthDel.filter(d => d.status === 'issue').length

  const clientSummary = {}
  monthDel.forEach(d => {
    if (!clientSummary[d.client_id]) clientSummary[d.client_id] = { count: 0, qty: 0, issues: 0 }
    clientSummary[d.client_id].count++
    clientSummary[d.client_id].qty += d.qty_delivered || 0
    if (d.status === 'issue') clientSummary[d.client_id].issues++
  })
  const driverSummary = {}
  monthDel.forEach(d => {
    if (!driverSummary[d.driver_id]) driverSummary[d.driver_id] = { count: 0, qty: 0 }
    if (d.status === 'delivered') { driverSummary[d.driver_id].count++; driverSummary[d.driver_id].qty += d.qty_delivered || 0 }
  })

  function exportCSV() {
    const header = ['Date', 'Chauffeur', 'Client', 'Section', 'Adresse', 'Prévu', 'Livré', 'Unité', 'Statut', 'Notes', 'Heure']
    const rows = monthDel.map(d => {
      const dr = drivers.find(x => x.id === d.driver_id), cl = clients.find(x => x.id === d.client_id), sec = sections.find(x => x.id === d.section_id)
      return [d.date, dr?.name, cl?.name, sec?.name || '', cl?.address, d.qty_planned, d.qty_delivered ?? '', d.unit || 'porcs', d.status, d.notes ?? '', d.return_time ? fmtTime(d.return_time) : '']
    })
    downloadCSV(`cotting-${target.toLocaleDateString('fr-CH', { month: '2-digit', year: 'numeric' }).replace('/', '-')}.csv`, [header, ...rows])
  }

  return (
    <div style={S.page}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <button style={S.btn('ghost')} onClick={() => setMonthOffset(monthOffset - 1)}>← Préc.</button>
        <div style={{ fontSize: 17, fontWeight: 700, textTransform: 'capitalize' }}>{monthLabel}</div>
        <button style={S.btn('ghost')} onClick={() => setMonthOffset(monthOffset + 1)}>Suiv. →</button>
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        <div style={S.stat}><div style={{ ...S.statN, color: C.green }}>{delivered.length}</div><div style={S.statL}>Livraisons</div></div>
        <div style={S.stat}><div style={{ ...S.statN, color: C.accent }}>{totalQty}</div><div style={S.statL}>Total</div></div>
        <div style={S.stat}><div style={{ ...S.statN, color: C.yellow }}>{issues}</div><div style={S.statL}>Problèmes</div></div>
      </div>

      <button style={{ ...S.bigBtn('green'), marginBottom: 16 }} onClick={exportCSV}>
        📥 Exporter le mois en CSV
      </button>

      {sections.length > 0 && (
        <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
          {sections.map(sec => {
            const sq = delivered.filter(d => d.section_id === sec.id).reduce((s, d) => s + (d.qty_delivered || 0), 0)
            return (
              <div key={sec.id} style={{ ...S.stat, minWidth: 80, borderLeft: `3px solid ${sec.color}` }}>
                <div style={{ fontSize: 18 }}>{sec.icon}</div>
                <div style={{ ...S.statN, fontSize: 20, color: sec.color }}>{sq}</div>
                <div style={S.statL}>{sec.name}</div>
              </div>
            )
          })}
        </div>
      )}

      <div style={S.section}>Par client</div>
      <div style={{ ...S.card, padding: 0, overflow: 'hidden', marginBottom: 16 }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead><tr><th style={S.th}>Client</th><th style={{ ...S.th, textAlign: 'right' }}>Livr.</th><th style={{ ...S.th, textAlign: 'right' }}>Total</th></tr></thead>
          <tbody>
            {Object.entries(clientSummary).sort((a, b) => b[1].qty - a[1].qty).map(([cId, data]) => {
              const cl = clients.find(c => c.id === cId), sec = sections.find(s => s.id === cl?.section_id)
              return <tr key={cId}><td style={S.td}>{sec ? sec.icon + ' ' : ''}{cl?.name}</td><td style={{ ...S.td, textAlign: 'right' }}>{data.count}</td><td style={{ ...S.td, textAlign: 'right', fontWeight: 700, color: C.accent }}>{data.qty}</td></tr>
            })}
            {!Object.keys(clientSummary).length && <tr><td colSpan={3} style={{ ...S.td, textAlign: 'center', color: C.muted }}>Aucune donnée</td></tr>}
          </tbody>
        </table>
      </div>

      <div style={S.section}>Par chauffeur</div>
      <div style={{ ...S.card, padding: 0, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead><tr><th style={S.th}>Chauffeur</th><th style={{ ...S.th, textAlign: 'right' }}>Livr.</th><th style={{ ...S.th, textAlign: 'right' }}>Total</th></tr></thead>
          <tbody>
            {Object.entries(driverSummary).sort((a, b) => b[1].qty - a[1].qty).map(([dId, data]) => (
              <tr key={dId}><td style={S.td}>{drivers.find(d => d.id === dId)?.name}</td><td style={{ ...S.td, textAlign: 'right' }}>{data.count}</td><td style={{ ...S.td, textAlign: 'right', fontWeight: 700, color: C.green }}>{data.qty}</td></tr>
            ))}
            {!Object.keys(driverSummary).length && <tr><td colSpan={3} style={{ ...S.td, textAlign: 'center', color: C.muted }}>Aucune donnée</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════
// MODALS
// ═══════════════════════════════════════════════════════════════
function DriverModal({ driver, onSave, onClose }) {
  const [f, setF] = useState(driver || { name: '', phone: '' })
  return (
    <div style={S.modal} onClick={onClose}>
      <div style={S.modalC} onClick={e => e.stopPropagation()}>
        <div style={{ fontSize: 17, fontWeight: 700, marginBottom: 16 }}>{driver ? '✏️ Modifier' : '➕ Nouveau'} chauffeur</div>
        <div style={{ marginBottom: 12 }}>
          <label style={S.label}>Nom complet</label>
          <input style={S.input} value={f.name} onChange={e => setF({ ...f, name: e.target.value })} placeholder="Jean Dupont" autoFocus />
        </div>
        <div style={{ marginBottom: 16 }}>
          <label style={S.label}>Téléphone</label>
          <input style={S.input} value={f.phone || ''} onChange={e => setF({ ...f, phone: e.target.value })} placeholder="079 123 45 67" />
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button style={{ ...S.bigBtn('outline'), flex: 1 }} onClick={onClose}>Annuler</button>
          <button style={{ ...S.bigBtn(), flex: 1 }} onClick={() => onSave(f)}>✅ Enregistrer</button>
        </div>
      </div>
    </div>
  )
}

function SectionModal({ section, onSave, onClose }) {
  const [f, setF] = useState(section || { name: '', icon: '📦', color: '#e8593c' })
  const emojis = ['🐷', '🥛', '♻️', '📦', '🚛', '🧀', '🥩', '🌾', '⛽', '🏭', '🐄', '🌽']
  const colors = ['#e8593c', '#60a5fa', '#34d399', '#fbbf24', '#a78bfa', '#f472b6', '#fb923c', '#4ade80']
  return (
    <div style={S.modal} onClick={onClose}>
      <div style={S.modalC} onClick={e => e.stopPropagation()}>
        <div style={{ fontSize: 17, fontWeight: 700, marginBottom: 16 }}>{section ? '✏️ Modifier' : '➕ Nouvelle'} section</div>
        <div style={{ marginBottom: 12 }}>
          <label style={S.label}>Nom de la section</label>
          <input style={S.input} value={f.name} onChange={e => setF({ ...f, name: e.target.value })} placeholder="Ex: Cochons, Petit-lait..." autoFocus />
        </div>
        <div style={{ marginBottom: 12 }}>
          <label style={S.label}>Icône</label>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {emojis.map(e => (
              <button key={e} onClick={() => setF({ ...f, icon: e })}
                style={{ fontSize: 28, padding: 8, borderRadius: 10, border: f.icon === e ? `3px solid ${C.accent}` : '3px solid transparent', background: f.icon === e ? C.accentSoft : C.input, cursor: 'pointer' }}>
                {e}
              </button>
            ))}
          </div>
        </div>
        <div style={{ marginBottom: 16 }}>
          <label style={S.label}>Couleur</label>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {colors.map(c => (
              <button key={c} onClick={() => setF({ ...f, color: c })}
                style={{ width: 36, height: 36, borderRadius: 10, background: c, border: f.color === c ? '3px solid white' : '3px solid transparent', cursor: 'pointer' }} />
            ))}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button style={{ ...S.bigBtn('outline'), flex: 1 }} onClick={onClose}>Annuler</button>
          <button style={{ ...S.bigBtn(), flex: 1 }} onClick={() => onSave(f)}>✅ Enregistrer</button>
        </div>
      </div>
    </div>
  )
}

function ClientModal({ client, sections, onSave, onClose }) {
  const [f, setF] = useState(client || { name: '', address: '', contact: '', phone: '', notes: '', default_qty: 0, section_id: null, default_unit: 'porcs' })
  const set = (k, v) => setF({ ...f, [k]: v })
  return (
    <div style={S.modal} onClick={onClose}>
      <div style={S.modalC} onClick={e => e.stopPropagation()}>
        <div style={{ fontSize: 17, fontWeight: 700, marginBottom: 16 }}>{client ? '✏️ Modifier' : '➕ Nouveau'} client</div>
        {[['name', 'Nom', 'Boucherie Exemple'], ['address', 'Adresse', 'Rue du Village 1, 1700 Fribourg'],
          ['contact', 'Personne de contact', 'Jean Dupont'], ['phone', 'Téléphone', '026 123 45 67'],
          ['notes', 'Notes pour les chauffeurs', 'Ex: sonner 2x, livraison arrière...']].map(([k, l, p]) => (
          <div key={k} style={{ marginBottom: 12 }}>
            <label style={S.label}>{l}</label>
            <input style={S.input} value={f[k] || ''} onChange={e => set(k, e.target.value)} placeholder={p} />
          </div>
        ))}
        <div style={{ marginBottom: 12 }}>
          <label style={S.label}>Section</label>
          <select style={S.select} value={f.section_id || ''} onChange={e => set('section_id', e.target.value || null)}>
            <option value="">— Aucune —</option>
            {sections.map(s => <option key={s.id} value={s.id}>{s.icon} {s.name}</option>)}
          </select>
        </div>
        <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
          <div style={{ flex: 1 }}>
            <label style={S.label}>Quantité par défaut</label>
            <input type="number" style={S.input} value={f.default_qty || 0} onChange={e => set('default_qty', parseInt(e.target.value) || 0)} />
          </div>
          <div style={{ flex: 1 }}>
            <label style={S.label}>Unité</label>
            <input style={S.input} value={f.default_unit || 'porcs'} onChange={e => set('default_unit', e.target.value)} placeholder="porcs, litres, kg..." />
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button style={{ ...S.bigBtn('outline'), flex: 1 }} onClick={onClose}>Annuler</button>
          <button style={{ ...S.bigBtn(), flex: 1 }} onClick={() => onSave(f)}>✅ Enregistrer</button>
        </div>
      </div>
    </div>
  )
}

function NewDeliveryModal({ clients, drivers, sections, date, onSave, onClose }) {
  const [driverId, setDriverId] = useState(drivers[0]?.id || '')
  const [clientId, setClientId] = useState(clients[0]?.id || '')
  const [qty, setQty] = useState('')
  const [filterSection, setFilterSection] = useState('')
  const selClient = clients.find(c => c.id === clientId)
  const filteredClients = filterSection ? clients.filter(c => c.section_id === filterSection) : clients

  return (
    <div style={S.modal} onClick={onClose}>
      <div style={S.modalC} onClick={e => e.stopPropagation()}>
        <div style={{ fontSize: 17, fontWeight: 700, marginBottom: 4 }}>➕ Nouvelle livraison</div>
        <div style={{ fontSize: 13, color: C.muted, marginBottom: 16 }}>📅 {fmtDate(date)}</div>
        <div style={{ marginBottom: 12 }}>
          <label style={S.label}>Chauffeur</label>
          <select style={S.select} value={driverId} onChange={e => setDriverId(e.target.value)}>
            {drivers.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
          </select>
        </div>
        {sections.length > 0 && (
          <div style={{ marginBottom: 12 }}>
            <label style={S.label}>Filtrer par section</label>
            <select style={S.select} value={filterSection} onChange={e => setFilterSection(e.target.value)}>
              <option value="">Tous les clients</option>
              {sections.map(s => <option key={s.id} value={s.id}>{s.icon} {s.name}</option>)}
            </select>
          </div>
        )}
        <div style={{ marginBottom: 12 }}>
          <label style={S.label}>Client</label>
          <select style={S.select} value={clientId} onChange={e => {
            setClientId(e.target.value)
            const c = clients.find(cl => cl.id === e.target.value)
            if (c) setQty(String(c.default_qty))
          }}>
            {filteredClients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <div style={{ marginBottom: 16 }}>
          <label style={S.label}>Quantité ({selClient?.default_unit || 'porcs'})</label>
          <input type="number" style={S.input} value={qty || selClient?.default_qty || ''} onChange={e => setQty(e.target.value)} />
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button style={{ ...S.bigBtn('outline'), flex: 1 }} onClick={onClose}>Annuler</button>
          <button style={{ ...S.bigBtn(), flex: 1 }} onClick={() => onSave({
            driverId, clientId, qtyPlanned: parseInt(qty || selClient?.default_qty || 0),
          })}>✅ Ajouter</button>
        </div>
      </div>
    </div>
  )
}

function ConfirmModal({ delivery, client, onSave, onClose }) {
  const [qty, setQty] = useState(String(delivery.qty_planned))
  const [notes, setNotes] = useState('')
  const [status, setStatus] = useState('delivered')
  return (
    <div style={S.modal} onClick={onClose}>
      <div style={S.modalC} onClick={e => e.stopPropagation()}>
        <div style={{ fontSize: 17, fontWeight: 700, marginBottom: 4 }}>Confirmer livraison</div>
        <div style={{ fontSize: 14, color: C.muted, marginBottom: 16 }}>📍 {client?.name}</div>
        <div style={{ marginBottom: 12 }}>
          <label style={S.label}>Quantité livrée ({delivery.unit || 'porcs'})</label>
          <input type="number" style={{ ...S.input, fontSize: 20, textAlign: 'center', padding: 14 }} value={qty} onChange={e => setQty(e.target.value)} />
        </div>
        <div style={{ marginBottom: 12 }}>
          <label style={S.label}>Tout est OK ?</label>
          <div style={{ display: 'flex', gap: 8 }}>
            <button style={{
              ...S.bigBtn(status === 'delivered' ? 'green' : 'outline'), flex: 1,
            }} onClick={() => setStatus('delivered')}>✅ Oui, tout bon</button>
            <button style={{
              ...S.bigBtn(status === 'issue' ? 'primary' : 'outline'), flex: 1,
              ...(status === 'issue' ? { background: C.yellow, color: '#000' } : {}),
            }} onClick={() => setStatus('issue')}>⚠️ Problème</button>
          </div>
        </div>
        <div style={{ marginBottom: 16 }}>
          <label style={S.label}>Remarque (optionnel)</label>
          <input style={S.input} value={notes} onChange={e => setNotes(e.target.value)} placeholder="Ex: client absent, 2 refusés..." />
        </div>
        <button style={S.bigBtn()} onClick={() => onSave({ id: delivery.id, qty: parseInt(qty), status, notes })}>
          📤 Envoyer au patron
        </button>
      </div>
    </div>
  )
}

function ImageGalleryModal({ clientId, images, client, onAdd, onDelete, onClose }) {
  const fileRef = useRef()
  const [caption, setCaption] = useState('')
  const [uploading, setUploading] = useState(false)
  async function handleUpload() {
    const file = fileRef.current?.files?.[0]
    if (!file) return
    setUploading(true)
    await onAdd(clientId, file, caption)
    setCaption(''); fileRef.current.value = ''; setUploading(false)
  }
  return (
    <div style={S.modal} onClick={onClose}>
      <div style={{ ...S.modalC, maxWidth: 500 }} onClick={e => e.stopPropagation()}>
        <div style={{ fontSize: 17, fontWeight: 700, marginBottom: 4 }}>📷 Photos — {client?.name}</div>
        <div style={{ fontSize: 13, color: C.muted, marginBottom: 14 }}>Photos du lieu de livraison visibles par les chauffeurs</div>
        {images.map(img => (
          <div key={img.id} style={{ marginBottom: 10, borderRadius: 10, overflow: 'hidden', border: `1px solid ${C.border}` }}>
            <img src={img.image_url} alt={img.caption} style={{ width: '100%', maxHeight: 200, objectFit: 'cover', display: 'block' }} />
            <div style={{ padding: '8px 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: C.input }}>
              <span style={{ fontSize: 13 }}>{img.caption || 'Sans description'}</span>
              <button style={{ ...S.btn('ghost'), padding: 4 }} onClick={() => onDelete(img.id)}>
                <Icon d={I.trash} size={15} color="#ef4444" />
              </button>
            </div>
          </div>
        ))}
        {!images.length && <div style={{ textAlign: 'center', color: C.muted, padding: 20 }}>Aucune photo pour ce client</div>}
        <div style={{ marginTop: 14, padding: 14, background: C.input, borderRadius: 10 }}>
          <label style={S.label}>Ajouter une photo</label>
          <input type="file" accept="image/*" ref={fileRef} style={{ ...S.input, padding: 8, marginBottom: 8 }} />
          <input style={{ ...S.input, marginBottom: 8 }} value={caption} onChange={e => setCaption(e.target.value)} placeholder="Description (ex: Quai B, Entrée...)" />
          <button style={S.bigBtn()} onClick={handleUpload} disabled={uploading}>
            {uploading ? '⏳ Envoi en cours...' : '📤 Ajouter la photo'}
          </button>
        </div>
        <button style={{ ...S.bigBtn('outline'), marginTop: 10 }} onClick={onClose}>Fermer</button>
      </div>
    </div>
  )
}

function ImageViewModal({ images, client, onClose }) {
  return (
    <div style={S.modal} onClick={onClose}>
      <div style={{ ...S.modalC, maxWidth: 500 }} onClick={e => e.stopPropagation()}>
        <div style={{ fontSize: 17, fontWeight: 700, marginBottom: 14 }}>📍 {client?.name}</div>
        {images.map(img => (
          <div key={img.id} style={{ marginBottom: 10, borderRadius: 10, overflow: 'hidden', border: `1px solid ${C.border}` }}>
            <img src={img.image_url} alt={img.caption} style={{ width: '100%', maxHeight: 280, objectFit: 'cover', display: 'block' }} />
            {img.caption && <div style={{ padding: '10px 12px', fontSize: 14, background: C.input }}>{img.caption}</div>}
          </div>
        ))}
        <button style={{ ...S.bigBtn('outline'), marginTop: 8 }} onClick={onClose}>Fermer</button>
      </div>
    </div>
  )
}
