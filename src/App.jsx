import { useState, useEffect, useCallback } from 'react'
import { supabase } from './supabase.js'

// ─── HELPERS ─────────────────────────────────────────────────
const todayStr = () => new Date().toISOString().split('T')[0]

function downloadCSV(filename, rows) {
  const BOM = '\uFEFF'
  const csv = BOM + rows.map(r => r.map(c => `"${String(c ?? '').replace(/"/g, '""')}"`).join(';')).join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = filename
  a.click()
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
  clock: 'M12 2a10 10 0 100 20 10 10 0 000-20zM12 6v6l4 2',
  phone: 'M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72 12.84 12.84 0 00.7 2.81 2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45 12.84 12.84 0 002.81.7A2 2 0 0122 16.92z',
  map: 'M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0zM12 13a3 3 0 100-6 3 3 0 000 6z',
  back: 'M19 12H5M12 19l-7-7 7-7',
  save: 'M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2zM17 21v-8H7v8M7 3v5h8',
  download: 'M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3',
  refresh: 'M23 4v6h-6M1 20v-6h6M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15',
  trash: 'M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2',
}

// ─── COLORS & STYLES ─────────────────────────────────────────
const C = {
  bg: '#0f1115', card: '#1a1d24', cardHover: '#22262f',
  accent: '#e8593c', accentSoft: 'rgba(232,89,60,0.12)',
  green: '#34d399', greenSoft: 'rgba(52,211,153,0.12)',
  yellow: '#fbbf24', yellowSoft: 'rgba(251,191,36,0.12)',
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
  nav: { display: 'flex', gap: 2, background: C.input, borderRadius: 10, padding: 3 },
  navBtn: (a) => ({
    padding: '7px 12px', borderRadius: 8, border: 'none', cursor: 'pointer',
    fontSize: 11, fontWeight: 600, transition: 'all 0.2s',
    background: a ? C.accent : 'transparent', color: a ? '#fff' : C.muted,
    display: 'flex', alignItems: 'center', gap: 4,
  }),
  page: { padding: '16px', maxWidth: 700, margin: '0 auto' },
  section: { fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: C.muted, marginBottom: 10 },
  card: { background: C.card, borderRadius: 12, padding: 14, marginBottom: 8, border: `1px solid ${C.border}` },
  badge: (color, bg) => ({
    display: 'inline-flex', alignItems: 'center', gap: 3,
    padding: '2px 8px', borderRadius: 20, fontSize: 11, fontWeight: 600, color, background: bg,
  }),
  btn: (v = 'primary') => ({
    padding: '9px 16px', borderRadius: 10, border: 'none', cursor: 'pointer',
    fontSize: 12, fontWeight: 600, transition: 'all 0.2s',
    display: 'inline-flex', alignItems: 'center', gap: 5,
    ...(v === 'primary' ? { background: C.accent, color: '#fff' } :
      v === 'ghost' ? { background: 'transparent', color: C.muted, padding: '6px 10px' } :
      v === 'green' ? { background: C.green, color: '#000' } :
      v === 'danger' ? { background: '#ef4444', color: '#fff' } :
      { background: C.input, color: C.text, border: `1px solid ${C.border}` }),
  }),
  input: {
    width: '100%', padding: '9px 12px', borderRadius: 8, boxSizing: 'border-box',
    border: `1px solid ${C.border}`, background: C.input, color: C.text, fontSize: 14, outline: 'none',
  },
  select: {
    width: '100%', padding: '9px 12px', borderRadius: 8, boxSizing: 'border-box',
    border: `1px solid ${C.border}`, background: C.input, color: C.text, fontSize: 14, outline: 'none',
  },
  label: { fontSize: 11, fontWeight: 600, color: C.muted, marginBottom: 3, display: 'block' },
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

// ─── DATA HOOKS ──────────────────────────────────────────────
function useSupabase() {
  const [clients, setClients] = useState([])
  const [drivers, setDrivers] = useState([])
  const [deliveries, setDeliveries] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchAll = useCallback(async () => {
    try {
      setError(null)
      const [cRes, dRes, delRes] = await Promise.all([
        supabase.from('clients').select('*').eq('active', true).order('name'),
        supabase.from('drivers').select('*').eq('active', true).order('name'),
        supabase.from('deliveries').select('*').order('date', { ascending: false }),
      ])
      if (cRes.error) throw cRes.error
      if (dRes.error) throw dRes.error
      if (delRes.error) throw delRes.error
      setClients(cRes.data)
      setDrivers(dRes.data)
      setDeliveries(delRes.data)
    } catch (e) {
      setError(e.message)
      console.error('Fetch error:', e)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchAll() }, [fetchAll])

  // Real-time subscriptions
  useEffect(() => {
    const channel = supabase
      .channel('cotting-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'deliveries' }, () => fetchAll())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'clients' }, () => fetchAll())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'drivers' }, () => fetchAll())
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [fetchAll])

  return { clients, drivers, deliveries, loading, error, refresh: fetchAll }
}

// ─── MAIN APP ────────────────────────────────────────────────
export default function App() {
  const [view, setView] = useState('driver')
  const db = useSupabase()

  if (db.loading) return (
    <div style={{ ...S.app, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 40, marginBottom: 8 }}>🐷</div>
        <div style={{ color: C.muted }}>Chargement...</div>
      </div>
    </div>
  )

  if (db.error) return (
    <div style={{ ...S.app, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ textAlign: 'center', padding: 20 }}>
        <div style={{ fontSize: 40, marginBottom: 8 }}>⚠️</div>
        <div style={{ color: C.accent, marginBottom: 8 }}>Erreur de connexion</div>
        <div style={{ color: C.muted, fontSize: 12, marginBottom: 16 }}>{db.error}</div>
        <button style={S.btn()} onClick={db.refresh}>Réessayer</button>
      </div>
    </div>
  )

  return (
    <div style={S.app}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
      <div style={S.header}>
        <div style={S.logo}>
          <span style={{ fontSize: 22 }}>🐷</span>
          <div>
            <div style={S.logoText}>Cotting SA</div>
            <div style={S.logoSub}>Transport</div>
          </div>
        </div>
        <div style={S.nav}>
          {[['patron', 'Patron', I.users], ['driver', 'Chauffeur', I.truck], ['secretary', 'Bureau', I.chart]].map(([k, l, ic]) => (
            <button key={k} style={S.navBtn(view === k)} onClick={() => setView(k)}>
              <Icon d={ic} size={13} /> {l}
            </button>
          ))}
        </div>
      </div>
      {view === 'patron' && <PatronView {...db} />}
      {view === 'driver' && <DriverView {...db} />}
      {view === 'secretary' && <SecretaryView {...db} />}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════
// PATRON VIEW
// ═══════════════════════════════════════════════════════════════
function PatronView({ clients, drivers, deliveries, refresh }) {
  const [tab, setTab] = useState('deliveries')
  const [showNewDel, setShowNewDel] = useState(false)
  const [showNewClient, setShowNewClient] = useState(false)
  const [editClient, setEditClient] = useState(null)

  const today = todayStr()
  const todayDel = deliveries.filter(d => d.date === today)
  const done = todayDel.filter(d => d.status === 'delivered').length

  async function addDelivery(data) {
    await supabase.from('deliveries').insert({
      date: today, driver_id: data.driverId, client_id: data.clientId,
      qty_planned: data.qtyPlanned, status: 'pending',
    })
    refresh()
    setShowNewDel(false)
  }

  async function saveClient(data) {
    if (data.id) {
      await supabase.from('clients').update({
        name: data.name, address: data.address, contact: data.contact,
        phone: data.phone, notes: data.notes, default_qty: data.default_qty,
      }).eq('id', data.id)
    } else {
      await supabase.from('clients').insert({
        name: data.name, address: data.address, contact: data.contact,
        phone: data.phone, notes: data.notes, default_qty: data.default_qty,
      })
    }
    refresh()
    setEditClient(null)
    setShowNewClient(false)
  }

  async function deleteDelivery(id) {
    if (confirm('Supprimer cette livraison ?')) {
      await supabase.from('deliveries').delete().eq('id', id)
      refresh()
    }
  }

  return (
    <div style={S.page}>
      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        <div style={S.stat}><div style={{ ...S.statN, color: C.accent }}>{todayDel.length}</div><div style={S.statL}>Aujourd'hui</div></div>
        <div style={S.stat}><div style={{ ...S.statN, color: C.green }}>{done}</div><div style={S.statL}>Effectuées</div></div>
        <div style={S.stat}><div style={{ ...S.statN, color: C.yellow }}>{todayDel.length - done}</div><div style={S.statL}>En attente</div></div>
      </div>

      <div style={{ display: 'flex', gap: 6, marginBottom: 14 }}>
        <button style={S.btn(tab === 'deliveries' ? 'primary' : 'outline')} onClick={() => setTab('deliveries')}>
          <Icon d={I.truck} size={13} /> Livraisons
        </button>
        <button style={S.btn(tab === 'clients' ? 'primary' : 'outline')} onClick={() => setTab('clients')}>
          <Icon d={I.users} size={13} /> Clients
        </button>
      </div>

      {tab === 'deliveries' && (
        <>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <div style={S.section}>Tournées du jour</div>
            <button style={S.btn()} onClick={() => setShowNewDel(true)}>
              <Icon d={I.plus} size={13} /> Ajouter
            </button>
          </div>
          {drivers.map(driver => {
            const dDel = todayDel.filter(d => d.driver_id === driver.id)
            if (!dDel.length) return null
            return (
              <div key={driver.id} style={{ marginBottom: 14 }}>
                <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 6, display: 'flex', alignItems: 'center', gap: 5 }}>
                  <Icon d={I.truck} size={13} color={C.accent} /> {driver.name}
                  <span style={S.badge(C.muted, C.input)}>{dDel.length} arrêts</span>
                </div>
                {dDel.map(del => {
                  const client = clients.find(c => c.id === del.client_id)
                  return (
                    <div key={del.id} style={{ ...S.card, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 600, fontSize: 13 }}>{client?.name}</div>
                        <div style={{ fontSize: 11, color: C.muted }}>{client?.address}</div>
                        <div style={{ fontSize: 11, color: C.muted, marginTop: 3 }}>
                          Prévu: {del.qty_planned}
                          {del.qty_delivered != null && <> → Livré: <b style={{ color: C.green }}>{del.qty_delivered}</b></>}
                        </div>
                        {del.notes && <div style={{ fontSize: 11, color: C.yellow, marginTop: 2 }}>📝 {del.notes}</div>}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        {del.status === 'delivered' ? (
                          <span style={S.badge(C.green, C.greenSoft)}><Icon d={I.check} size={11} color={C.green} /> Livré</span>
                        ) : del.status === 'issue' ? (
                          <span style={S.badge(C.yellow, C.yellowSoft)}>⚠️</span>
                        ) : (
                          <span style={S.badge(C.muted, C.input)}>En attente</span>
                        )}
                        {del.status === 'pending' && (
                          <button style={{ ...S.btn('ghost'), padding: 4 }} onClick={() => deleteDelivery(del.id)}>
                            <Icon d={I.trash} size={14} color="#ef4444" />
                          </button>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )
          })}
          {todayDel.length === 0 && (
            <div style={{ textAlign: 'center', color: C.muted, padding: 40 }}>
              Aucune livraison planifiée aujourd'hui.<br />
              <button style={{ ...S.btn(), marginTop: 12 }} onClick={() => setShowNewDel(true)}>
                <Icon d={I.plus} size={13} /> Créer une tournée
              </button>
            </div>
          )}
        </>
      )}

      {tab === 'clients' && (
        <>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <div style={S.section}>Clients ({clients.length})</div>
            <button style={S.btn()} onClick={() => setShowNewClient(true)}>
              <Icon d={I.plus} size={13} /> Nouveau
            </button>
          </div>
          {clients.map(c => (
            <div key={c.id} style={{ ...S.card, cursor: 'pointer' }} onClick={() => setEditClient(c)}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 13 }}>{c.name}</div>
                  <div style={{ fontSize: 11, color: C.muted, marginTop: 3 }}><Icon d={I.map} size={11} /> {c.address}</div>
                  <div style={{ fontSize: 11, color: C.muted, marginTop: 1 }}><Icon d={I.phone} size={11} /> {c.contact} — {c.phone}</div>
                  {c.notes && <div style={{ fontSize: 11, color: C.yellow, marginTop: 3 }}>💡 {c.notes}</div>}
                </div>
                <span style={S.badge(C.accent, C.accentSoft)}>{c.default_qty}/défaut</span>
              </div>
            </div>
          ))}
        </>
      )}

      {showNewDel && <NewDeliveryModal clients={clients} drivers={drivers} onSave={addDelivery} onClose={() => setShowNewDel(false)} />}
      {(showNewClient || editClient) && (
        <ClientModal client={editClient} onSave={saveClient} onClose={() => { setEditClient(null); setShowNewClient(false) }} />
      )}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════
// DRIVER VIEW
// ═══════════════════════════════════════════════════════════════
function DriverView({ clients, drivers, deliveries, refresh }) {
  const [driverId, setDriverId] = useState(() => localStorage.getItem('cotting-driver') || null)
  const [confirmDel, setConfirmDel] = useState(null)

  const today = todayStr()

  function selectDriver(id) {
    setDriverId(id)
    localStorage.setItem('cotting-driver', id)
  }

  if (!driverId) return (
    <div style={S.page}>
      <div style={S.section}>Qui êtes-vous ?</div>
      {drivers.map(d => {
        const myDel = deliveries.filter(del => del.driver_id === d.id && del.date === today)
        const done = myDel.filter(del => del.status === 'delivered').length
        return (
          <button key={d.id} style={{ ...S.card, cursor: 'pointer', textAlign: 'left', width: '100%' }}
            onClick={() => selectDriver(d.id)}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: 15 }}>{d.name}</div>
                <div style={{ fontSize: 12, color: C.muted }}>{myDel.length} livraison{myDel.length !== 1 ? 's' : ''}</div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                {myDel.length > 0 && <span style={S.badge(done === myDel.length ? C.green : C.yellow, done === myDel.length ? C.greenSoft : C.yellowSoft)}>{done}/{myDel.length}</span>}
                <span style={{ color: C.accent, fontSize: 18 }}>→</span>
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

  async function confirmDelivery(data) {
    await supabase.from('deliveries').update({
      qty_delivered: data.qty, status: data.status,
      notes: data.notes, return_time: new Date().toISOString(),
    }).eq('id', data.id)
    refresh()
    setConfirmDel(null)
  }

  return (
    <div style={S.page}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <button style={S.btn('ghost')} onClick={() => { setDriverId(null); localStorage.removeItem('cotting-driver') }}>
          <Icon d={I.back} size={15} /> Retour
        </button>
        <button style={S.btn('ghost')} onClick={refresh}>
          <Icon d={I.refresh} size={14} />
        </button>
      </div>

      <div style={{ marginTop: 10, marginBottom: 14 }}>
        <div style={{ fontSize: 18, fontWeight: 800 }}>Salut {driver?.name?.split(' ')[0]} 👋</div>
        <div style={{ color: C.muted, fontSize: 12, marginTop: 3 }}>
          {done}/{myDel.length} livraison{myDel.length !== 1 ? 's' : ''} effectuée{done !== 1 ? 's' : ''}
        </div>
        <div style={{ background: C.input, borderRadius: 8, height: 5, marginTop: 8, overflow: 'hidden' }}>
          <div style={{
            background: `linear-gradient(90deg, ${C.accent}, ${C.green})`,
            height: '100%', borderRadius: 8, transition: 'width 0.5s',
            width: myDel.length ? `${(done / myDel.length) * 100}%` : '0%',
          }} />
        </div>
      </div>

      {myDel.map(del => {
        const client = clients.find(c => c.id === del.client_id)
        const isDone = del.status === 'delivered'
        const isIssue = del.status === 'issue'
        return (
          <div key={del.id} style={{
            ...S.card, opacity: isDone ? 0.55 : 1,
            borderLeft: `3px solid ${isDone ? C.green : isIssue ? C.yellow : C.accent}`,
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, fontSize: 14 }}>{client?.name}</div>
                <div style={{ fontSize: 11, color: C.muted, marginTop: 3 }}>
                  <Icon d={I.map} size={11} /> {client?.address}
                </div>
                {client?.phone && (
                  <a href={`tel:${client.phone}`} style={{ fontSize: 11, color: C.accent, marginTop: 3, display: 'flex', alignItems: 'center', gap: 3, textDecoration: 'none' }}>
                    <Icon d={I.phone} size={11} color={C.accent} /> {client.phone}
                  </a>
                )}
                {client?.notes && (
                  <div style={{ fontSize: 11, color: C.yellow, marginTop: 5, padding: '5px 8px', background: C.yellowSoft, borderRadius: 6 }}>
                    💡 {client.notes}
                  </div>
                )}
                <div style={{ marginTop: 6, fontSize: 12 }}>
                  <b>{del.qty_planned}</b> porcs à livrer
                  {isDone && <span style={{ color: C.green, marginLeft: 6 }}>✓ {del.qty_delivered} livrés</span>}
                  {isIssue && <span style={{ color: C.yellow, marginLeft: 6 }}>⚠️ {del.notes}</span>}
                </div>
              </div>
              {!isDone && !isIssue && (
                <button style={S.btn()} onClick={() => setConfirmDel(del)}>Confirmer</button>
              )}
            </div>
          </div>
        )
      })}

      {myDel.length === 0 && (
        <div style={{ textAlign: 'center', color: C.muted, padding: 40 }}>
          Pas de livraison prévue aujourd'hui 🎉
        </div>
      )}

      {confirmDel && (
        <ConfirmModal delivery={confirmDel} client={clients.find(c => c.id === confirmDel.client_id)}
          onSave={confirmDelivery} onClose={() => setConfirmDel(null)} />
      )}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════
// SECRETARY VIEW — avec export CSV
// ═══════════════════════════════════════════════════════════════
function SecretaryView({ clients, drivers, deliveries }) {
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
    if (d.status === 'delivered') {
      driverSummary[d.driver_id].count++
      driverSummary[d.driver_id].qty += d.qty_delivered || 0
    }
  })

  function exportCSV() {
    const header = ['Date', 'Chauffeur', 'Client', 'Adresse', 'Prévu', 'Livré', 'Statut', 'Notes', 'Heure retour']
    const rows = monthDel.map(d => {
      const driver = drivers.find(dr => dr.id === d.driver_id)
      const client = clients.find(c => c.id === d.client_id)
      return [
        d.date, driver?.name, client?.name, client?.address,
        d.qty_planned, d.qty_delivered ?? '', d.status,
        d.notes ?? '', d.return_time ? new Date(d.return_time).toLocaleString('fr-CH') : '',
      ]
    })
    const month = target.toLocaleDateString('fr-CH', { month: '2-digit', year: 'numeric' }).replace('/', '-')
    downloadCSV(`cotting-livraisons-${month}.csv`, [header, ...rows])
  }

  function exportClientCSV() {
    const header = ['Client', 'Adresse', 'Nb livraisons', 'Total porcs', 'Problèmes']
    const rows = Object.entries(clientSummary)
      .sort((a, b) => b[1].qty - a[1].qty)
      .map(([cId, data]) => {
        const client = clients.find(c => c.id === cId)
        return [client?.name, client?.address, data.count, data.qty, data.issues]
      })
    const month = target.toLocaleDateString('fr-CH', { month: '2-digit', year: 'numeric' }).replace('/', '-')
    downloadCSV(`cotting-clients-${month}.csv`, [header, ...rows])
  }

  return (
    <div style={S.page}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <button style={S.btn('ghost')} onClick={() => setMonthOffset(monthOffset - 1)}>←</button>
        <div style={{ fontSize: 16, fontWeight: 700, textTransform: 'capitalize' }}>{monthLabel}</div>
        <button style={S.btn('ghost')} onClick={() => setMonthOffset(monthOffset + 1)}>→</button>
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        <div style={S.stat}><div style={{ ...S.statN, color: C.green }}>{delivered.length}</div><div style={S.statL}>Livraisons</div></div>
        <div style={S.stat}><div style={{ ...S.statN, color: C.accent }}>{totalQty}</div><div style={S.statL}>Porcs</div></div>
        <div style={S.stat}><div style={{ ...S.statN, color: C.yellow }}>{issues}</div><div style={S.statL}>Problèmes</div></div>
      </div>

      {/* Export buttons */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        <button style={{ ...S.btn('green'), flex: 1, justifyContent: 'center' }} onClick={exportCSV}>
          <Icon d={I.download} size={14} /> Export détaillé CSV
        </button>
        <button style={{ ...S.btn('outline'), flex: 1, justifyContent: 'center' }} onClick={exportClientCSV}>
          <Icon d={I.download} size={14} /> Résumé clients
        </button>
      </div>

      <div style={S.section}>Par client</div>
      <div style={{ ...S.card, padding: 0, overflow: 'hidden', marginBottom: 16 }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr><th style={S.th}>Client</th><th style={{ ...S.th, textAlign: 'right' }}>Livr.</th><th style={{ ...S.th, textAlign: 'right' }}>Porcs</th></tr>
          </thead>
          <tbody>
            {Object.entries(clientSummary).sort((a, b) => b[1].qty - a[1].qty).map(([cId, data]) => (
              <tr key={cId}>
                <td style={S.td}>{clients.find(c => c.id === cId)?.name}</td>
                <td style={{ ...S.td, textAlign: 'right' }}>{data.count}</td>
                <td style={{ ...S.td, textAlign: 'right', fontWeight: 700, color: C.accent }}>{data.qty}</td>
              </tr>
            ))}
            {!Object.keys(clientSummary).length && (
              <tr><td colSpan={3} style={{ ...S.td, textAlign: 'center', color: C.muted }}>Aucune donnée</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <div style={S.section}>Par chauffeur</div>
      <div style={{ ...S.card, padding: 0, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr><th style={S.th}>Chauffeur</th><th style={{ ...S.th, textAlign: 'right' }}>Livr.</th><th style={{ ...S.th, textAlign: 'right' }}>Porcs</th></tr>
          </thead>
          <tbody>
            {Object.entries(driverSummary).sort((a, b) => b[1].qty - a[1].qty).map(([dId, data]) => (
              <tr key={dId}>
                <td style={S.td}>{drivers.find(d => d.id === dId)?.name}</td>
                <td style={{ ...S.td, textAlign: 'right' }}>{data.count}</td>
                <td style={{ ...S.td, textAlign: 'right', fontWeight: 700, color: C.green }}>{data.qty}</td>
              </tr>
            ))}
            {!Object.keys(driverSummary).length && (
              <tr><td colSpan={3} style={{ ...S.td, textAlign: 'center', color: C.muted }}>Aucune donnée</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════
// MODALS
// ═══════════════════════════════════════════════════════════════
function NewDeliveryModal({ clients, drivers, onSave, onClose }) {
  const [driverId, setDriverId] = useState(drivers[0]?.id || '')
  const [clientId, setClientId] = useState(clients[0]?.id || '')
  const [qty, setQty] = useState('')
  const selClient = clients.find(c => c.id === clientId)

  return (
    <div style={S.modal} onClick={onClose}>
      <div style={S.modalC} onClick={e => e.stopPropagation()}>
        <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 14 }}>Nouvelle livraison</div>
        <div style={{ marginBottom: 10 }}>
          <label style={S.label}>Chauffeur</label>
          <select style={S.select} value={driverId} onChange={e => setDriverId(e.target.value)}>
            {drivers.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
          </select>
        </div>
        <div style={{ marginBottom: 10 }}>
          <label style={S.label}>Client</label>
          <select style={S.select} value={clientId} onChange={e => {
            setClientId(e.target.value)
            const c = clients.find(cl => cl.id === e.target.value)
            if (c) setQty(String(c.default_qty))
          }}>
            {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <div style={{ marginBottom: 14 }}>
          <label style={S.label}>Quantité (porcs)</label>
          <input type="number" style={S.input} value={qty || selClient?.default_qty || ''} onChange={e => setQty(e.target.value)} />
        </div>
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button style={S.btn('outline')} onClick={onClose}>Annuler</button>
          <button style={S.btn()} onClick={() => onSave({
            driverId, clientId, qtyPlanned: parseInt(qty || selClient?.default_qty || 0),
          })}><Icon d={I.save} size={13} /> Ajouter</button>
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
        <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 3 }}>Confirmer livraison</div>
        <div style={{ fontSize: 12, color: C.muted, marginBottom: 14 }}>{client?.name}</div>
        <div style={{ marginBottom: 10 }}>
          <label style={S.label}>Quantité livrée</label>
          <input type="number" style={S.input} value={qty} onChange={e => setQty(e.target.value)} />
        </div>
        <div style={{ marginBottom: 10 }}>
          <label style={S.label}>Statut</label>
          <div style={{ display: 'flex', gap: 6 }}>
            <button style={{ ...S.btn(status === 'delivered' ? 'green' : 'outline'), flex: 1, justifyContent: 'center' }}
              onClick={() => setStatus('delivered')}><Icon d={I.check} size={13} /> OK</button>
            <button style={{
              ...S.btn(status === 'issue' ? 'primary' : 'outline'), flex: 1, justifyContent: 'center',
              ...(status === 'issue' ? { background: C.yellow, color: '#000' } : {}),
            }} onClick={() => setStatus('issue')}>⚠️ Problème</button>
          </div>
        </div>
        <div style={{ marginBottom: 14 }}>
          <label style={S.label}>Note (optionnel)</label>
          <input style={S.input} value={notes} onChange={e => setNotes(e.target.value)} placeholder="Ex: client absent, 2 refusés..." />
        </div>
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button style={S.btn('outline')} onClick={onClose}>Annuler</button>
          <button style={S.btn()} onClick={() => onSave({ id: delivery.id, qty: parseInt(qty), status, notes })}>
            <Icon d={I.save} size={13} /> Envoyer
          </button>
        </div>
      </div>
    </div>
  )
}

function ClientModal({ client, onSave, onClose }) {
  const [f, setF] = useState(client || { name: '', address: '', contact: '', phone: '', notes: '', default_qty: 0 })
  const set = (k, v) => setF({ ...f, [k]: v })

  return (
    <div style={S.modal} onClick={onClose}>
      <div style={S.modalC} onClick={e => e.stopPropagation()}>
        <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 14 }}>{client ? 'Modifier' : 'Nouveau'} client</div>
        {[['name', 'Nom', 'Boucherie Exemple'], ['address', 'Adresse', 'Rue du Village 1, 1700 Fribourg'],
          ['contact', 'Contact', 'Jean Dupont'], ['phone', 'Téléphone', '026 123 45 67'],
          ['notes', 'Notes chauffeurs', 'Infos livraison...']].map(([k, l, p]) => (
          <div key={k} style={{ marginBottom: 10 }}>
            <label style={S.label}>{l}</label>
            <input style={S.input} value={f[k] || ''} onChange={e => set(k, e.target.value)} placeholder={p} />
          </div>
        ))}
        <div style={{ marginBottom: 14 }}>
          <label style={S.label}>Quantité par défaut</label>
          <input type="number" style={S.input} value={f.default_qty || 0} onChange={e => set('default_qty', parseInt(e.target.value) || 0)} />
        </div>
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button style={S.btn('outline')} onClick={onClose}>Annuler</button>
          <button style={S.btn()} onClick={() => onSave(f)}><Icon d={I.save} size={13} /> Enregistrer</button>
        </div>
      </div>
    </div>
  )
}
