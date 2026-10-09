import { useEffect, useMemo, useState } from 'react'
import apiClient from '../services/apiClient.js'
import { getTransactions } from '../services/transactionService.js'
import BudgetComponent from './BudgetComponent.jsx'
import BudgetReviewComponent from './BudgetReviewComponent.jsx'
import ListMonthlyReviewComponent from './ListMonthlyReviewComponent.jsx'
import MonthlyReviewComponent from './MonthlyReviewComponent.jsx'
import MonthlyReviewConfirmationComponent from './MonthlyReviewConfirmationComponent.jsx'

function monthKey(date) { return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}` }
function monthDate(month) { return new Date(`${month}-01T12:00:00`) }
function shiftMonth(month, amount) {
    const date = monthDate(month)
    date.setMonth(date.getMonth() + amount)
    return monthKey(date)
}
function monthStart(month) { return `${month}-01` }
function labelMonth(month) { return monthDate(month).toLocaleDateString(undefined, { month: 'long', year: 'numeric' }) }
function localDate(date) {
    return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 10)
}
function money(amount) { return new Intl.NumberFormat(undefined, { style: 'currency', currency: 'USD' }).format(Number(amount) || 0) }

function Dialog({ title, onClose, children, size = 'modal-xl' }) {
    return <>
        <div className="modal-backdrop fade show" />
        <div className="modal d-block" role="dialog" aria-modal="true" aria-label={title} tabIndex="-1">
            <div className={`modal-dialog ${size} modal-dialog-centered modal-dialog-scrollable`}>
                <div className="modal-content">
                    <div className="modal-header"><h2 className="modal-title fs-5">{title}</h2><button type="button" className="btn-close" aria-label="Close" onClick={onClose} /></div>
                    <div className="modal-body">{children}</div>
                </div>
            </div>
        </div>
    </>
}

export default function HomeComponent() {
    const currentMonth = useMemo(() => monthKey(new Date()), [])
    const [modal, setModal] = useState(null)
    const [monthlyStage, setMonthlyStage] = useState('history')
    const [monthlyReviewId, setMonthlyReviewId] = useState(null)
    const [monthlyDraft, setMonthlyDraft] = useState(null)
    const [monthlyHistoryKey, setMonthlyHistoryKey] = useState(0)
    const [hasCurrentBudget, setHasCurrentBudget] = useState(false)
    const [canOpenMonthlyReview, setCanOpenMonthlyReview] = useState(false)
    const [checkingBudgetReview, setCheckingBudgetReview] = useState(true)
    const [budgetHistory, setBudgetHistory] = useState(null)
    const [historyLoading, setHistoryLoading] = useState(false)
    const [historyError, setHistoryError] = useState('')
    const [selectedHistoryMonth, setSelectedHistoryMonth] = useState(null)

    async function refreshBudgetReviewStatus() {
        setCheckingBudgetReview(true)
        try {
            const now = new Date()
            const previousMonth = shiftMonth(currentMonth, -1)
            const previousStart = monthStart(previousMonth)
            const previousEnd = localDate(new Date(now.getFullYear(), now.getMonth(), 0))
            const [budgetResponse, progressResponse, transactionsResponse] = await Promise.all([
                apiClient.get('/budget/monthly', { params: { month: monthStart(currentMonth) } }),
                apiClient.get('/budget/review-progress', { params: { month: monthStart(currentMonth) } }),
                getTransactions({ from: previousStart, to: previousEnd }),
            ])
            const savedBudget = budgetResponse.data.length > 0
            const transactionsReviewed = transactionsResponse.every((transaction) => transaction.pending
                || (transaction.reviewed && transaction.category && transaction.category !== 'Uncategorized'))
            setHasCurrentBudget(savedBudget)
            setCanOpenMonthlyReview(savedBudget && Boolean(progressResponse.data.previousBudgetReviewed) && transactionsReviewed)
        } catch {
            setCanOpenMonthlyReview(false)
        } finally { setCheckingBudgetReview(false) }
    }

    useEffect(() => { refreshBudgetReviewStatus() }, [currentMonth])

    async function openBudgetHistory() {
        setModal('budget-history')
        setSelectedHistoryMonth(null)
        if (budgetHistory) return
        setHistoryLoading(true)
        setHistoryError('')
        try {
            const months = Array.from({ length: 24 }, (_, index) => shiftMonth(currentMonth, -index))
            const entries = await Promise.all(months.map(async (month) => {
                const { data } = await apiClient.get('/budget/monthly', { params: { month: monthStart(month) } })
                return { month, total: data.reduce((sum, entry) => sum + Number(entry.amount || 0), 0), count: data.length }
            }))
            setBudgetHistory(entries.filter((entry) => entry.count > 0))
        } catch (error) {
            setHistoryError(error.response?.data?.detail || error.response?.data?.message || 'Unable to load budget history.')
        } finally { setHistoryLoading(false) }
    }

    function openMonthlyHistory() {
        setMonthlyStage('history')
        setMonthlyReviewId(null)
        setMonthlyDraft(null)
        setModal('monthly')
    }

    function openMonthlyReview() {
        setMonthlyStage('form')
        setMonthlyReviewId(null)
        setMonthlyDraft(null)
        setModal('monthly')
    }

    function startMonthlyReview(review = null) {
        setMonthlyReviewId(review?.id ?? null)
        setMonthlyDraft(review)
        setMonthlyStage('form')
    }

    function closeModal() {
        setModal(null)
        setSelectedHistoryMonth(null)
    }

    return <div className="container py-4">
        <div className="mb-4"><h1 className="h2 mb-1">Home</h1><p className="text-muted mb-0">Your monthly finances and the next steps to review them.</p></div>

        <div className="row g-3 mb-4">
            <div className="col-12 col-lg-6"><section className="card h-100"><div className="card-body d-flex flex-column"><div className="d-flex justify-content-between align-items-start gap-2"><div><h2 className="h5">Budget review</h2><p className="text-muted mb-3">Review last month’s transactions and budget, then prepare this month’s plan.</p></div><span className={`badge ${hasCurrentBudget ? 'text-bg-secondary' : 'text-bg-warning'}`}>{hasCurrentBudget ? 'Budget saved' : 'Action needed'}</span></div><div className="d-flex justify-content-between align-items-center gap-2 mt-auto"><button className="btn btn-primary" type="button" onClick={() => setModal('budget-review')}>Open</button><button className="btn btn-outline-secondary" type="button" onClick={openBudgetHistory}>History</button></div></div></section></div>
            <div className="col-12 col-lg-6"><section className="card h-100"><div className="card-body d-flex flex-column"><div className="d-flex justify-content-between align-items-start gap-2"><div><h2 className="h5">Monthly review</h2><p className="text-muted mb-3">Review income, withdrawals, balances, tithing, and investments.</p></div>{!canOpenMonthlyReview && <span className="badge text-bg-light">{checkingBudgetReview ? 'Checking' : 'Budget review first'}</span>}</div><div className="d-flex justify-content-between align-items-center gap-2 mt-auto"><button className="btn btn-primary" type="button" onClick={openMonthlyReview} disabled={!canOpenMonthlyReview}>{canOpenMonthlyReview ? 'Open' : 'Complete budget review first'}</button><button className="btn btn-outline-secondary" type="button" onClick={openMonthlyHistory}>History</button></div></div></section></div>
        </div>

        {modal === 'budget-review' && <Dialog title="Budget review" onClose={() => { closeModal(); refreshBudgetReviewStatus() }}>
            <BudgetReviewComponent embedded />
        </Dialog>}

        {modal === 'budget-history' && <Dialog title={selectedHistoryMonth ? `Budget · ${labelMonth(selectedHistoryMonth)}` : 'Budget history'} onClose={closeModal}>
            {selectedHistoryMonth ? <><button className="btn btn-link px-0 mb-3" type="button" onClick={() => setSelectedHistoryMonth(null)}>← All budget history</button><BudgetComponent key={selectedHistoryMonth} initialMonth={selectedHistoryMonth} hideMonthSelector readOnly /></>
                : historyLoading ? <p>Loading budget history…</p>
                    : historyError ? <div className="alert alert-danger" role="alert">{historyError}</div>
                        : budgetHistory?.length ? <div className="table-responsive"><table className="table table-hover align-middle"><thead><tr><th>Month</th><th className="text-end">Planned total</th><th></th></tr></thead><tbody>{budgetHistory.map((entry) => <tr key={entry.month}><th scope="row">{labelMonth(entry.month)}</th><td className="text-end">{money(entry.total)}</td><td className="text-end"><button className="btn btn-sm btn-outline-primary" type="button" onClick={() => setSelectedHistoryMonth(entry.month)}>View</button></td></tr>)}</tbody></table></div>
                            : <p className="text-muted mb-0">No saved monthly budgets yet.</p>}
        </Dialog>}

        {modal === 'monthly' && <Dialog title={monthlyStage === 'history' ? 'Monthly review history' : monthlyStage === 'form' ? (monthlyReviewId ? 'Update monthly review' : 'Monthly review') : 'Confirm monthly review'} onClose={closeModal}>
            {monthlyStage === 'history' && <ListMonthlyReviewComponent key={monthlyHistoryKey} embedded showAdd={false} showTitle={false} onEdit={(review) => startMonthlyReview(review)} />}
            {monthlyStage === 'form' && <MonthlyReviewComponent key={`${monthlyReviewId || 'new'}-${monthlyStage}`} embedded reviewId={monthlyReviewId} initialReview={monthlyDraft} onCancel={() => setMonthlyStage('history')} onConfirmation={(review) => { setMonthlyReviewId(review.id ?? null); setMonthlyDraft(review.monthlyReview); setMonthlyStage('confirmation') }} />}
            {monthlyStage === 'confirmation' && <MonthlyReviewConfirmationComponent key={`${monthlyReviewId || 'new'}-${monthlyStage}`} embedded reviewId={monthlyReviewId} reviewData={monthlyDraft} onBack={(id, review) => { setMonthlyReviewId(id ?? null); setMonthlyDraft(review); setMonthlyStage('form') }} onSaved={() => { setMonthlyStage('history'); setMonthlyHistoryKey((key) => key + 1) }} />}
        </Dialog>}
    </div>
}
