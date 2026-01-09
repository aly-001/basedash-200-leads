import { useMemo, useState } from 'react'
import leads from './data/leads.json'

const escapeCsv = (value) => {
  if (value === null || value === undefined) return ''
  const stringValue = String(value)
  if (/[",\n]/.test(stringValue)) {
    return `"${stringValue.replace(/"/g, '""')}"`
  }
  return stringValue
}

const isValidEmail = (email) =>
  typeof email === 'string' && email.includes('@')

const truncateEmail = (email) => {
  if (!email) return ''
  if (email.length <= 24) return email
  const [name, domain] = email.split('@')
  if (!domain) return `${email.slice(0, 20)}...`
  const shortName = name.slice(0, 8)
  const shortDomain = domain.length > 12 ? `${domain.slice(0, 10)}...` : domain
  return `${shortName}...@${shortDomain}`
}

const getDisplayDecisionMakers = (lead) => {
  const decisionMakers = lead.decision_makers ?? []
  const headOfData = lead.head_of_data ? [{ ...lead.head_of_data }] : []
  const combined = [...decisionMakers, ...headOfData]
  const seen = new Set()
  return combined.filter((dm) => {
    const key = `${dm.name}-${dm.role}-${dm.linkedin_url || ''}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

const buildCsv = (rows) => {
  const headers = [
    'company',
    'url',
    'decision_makers',
    'decision_maker_roles',
    'decision_maker_linkedins',
    'decision_maker_emails',
    'head_of_data_name',
    'head_of_data_role',
    'head_of_data_linkedin',
    'head_of_data_email',
  ]

  const body = rows.map((lead) => {
    const decisionMakers = getDisplayDecisionMakers(lead)
    const headOfData = lead.head_of_data ?? null

    const decisionMakerNames = decisionMakers.map((dm) => dm.name).join(' | ')
    const decisionMakerRoles = decisionMakers.map((dm) => dm.role).join(' | ')
    const decisionMakerLinkedins = decisionMakers
      .map((dm) => dm.linkedin_url)
      .join(' | ')
    const decisionMakerEmails = decisionMakers
      .map((dm) => (isValidEmail(dm.email) ? dm.email : ''))
      .filter(Boolean)
      .join(' | ')
    const headOfDataEmail = isValidEmail(headOfData?.email)
      ? headOfData.email
      : ''

    return [
      lead.company,
      lead.url,
      decisionMakerNames,
      decisionMakerRoles,
      decisionMakerLinkedins,
      decisionMakerEmails,
      headOfData?.name ?? '',
      headOfData?.role ?? '',
      headOfData?.linkedin_url ?? '',
      headOfDataEmail,
    ]
      .map(escapeCsv)
      .join(',')
  })

  return [headers.join(','), ...body].join('\n')
}

const downloadCsv = (rows, label) => {
  const csv = buildCsv(rows)
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = label
  link.click()
  URL.revokeObjectURL(url)
}

const getSearchHaystack = (lead) => {
  const decisionMakers = getDisplayDecisionMakers(lead)
  const headOfData = lead.head_of_data ?? null

  return [
    lead.company,
    lead.url,
    decisionMakers.map((dm) => dm.name).join(' '),
    decisionMakers.map((dm) => dm.role).join(' '),
    decisionMakers
      .map((dm) => (isValidEmail(dm.email) ? dm.email : ''))
      .join(' '),
    headOfData?.name ?? '',
    headOfData?.role ?? '',
    isValidEmail(headOfData?.email) ? headOfData.email : '',
  ]
    .join(' ')
    .toLowerCase()
}

const statLabel = (value, label) => (
  <div className="rounded-2xl border border-white/60 bg-white/70 px-4 py-3 shadow-halo">
    <div className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
      {label}
    </div>
    <div className="font-display text-2xl text-ink">{value}</div>
  </div>
)

const App = () => {
  const [query, setQuery] = useState('')
  const [minDecisionMakers, setMinDecisionMakers] = useState('0')
  const [hasHeadOfData, setHasHeadOfData] = useState(false)
  const [expandedLeads, setExpandedLeads] = useState({})
  const [copiedEmail, setCopiedEmail] = useState('')
  const [emailModal, setEmailModal] = useState(null)

  const totalLeads = leads.length
  const decisionMakerTotal = leads.reduce(
    (count, lead) => count + getDisplayDecisionMakers(lead).length,
    0,
  )
  const headOfDataCount = leads.filter((lead) => lead.head_of_data).length

  const filteredLeads = useMemo(() => {
    const minCount = Number(minDecisionMakers) || 0
    const normalizedQuery = query.trim().toLowerCase()

    const filtered = leads.filter((lead) => {
      const matchesQuery =
        !normalizedQuery || getSearchHaystack(lead).includes(normalizedQuery)
      const matchesDecisionMakers =
        (lead.decision_makers?.length ?? 0) >= minCount
      const matchesHeadOfData = !hasHeadOfData || Boolean(lead.head_of_data)

      return matchesQuery && matchesDecisionMakers && matchesHeadOfData
    })

    return filtered
  }, [query, minDecisionMakers, hasHeadOfData])

  const onExportFiltered = () => {
    const dateStamp = new Date().toISOString().slice(0, 10)
    downloadCsv(filteredLeads, `leads-filtered-${dateStamp}.csv`)
  }

  const onExportAll = () => {
    const dateStamp = new Date().toISOString().slice(0, 10)
    downloadCsv(leads, `leads-all-${dateStamp}.csv`)
  }

  const onReset = () => {
    setQuery('')
    setMinDecisionMakers('0')
    setHasHeadOfData(false)
    setExpandedLeads({})
  }

  const onCopyEmail = async (email) => {
    if (!email) return
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(email)
      } else {
        const textarea = document.createElement('textarea')
        textarea.value = email
        textarea.style.position = 'fixed'
        textarea.style.opacity = '0'
        document.body.appendChild(textarea)
        textarea.focus()
        textarea.select()
        document.execCommand('copy')
        document.body.removeChild(textarea)
      }
      setCopiedEmail(email)
      setTimeout(() => setCopiedEmail(''), 1600)
    } catch (error) {
      console.error('Copy failed', error)
    }
  }

  const onOpenEmailModal = (dm) => {
    if (!dm?.email) return
    setEmailModal({
      name: dm.name,
      role: dm.role,
      email: dm.email,
    })
  }

  const onCloseEmailModal = () => setEmailModal(null)

  return (
    <div className="min-h-screen px-6 pb-16 pt-12 text-ink sm:px-10 lg:px-16">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-10">
        <header className="rounded-[34px] border border-white/70 bg-white/70 p-8 shadow-glow">
          <div className="flex flex-wrap items-center justify-between gap-6">
            <div>
              <h1 className="font-display text-3xl text-ink sm:text-4xl">
                Leads Atlas
              </h1>
            </div>
            <div className="flex flex-wrap gap-3">
              <button
                className="rounded-full bg-ink px-5 py-2 text-sm font-semibold text-white shadow-halo transition hover:-translate-y-0.5 hover:bg-slate-900"
                onClick={onExportFiltered}
              >
                Export filtered CSV
              </button>
              <button
                className="rounded-full border border-slate-200 bg-white/80 px-5 py-2 text-sm font-semibold text-slate-700 transition hover:-translate-y-0.5"
                onClick={onExportAll}
              >
                Export full CSV
              </button>
            </div>
          </div>
          <div className="mt-6 grid gap-4 sm:grid-cols-3">
            {statLabel(totalLeads, 'Total Leads')}
            {statLabel(decisionMakerTotal, 'Decision Makers')}
            {statLabel(headOfDataCount, 'Heads of Data')}
          </div>
        </header>

        <section className="grid gap-4 rounded-[28px] border border-white/70 bg-white/75 p-6 shadow-halo lg:grid-cols-[1.3fr_0.9fr_0.7fr_auto]">
          <div className="flex flex-col gap-2">
            <label className="text-xs font-semibold uppercase tracking-[0.25em] text-slate-500">
              Search
            </label>
            <input
              className="rounded-2xl border border-slate-200/80 bg-white/90 px-4 py-3 text-sm focus:border-slate-400 focus:outline-none"
              placeholder="Company, role, or name"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-xs font-semibold uppercase tracking-[0.25em] text-slate-500">
              Decision makers
            </label>
            <select
              className="rounded-2xl border border-slate-200/80 bg-white/90 px-4 py-3 text-sm focus:border-slate-400 focus:outline-none"
              value={minDecisionMakers}
              onChange={(event) => setMinDecisionMakers(event.target.value)}
            >
              <option value="0">Any</option>
              <option value="1">1+</option>
              <option value="2">2+</option>
              <option value="3">3+</option>
              <option value="4">4+</option>
            </select>
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-xs font-semibold uppercase tracking-[0.25em] text-slate-500">
              Head of data
            </label>
            <button
              className={`rounded-2xl border px-4 py-3 text-sm font-semibold transition ${
                hasHeadOfData
                  ? 'border-ink bg-ink text-white'
                  : 'border-slate-200/80 bg-white/90 text-slate-700'
              }`}
              onClick={() => setHasHeadOfData((prev) => !prev)}
            >
              {hasHeadOfData ? 'Only with head of data' : 'Include all'}
            </button>
          </div>
          <div className="flex items-end">
            <button
              className="rounded-2xl border border-slate-200/80 bg-white/90 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:-translate-y-0.5"
              onClick={onReset}
            >
              Reset
            </button>
          </div>
        </section>

        <section className="flex items-center justify-between text-sm text-slate-500">
          <div>
            Showing <span className="font-semibold text-ink">{filteredLeads.length}</span>{' '}
            leads
          </div>
          <div className="font-mono text-xs uppercase tracking-[0.2em]">
            updated dataset
          </div>
        </section>

        <section className="grid gap-6 md:grid-cols-2">
          {filteredLeads.length === 0 && (
            <div className="rounded-[28px] border border-dashed border-slate-200 bg-white/70 p-10 text-center text-slate-500">
              No matches. Try clearing a filter or searching with fewer terms.
            </div>
          )}
          {filteredLeads.map((lead, index) => {
            const urlValue = lead.url || ''
            const urlHref = urlValue
              ? `https://${urlValue.replace(/^https?:\/\//, '')}`
              : ''
            const leadKey = `${lead.company}-${index}`
            const decisionMakers = getDisplayDecisionMakers(lead)
            const hasManyDecisionMakers = decisionMakers.length > 3
            const isExpanded = expandedLeads[leadKey]
            const visibleDecisionMakers = isExpanded
              ? decisionMakers
              : decisionMakers.slice(0, 3)
            return (
              <article
                key={leadKey}
                className="group animate-floatIn rounded-[28px] border border-white/70 bg-white/80 p-6 shadow-halo transition hover:-translate-y-1"
                style={{ animationDelay: `${index * 40}ms` }}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.25em] text-slate-400">
                      Lead
                    </p>
                    <h2 className="mt-2 font-display text-2xl text-ink">
                      {lead.company}
                    </h2>
                  </div>
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                    {lead.decision_makers?.length ?? 0} DMs
                  </span>
                </div>

                {urlValue && (
                  <a
                    className="mt-3 inline-flex items-center gap-2 text-sm font-semibold text-slate-600 transition hover:text-ink"
                    href={urlHref}
                    target="_blank"
                    rel="noreferrer"
                  >
                    {urlValue}
                  </a>
                )}

                <div className="mt-4 rounded-2xl border border-slate-100 bg-slate-50/80 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.25em] text-slate-400">
                    Decision makers
                  </p>
                    {decisionMakers.length === 0 ? (
                      <p className="mt-2 text-sm text-slate-600">
                        No decision makers listed
                      </p>
                    ) : (
                    <div className="mt-3 grid gap-3 sm:grid-cols-2">
                      {visibleDecisionMakers.map((dm) => (
                        <div
                          key={`${dm.name}-${dm.role}`}
                          className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm"
                        >
                          <div className="text-sm font-semibold text-ink">
                            {dm.name}
                          </div>
                          <div className="mt-1 text-xs text-slate-500">
                            {dm.role}
                          </div>
                          {dm.linkedin_url && (
                            <a
                              className="mt-2 inline-flex text-xs font-semibold text-slate-600 transition hover:text-ink"
                              href={dm.linkedin_url}
                              target="_blank"
                              rel="noreferrer"
                            >
                              LinkedIn
                            </a>
                          )}
                          {isValidEmail(dm.email) && (
                            <div className="mt-2 flex flex-wrap items-center gap-2">
                              <span className="max-w-[160px] truncate rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[11px] font-semibold text-slate-600">
                                {truncateEmail(dm.email)}
                              </span>
                              <div className="flex items-center gap-2">
                                <button
                                  className="rounded-full border border-slate-200 bg-white px-3 py-1 text-[11px] font-semibold text-slate-600 transition hover:text-ink"
                                  onClick={() => onOpenEmailModal(dm)}
                                >
                                  View
                                </button>
                                <button
                                  className="rounded-full border border-slate-200 bg-white px-3 py-1 text-[11px] font-semibold text-slate-600 transition hover:text-ink"
                                  onClick={() => onCopyEmail(dm.email)}
                                >
                                  {copiedEmail === dm.email ? 'Copied' : 'Copy'}
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                  {hasManyDecisionMakers && (
                    <button
                      className="mt-3 inline-flex rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-600 transition hover:text-ink"
                      onClick={() =>
                        setExpandedLeads((prev) => ({
                          ...prev,
                          [leadKey]: !prev[leadKey],
                        }))
                      }
                    >
                      {isExpanded
                        ? 'Show fewer decision makers'
                        : `Show all (${decisionMakers.length})`}
                    </button>
                  )}
                </div>

              </article>
            )
          })}
        </section>
        <footer className="mt-8 flex justify-center pb-6">
          <div className="flex items-center gap-3 rounded-full border border-white/70 bg-white/80 px-5 py-3 shadow-halo">
            <img
              src="/logo.png"
              alt="MacKenzie AI Consulting"
              className="h-7 w-auto"
              loading="lazy"
            />
            <span
              className="text-sm uppercase tracking-[0.2em] text-ink"
              style={{ fontFamily: '"Arial Black", Arial, sans-serif' }}
            >
              MacKenzie AI Consulting
            </span>
          </div>
        </footer>
      </div>
      {emailModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 px-4 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-3xl border border-white/70 bg-white/90 p-6 shadow-glow">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.25em] text-slate-400">
                  Email
                </p>
                <h3 className="mt-2 text-lg font-semibold text-ink">
                  {emailModal.name}
                </h3>
                <p className="mt-1 text-sm text-slate-500">{emailModal.role}</p>
              </div>
              <button
                className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-600 transition hover:text-ink"
                onClick={onCloseEmailModal}
              >
                Close
              </button>
            </div>
            <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
              <div className="text-sm font-semibold text-ink">
                {emailModal.email}
              </div>
            </div>
            <div className="mt-4 flex items-center justify-end gap-2">
              <button
                className="rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-600 transition hover:text-ink"
                onClick={() => onCopyEmail(emailModal.email)}
              >
                {copiedEmail === emailModal.email ? 'Copied' : 'Copy'}
              </button>
              <button
                className="rounded-full bg-ink px-4 py-2 text-xs font-semibold text-white shadow-halo transition hover:-translate-y-0.5 hover:bg-slate-900"
                onClick={onCloseEmailModal}
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default App
