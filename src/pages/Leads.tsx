import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import GlassCard from '../components/ui/GlassCard'
import { motion } from 'framer-motion'
import { Phone, Plus, X, Building2, User, MessageSquare, Globe } from 'lucide-react'

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

const STATUS_ORDER: Lead['status'][] = ['pending', 'yes', 'maybe', 'no']

const STATUS_COLORS: Record<Lead['status'], string> = {
  pending: 'text-white/30 border-white/10',
  yes: 'text-neon-green border-neon-green/30 bg-neon-green/10',
  maybe: 'text-gold border-gold/30 bg-gold/10',
  no: 'text-red-400/60 border-red-400/20 bg-red-400/10',
}

const STATUS_LABELS: Record<string, string> = {
  pending: 'Pending',
  yes: 'Yes',
  maybe: 'Maybe',
  no: 'No',
  all: 'All',
}

export default function Leads() {
  const { user } = useAuth()
  const [leads, setLeads] = useState<Lead[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [filter, setFilter] = useState<Lead['status'] | 'all'>('all')

  // Form state
  const [businessName, setBusinessName] = useState('')
  const [contactName, setContactName] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [notes, setNotes] = useState('')
  const [source, setSource] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    fetchLeads()
  }, [])

  async function fetchLeads() {
    if (!user) return
    const { data } = await supabase
      .from('leads')
      .select('*')
      .order('created_at', { ascending: false })
    if (data) setLeads(data)
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

  async function cycleStatus(lead: Lead) {
    const idx = STATUS_ORDER.indexOf(lead.status)
    const nextStatus = STATUS_ORDER[(idx + 1) % STATUS_ORDER.length]
    await supabase.from('leads').update({ status: nextStatus, updated_at: new Date().toISOString() }).eq('id', lead.id)
    setLeads(prev => prev.map(l => l.id === lead.id ? { ...l, status: nextStatus } : l))
  }

  async function deleteLead(id: number) {
    await supabase.from('leads').delete().eq('id', id)
    setLeads(prev => prev.filter(l => l.id !== id))
  }

  const filteredLeads = filter === 'all' ? leads : leads.filter(l => l.status === filter)

  const counts = {
    all: leads.length,
    pending: leads.filter(l => l.status === 'pending').length,
    yes: leads.filter(l => l.status === 'yes').length,
    maybe: leads.filter(l => l.status === 'maybe').length,
    no: leads.filter(l => l.status === 'no').length,
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="p-4 pb-24 space-y-4 max-w-lg mx-auto"
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">Leads</h1>
          <p className="text-xs text-white/40">{counts.all} lead{counts.all !== 1 ? 's' : ''}</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-neon-cyan/15 text-neon-cyan border border-neon-cyan/25 text-xs font-medium hover:bg-neon-cyan/25 transition-colors"
        >
          <Plus size={14} />
          Add Lead
        </button>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
        {(['all', 'pending', 'yes', 'maybe', 'no'] as const).map(s => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={`shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              filter === s
                ? s === 'all' ? 'bg-white/10 text-white border border-white/10'
                  : s === 'yes' ? 'bg-neon-green/15 text-neon-green border border-neon-green/25'
                  : s === 'maybe' ? 'bg-gold/15 text-gold border border-gold/25'
                  : s === 'no' ? 'bg-red-400/15 text-red-400/70 border border-red-400/20'
                  : 'bg-white/5 text-white/50 border border-white/5'
                : 'bg-white/5 text-white/30 border border-white/5 hover:text-white/50'
            }`}
          >
            {STATUS_LABELS[s]} ({counts[s]})
          </button>
        ))}
      </div>

      {/* Add Lead Form */}
      {showForm && (
        <GlassCard className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs text-white/40 uppercase tracking-wider font-medium">New Lead</span>
            <button onClick={() => setShowForm(false)} className="text-white/30 hover:text-white/60 transition-colors">
              <X size={16} />
            </button>
          </div>
          <input
            value={businessName}
            onChange={e => setBusinessName(e.target.value)}
            placeholder="Business name *"
            className="w-full bg-white/5 border border-white/5 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-neon-cyan/30 placeholder:text-white/20"
          />
          <input
            value={contactName}
            onChange={e => setContactName(e.target.value)}
            placeholder="Contact name"
            className="w-full bg-white/5 border border-white/5 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-neon-cyan/30 placeholder:text-white/20"
          />
          <div className="grid grid-cols-2 gap-2">
            <input
              value={phone}
              onChange={e => setPhone(e.target.value)}
              placeholder="Phone"
              className="w-full bg-white/5 border border-white/5 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-neon-cyan/30 placeholder:text-white/20"
            />
            <input
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="Email"
              className="w-full bg-white/5 border border-white/5 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-neon-cyan/30 placeholder:text-white/20"
            />
          </div>
          <input
            value={source}
            onChange={e => setSource(e.target.value)}
            placeholder="Source (e.g. Google Maps, referral)"
            className="w-full bg-white/5 border border-white/5 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-neon-cyan/30 placeholder:text-white/20"
          />
          <textarea
            value={notes}
            onChange={e => setNotes(e.target.value)}
            placeholder="Notes..."
            className="w-full bg-white/5 border border-white/5 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-neon-cyan/30 placeholder:text-white/20 resize-none h-16"
          />
          <button
            onClick={addLead}
            disabled={!businessName.trim() || submitting}
            className="w-full py-2 rounded-lg bg-neon-cyan/15 text-neon-cyan border border-neon-cyan/25 text-sm font-medium hover:bg-neon-cyan/25 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
          >
            {submitting ? 'Adding...' : 'Add Lead'}
          </button>
        </GlassCard>
      )}

      {/* Lead List */}
      {loading ? (
        <div className="text-center text-white/20 text-sm py-12">Loading...</div>
      ) : filteredLeads.length === 0 ? (
        <div className="text-center text-white/20 text-sm py-12">
          {filter === 'all' ? 'No leads yet. Tap "Add Lead" to get started.' : 'No leads with this status.'}
        </div>
      ) : (
        <div className="space-y-2">
          {filteredLeads.map((lead, i) => (
            <motion.div
              key={lead.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.03 }}
            >
              <GlassCard className="!p-3">
                <div className="flex items-start justify-between gap-2">
                  {/* Info */}
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

                  {/* Actions */}
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => cycleStatus(lead)}
                      className={`px-2.5 py-1 rounded-md text-[10px] font-semibold border uppercase tracking-wider transition-colors ${STATUS_COLORS[lead.status]}`}
                      title="Tap to cycle status: pending → yes → maybe → no"
                    >
                      {STATUS_LABELS[lead.status]}
                    </button>
                    <button
                      onClick={() => deleteLead(lead.id)}
                      className="p-1.5 rounded-md text-white/20 hover:text-red-400/60 hover:bg-red-400/10 transition-colors"
                      title="Delete"
                    >
                      <X size={13} />
                    </button>
                  </div>
                </div>
              </GlassCard>
            </motion.div>
          ))}
        </div>
      )}
    </motion.div>
  )
}
