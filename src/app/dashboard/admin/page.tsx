'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'

interface Club { id: string; name: string; country: string }
interface Team { id: string; name: string; season: string; club_id: string; invite_code: string | null; age_group?: string | null }
interface Member { user_id: string; role_in_team: string; profiles: any }

export default function AdminPage() {
  const [clubs, setClubs] = useState<Club[]>([])
  const [teams, setTeams] = useState<Team[]>([])
  const [members, setMembers] = useState<Member[]>([])
  const [selectedClub, setSelectedClub] = useState<string>('')
  const [selectedTeam, setSelectedTeam] = useState<string>('')
  const [allUsers, setAllUsers] = useState<any[]>([])

  const [newClubName, setNewClubName] = useState('')
  const [newTeamName, setNewTeamName] = useState('')
  const [newTeamSeason, setNewTeamSeason] = useState('2025/26')
  const [newTeamAge, setNewTeamAge] = useState<'u13' | 'u16' | 'u19' | ''>('u16')
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'ok' | 'err'; text: string } | null>(null)

  const supabase = createClient()

  function showMsg(type: 'ok' | 'err', text: string) {
    setMessage({ type, text })
    setTimeout(() => setMessage(null), 4000)
  }

  useEffect(() => { loadClubs() }, [])
  useEffect(() => { if (selectedClub) loadTeams(selectedClub) }, [selectedClub])
  useEffect(() => { if (selectedTeam) loadMembers(selectedTeam) }, [selectedTeam])

  async function loadClubs() {
    const { data } = await supabase.from('clubs').select('*').order('name')
    if (data) {
      setClubs(data)
      if (data.length && !selectedClub) setSelectedClub(data[0].id)
    }
  }

  async function loadTeams(clubId: string) {
    const { data } = await supabase.from('teams').select('*').eq('club_id', clubId).order('name')
    if (data) {
      setTeams(data)
      if (data.length) setSelectedTeam(data[0].id)
      else setSelectedTeam('')
    }
  }

  async function loadMembers(teamId: string) {
    const { data } = await supabase.from('team_memberships')
      .select('user_id, role_in_team, profiles(id, first_name, last_name, email, role)')
      .eq('team_id', teamId)
    if (data) setMembers(data as any)

    const { data: all } = await supabase.from('profiles').select('id, first_name, last_name, email, role')
    if (all && data) {
      const memberIds = new Set(data.map((m: any) => m.user_id))
      setAllUsers(all.filter((u: any) => !memberIds.has(u.id)))
    }
  }

  function generateCode() {
    return Math.random().toString(36).substring(2, 8).toUpperCase()
  }

  async function generateInviteLink(teamId: string) {
    const code = generateCode()
    const { error } = await supabase.from('teams').update({ invite_code: code }).eq('id', teamId)
    if (error) showMsg('err', 'Fehler beim Erstellen des Einladungslinks')
    else { showMsg('ok', 'Einladungslink erstellt!'); loadTeams(selectedClub) }
  }

  function getInviteUrl(code: string) {
    if (typeof window === 'undefined') return ''
    return `${window.location.origin}/invite/${code}`
  }

  async function copyInvite(code: string) {
    const url = getInviteUrl(code)
    await navigator.clipboard.writeText(url)
    showMsg('ok', 'Link kopiert! Per WhatsApp weiterleiten.')
  }

  async function createClub() {
    if (!newClubName.trim()) return
    setSaving(true)
    const { error } = await supabase.from('clubs').insert({ name: newClubName.trim(), country: 'AT' })
    if (error) showMsg('err', `Fehler: ${error.message}`)
    else { showMsg('ok', `Akademie "${newClubName}" erstellt`); setNewClubName(''); loadClubs() }
    setSaving(false)
  }

  async function createTeam() {
    if (!newTeamName.trim() || !selectedClub) return
    setSaving(true)
    const payload: any = {
      name: newTeamName.trim(),
      season: newTeamSeason,
      club_id: selectedClub,
      invite_code: generateCode(),
    }
    if (newTeamAge) payload.age_group = newTeamAge
    const { error } = await supabase.from('teams').insert(payload)
    if (error) showMsg('err', `Fehler: ${error.message}`)
    else { showMsg('ok', `Mannschaft "${newTeamName}" erstellt`); setNewTeamName(''); loadTeams(selectedClub) }
    setSaving(false)
  }

  async function addMember(userId: string, role: 'player' | 'coach') {
    if (!selectedTeam) return
    setSaving(true)
    const { error } = await supabase.from('team_memberships')
      .insert({ user_id: userId, team_id: selectedTeam, role_in_team: role })
    if (error) showMsg('err', `Fehler: ${error.message}`)
    else { showMsg('ok', 'Zuordnung gespeichert'); loadMembers(selectedTeam) }
    setSaving(false)
  }

  async function removeMember(userId: string) {
    if (!selectedTeam || !confirm('Wirklich aus der Mannschaft entfernen?')) return
    const { error } = await supabase.from('team_memberships').delete()
      .eq('user_id', userId).eq('team_id', selectedTeam)
    if (error) showMsg('err', `Fehler: ${error.message}`)
    else { showMsg('ok', 'Entfernt'); loadMembers(selectedTeam) }
  }

  async function deleteTeam(teamId: string) {
    if (!confirm('Mannschaft wirklich löschen? Alle Zuordnungen gehen verloren.')) return
    await supabase.from('team_memberships').delete().eq('team_id', teamId)
    await supabase.from('teams').delete().eq('id', teamId)
    showMsg('ok', 'Mannschaft gelöscht')
    loadTeams(selectedClub)
  }

  const coaches = members.filter(m => m.role_in_team === 'coach')
  const players = members.filter(m => m.role_in_team === 'player')
  const currentTeam = teams.find(t => t.id === selectedTeam)

  return (
    <div className="max-w-6xl mx-auto fade-in">
      <div className="hm-breadcrumb">Trainer · Verwaltung</div>

      <h1 className="hero">
        Akademie-<span style={{ color: 'var(--accent)' }}>Verwaltung</span>
      </h1>
      <p className="hero-sub">Akademien, Teams und Jugendliche verwalten</p>

      {message && (
        <div style={{
          marginTop: '1.2rem',
          padding: '0.85rem 1.1rem',
          borderRadius: 14,
          fontSize: '0.88rem',
          fontWeight: 700,
          background: message.type === 'ok'
            ? 'rgba(16,185,129,0.1)'
            : 'rgba(236,72,153,0.1)',
          border: `1.5px solid ${message.type === 'ok' ? 'rgba(16,185,129,0.3)' : 'rgba(236,72,153,0.3)'}`,
          color: message.type === 'ok' ? 'var(--success)' : 'var(--danger)',
        }}>
          {message.type === 'ok' ? '✓ ' : '⚠ '}{message.text}
        </div>
      )}

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
        gap: '1rem',
        marginTop: '1.4rem',
      }}>
        {/* Akademien */}
        <div className="card">
          <div className="hm-section">🏛 Akademien</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', marginBottom: '1rem' }}>
            {clubs.map(c => (
              <button
                key={c.id}
                onClick={() => setSelectedClub(c.id)}
                style={{
                  textAlign: 'left',
                  padding: '0.75rem 0.9rem',
                  borderRadius: 12,
                  background: selectedClub === c.id ? 'rgba(124,58,237,0.08)' : 'var(--surface)',
                  border: selectedClub === c.id ? '2px solid rgba(124,58,237,0.3)' : '1px solid var(--border)',
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                  color: 'var(--ink)',
                  fontWeight: 700,
                  fontSize: '0.88rem',
                }}
              >
                {c.name}
              </button>
            ))}
            {clubs.length === 0 && (
              <div style={{ fontSize: '0.85rem', padding: '1rem', textAlign: 'center', color: 'var(--muted)' }}>
                Noch keine Akademien.
              </div>
            )}
          </div>

          <div style={{ paddingTop: '1rem', borderTop: '1px solid var(--border)' }}>
            <label>+ Neue Akademie</label>
            <input
              type="text"
              value={newClubName}
              onChange={e => setNewClubName(e.target.value)}
              placeholder="Akademiename"
              style={{ marginBottom: '0.6rem' }}
            />
            <button
              onClick={createClub}
              disabled={saving || !newClubName.trim()}
              className="btn-primary"
              style={{ width: '100%', opacity: saving || !newClubName.trim() ? 0.5 : 1 }}
            >
              + Akademie erstellen
            </button>
          </div>
        </div>

        {/* Mannschaften */}
        <div className="card">
          <div className="hm-section">
            ⚽ Mannschaften {selectedClub ? `· ${clubs.find(c => c.id === selectedClub)?.name}` : ''}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', marginBottom: '1rem' }}>
            {teams.map(t => (
              <div key={t.id} style={{ display: 'flex', gap: '0.4rem', alignItems: 'stretch' }}>
                <button
                  onClick={() => setSelectedTeam(t.id)}
                  style={{
                    flex: 1,
                    textAlign: 'left',
                    padding: '0.75rem 0.9rem',
                    borderRadius: 12,
                    background: selectedTeam === t.id ? 'rgba(124,58,237,0.08)' : 'var(--surface)',
                    border: selectedTeam === t.id ? '2px solid rgba(124,58,237,0.3)' : '1px solid var(--border)',
                    cursor: 'pointer',
                    fontFamily: 'inherit',
                    color: 'var(--ink)',
                  }}
                >
                  <div style={{ fontWeight: 800, fontSize: '0.88rem' }}>{t.name}</div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--muted)', marginTop: '0.15rem' }}>
                    {t.season}
                    {t.age_group && ` · ${t.age_group.toUpperCase()}`}
                  </div>
                </button>
                <button
                  onClick={() => deleteTeam(t.id)}
                  style={{
                    padding: '0.4rem 0.7rem',
                    borderRadius: 10,
                    border: '1px solid var(--border)',
                    background: 'var(--surface)',
                    color: 'var(--danger)',
                    fontSize: '0.9rem',
                    cursor: 'pointer',
                    fontFamily: 'inherit',
                  }}
                  title="Löschen"
                >
                  ✕
                </button>
              </div>
            ))}
            {teams.length === 0 && (
              <div style={{ fontSize: '0.85rem', padding: '1rem', textAlign: 'center', color: 'var(--muted)' }}>
                Noch keine Mannschaften.
              </div>
            )}
          </div>

          {/* Einladungslink */}
          {currentTeam && (
            <div style={{
              marginBottom: '1rem',
              padding: '0.9rem 1rem',
              borderRadius: 14,
              background: 'linear-gradient(135deg, rgba(124,58,237,0.06), rgba(236,72,153,0.04))',
              border: '1px solid rgba(124,58,237,0.18)',
            }}>
              <div className="hm-section" style={{ margin: 0, marginBottom: '0.4rem' }}>
                🔗 Einladungslink · {currentTeam.name}
              </div>
              {currentTeam.invite_code ? (
                <>
                  <div style={{
                    fontSize: '0.72rem',
                    padding: '0.5rem 0.7rem',
                    borderRadius: 10,
                    background: 'var(--surface)',
                    border: '1px solid var(--border)',
                    wordBreak: 'break-all',
                    fontFamily: 'var(--font-mono)',
                    marginBottom: '0.5rem',
                    color: 'var(--ink-soft)',
                  }}>
                    {getInviteUrl(currentTeam.invite_code)}
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button
                      onClick={() => copyInvite(currentTeam.invite_code!)}
                      className="btn-primary"
                      style={{ flex: 1, fontSize: '0.8rem' }}
                    >
                      📋 Kopieren
                    </button>
                    <a
                      href={`https://wa.me/?text=${encodeURIComponent(`Hey! Tritt unserem Team "${currentTeam.name}" in der Humatrix Youth Academy bei 🏆⚽\n\nKlick auf den Link und melde dich an:\n${getInviteUrl(currentTeam.invite_code!)}`)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn-accent"
                      style={{ flex: 1, fontSize: '0.8rem', textAlign: 'center', textDecoration: 'none' }}
                    >
                      💬 WhatsApp
                    </a>
                  </div>
                </>
              ) : (
                <button
                  onClick={() => generateInviteLink(currentTeam.id)}
                  className="btn-primary"
                  style={{ width: '100%', fontSize: '0.8rem' }}
                >
                  🔗 Einladungslink erstellen
                </button>
              )}
            </div>
          )}

          <div style={{ paddingTop: '1rem', borderTop: '1px solid var(--border)' }}>
            <label>+ Neue Mannschaft</label>
            <input
              type="text"
              value={newTeamName}
              onChange={e => setNewTeamName(e.target.value)}
              placeholder="z.B. U16 Eagles"
              style={{ marginBottom: '0.5rem' }}
            />
            <input
              type="text"
              value={newTeamSeason}
              onChange={e => setNewTeamSeason(e.target.value)}
              placeholder="Saison z.B. 2025/26"
              style={{ marginBottom: '0.5rem' }}
            />
            <select
              value={newTeamAge}
              onChange={e => setNewTeamAge(e.target.value as any)}
              style={{ marginBottom: '0.6rem' }}
            >
              <option value="">— Altersgruppe —</option>
              <option value="u13">U13 (10–13 J.)</option>
              <option value="u16">U16 (14–16 J.)</option>
              <option value="u19">U19 (17–19 J.)</option>
            </select>
            <button
              onClick={createTeam}
              disabled={saving || !newTeamName.trim() || !selectedClub}
              className="btn-primary"
              style={{ width: '100%', opacity: saving || !newTeamName.trim() || !selectedClub ? 0.5 : 1 }}
            >
              + Mannschaft erstellen
            </button>
          </div>
        </div>

        {/* Kader */}
        <div className="card">
          <div className="hm-section">
            👥 Kader {currentTeam ? `· ${currentTeam.name}` : ''}
          </div>

          {!selectedTeam ? (
            <div style={{ fontSize: '0.85rem', padding: '2rem 1rem', textAlign: 'center', color: 'var(--muted)' }}>
              Wähle eine Mannschaft.
            </div>
          ) : (
            <>
              {coaches.length > 0 && (
                <div style={{ marginBottom: '1rem' }}>
                  <div style={{
                    fontSize: '0.68rem',
                    fontWeight: 800,
                    letterSpacing: '0.1em',
                    textTransform: 'uppercase',
                    color: 'var(--gold)',
                    marginBottom: '0.4rem',
                  }}>
                    Trainer ({coaches.length})
                  </div>
                  {coaches.map(m => (
                    <div key={m.user_id} style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      padding: '0.55rem 0.7rem',
                      borderRadius: 10,
                      background: 'var(--surface-2)',
                      marginBottom: '0.3rem',
                    }}>
                      <span style={{ fontSize: '1.1rem' }}>🏅</span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: '0.85rem', fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {m.profiles?.first_name} {m.profiles?.last_name}
                        </div>
                        <div style={{ fontSize: '0.7rem', color: 'var(--muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {m.profiles?.email}
                        </div>
                      </div>
                      <button
                        onClick={() => removeMember(m.user_id)}
                        style={{ background: 'transparent', border: 'none', color: 'var(--danger)', cursor: 'pointer', fontSize: '0.85rem' }}
                      >✕</button>
                    </div>
                  ))}
                </div>
              )}

              <div style={{ marginBottom: '1rem' }}>
                <div style={{
                  fontSize: '0.68rem',
                  fontWeight: 800,
                  letterSpacing: '0.1em',
                  textTransform: 'uppercase',
                  color: 'var(--success)',
                  marginBottom: '0.4rem',
                }}>
                  Spieler ({players.length})
                </div>
                {players.map(m => (
                  <div key={m.user_id} style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    padding: '0.55rem 0.7rem',
                    borderRadius: 10,
                    background: 'var(--surface-2)',
                    marginBottom: '0.3rem',
                  }}>
                    <span style={{ fontSize: '1.1rem' }}>⚽</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: '0.85rem', fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {m.profiles?.first_name} {m.profiles?.last_name}
                      </div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {m.profiles?.email}
                      </div>
                    </div>
                    <button
                      onClick={() => removeMember(m.user_id)}
                      style={{ background: 'transparent', border: 'none', color: 'var(--danger)', cursor: 'pointer', fontSize: '0.85rem' }}
                    >✕</button>
                  </div>
                ))}
                {players.length === 0 && (
                  <div style={{ fontSize: '0.78rem', padding: '0.5rem', color: 'var(--muted)' }}>
                    Noch keine Spieler. Sende den Einladungslink!
                  </div>
                )}
              </div>

              {allUsers.length > 0 && (
                <div style={{ paddingTop: '1rem', borderTop: '1px solid var(--border)' }}>
                  <div style={{
                    fontSize: '0.68rem',
                    fontWeight: 800,
                    letterSpacing: '0.1em',
                    textTransform: 'uppercase',
                    color: 'var(--gold)',
                    marginBottom: '0.5rem',
                  }}>
                    Person zuordnen
                  </div>
                  {allUsers.slice(0, 10).map(u => (
                    <div key={u.id} style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.4rem',
                      padding: '0.5rem 0.6rem',
                      borderRadius: 10,
                      background: 'var(--surface)',
                      border: '1px solid var(--border)',
                      marginBottom: '0.3rem',
                    }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: '0.82rem', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {u.first_name} {u.last_name}
                        </div>
                        <div style={{ fontSize: '0.68rem', color: 'var(--muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {u.email}
                        </div>
                      </div>
                      <button
                        onClick={() => addMember(u.id, 'player')}
                        style={{
                          fontSize: '0.68rem',
                          padding: '0.35rem 0.55rem',
                          borderRadius: 8,
                          background: 'rgba(16,185,129,0.14)',
                          color: 'var(--success)',
                          border: 'none',
                          cursor: 'pointer',
                          fontWeight: 800,
                          fontFamily: 'inherit',
                        }}
                      >+ Spieler</button>
                      <button
                        onClick={() => addMember(u.id, 'coach')}
                        style={{
                          fontSize: '0.68rem',
                          padding: '0.35rem 0.55rem',
                          borderRadius: 8,
                          background: 'rgba(245,158,11,0.14)',
                          color: 'var(--gold)',
                          border: 'none',
                          cursor: 'pointer',
                          fontWeight: 800,
                          fontFamily: 'inherit',
                        }}
                      >+ Trainer</button>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      <div style={{ marginTop: '1.5rem', textAlign: 'center' }}>
        <Link href="/dashboard/coach" className="btn-secondary">
          ← Zurück zum Dashboard
        </Link>
      </div>
    </div>
  )
}
