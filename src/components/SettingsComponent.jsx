import { useEffect, useState } from 'react'
import apiClient from '../services/apiClient.js'

const LINK_SCRIPT_URL = 'https://cdn.plaid.com/link/v2/stable/link-initialize.js'

function loadPlaidLink() {
    if (window.Plaid) return Promise.resolve()
    return new Promise((resolve, reject) => {
        const existing = document.querySelector(`script[src="${LINK_SCRIPT_URL}"]`)
        if (existing) {
            existing.addEventListener('load', resolve, { once: true })
            existing.addEventListener('error', reject, { once: true })
            return
        }
        const script = document.createElement('script')
        script.src = LINK_SCRIPT_URL
        script.async = true
        script.onload = resolve
        script.onerror = reject
        document.head.appendChild(script)
    })
}

function getError(error, fallback) {
    return error.response?.data?.detail || error.response?.data?.message || fallback
}

export default function SettingsComponent() {
    const [connections, setConnections] = useState([])
    const [categories, setCategories] = useState([])
    const [expandedSections, setExpandedSections] = useState({})
    const [accountsByConnection, setAccountsByConnection] = useState({})
    const [accountsLoading, setAccountsLoading] = useState(false)
    const [rules, setRules] = useState([])
    const [newCategory, setNewCategory] = useState('')
    const [newColor, setNewColor] = useState('#64748B')
    const [matchText, setMatchText] = useState('')
    const [descriptionMatch, setDescriptionMatch] = useState('CONTAINS')
    const [caseSensitive, setCaseSensitive] = useState(false)
    const [ruleConnectionId, setRuleConnectionId] = useState('')
    const [amountOperator, setAmountOperator] = useState('')
    const [amountValue, setAmountValue] = useState('')
    const [ruleCategory, setRuleCategory] = useState('')
    const [rulePreview, setRulePreview] = useState(null)
    const [showRuleDialog, setShowRuleDialog] = useState(false)
    const [editingRuleId, setEditingRuleId] = useState(null)
    const [previewingRule, setPreviewingRule] = useState(false)
    const [applyingRule, setApplyingRule] = useState(false)
    const [connecting, setConnecting] = useState(false)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')
    const [notice, setNotice] = useState('')

    async function toggleSection(section) {
        const opening = !expandedSections[section]
        setExpandedSections((current) => ({ ...current, [section]: opening }))
        const missingAccountDetails = connections.filter((connection) => !Object.hasOwn(accountsByConnection, connection.id))
        if (section === 'connections' && opening && missingAccountDetails.length) {
            setAccountsLoading(true)
            try {
                const results = await Promise.all(missingAccountDetails.map(async (connection) => {
                    const { data } = await apiClient.get(`/plaid/connections/${connection.id}/accounts`)
                    return [connection.id, data]
                }))
                setAccountsByConnection(Object.fromEntries(results))
            } catch (requestError) {
                setError(getError(requestError, 'Unable to load connected bank accounts.'))
            } finally { setAccountsLoading(false) }
        }
    }

    async function refresh() {
        const [connectionResponse, categoryResponse, ruleResponse] = await Promise.all([
            apiClient.get('/plaid/connections'), apiClient.get('/plaid/categories'), apiClient.get('/plaid/rules'),
        ])
        setConnections(connectionResponse.data)
        setCategories(categoryResponse.data)
        setRules(ruleResponse.data)
        if (!ruleCategory && categoryResponse.data.length) setRuleCategory(categoryResponse.data.find((category) => category.enabled)?.name || '')
    }

    useEffect(() => {
        let active = true
        Promise.all([apiClient.get('/plaid/connections'), apiClient.get('/plaid/categories'), apiClient.get('/plaid/rules')])
            .then(([connectionResponse, categoryResponse, ruleResponse]) => {
                if (!active) return
                setConnections(connectionResponse.data)
                setCategories(categoryResponse.data)
                setRules(ruleResponse.data)
                setRuleCategory(categoryResponse.data.find((category) => category.enabled)?.name || '')
            })
            .catch((requestError) => { if (active) setError(getError(requestError, 'Unable to load Plaid settings.')) })
            .finally(() => { if (active) setLoading(false) })
        return () => { active = false }
    }, [])

    async function connectBank() {
        setConnecting(true)
        setError('')
        setNotice('')
        try {
            const [{ data }] = await Promise.all([apiClient.post('/plaid/link-token'), loadPlaidLink()])
            window.Plaid.create({
                token: data.linkToken,
                onSuccess: async (publicToken, metadata) => {
                    try {
                        await apiClient.post('/plaid/exchange-token', {
                            publicToken,
                            institutionId: metadata?.institution?.institution_id,
                            institutionName: metadata?.institution?.name,
                        })
                        await refresh()
                        setNotice('Bank connected.')
                    } catch (requestError) {
                        setError(getError(requestError, 'Plaid connected, but saving the bank connection failed.'))
                    } finally { setConnecting(false) }
                },
                onExit: () => setConnecting(false),
            }).open()
        } catch (requestError) {
            setError(getError(requestError, 'Unable to start Plaid Link. Check the backend Plaid configuration.'))
            setConnecting(false)
        }
    }

    async function updateCategory(category, changes) {
        setError('')
        setNotice('')
        try {
            const { data } = await apiClient.put(`/plaid/categories/${category.id}`, changes)
            setCategories((current) => current.map((item) => item.id === data.id ? data : item))
            setNotice(`${data.name} updated.`)
        } catch (requestError) { setError(getError(requestError, 'Unable to update category settings.')) }
    }

    async function addCategory(event) {
        event.preventDefault()
        setError('')
        try {
            const { data } = await apiClient.post('/plaid/categories', { name: newCategory, color: newColor, enabled: true })
            setCategories((current) => [...current, data].sort((a, b) => a.name.localeCompare(b.name)))
            setNewCategory('')
            setNotice('Category added.')
        } catch (requestError) { setError(getError(requestError, 'Unable to add this category.')) }
    }

    function rulePayload(applyToExisting = false) {
        return {
            matchText, descriptionMatch, caseSensitive,
            connectionId: ruleConnectionId ? Number(ruleConnectionId) : null,
            amountOperator: amountOperator || null,
            amountValue: amountOperator ? Number(amountValue) : null,
            category: ruleCategory, applyToExisting,
        }
    }

    function startNewRule() {
        setEditingRuleId(null)
        setMatchText('')
        setDescriptionMatch('CONTAINS')
        setCaseSensitive(false)
        setRuleConnectionId('')
        setAmountOperator('')
        setAmountValue('')
        setShowRuleDialog(true)
    }

    function editRule(rule) {
        setEditingRuleId(rule.id)
        setMatchText(rule.matchText || '')
        setDescriptionMatch(rule.descriptionMatch || 'CONTAINS')
        setCaseSensitive(Boolean(rule.caseSensitive))
        setRuleConnectionId(rule.connectionId ? String(rule.connectionId) : '')
        setAmountOperator(rule.amountOperator || '')
        setAmountValue(rule.amountValue == null ? '' : String(rule.amountValue))
        setRuleCategory(rule.category)
        setShowRuleDialog(true)
    }

    async function addRule(event) {
        event.preventDefault()
        setError('')
        setNotice('')
        setPreviewingRule(true)
        try {
            const { data } = await apiClient.post('/plaid/rules/preview', rulePayload())
            setRulePreview(data)
            setShowRuleDialog(false)
        } catch (requestError) { setError(getError(requestError, 'Unable to check matching transactions.')) }
        finally { setPreviewingRule(false) }
    }

    async function confirmRule() {
        if (!rulePreview) return
        setError('')
        setApplyingRule(true)
        try {
            const payload = rulePayload(true)
            const { data } = editingRuleId
                ? await apiClient.put(`/plaid/rules/${editingRuleId}`, payload)
                : await apiClient.post('/plaid/rules', payload)
            const savedRule = { id: data.id, ...payload }
            setRules((current) => editingRuleId
                ? current.map((rule) => rule.id === editingRuleId ? savedRule : rule)
                : [...current, savedRule])
            setMatchText('')
            setDescriptionMatch('CONTAINS')
            setCaseSensitive(false)
            setRuleConnectionId('')
            setAmountOperator('')
            setAmountValue('')
            setRulePreview(null)
            setShowRuleDialog(false)
            setNotice(`${editingRuleId ? 'Rule updated' : 'Rule created'} and applied to ${data.updatedTransactions} existing transaction${data.updatedTransactions === 1 ? '' : 's'}.`)
            setEditingRuleId(null)
        } catch (requestError) { setError(getError(requestError, 'Unable to create and apply this rule.')) }
        finally { setApplyingRule(false) }
    }

    async function removeRule(id) {
        setError('')
        try {
            await apiClient.delete(`/plaid/rules/${id}`)
            setRules((current) => current.filter((rule) => rule.id !== id))
            setNotice('Rule removed.')
        } catch (requestError) { setError(getError(requestError, 'Unable to remove this rule.')) }
    }

    return <div className="container py-4 plaid-page">
        <h1 className="h2 mb-4">Settings</h1>
        {error && <div className="alert alert-danger" role="alert">{error}</div>}
        {notice && <div className="alert alert-success" role="status">{notice}</div>}
        {loading ? <p>Loading settings…</p> : <>
            <section className="card mb-4" aria-labelledby="connections-heading">
                <div className="card-header d-flex align-items-center justify-content-between gap-3">
                    <button className="btn btn-link text-decoration-none text-body fw-semibold p-0 d-flex align-items-center gap-2" type="button" aria-expanded={Boolean(expandedSections.connections)} aria-controls="settings-connections-content" onClick={() => toggleSection('connections')}>
                        <span aria-hidden="true">{expandedSections.connections ? '▾' : '▸'}</span><span id="connections-heading" className="h5 mb-0">Connected banks</span>
                    </button>
                </div>
                {expandedSections.connections && <div className="card-body" id="settings-connections-content">
                    <div className="d-flex justify-content-end mb-3"><button className="btn btn-primary btn-sm" type="button" onClick={connectBank} disabled={connecting}>{connecting ? 'Opening Plaid Link…' : 'Connect a bank'}</button></div>
                    {accountsLoading && <p className="small text-muted">Loading account details…</p>}
                    {connections.length ? <div className="row g-3">{connections.map((connection) => <div className="col-12 col-md-6 col-xl-4" key={connection.id}>
                        <div className="border rounded p-3 h-100"><div className="fw-semibold">{connection.institutionName}</div><div className="small text-muted mb-2">Connected {new Date(connection.connectedAt).toLocaleDateString()}</div>
                            {accountsByConnection[connection.id]?.length ? <ul className="list-unstyled small mb-0">{accountsByConnection[connection.id].map((account, index) => <li className="border-top pt-2 mt-2" key={`${account.name}-${account.mask || index}`}>
                                <div>{account.name}{account.mask ? <span className="text-muted"> ···· {account.mask}</span> : ''}</div>
                                <div className="text-muted text-capitalize">{[account.subtype, account.type].filter(Boolean).join(' · ')}</div>
                            </li>)}</ul> : accountsByConnection[connection.id] ? <div className="small text-muted">No accounts returned.</div> : null}
                        </div>
                    </div>)}</div> : <p className="text-muted mb-0">No banks connected yet.</p>}
                </div>}
            </section>

            <section className="card mb-4" aria-labelledby="categories-heading">
                <div className="card-header">
                    <button className="btn btn-link text-decoration-none text-body fw-semibold p-0 d-flex align-items-center gap-2" type="button" aria-expanded={Boolean(expandedSections.categories)} aria-controls="settings-categories-content" onClick={() => toggleSection('categories')}>
                        <span aria-hidden="true">{expandedSections.categories ? '▾' : '▸'}</span>
                        <span id="categories-heading" className="h5 mb-0">Categories</span>
                    </button>
                </div>
                {expandedSections.categories && <div className="card-body" id="settings-categories-content">
                    <p className="small text-muted">Choose which categories appear in transactions, set a color, and optionally make a category roll over. Assign both income and spending transactions to that category. Next month’s suggested budget carries forward the previous budget minus net activity, then adds the monthly increase. Set its starting amount in the first monthly budget.</p>
                    <div className="list-group mb-3">{categories.map((category) => <div className="list-group-item d-flex flex-wrap align-items-center gap-3" key={category.id}>
                        <label className="d-flex align-items-center gap-2 me-auto">
                            <input className="form-check-input mt-0" type="checkbox" checked={category.enabled} onChange={(event) => updateCategory(category, { enabled: event.target.checked })} aria-label={`Track ${category.name}`} />
                            <span>{category.name}</span>
                        </label>
                        <input type="color" className="form-control form-control-color" value={category.color} onChange={(event) => updateCategory(category, { color: event.target.value })} aria-label={`${category.name} color`} title={`Choose ${category.name} color`} />
                        {!['income', 'transfers'].includes(category.name.toLowerCase()) && <>
                            <label className="form-check d-flex align-items-center gap-2 mb-0">
                                <input className="form-check-input mt-0" type="checkbox" checked={Boolean(category.rolloverEnabled)} onChange={(event) => updateCategory(category, { rolloverEnabled: event.target.checked })} aria-label={`Make ${category.name} a rollover category`} />
                                <span>Rollover</span>
                            </label>
                            {category.rolloverEnabled && <div style={{ width: 150, flex: '0 0 150px' }}>
                                <label className="form-label small mb-1" htmlFor={`rollover-increase-${category.id}`}>Monthly increase</label>
                                <div className="input-group input-group-sm">
                                    <span className="input-group-text">$</span>
                                    <input id={`rollover-increase-${category.id}`} key={`${category.id}-${category.rolloverMonthlyIncrease}`} className="form-control text-end" style={{ minWidth: 0 }} type="number" min="0" step="0.01" defaultValue={Number(category.rolloverMonthlyIncrease || 0).toFixed(2)} aria-label={`${category.name} monthly rollover increase`} onBlur={(event) => {
                                        const value = Number(event.target.value)
                                        if (Number.isFinite(value) && value >= 0 && value !== Number(category.rolloverMonthlyIncrease || 0)) updateCategory(category, { rolloverMonthlyIncrease: value })
                                    }} />
                                </div>
                            </div>}
                        </>}
                    </div>)}</div>
                    <form className="row g-2 align-items-end" onSubmit={addCategory}>
                        <div className="col-12 col-sm-6"><label htmlFor="new-category-name" className="form-label">Add a category</label><input id="new-category-name" className="form-control" value={newCategory} onChange={(event) => setNewCategory(event.target.value)} maxLength={60} required /></div>
                        <div className="col-auto"><label htmlFor="new-category-color" className="form-label">Color</label><input id="new-category-color" type="color" className="form-control form-control-color" value={newColor} onChange={(event) => setNewColor(event.target.value)} /></div>
                        <div className="col-auto"><button className="btn btn-outline-primary" type="submit">Add category</button></div>
                    </form>
                </div>}
            </section>

            <section className="card" aria-labelledby="rules-heading">
                <div className="card-header"><button className="btn btn-link text-decoration-none text-body fw-semibold p-0 d-flex align-items-center gap-2" type="button" aria-expanded={Boolean(expandedSections.rules)} aria-controls="settings-rules-content" onClick={() => toggleSection('rules')}><span aria-hidden="true">{expandedSections.rules ? '▾' : '▸'}</span><span id="rules-heading" className="h5 mb-0">Transaction rules</span></button></div>
                {expandedSections.rules && <div className="card-body" id="settings-rules-content">
                    <div className="d-flex justify-content-end mb-3"><button className="btn btn-sm btn-primary" type="button" onClick={startNewRule}>Add rule</button></div>
                    {rules.length ? <ul className="list-group">{rules.map((rule) => <li className="list-group-item d-flex justify-content-between align-items-center gap-3" key={rule.id}>
                        <span><strong>{rule.matchText}</strong> <span className="text-muted">{rule.descriptionMatch === 'EQUALS' ? 'equals' : 'contains'}{rule.caseSensitive ? ' (case sensitive)' : ''}{rule.connectionId ? ` · ${connections.find((connection) => connection.id === rule.connectionId)?.institutionName || 'Selected bank'}` : ''}{rule.accountName ? ` · ${rule.accountName}` : ''}{rule.categoryCondition ? ` · category ${rule.categoryCondition}` : ''}{rule.amountOperator ? ` · amount ${rule.amountOperator} $${Number(rule.amountValue).toFixed(2)}` : ''} → {rule.category}</span></span><div className="btn-group btn-group-sm"><button className="btn btn-outline-primary" type="button" onClick={() => editRule(rule)}>Edit</button><button className="btn btn-outline-secondary" type="button" onClick={() => removeRule(rule.id)}>Remove</button></div>
                    </li>)}</ul> : <p className="text-muted mb-0">No transaction rules yet.</p>}
                </div>}
            </section>
        </>}
        {showRuleDialog && !rulePreview && <>
            <div className="modal-backdrop fade show" />
            <div className="modal d-block" role="dialog" aria-modal="true" aria-labelledby="rule-editor-title" tabIndex="-1">
                <div className="modal-dialog modal-dialog-centered modal-lg modal-dialog-scrollable">
                    <form className="modal-content" onSubmit={addRule}>
                        <div className="modal-header"><div><h2 className="modal-title fs-5" id="rule-editor-title">{editingRuleId ? 'Edit transaction rule' : 'Add transaction rule'}</h2><p className="small text-muted mb-0 mt-1">Choose matching conditions and a category suggestion.</p></div><button type="button" className="btn-close" aria-label="Close" onClick={() => setShowRuleDialog(false)} /></div>
                        <div className="modal-body">
                            <div className="small fw-semibold text-uppercase text-secondary mb-3">Requirements</div>
                            <div className="row g-3 align-items-end">
                                <div className="col-12 col-md-4"><label htmlFor="rule-bank" className="form-label">Bank</label><select id="rule-bank" className="form-select" value={ruleConnectionId} onChange={(event) => setRuleConnectionId(event.target.value)}><option value="">Any bank</option>{connections.map((connection) => <option key={connection.id} value={connection.id}>{connection.institutionName}</option>)}</select></div>
                                <div className="col-12">
                                    <div className="input-group"><span className="input-group-text">Description</span><select id="rule-description-match" className="form-select flex-grow-0" style={{ width: '12rem' }} aria-label="Description match" value={descriptionMatch} onChange={(event) => setDescriptionMatch(event.target.value)}><option value="CONTAINS">Contains</option><option value="EQUALS">Is equal to</option></select><input id="rule-match-text" className="form-control" aria-label="Description text" value={matchText} onChange={(event) => setMatchText(event.target.value)} maxLength={100} placeholder="Description text" required /></div>
                                    <div className="form-check mt-2"><input id="rule-case-sensitive" className="form-check-input" type="checkbox" checked={caseSensitive} onChange={(event) => setCaseSensitive(event.target.checked)} /><label className="form-check-label" htmlFor="rule-case-sensitive">Case sensitive</label></div>
                                </div>
                                <div className="col-12">
                                    <div className="input-group"><span className="input-group-text">Amount</span><select id="rule-amount-operator" className="form-select flex-grow-0" style={{ width: '12rem' }} aria-label="Amount comparison" value={amountOperator} onChange={(event) => { setAmountOperator(event.target.value); if (!event.target.value) setAmountValue('') }}><option value="">Any amount</option><option value="<">Less than</option><option value="<=">At most</option><option value="=">Equal to</option><option value="!=">Not equal to</option><option value=">=">At least</option><option value=">">Greater than</option></select><input id="rule-amount-value" className="form-control" aria-label="Amount in USD" type="number" min="0" step="0.01" value={amountValue} onChange={(event) => setAmountValue(event.target.value)} disabled={!amountOperator} required={Boolean(amountOperator)} placeholder="Amount (USD)" /></div>
                                    <div className="form-text">Compares the absolute amount.</div>
                                </div>
                            </div>
                            <hr className="my-4" />
                            <div className="small fw-semibold text-uppercase text-secondary mb-3">Action</div>
                            <label htmlFor="rule-category" className="form-label">Set category to</label>
                            <select id="rule-category" className="form-select" value={ruleCategory} onChange={(event) => setRuleCategory(event.target.value)} required>{categories.filter((category) => category.enabled).map((category) => <option key={category.id} value={category.name}>{category.name}</option>)}</select>
                        </div>
                        <div className="modal-footer"><button type="button" className="btn btn-outline-secondary" onClick={() => setShowRuleDialog(false)} disabled={previewingRule}>Cancel</button><button className="btn btn-primary" type="submit" disabled={!ruleCategory || previewingRule}>{previewingRule ? 'Checking matches…' : 'Preview matches'}</button></div>
                    </form>
                </div>
            </div>
        </>}
        {rulePreview && <>
            <div className="modal-backdrop fade show" />
            <div className="modal d-block" role="dialog" aria-modal="true" aria-labelledby="rule-confirm-title">
                <div className="modal-dialog modal-dialog-centered">
                    <div className="modal-content">
                        <div className="modal-header"><h2 className="modal-title fs-5" id="rule-confirm-title">{editingRuleId ? 'Apply rule changes?' : 'Apply this rule?'}</h2></div>
                        <div className="modal-body">
                            <p>This rule will change the category to <strong>{ruleCategory}</strong> for <strong>{rulePreview.matchingTransactions}</strong> matching transaction{rulePreview.matchingTransactions === 1 ? '' : 's'} across your connected banks.</p>
                            <p className="small text-muted mb-0">The count covers Plaid history from {rulePreview.from} through {rulePreview.to}. Existing categories, including reviewed ones, will be replaced. Notes and review status will be kept. The rule will also apply to future matches.</p>
                        </div>
                        <div className="modal-footer">
                            <button type="button" className="btn btn-outline-secondary" onClick={() => { setRulePreview(null); setShowRuleDialog(true) }} disabled={applyingRule}>Back to rule</button>
                            <button type="button" className="btn btn-primary" onClick={confirmRule} disabled={applyingRule}>{applyingRule ? 'Applying…' : 'Create and apply'}</button>
                        </div>
                    </div>
                </div>
            </div>
        </>}
    </div>
}
