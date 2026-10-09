import { useEffect, useMemo, useState } from 'react'
import apiClient from '../services/apiClient.js'

function cents(value) {
    const parsed = Number(value)
    return Number.isFinite(parsed) ? Math.round(parsed * 100) : 0
}

function messageFrom(error) { return error.response?.data?.detail || error.response?.data?.message || 'Unable to save this transaction split.' }

export default function TransactionSplitDialog({ transaction, categories, onClose, onSaved }) {
    const [details, setDetails] = useState(null)
    const [parts, setParts] = useState([])
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [error, setError] = useState('')

    useEffect(() => {
        let active = true
        apiClient.get('/plaid/transactions/adjustment', { params: {
            connectionId: transaction.connectionId,
            transactionId: transaction.transactionId,
            annotationId: transaction.annotationId,
            originalDate: transaction.originalDate,
        } }).then(({ data }) => {
            if (!active) return
            setDetails(data)
            if (data.splits.length) {
                setParts(data.splits.map((part) => ({
                    id: part.id, key: `existing-${part.id}`, amount: Number(part.amount).toFixed(2),
                    category: part.category, note: part.note || '', reviewed: part.reviewed,
                    countAsIncome: part.countAsIncome !== false,
                })))
            } else {
                setParts([
                    { key: 'part-1', amount: '', category: 'Uncategorized', note: '', reviewed: false, countAsIncome: transaction.countAsIncome !== false },
                    { key: 'part-2', amount: '', category: 'Uncategorized', note: '', reviewed: false, countAsIncome: transaction.countAsIncome !== false },
                ])
            }
        }).catch((requestError) => {
            if (active) setError(messageFrom(requestError))
        }).finally(() => { if (active) setLoading(false) })
        return () => { active = false }
    }, [transaction])

    const totalCents = details ? cents(Math.abs(Number(details.originalAmount))) : 0
    const allocatedCents = useMemo(() => parts.reduce((total, part) => total + cents(part.amount), 0), [parts])
    const allocationsValid = parts.length >= 2 && parts.every((part) => cents(part.amount) > 0 && part.category && part.category !== 'Uncategorized')
        && allocatedCents === totalCents

    function updatePart(index, changes) {
        setParts((current) => current.map((part, partIndex) => partIndex === index ? { ...part, ...changes } : part))
    }

    async function save(event) {
        event.preventDefault()
        if (!details || !allocationsValid) return
        setError('')
        setSaving(true)
        try {
            await apiClient.put('/plaid/transactions/adjustment', {
                connectionId: details.connectionId,
                transactionId: details.transactionId,
                annotationId: details.annotationId,
                originalDate: details.originalDate,
                date: details.date,
                splits: parts.map(({ id, amount, category, note, reviewed, countAsIncome }) => ({ id, amount, category, note, reviewed, countAsIncome })),
            })
            await onSaved()
        } catch (requestError) {
            setError(messageFrom(requestError))
        } finally { setSaving(false) }
    }

    const currency = transaction.currency || 'USD'
    const formatMoney = (amount) => new Intl.NumberFormat(undefined, { style: 'currency', currency }).format(amount)

    return <>
        <div className="modal-backdrop fade show" />
        <div className="modal d-block" role="dialog" aria-modal="true" aria-labelledby="transaction-split-title" tabIndex="-1">
            <div className="modal-dialog modal-dialog-centered modal-lg modal-dialog-scrollable">
                <form className="modal-content" onSubmit={save}>
                    <div className="modal-header">
                        <div><h2 className="modal-title fs-5" id="transaction-split-title">Split transaction</h2><div className="small text-muted">{transaction.merchantName || transaction.description} · {formatMoney(details?.originalAmount ?? transaction.amount)}</div></div>
                        <button type="button" className="btn-close" aria-label="Close" onClick={onClose} disabled={saving} />
                    </div>
                    <div className="modal-body">
                        {error && <div className="alert alert-danger" role="alert">{error}</div>}
                        {loading ? <p className="mb-0">Loading transaction details…</p> : details && <>
                            <div className="d-flex flex-wrap gap-3 mb-3 small">
                                <div><span className="text-muted">Date</span><div className="fw-semibold">{details.date}</div></div>
                                <div><span className="text-muted">Original total</span><div className="fw-semibold">{formatMoney(totalCents / 100)}</div></div>
                            </div>
                            <p className="small text-muted">Enter each allocation. The amounts must add up to the original total, and each part will appear as its own transaction.</p>
                            <div className="vstack gap-3">
                                {parts.map((part, index) => <div className="border rounded p-3" key={part.key}>
                                    <div className="d-flex align-items-center justify-content-between mb-2">
                                        <strong>Part {index + 1}</strong>
                                        {parts.length > 2 && <button type="button" className="btn btn-sm btn-link text-danger" onClick={() => setParts((current) => current.filter((_, partIndex) => partIndex !== index))}>Remove</button>}
                                    </div>
                                    <div className="row g-2">
                                        <div className="col-12 col-sm-4"><label className="form-label" htmlFor={`split-amount-${index}`}>Amount</label><input id={`split-amount-${index}`} type="number" inputMode="decimal" min="0.01" step="0.01" className="form-control" value={part.amount} onChange={(event) => updatePart(index, { amount: event.target.value })} required /></div>
                                        <div className="col-12 col-sm-8"><label className="form-label" htmlFor={`split-category-${index}`}>Category</label><select id={`split-category-${index}`} className="form-select" value={part.category} onChange={(event) => updatePart(index, { category: event.target.value, reviewed: false })} required>{!categories.includes(part.category) && <option value={part.category}>{part.category}</option>}{categories.map((category) => <option key={category} value={category}>{category}</option>)}</select></div>
                                        <div className="col-12"><label className="form-label" htmlFor={`split-note-${index}`}>Note <span className="text-muted">(optional)</span></label><input id={`split-note-${index}`} className="form-control" maxLength={500} value={part.note} onChange={(event) => updatePart(index, { note: event.target.value })} /></div>
                                        {Number(details.originalAmount) < 0 && <div className="col-12"><div className="form-check"><input id={`split-count-income-${index}`} className="form-check-input" type="checkbox" checked={part.countAsIncome !== false} onChange={(event) => updatePart(index, { countAsIncome: event.target.checked })} /><label className="form-check-label" htmlFor={`split-count-income-${index}`}>Count in total income</label></div></div>}
                                    </div>
                                </div>)}
                            </div>
                            <div className={`small mt-3 ${allocatedCents === totalCents && parts.every((part) => part.category !== 'Uncategorized') ? 'text-success' : 'text-danger'}`} aria-live="polite">Allocated {formatMoney(allocatedCents / 100)} of {formatMoney(totalCents / 100)}</div>
                            {parts.some((part) => part.category === 'Uncategorized') && <div className="small text-danger mt-1">Choose a category for each split part.</div>}
                            <button type="button" className="btn btn-sm btn-outline-secondary mt-3" onClick={() => setParts((current) => [...current, { key: `new-${Date.now()}`, amount: '0.00', category: 'Uncategorized', note: '', reviewed: false, countAsIncome: transaction.countAsIncome !== false }])}>Add another part</button>
                        </>}
                    </div>
                    <div className="modal-footer">
                        <button type="button" className="btn btn-outline-secondary" onClick={onClose} disabled={saving}>Cancel</button>
                        <button type="submit" className="btn btn-primary" disabled={loading || saving || !allocationsValid}>{saving ? 'Saving…' : 'Save split'}</button>
                    </div>
                </form>
            </div>
        </div>
    </>
}
