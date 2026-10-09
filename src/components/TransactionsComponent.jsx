import { useEffect, useMemo, useState } from 'react'
import apiClient from '../services/apiClient.js'
import { getTransactions } from '../services/transactionService.js'
import TransactionSplitDialog from './TransactionSplitDialog.jsx'

const PAGE_SIZE = 20

function localDateString(date) {
    const offsetDate = new Date(date.getTime() - date.getTimezoneOffset() * 60000)
    return offsetDate.toISOString().slice(0, 10)
}

function rangeForPreset(preset) {
    const now = new Date()
    const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1)
    if (preset === 'lastMonth') {
        return {
            from: localDateString(new Date(now.getFullYear(), now.getMonth() - 1, 1)),
            to: localDateString(new Date(now.getFullYear(), now.getMonth(), 0)),
        }
    }
    return { from: localDateString(thisMonthStart), to: localDateString(now) }
}

function formatAmount(amount, currency) {
    return new Intl.NumberFormat(undefined, { style: 'currency', currency: currency || 'USD' }).format(amount)
}

function displayTransactionAmount(amount, currency) {
    const value = Number(amount) || 0
    return value < 0
        ? <span className="text-success">+{formatAmount(Math.abs(value), currency)}</span>
        : formatAmount(value, currency)
}

function TransactionRow({ transaction, categories, categoryColors, onSaved, onError, onDateChanged, onSplit }) {
    const [category, setCategory] = useState(transaction.category || 'Uncategorized')
    const [note, setNote] = useState(transaction.note || '')
    const [reviewed, setReviewed] = useState(Boolean(transaction.reviewed))
    const [countAsIncome, setCountAsIncome] = useState(transaction.countAsIncome !== false)
    const [saving, setSaving] = useState(false)
    const [savingDate, setSavingDate] = useState(false)
    const currentCategory = transaction.category || 'Uncategorized'
    const rowCategories = categories.includes(currentCategory) ? categories : [...categories, currentCategory]

    useEffect(() => {
        setCategory(transaction.category || 'Uncategorized')
        setNote(transaction.note || '')
        setReviewed(Boolean(transaction.reviewed))
        setCountAsIncome(transaction.countAsIncome !== false)
    }, [transaction.category, transaction.note, transaction.reviewed, transaction.countAsIncome])

    async function save(values = {}) {
        const nextCategory = values.category ?? category
        const nextNote = values.note ?? note
        const nextReviewed = values.reviewed ?? reviewed
        const nextCountAsIncome = values.countAsIncome ?? countAsIncome
        setSaving(true)
        try {
            const { data } = transaction.splitId
                ? await apiClient.put(`/plaid/transactions/splits/${transaction.splitId}`, {
                    category: nextCategory, note: nextNote, reviewed: nextReviewed,
                    countAsIncome: nextCountAsIncome,
                })
                : await apiClient.put('/plaid/transactions/annotations', {
                    connectionId: transaction.connectionId,
                    transactionId: transaction.annotationId,
                    category: nextCategory,
                    note: nextNote,
                    reviewed: nextReviewed,
                    countAsIncome: nextCountAsIncome,
                })
            onSaved(data)
            setCategory(data.category)
            setNote(data.note)
            setReviewed(data.reviewed)
            setCountAsIncome(data.countAsIncome !== false)
        } catch (requestError) {
            setCategory(currentCategory)
            setNote(transaction.note || '')
            setReviewed(Boolean(transaction.reviewed))
            onError(requestError.response?.data?.detail || requestError.response?.data?.message || 'Unable to save this transaction annotation.')
        } finally {
            setSaving(false)
        }
    }

    async function saveDate(nextDate) {
        if (!nextDate || nextDate === transaction.date) return
        setSavingDate(true)
        try {
            await apiClient.put('/plaid/transactions/date', {
                connectionId: transaction.connectionId,
                transactionId: transaction.transactionId,
                annotationId: transaction.annotationId,
                splitId: transaction.splitId || null,
                originalDate: transaction.originalDate,
                date: nextDate,
            })
            await onDateChanged()
        } catch (requestError) {
            onError(requestError.response?.data?.detail || requestError.response?.data?.message || 'Unable to update this transaction date.')
        } finally { setSavingDate(false) }
    }

    return (
        <tr>
            <td className="text-nowrap"><input className="form-control form-control-sm border-0 bg-transparent p-0 transaction-date-input" type="date" aria-label={`Date for ${transaction.merchantName || transaction.description}`} value={transaction.date} disabled={savingDate} onChange={(event) => saveDate(event.target.value)} />{transaction.pending && <span className="badge text-bg-light ms-2">Pending</span>}</td>
            <td><div>{transaction.institutionName}</div><div className="small text-muted">{transaction.accountName}</div></td>
            <td>{transaction.merchantName || transaction.description}</td>
            <td className="text-end text-nowrap">{displayTransactionAmount(transaction.amount, transaction.currency)}{Number(transaction.amount) < 0 && <div className="form-check d-flex justify-content-end align-items-center gap-1 mt-1 mb-0"><input id={`count-income-${transaction.connectionId}-${transaction.splitId || transaction.transactionId}`} className="form-check-input mt-0 ms-0" type="checkbox" checked={countAsIncome} disabled={saving} onChange={(event) => { const checked = event.target.checked; setCountAsIncome(checked); save({ countAsIncome: checked }) }} /><label className="form-check-label small text-muted" htmlFor={`count-income-${transaction.connectionId}-${transaction.splitId || transaction.transactionId}`}>Count in total income</label></div>}</td>
            <td>
                <div className="d-flex align-items-center gap-2">
                    <select className="form-select form-select-sm" style={{ backgroundColor: `${categoryColors[category] || '#6B7280'}18` }} aria-label={`Category for ${transaction.merchantName || transaction.description}`} value={category} onChange={(event) => {
                        const nextCategory = event.target.value
                        const nextReviewed = false
                        setCategory(nextCategory)
                        setReviewed(nextReviewed)
                        save({ category: nextCategory, reviewed: nextReviewed })
                    }}>
                        {rowCategories.map((item) => <option key={item} value={item}>{item}</option>)}
                    </select>
                    {!reviewed && category !== 'Uncategorized' && <button type="button" className="btn btn-sm btn-outline-success rounded-circle p-0 d-inline-flex align-items-center justify-content-center" style={{ width: 25, height: 25 }} title="Mark category reviewed" aria-label={`Confirm category for ${transaction.merchantName || transaction.description}`} disabled={saving} onClick={() => { setReviewed(true); save({ reviewed: true }) }}>✓</button>}
                </div>
            </td>
            <td>
                <div className="d-flex gap-2">
                    <input className="form-control form-control-sm" type="text" maxLength={500} value={note} placeholder="Add a note" aria-label={`Note for ${transaction.merchantName || transaction.description}`} onChange={(event) => setNote(event.target.value)} onBlur={() => { if (note !== (transaction.note || '')) save({ note }) }} onKeyDown={(event) => { if (event.key === 'Enter') { event.preventDefault(); event.currentTarget.blur() } }} />
                </div>
            </td>
            <td className="text-nowrap"><button type="button" className={`btn btn-sm ${transaction.splitId ? 'btn-primary' : 'btn-outline-secondary'}`} title={transaction.splitId ? 'This transaction has been split' : 'Split this transaction'} onClick={() => onSplit(transaction)}>{transaction.splitId ? '✓ Split' : 'Split'}</button></td>
        </tr>
    )
}

