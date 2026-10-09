import { useEffect, useMemo, useState } from 'react'
import apiClient from '../services/apiClient.js'
import BudgetComponent from './BudgetComponent.jsx'
import TransactionsComponent from './TransactionsComponent.jsx'

function localMonth(date) { return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}` }
function monthDate(month) { return new Date(`${month}-01T12:00:00`) }
function monthKey(date) { return localMonth(date) }
function shiftMonth(month, amount) {
    const date = monthDate(month)
    date.setMonth(date.getMonth() + amount)
    return monthKey(date)
}
function monthStart(month) { return `${month}-01` }

export default function BudgetReviewComponent({ embedded = false }) {
    const currentMonth = useMemo(() => localMonth(new Date()), [])
    const previousMonth = useMemo(() => shiftMonth(currentMonth, -1), [currentMonth])
    const [step, setStep] = useState(1)
    const [transactionsReviewed, setTransactionsReviewed] = useState(false)
    const [previousBudgetReviewed, setPreviousBudgetReviewed] = useState(false)
    const [savingReview, setSavingReview] = useState(false)
    const [currentBudgetSaved, setCurrentBudgetSaved] = useState(false)
    const [error, setError] = useState('')

    useEffect(() => {
        let active = true
        apiClient.get('/budget/review-progress', { params: { month: monthStart(currentMonth) } })
            .then(({ data }) => { if (active) setPreviousBudgetReviewed(Boolean(data.previousBudgetReviewed)) })
            .catch((requestError) => { if (active) setError(requestError.response?.data?.detail || requestError.response?.data?.message || 'Unable to load budget review progress.') })
        return () => { active = false }
    }, [currentMonth])

    async function finishPreviousBudgetReview() {
        setSavingReview(true)
        setError('')
        try {
            await apiClient.put('/budget/review-progress', {
                month: monthStart(currentMonth),
                previousBudgetReviewed: true,
            })
            setPreviousBudgetReviewed(true)
            setStep(3)
        } catch (requestError) {
            setError(requestError.response?.data?.detail || requestError.response?.data?.message || 'Unable to save this review step.')
        } finally { setSavingReview(false) }
    }

    const steps = [
        { number: 1, title: 'Review transactions', detail: monthDate(previousMonth).toLocaleDateString(undefined, { month: 'short', year: 'numeric' }) },
        { number: 2, title: 'Review last month', detail: monthDate(previousMonth).toLocaleDateString(undefined, { month: 'short', year: 'numeric' }) },
        { number: 3, title: 'Create this month’s budget', detail: monthDate(currentMonth).toLocaleDateString(undefined, { month: 'short', year: 'numeric' }) },
    ]

    return <div className={embedded ? 'p-2' : 'container py-4'}>
        <div className="mb-4"><h1 className="h2 mb-1">Budget review</h1><p className="text-muted mb-0">Work through last month’s transactions and budget, then set this month’s plan.</p></div>
        {error && <div className="alert alert-danger" role="alert">{error}</div>}
        <nav aria-label="Budget review steps" className="row g-2 mb-4">
            {steps.map((item) => {
                const complete = item.number === 1 ? transactionsReviewed : item.number === 2 ? previousBudgetReviewed : currentBudgetSaved
                const blocked = item.number === 2 ? !transactionsReviewed && !previousBudgetReviewed : item.number === 3 && !previousBudgetReviewed
                return <div className="col-12 col-md-4" key={item.number}><button type="button" className={`card h-100 w-100 text-start ${step === item.number ? 'border-primary border-2' : ''}`} disabled={blocked} onClick={() => setStep(item.number)}><div className="card-body py-3"><div className="d-flex align-items-center gap-2"><span className={`badge ${complete ? 'text-bg-success' : step === item.number ? 'text-bg-primary' : 'text-bg-secondary'}`}>{complete ? '✓' : item.number}</span><strong>{item.title}</strong></div><div className="small text-muted mt-1">{complete ? 'Complete' : item.detail}</div></div></button></div>
            })}
        </nav>

        {step === 1 && <TransactionsComponent
            key={`${currentMonth}-review-transactions`}
            initialPreset="lastMonth"
            lockDateRange
            title={`Step 1 · Review transactions from ${monthDate(previousMonth).toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}`}
            continueLabel="Continue to last month’s budget"
            onContinue={() => { setTransactionsReviewed(true); setStep(2) }}
        />}

        {step === 2 && <>
            <div className="alert alert-light border"><strong>Step 2 · Review last month’s budget and spending</strong><div className="small text-muted">Compare the plan with actual spending, then continue to create this month’s budget.</div></div>
            <BudgetComponent initialMonth={previousMonth} hideMonthSelector readOnly />
            <div className="d-flex justify-content-end mt-3"><button className="btn btn-primary" type="button" onClick={finishPreviousBudgetReview} disabled={savingReview}>{savingReview ? 'Saving…' : 'Continue to this month’s budget'}</button></div>
        </>}

        {step === 3 && <>
            <BudgetComponent initialMonth={currentMonth} hideMonthSelector onBudgetSaved={() => setCurrentBudgetSaved(true)} />
        </>}
    </div>
}
