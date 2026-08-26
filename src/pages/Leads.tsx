import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase-enhanced'
import GlassCard from '../components/ui/GlassCard'
import { motion, AnimatePresence } from 'framer-motion'
import { Phone, Plus, X, Building2, User, MessageSquare, Globe, PhoneCall, CheckCircle2 } from 'lucide-react'

interface Lead {
  id: number
  business_name: string
  contact_name: string
  phone: string
  email: string
  notes: string
  status: 'pending' | 'yes' | 'no' | 'maybe'
  source: string
  created_at: string
}

interface CallLog {
  id: number
  lead_id: number
  outcome: string
  notes: string
  created_at: string
}

type Tab = 'to-call' | 'history' | 'all'

const OUTCOME_COLORS: Record<string, string> = {
  yes: 'text-neon-green border-neon-green/30 bg-neon-green/10',
  maybe: 'text-gold border-gold/30 bg-gold/10',
  no: 'text-red-400/60 border-red-400/20 bg-red-400/10',
  no_answer: 'text-white/30 border-white/10 bg-white/5',
}

const OUTCOME_LABELS: Record<string, string> = {
  yes: 'Yes',
  maybe: 'Maybe',
  no: 'No',
  no_answer: 'No Answer',
}

export default function Leads() {
  const { user } = useAuth()
  const [leads, setLeads] = useState<Lead[]>([])
  const [callLogs, setCallLogs] = useState<CallLog[]>([])
  const [todayCalls, setTodayCalls] = useState(0)
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [tab, setTab] = useState<Tab>('to-call')

  // Lead form
  const [businessName, setBusinessName] = useState('')
  const [contactName, setContactName] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [notes, setNotes] = useState('')
  const [source, setSource] = useState('')
  const [submitting, setSubmitting] = useState(false)

  // Call dialog
  const [callingLead, setCallingLead] = useState<Lead | null>(null)
  const [callNotes, setCallNotes] = useState('')
  const [callOutcome, setCallOutcome] = useState<string | null>(null)
  const [savingCall, setSavingCall] = useState(false)

  useEffect(() => {
    fetchAll()
  }, [])

  async function fetchAll() {
    if (!user) return
    const [leadRes, logRes] = await Promise.all([
      supabase.from('leads').select('*').order('created_at', { ascending: false }),
      supabase.from('call_logs').select('*').order('created_at', { ascending: false }),
    ])
    if (leadRes.data) setLeads(leadRes.data)
    if (logRes.data) {
      setCallLogs(logRes.data)
      // Count today's calls
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      setTodayCalls(logRes.data.filter((l: any) => new Date(l.created_at) >= today).length)
    }
    setLoading(false)
  }

  async function addLead() {
    if (!user || !businessName.trim()) return
    setSubmitting(true)
    const { data } = await supabase
      .from('leads')
      .insert({
        user_id: user.id,
        business_name: businessName.trim(),
        contact_name: contactName.trim(),
        phone: phone.trim(),
        email: email.trim(),
        notes: notes.trim(),
        source: source.trim(),
        status: 'pending',
      })
      .select()
      .single()
    if (data) {
      setLeads(prev => [data, ...prev])
      setBusinessName(''); setContactName(''); setPhone(''); setEmail('')
      setNotes(''); setSource(''); setShowForm(false)
    }
    setSubmitting(false)
  }

  async function logCall() {
    if (!user || !callingLead || !callOutcome) return
    setSavingCall(true)
    const now = new Date().toISOString()

    // Insert call log
    await supabase.from('call_logs').insert({
      user_id: user.id,
      lead_id: callingLead.id,
      outcome: callOutcome,
      notes: callNotes.trim(),
    })

    // Update lead status
    await supabase.from('leads').update({ status: callOutcome, updated_at: now }).eq('id', callingLead.id)

    // Update local state
    const newLog: CallLog = {
      id: Date.now(),
      lead_id: callingLead.id,
      outcome: callOutcome,
      notes: callNotes.trim(),
      created_at: now,
    }
    setCallLogs(prev => [newLog, ...prev])
    setLeads(prev => prev.map(l => l.id === callingLead.id ? { ...l, status: callOutcome as Lead['status'] } : l))
    setTodayCalls(prev => prev + 1)
    setCallingLead(null)
    setCallNotes('')
    setCallOutcome(null)
    setSavingCall(false)
  }

  function openCallDialog(lead: Lead) {
    setCallingLead(lead)
    setCallNotes('')
    setCallOutcome(null)
  }

  // Get the last outcome for each lead today
  function getTodayOutcome(leadId: number): string | null {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const todayLog = callLogs.find(l => l.lead_id === leadId && new Date(l.created_at) >= today)
    return todayLog?.outcome || null
  }

  // Leads to call: pending or called before today but no call today yet
  const toCallLeads = leads.filter(l => {
    const outcome = getTodayOutcome(l.id)
    if (outcome) return false // Already called today
    return l.status === 'pending' || l.status === 'maybe'
  })

  // Leads called today
  const todayLeads = leads.filter(l => getTodayOutcome(l.id) !== null)

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="p-4 pb-24 space-y-4 max-w-lg mx-auto"
    >
      {/* Header with daily counter */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">Leads</h1>
          <p className="text-xs text-white/40">{leads.length} total</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right">
            <div className="text-2xl font-bold text-neon-cyan">{todayCalls}</div>
            <div className="text-[10px] text-white/40 uppercase tracking-wider">Called Today</div>
          </div>
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-neon-cyan/15 text-neon-cyan border border-neon-cyan/25 text-xs font-medium hover:bg-neon-cyan/25 transition-colors"
          >
            <Plus size={14} />
            Add Lead
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1.5">
        {(['to-call', 'history', 'all'] as const).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 py-2 rounded-lg text-xs font-medium transition-colors ${
              tab === t
                ? 'bg-white/10 text-white border border-white/10'
                : 'bg-white/5 text-white/30 border border-white/5 hover:text-white/50'
            }`}
          >
            {t === 'to-call' ? `To Call (${toCallLeads.length})` : t === 'history' ? `Today (${todayLeads.length})` : `All (${leads.length})`}
          </button>
        ))}
      </div>

      {/* Add Lead Form */}
      <AnimatePresence>
        {showForm && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}>
            <GlassCard className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs text-white/40 uppercase tracking-wider font-medium">New Lead</span>
                <button onClick={() => setShowForm(false)} className="text-white/30 hover:text-white/60 transition-colors">
                  <X size={16} />
                </button>
              </div>
              <input value={businessName} onChange={e => setBusinessName(e.target.value)} placeholder="Business name *"
                className="w-full bg-white/5 border border-white/5 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-neon-cyan/30 placeholder:text-white/20" />
              <input value={contactName} onChange={e => setContactName(e.target.value)} placeholder="Contact name"
                className="w-full bg-white/5 border border-white/5 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-neon-cyan/30 placeholder:text-white/20" />
              <div className="grid grid-cols-2 gap-2">
                <input value={phone} onChange={e => setPhone(e.target.value)} placeholder="Phone"
                  className="w-full bg-white/5 border border-white/5 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-neon-cyan/30 placeholder:text-white/20" />
                <input value={email} onChange={e => setEmail(e.target.value)} placeholder="Email"
                  className="w-full bg-white/5 border border-white/5 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-neon-cyan/30 placeholder:text-white/20" />
              </div>
              <input value={source} onChange={e => setSource(e.target.value)} placeholder="Source (Google Maps, referral...)"
                className="w-full bg-white/5 border border-white/5 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-neon-cyan/30 placeholder:text-white/20" />
              <textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Notes..."
                className="w-full bg-white/5 border border-white/5 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-neon-cyan/30 placeholder:text-white/20 resize-none h-16" />
              <button onClick={addLead} disabled={!businessName.trim() || submitting}
                className="w-full py-2 rounded-lg bg-neon-cyan/15 text-neon-cyan border border-neon-cyan/25 text-sm font-medium hover:bg-neon-cyan/25 transition-colors disabled:opacity-30 disabled:cursor-not-allowed">
                {submitting ? 'Adding...' : 'Add Lead'}
              </button>
            </GlassCard>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Call Dialog */}
      <AnimatePresence>
        {callingLead && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
            onClick={() => !savingCall && setCallingLead(null)}
          >
            <motion.div
              initial={{ y: 100, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 100, opacity: 0 }}
              className="w-full max-w-sm"
              onClick={e => e.stopPropagation()}
            >
              <GlassCard className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-medium text-white">{callingLead.business_name}</div>
                    {callingLead.phone && (
                      <div className="text-xs text-white/40 flex items-center gap-1 mt-0.5">
                        <Phone size={11} />
                        {callingLead.phone}
                      </div>
                    )}
                  </div>
                  <button onClick={() => setCallingLead(null)} className="text-white/30 hover:text-white/60">
                    <X size={16} />
                  </button>
                </div>

                <div className="text-center">
                  <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-neon-cyan/15 mb-2">
                    <PhoneCall size={24} className="text-neon-cyan" />
                  </div>
                  <div className="text-sm text-white/60">How did the call go?</div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  {[
                    { value: 'yes', label: 'Yes', color: 'border-neon-green/30 bg-neon-green/10 text-neon-green hover:bg-neon-green/20' },
                    { value: 'maybe', label: 'Maybe', color: 'border-gold/30 bg-gold/10 text-gold hover:bg-gold/20' },
                    { value: 'no', label: 'No', color: 'border-red-400/30 bg-red-400/10 text-red-400 hover:bg-red-400/20' },
                    { value: 'no_answer', label: 'No Answer', color: 'border-white/10 bg-white/5 text-white/50 hover:bg-white/10' },
                  ].map(o => (
                    <button
                      key={o.value}
                      onClick={() => setCallOutcome(callOutcome === o.value ? null : o.value)}
                      className={`py-3 px-4 rounded-lg border text-sm font-medium transition-all ${
                        callOutcome === o.value ? o.color + ' ring-2 ring-offset-2 ring-offset-transparent' : 'border-white/5 bg-white/5 text-white/40 hover:text-white/60 hover:bg-white/10'
                      }`}
                    >
                      {o.label}
                    </button>
                  ))}
                </div>

                <input
                  value={callNotes}
                  onChange={e => setCallNotes(e.target.value)}
                  placeholder="Any notes from the call..."
                  className="w-full bg-white/5 border border-white/5 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-neon-cyan/30 placeholder:text-white/20"
                />

                <button
                  onClick={logCall}
                  disabled={!callOutcome || savingCall}
                  className="w-full py-2.5 rounded-lg bg-neon-cyan/15 text-neon-cyan border border-neon-cyan/25 text-sm font-medium hover:bg-neon-cyan/25 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  {savingCall ? 'Saving...' : 'Log Call'}
                </button>
              </GlassCard>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* --- TO CALL TAB --- */}
      {tab === 'to-call' && (
        loading ? (
          <div className="text-center text-white/20 text-sm py-12">Loading...</div>
        ) : toCallLeads.length === 0 ? (
          <div className="text-center text-white/20 text-sm py-12">
            All caught up! Everyone's been called today.
          </div>
        ) : (
          <div className="space-y-2">
            {toCallLeads.map((lead, i) => (
              <motion.div key={lead.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}>
                <GlassCard className="!p-3">
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => openCallDialog(lead)}
                      className="shrink-0 w-12 h-12 rounded-full bg-neon-cyan/15 text-neon-cyan flex items-center justify-center hover:bg-neon-cyan/25 transition-colors"
                    >
                      <PhoneCall size={20} />
                    </button>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-white truncate">{lead.business_name}</div>
                      {lead.contact_name && (
                        <div className="text-xs text-white/40 flex items-center gap-1">
                          <User size={11} />
                          {lead.contact_name}
                        </div>
                      )}
                      {lead.phone && (
                        <div className="text-xs text-white/30 flex items-center gap-1">
                          <Phone size={11} />
                          {lead.phone}
                        </div>
                      )}
                    </div>
                    <button
                      onClick={() => openCallDialog(lead)}
                      className="shrink-0 px-3 py-1.5 rounded-lg bg-neon-cyan/15 text-neon-cyan border border-neon-cyan/25 text-xs font-medium hover:bg-neon-cyan/25 transition-colors"
                    >
                      Call Now
                    </button>
                  </div>
                </GlassCard>
              </motion.div>
            ))}
          </div>
        )
      )}

      {/* --- HISTORY TAB --- */}
      {tab === 'history' && (
        loading ? (
          <div className="text-center text-white/20 text-sm py-12">Loading...</div>
        ) : todayLeads.length === 0 ? (
          <div className="text-center text-white/20 text-sm py-12">
            No calls logged today yet.
          </div>
        ) : (
          <div className="space-y-2">
            {todayLeads.map((lead, i) => {
              const outcome = getTodayOutcome(lead.id)
              return (
                <motion.div key={lead.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}>
                  <GlassCard className="!p-3">
                    <div className="flex items-center gap-3">
                      <div className={`shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${outcome === 'yes' ? 'bg-neon-green/15 text-neon-green' : outcome === 'maybe' ? 'bg-gold/15 text-gold' : 'bg-red-400/15 text-red-400'}`}>
                        {outcome === 'yes' ? <CheckCircle2 size={18} /> : <X size={18} />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-white truncate">{lead.business_name}</div>
                        <div className="text-[10px] text-white/30">
                          {new Date().toLocaleDateString('en-GB', { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </div>
                      <span className={`px-2 py-1 rounded-md text-[10px] font-semibold border uppercase tracking-wider ${OUTCOME_COLORS[outcome || '']}`}>
                        {OUTCOME_LABELS[outcome || '']}
                      </span>
                    </div>
                  </GlassCard>
                </motion.div>
              )
            })}
          </div>
        )
      )}

      {/* --- ALL TAB --- */}
      {tab === 'all' && (
        loading ? (
          <div className="text-center text-white/20 text-sm py-12">Loading...</div>
        ) : leads.length === 0 ? (
          <div className="text-center text-white/20 text-sm py-12">
            No leads yet. Tap "Add Lead" to get started.
          </div>
        ) : (
          <div className="space-y-2">
            {leads.map((lead, i) => {
              const todayOutcome = getTodayOutcome(lead.id)
              return (
                <motion.div key={lead.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}>
                  <GlassCard className="!p-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <Building2 size={13} className="text-white/30 shrink-0" />
                          <span className="text-sm font-medium text-white truncate">{lead.business_name}</span>
                        </div>
                        {lead.contact_name && (
                          <div className="flex items-center gap-1.5 text-xs text-white/40 mb-0.5">
                            <User size={11} />
                            {lead.contact_name}
                          </div>
                        )}
                        {lead.phone && (
                          <div className="flex items-center gap-1.5 text-xs text-white/40 mb-0.5">
                            <Phone size={11} />
                            {lead.phone}
                          </div>
                        )}
                        {lead.email && (
                          <div className="flex items-center gap-1.5 text-xs text-white/40 mb-0.5">
                            <Globe size={11} />
                            {lead.email}
                          </div>
                        )}
                        {lead.notes && (
                          <div className="flex items-start gap-1.5 text-xs text-white/30 mt-1">
                            <MessageSquare size={11} className="mt-0.5 shrink-0" />
                            <span className="line-clamp-2">{lead.notes}</span>
                          </div>
                        )}
                        {lead.source && (
                          <div className="text-[10px] text-white/20 mt-1">{lead.source}</div>
                        )}
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        {todayOutcome ? (
                          <span className={`px-2 py-1 rounded-md text-[10px] font-semibold border uppercase tracking-wider ${OUTCOME_COLORS[todayOutcome]}`}>
                            {OUTCOME_LABELS[todayOutcome]}
                          </span>
                        ) : (
                          <button
                            onClick={() => openCallDialog(lead)}
                            className="p-2 rounded-lg bg-neon-cyan/15 text-neon-cyan hover:bg-neon-cyan/25 transition-colors"
                            title="Call now"
                          >
                            <PhoneCall size={14} />
                          </button>
                        )}
                        <button
                          onClick={async () => {
                            await supabase.from('leads').delete().eq('id', lead.id)
                            setLeads(prev => prev.filter(l => l.id !== lead.id))
                          }}
                          className="p-1.5 rounded-md text-white/20 hover:text-red-400/60 hover:bg-red-400/10 transition-colors"
                          title="Delete"
                        >
                          <X size={13} />
                        </button>
                      </div>
                    </div>
                  </GlassCard>
                </motion.div>
              )
            })}
          </div>
        )
      )}
    </motion.div>
  )
}