export default function TransactionsComponent({ initialPreset = 'thisMonth', initialRange: providedInitialRange, initialCategoryFilter = 'All categories', initialFlowFilter = 'All transactions', title = 'Transactions', lockDateRange = false, onContinue, continueLabel = 'Continue', inDialog = false, onClose }) {
    const initialRange = useMemo(() => providedInitialRange || rangeForPreset(initialPreset), [providedInitialRange, initialPreset])
    const [transactions, setTransactions] = useState([])
    const [categorySettings, setCategorySettings] = useState([])
    const [datePreset, setDatePreset] = useState(providedInitialRange ? 'custom' : initialPreset)
    const [range, setRange] = useState(initialRange)
    const [displayCount, setDisplayCount] = useState(PAGE_SIZE)
    const [categoryFilter, setCategoryFilter] = useState(initialCategoryFilter)
    const [flowFilter, setFlowFilter] = useState(initialFlowFilter)
    const [reviewFilter, setReviewFilter] = useState('All transactions')
    const [bankFilter, setBankFilter] = useState('All banks')
    const [searchText, setSearchText] = useState('')
    const [sort, setSort] = useState({ key: 'date', direction: 'desc' })
    const [loading, setLoading] = useState(true)
    const [loadingTransactions, setLoadingTransactions] = useState(false)
    const [error, setError] = useState('')
    const [splittingTransaction, setSplittingTransaction] = useState(null)

    async function fetchTransactions(nextRange = range) {
        if (!nextRange.from || !nextRange.to) return
        setLoadingTransactions(true)
        setError('')
        try {
            const data = await getTransactions(nextRange)
            setTransactions(data)
            setDisplayCount(PAGE_SIZE)
        } catch (requestError) {
            setError(requestError.response?.data?.detail || requestError.response?.data?.message || 'Unable to load transactions.')
        } finally {
            setLoadingTransactions(false)
        }
    }

    async function selectDatePreset(preset) {
        setDatePreset(preset)
        if (preset !== 'custom') {
            const nextRange = rangeForPreset(preset)
            setRange(nextRange)
            await fetchTransactions(nextRange)
        }
    }

    useEffect(() => {
        let active = true
        Promise.all([
            getTransactions(initialRange),
            apiClient.get('/plaid/categories'),
        ])
            .then(([transactionResponse, categoryResponse]) => {
                if (!active) return
                setTransactions(transactionResponse)
                setCategorySettings(categoryResponse.data)
            })
            .catch((requestError) => {
                if (active) setError(requestError.response?.data?.detail || requestError.response?.data?.message || 'Unable to load Plaid Sandbox data.')
            })
            .finally(() => { if (active) setLoading(false) })
        return () => { active = false }
    }, [initialRange])

    const categories = useMemo(() => ['Uncategorized', ...categorySettings.filter((item) => item.enabled).map((item) => item.name)], [categorySettings])
    const categoryColors = useMemo(() => Object.fromEntries(categorySettings.map((item) => [item.name, item.color])), [categorySettings])

    const banks = useMemo(() => [...new Set(transactions.map((transaction) => transaction.institutionName))].sort(), [transactions])
    const filteredTransactions = useMemo(() => {
        const query = searchText.trim().toLowerCase()
        const rows = transactions.filter((transaction) => {
            if (flowFilter === 'Income' && (Number(transaction.amount) >= 0 || transaction.category?.toLowerCase() === 'transfers' || transaction.countAsIncome === false)) return false
            if (flowFilter === 'Spending' && Number(transaction.amount) <= 0) return false
            if (categoryFilter !== 'All categories' && transaction.category !== categoryFilter) return false
            if (reviewFilter === 'Needs review' && transaction.reviewed) return false
            if (reviewFilter === 'Reviewed' && !transaction.reviewed) return false
            if (bankFilter !== 'All banks' && transaction.institutionName !== bankFilter) return false
            if (query && ![
                transaction.merchantName, transaction.description, transaction.institutionName,
                transaction.accountName, transaction.category, transaction.note,
            ].some((value) => (value || '').toLowerCase().includes(query))) return false
            return true
        })
        const direction = sort.direction === 'asc' ? 1 : -1
        return rows.sort((left, right) => {
            const leftValue = sort.key === 'amount' ? left.amount
                : sort.key === 'reviewed' ? left.reviewed
                    : sort.key === 'merchantName' ? (left.merchantName || left.description)
                        : left[sort.key]
            const rightValue = sort.key === 'amount' ? right.amount
                : sort.key === 'reviewed' ? right.reviewed
                    : sort.key === 'merchantName' ? (right.merchantName || right.description)
                        : right[sort.key]
            if (typeof leftValue === 'number' && typeof rightValue === 'number') return (leftValue - rightValue) * direction
            if (typeof leftValue === 'boolean' && typeof rightValue === 'boolean') return (Number(leftValue) - Number(rightValue)) * direction
            return String(leftValue || '').localeCompare(String(rightValue || ''), undefined, { sensitivity: 'base' }) * direction
        })
    }, [transactions, flowFilter, categoryFilter, reviewFilter, bankFilter, searchText, sort])
    const visibleTransactions = filteredTransactions.slice(0, displayCount)
    const visibleIncomeTotal = filteredTransactions
        .filter((transaction) => !transaction.pending && Number(transaction.amount) < 0
            && transaction.category?.toLowerCase() !== 'transfers' && transaction.countAsIncome !== false)
        .reduce((sum, transaction) => sum + Math.abs(Number(transaction.amount)), 0)
    const outstandingReviewCount = transactions.filter((transaction) => !transaction.pending
        && (!transaction.reviewed || !transaction.category || transaction.category === 'Uncategorized')).length

    function toggleSort(key) {
        setSort((current) => current.key === key
            ? { key, direction: current.direction === 'asc' ? 'desc' : 'asc' }
            : { key, direction: key === 'date' || key === 'amount' ? 'desc' : 'asc' })
    }

    function sortHeading(label, key) {
        const indicator = sort.key !== key ? '' : sort.direction === 'asc' ? ' ↑' : ' ↓'
        return <th scope="col"><button type="button" className="btn btn-link btn-sm p-0 text-body fw-semibold text-decoration-none" onClick={() => toggleSort(key)}>{label}{indicator}</button></th>
    }

    function handleAnnotationSaved(annotation) {
        setError('')
        const splitId = annotation.splitId ?? annotation.id
        setTransactions((current) => current.map((transaction) =>
            transaction.connectionId === annotation.connectionId
                && (splitId
                    ? transaction.splitId === splitId
                    : !transaction.splitId && transaction.annotationId === annotation.transactionId)
                ? { ...transaction, category: annotation.category, note: annotation.note,
                    reviewed: annotation.reviewed, countAsIncome: annotation.countAsIncome,
                    categorySource: annotation.reviewed ? 'Confirmed' : 'You' }
                : transaction
        ))
    }

    const content = (
        <div className={`${inDialog ? 'container-fluid py-0' : 'container py-4'} plaid-page`}>
            {!inDialog && <h1 className="h2 mb-4">{title}</h1>}

            {error && <div className="alert alert-danger" role="alert">{error}</div>}
            {loading && <p>Loading Sandbox connections…</p>}

            <section className="card" aria-labelledby="bank-transactions-heading">
                <div className="card-body">
                    <div className="d-flex flex-wrap align-items-center justify-content-between gap-3 mb-3">
                        {!lockDateRange && <div className="btn-group" role="group" aria-label="Transaction date range">
                            <button type="button" className={`btn ${datePreset === 'thisMonth' ? 'btn-primary' : 'btn-outline-primary'}`} onClick={() => selectDatePreset('thisMonth')}>This month</button>
                            <button type="button" className={`btn ${datePreset === 'lastMonth' ? 'btn-primary' : 'btn-outline-primary'}`} onClick={() => selectDatePreset('lastMonth')}>Last month</button>
                            <button type="button" className={`btn ${datePreset === 'custom' ? 'btn-primary' : 'btn-outline-primary'}`} onClick={() => selectDatePreset('custom')}>Custom dates</button>
                        </div>}
                        <span className="small text-muted">{filteredTransactions.length} of {transactions.length} transactions</span>
                    </div>

                    {!lockDateRange && datePreset === 'custom' && (
                        <form className="row g-3 align-items-end mb-3" onSubmit={(event) => { event.preventDefault(); fetchTransactions() }}>
                            <div className="col-12 col-sm-4 col-md-3">
                                <label htmlFor="plaid-from-date" className="form-label">From</label>
                                <input id="plaid-from-date" className="form-control" type="date" value={range.from} max={range.to} onChange={(event) => setRange({ ...range, from: event.target.value })} required />
                            </div>
                            <div className="col-12 col-sm-4 col-md-3">
                                <label htmlFor="plaid-to-date" className="form-label">To</label>
                                <input id="plaid-to-date" className="form-control" type="date" value={range.to} min={range.from} max={localDateString(new Date())} onChange={(event) => setRange({ ...range, to: event.target.value })} required />
                            </div>
                            <div className="col-12 col-sm-4 col-md-auto">
                                <button className="btn btn-outline-primary" type="submit" disabled={loadingTransactions}>{loadingTransactions ? 'Loading…' : 'Apply dates'}</button>
                            </div>
                        </form>
                    )}

                    {flowFilter === 'Income' && <div className="card bg-light border-0 mb-3"><div className="card-body py-2 d-flex align-items-center justify-content-between"><span className="text-muted">Total income</span><strong className="fs-5 text-success">{formatAmount(visibleIncomeTotal, 'USD')}</strong></div></div>}

                    <div className="row g-2 align-items-end mb-3">
                        <div className="col-12 col-md-3">
                            <label className="form-label" htmlFor="transaction-search">Search</label>
                            <input id="transaction-search" className="form-control" type="search" value={searchText} onChange={(event) => { setSearchText(event.target.value); setDisplayCount(PAGE_SIZE) }} placeholder="Merchant, note, bank…" />
                        </div>
                        <div className="col-12 col-sm-4 col-md-2">
                            <label className="form-label" htmlFor="transaction-flow-filter">Type</label>
                            <select id="transaction-flow-filter" className="form-select" value={flowFilter} onChange={(event) => { setFlowFilter(event.target.value); setDisplayCount(PAGE_SIZE) }}>
                                <option>All transactions</option><option>Income</option><option>Spending</option>
                            </select>
                        </div>
                        <div className="col-12 col-sm-4 col-md-2">
                            <label className="form-label" htmlFor="category-filter">Category</label>
                            <select id="category-filter" className="form-select" value={categoryFilter} onChange={(event) => { setCategoryFilter(event.target.value); setDisplayCount(PAGE_SIZE) }}>
                                <option>All categories</option>{categories.map((category) => <option key={category}>{category}</option>)}
                            </select>
                        </div>
                        <div className="col-12 col-sm-4 col-md-2">
                            <label className="form-label" htmlFor="review-filter">Review status</label>
                            <select id="review-filter" className="form-select" value={reviewFilter} onChange={(event) => { setReviewFilter(event.target.value); setDisplayCount(PAGE_SIZE) }}>
                                <option>Needs review</option><option>All transactions</option><option>Reviewed</option>
                            </select>
                        </div>
                        <div className="col-12 col-sm-4 col-md-3">
                            <label className="form-label" htmlFor="bank-filter">Bank</label>
                            <select id="bank-filter" className="form-select" value={bankFilter} onChange={(event) => { setBankFilter(event.target.value); setDisplayCount(PAGE_SIZE) }}>
                                <option>All banks</option>{banks.map((bank) => <option key={bank}>{bank}</option>)}
                            </select>
                        </div>
                    </div>
                    <p className="small text-muted mb-3">Suggested categories remain unreviewed until you select the check mark beside the category.</p>

                    {visibleTransactions.length === 0 ? (
                        <p className="text-muted mb-0">{transactions.length ? 'No transactions match these filters.' : 'No transactions found for these dates. Connect a bank in Settings to get started.'}</p>
                    ) : (
                        <div className="table-responsive">
                            <table className="table table-hover align-middle mb-3">
                                <thead><tr>{sortHeading('Date', 'date')}{sortHeading('Bank / account', 'institutionName')}{sortHeading('Description', 'merchantName')}<th scope="col" className="text-end"><button type="button" className="btn btn-link btn-sm p-0 text-body fw-semibold text-decoration-none" onClick={() => toggleSort('amount')}>Amount{sort.key === 'amount' ? sort.direction === 'asc' ? ' ↑' : ' ↓' : ''}</button></th>{sortHeading('Category', 'category')}<th scope="col">Notes</th><th scope="col"><span className="visually-hidden">Actions</span></th></tr></thead>
                                <tbody>
                                    {visibleTransactions.map((transaction) => (
                                        <TransactionRow
                                            key={`${transaction.connectionId}-${transaction.transactionId}-${transaction.splitId || 'whole'}`}
                                            transaction={transaction}
                                            categories={categories}
                                            categoryColors={categoryColors}
                                            onSaved={handleAnnotationSaved}
                                            onError={setError}
                                            onDateChanged={() => fetchTransactions()}
                                            onSplit={setSplittingTransaction}
                                        />
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                    {displayCount < filteredTransactions.length && (
                        <button className="btn btn-outline-secondary" type="button" onClick={() => setDisplayCount((count) => count + PAGE_SIZE)}>
                            See more transactions
                        </button>
                    )}
                    {onContinue && <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 border-top pt-3 mt-3">
                        <span className={`small ${outstandingReviewCount ? 'text-muted' : 'text-success'}`}>{outstandingReviewCount ? `${outstandingReviewCount} transaction${outstandingReviewCount === 1 ? '' : 's'} still need review` : 'All transactions are categorized and reviewed.'}</span>
                        <button className="btn btn-primary" type="button" onClick={onContinue} disabled={outstandingReviewCount > 0}>{continueLabel}</button>
                    </div>}
                </div>
            </section>
            {splittingTransaction && <TransactionSplitDialog
                transaction={splittingTransaction}
                categories={categories}
                onClose={() => setSplittingTransaction(null)}
                onSaved={async () => {
                    await fetchTransactions()
                    setSplittingTransaction(null)
                }}
            />}
        </div>
    )

    if (!inDialog) return content
    return <>
        <div className="modal-backdrop show" onClick={onClose} />
        <div className="modal d-block" role="dialog" aria-modal="true" aria-label={title} tabIndex="-1" onClick={(event) => {
            if (event.target === event.currentTarget) onClose?.()
        }}>
            <div className="modal-dialog modal-xl modal-dialog-centered modal-dialog-scrollable">
                <div className="modal-content">
                    <div className="modal-header"><h2 className="modal-title fs-5">{title}</h2><button className="btn-close" type="button" aria-label="Close" onClick={onClose} /></div>
                    <div className="modal-body"><div className="p-1">{content}</div></div>
                </div>
            </div>
        </div>
    </>
}
