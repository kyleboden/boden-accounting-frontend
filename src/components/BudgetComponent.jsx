import { useEffect, useMemo, useState } from 'react'
import apiClient from '../services/apiClient.js'
import { getTransactions } from '../services/transactionService.js'
import BudgetTrendChart from './BudgetTrendChart.jsx'
import TransactionsComponent from './TransactionsComponent.jsx'

const money = (amount) => new Intl.NumberFormat(undefined, { style: 'currency', currency: 'USD' }).format(Number(amount) || 0)

function localDate(date) {
    const adjusted = new Date(date.getTime() - date.getTimezoneOffset() * 60000)
    return adjusted.toISOString().slice(0, 10)
}

function monthDate(month) { return new Date(`${month}-01T12:00:00`) }
function monthKey(date) { return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}` }
function transactionMonth(date) { return typeof date === 'string' ? date.slice(0, 7) : '' }
function monthIso(month) { return `${month}-01` }
function shiftMonth(month, amount) {
    const date = monthDate(month)
    date.setMonth(date.getMonth() + amount)
    return monthKey(date)
}
function monthEnd(month) {
    const date = monthDate(month)
    date.setMonth(date.getMonth() + 1, 0)
    return localDate(date)
}
function transactionRangeForMonth(month) {
    const today = localDate(new Date())
    return { from: monthIso(month), to: monthEnd(month) > today ? today : monthEnd(month) }
}
function monthLabel(month, options = { month: 'short' }) {
    return monthDate(month).toLocaleDateString(undefined, options)
}
function errorText(error, fallback) {
    return error.response?.data?.detail || error.response?.data?.message || fallback
}

function spendFor(rows, category, month) {
    return rows.reduce((sum, transaction) => {
        if (transaction.pending || transaction.category !== category || transactionMonth(transaction.date) !== month) return sum
        return sum + Number(transaction.amount || 0)
    }, 0)
}

function outflowFor(rows, category, month) {
    return rows.reduce((sum, transaction) => transaction.pending || transaction.category !== category
        || transactionMonth(transaction.date) !== month ? sum : sum + Math.max(0, Number(transaction.amount || 0)), 0)
}

function inflowFor(rows, category, month) {
    return rows.reduce((sum, transaction) => transaction.pending || transaction.category !== category
        || transactionMonth(transaction.date) !== month ? sum : sum + Math.max(0, -Number(transaction.amount || 0)), 0)
}

function TrendPanel({ title, subtitle, months, values, color, currency, control }) {
    return <section className="card h-100">
        <div className="card-body">
            <div className="d-flex flex-wrap align-items-start justify-content-between gap-2 mb-2">
                <div><h2 className="h6 mb-1">{title}</h2><p className="small text-muted mb-0">{subtitle}</p></div>
                {control}
            </div>
            <BudgetTrendChart months={months} values={values} color={color} currency={currency} />
        </div>
    </section>
}

export default function BudgetComponent({ initialMonth, hideMonthSelector = false, readOnly = false, onBudgetSaved }) {
    const currentMonth = useMemo(() => monthKey(new Date()), [])
    const [selectedMonth, setSelectedMonth] = useState(initialMonth || currentMonth)
    const [showMonthPicker, setShowMonthPicker] = useState(false)
    const [categories, setCategories] = useState([])
    const [transactions, setTransactions] = useState([])
    const [budgetValues, setBudgetValues] = useState({})
    const [savedBudgetValues, setSavedBudgetValues] = useState({})
    const [previousBudgetValues, setPreviousBudgetValues] = useState({})
    const [hasSavedBudget, setHasSavedBudget] = useState(false)
    const [editingBudget, setEditingBudget] = useState(false)
    const [loading, setLoading] = useState(true)
    const [loadFailed, setLoadFailed] = useState(false)
    const [savingBudget, setSavingBudget] = useState(false)
    const [error, setError] = useState('')
    const [trendCategory, setTrendCategory] = useState('')
    const [transactionCategory, setTransactionCategory] = useState(null)
    const [transactionFlow, setTransactionFlow] = useState('All transactions')
    const isPastMonth = selectedMonth < currentMonth
    const canEditBudget = !readOnly && !isPastMonth

    const budgetCategories = useMemo(() => categories.filter((category) => category.enabled
        && !['income', 'transfers'].includes(category.name.toLowerCase())), [categories])
    const categoryColors = useMemo(() => Object.fromEntries(categories.map((category) => [category.name, category.color])), [categories])
    const incomeTransactions = useMemo(() => transactions.filter((transaction) => !transaction.pending
        && Number(transaction.amount) < 0 && transaction.category?.toLowerCase() !== 'transfers'
        && transaction.countAsIncome !== false), [transactions])
    const historyMonths = useMemo(() => Array.from({ length: 6 }, (_, index) => shiftMonth(selectedMonth, index - 5)), [selectedMonth])
    const recentSpendingMonths = useMemo(() => [shiftMonth(selectedMonth, -3), shiftMonth(selectedMonth, -2), shiftMonth(selectedMonth, -1)], [selectedMonth])

    async function loadMonth(month) {
        setLoading(true)
        setLoadFailed(false)
        setError('')
        try {
            const selectedEnd = monthEnd(month) < localDate(new Date()) ? monthEnd(month) : localDate(new Date())
            const maxPlaidStart = shiftMonth(transactionMonth(selectedEnd), -23)
            const chartStart = shiftMonth(month, -5)
            const rangeStart = chartStart < maxPlaidStart ? maxPlaidStart : chartStart
            const transactionRequest = selectedEnd >= monthIso(rangeStart.slice(0, 7))
                ? getTransactions({ from: monthIso(rangeStart), to: selectedEnd })
                : Promise.resolve([])
            const [categoryResponse, budgetResponse, previousBudgetResponse, transactionResponse] = await Promise.all([
                apiClient.get('/plaid/categories'),
                apiClient.get('/budget/monthly', { params: { month: monthIso(month) } }),
                apiClient.get('/budget/monthly', { params: { month: monthIso(shiftMonth(month, -1)) } }),
                transactionRequest,
            ])
            const nextCategories = categoryResponse.data
            const transactionRows = transactionResponse
            setCategories(nextCategories)
            setTransactions(transactionRows)
            const saved = Object.fromEntries(budgetResponse.data.map((entry) => [entry.category, Number(entry.amount).toFixed(2)]))
            const previousSaved = Object.fromEntries(previousBudgetResponse.data.map((entry) => [entry.category, Number(entry.amount)]))
            setPreviousBudgetValues(previousSaved)
            const previousMonth = shiftMonth(month, -1)
            const priorMonths = [shiftMonth(month, -3), shiftMonth(month, -2), shiftMonth(month, -1)]
            const suggestions = Object.fromEntries(nextCategories.filter((category) => category.enabled
                && !['income', 'transfers'].includes(category.name.toLowerCase())).map((category) => {
                if (category.rolloverEnabled && previousSaved[category.name] != null) {
                    const carriedBalance = previousSaved[category.name] - spendFor(transactionRows, category.name, previousMonth)
                    return [category.name, Math.max(0, carriedBalance + Number(category.rolloverMonthlyIncrease || 0)).toFixed(2)]
                }
                const average = priorMonths.reduce((sum, historyMonth) => sum + outflowFor(transactionRows, category.name, historyMonth), 0) / 3
                return [category.name, average.toFixed(2)]
            }))
            setBudgetValues({ ...suggestions, ...saved })
            setSavedBudgetValues({ ...suggestions, ...saved })
            setHasSavedBudget(budgetResponse.data.length > 0)
            setEditingBudget(false)
            if (budgetResponse.data.length > 0) onBudgetSaved?.()
            if (!nextCategories.some((category) => category.name === trendCategory && category.enabled)) {
                setTrendCategory('')
            }
        } catch (requestError) {
            setError(errorText(requestError, 'Unable to load your budget.'))
            setLoadFailed(true)
        } finally { setLoading(false) }
    }

    useEffect(() => { loadMonth(selectedMonth) }, [selectedMonth])

    const incomeByMonth = useMemo(() => historyMonths.map((month) => incomeTransactions
        .filter((transaction) => transactionMonth(transaction.date) === month)
        .reduce((sum, transaction) => sum + Math.abs(Number(transaction.amount)), 0)), [historyMonths, incomeTransactions])
    const trendValues = useMemo(() => historyMonths.map((month) => trendCategory
        ? outflowFor(transactions, trendCategory, month)
        : budgetCategories.reduce((sum, category) => sum + outflowFor(transactions, category.name, month), 0)),
    [historyMonths, transactions, trendCategory, budgetCategories])
    const monthIncome = incomeTransactions.filter((transaction) => transactionMonth(transaction.date) === selectedMonth)
        .reduce((sum, transaction) => sum + Math.abs(Number(transaction.amount)), 0)
    const monthSpending = budgetCategories.reduce((sum, category) => sum + outflowFor(transactions, category.name, selectedMonth), 0)
    const monthRemaining = budgetCategories.reduce((sum, category) => sum + (Number(budgetValues[category.name]) || 0)
        - outflowFor(transactions, category.name, selectedMonth) + inflowFor(transactions, category.name, selectedMonth), 0)
    const plannedTotal = budgetCategories.reduce((sum, category) => sum + (Number(budgetValues[category.name]) || 0), 0)
    const monthDateStart = monthIso(selectedMonth)

    function selectPreset(which) {
        setShowMonthPicker(false)
        if (which === 'this') setSelectedMonth(currentMonth)
        else setSelectedMonth(shiftMonth(currentMonth, -1))
    }

    function historicalAverage(category) {
        return recentSpendingMonths.reduce((sum, month) => sum + outflowFor(transactions, category, month), 0) / 3
    }

    function suggestedAmount(category) {
        if (category.rolloverEnabled && previousBudgetValues[category.name] != null) {
            const priorBalance = previousBudgetValues[category.name] - spendFor(transactions, category.name, shiftMonth(selectedMonth, -1))
            return Math.max(0, priorBalance + Number(category.rolloverMonthlyIncrease || 0))
        }
        return historicalAverage(category.name)
    }

    async function saveMonthlyBudget(event) {
        event.preventDefault()
        setError('')
        setSavingBudget(true)
        try {
            const entries = budgetCategories.map((category) => ({ category: category.name, amount: Number(budgetValues[category.name] || 0) }))
            await apiClient.put('/budget/monthly', { month: monthDateStart, entries })
            setHasSavedBudget(true)
            setSavedBudgetValues({ ...budgetValues })
            setEditingBudget(false)
            onBudgetSaved?.()
        } catch (requestError) { setError(errorText(requestError, 'Unable to save this monthly budget.')) }
        finally { setSavingBudget(false) }
    }

    return <div className="container py-4 plaid-page">
        <div className="d-flex flex-wrap align-items-center justify-content-between gap-3 mb-4">
            <div><h1 className="h2 mb-1">Budget</h1><p className="text-muted mb-0">Set category targets and track spending, income, and rollover balances.</p></div>
            {!hideMonthSelector && <div className="d-flex flex-wrap align-items-center gap-2">
                <div className="btn-group" role="group" aria-label="Budget month">
                    <button type="button" className={`btn ${!showMonthPicker && selectedMonth === currentMonth ? 'btn-primary' : 'btn-outline-primary'}`} onClick={() => selectPreset('this')}>This month</button>
                    <button type="button" className={`btn ${!showMonthPicker && selectedMonth === shiftMonth(currentMonth, -1) ? 'btn-primary' : 'btn-outline-primary'}`} onClick={() => selectPreset('last')}>Last month</button>
                    <button type="button" className={`btn ${showMonthPicker ? 'btn-primary' : 'btn-outline-primary'}`} onClick={() => setShowMonthPicker((visible) => !visible)}>Choose month</button>
                </div>
                {showMonthPicker && <><label className="visually-hidden" htmlFor="budget-month">Choose month</label><input id="budget-month" type="month" className="form-control" style={{ width: 'auto' }} value={selectedMonth} onChange={(event) => event.target.value && setSelectedMonth(event.target.value)} /></>}
            </div>}
        </div>

        {error && <div className="alert alert-danger" role="alert">{error}</div>}
        {loading ? <p>Loading budget…</p> : loadFailed ? <p className="text-muted">Refresh the page after the budget service is available.</p> : <>
            <div className="d-flex flex-wrap align-items-end justify-content-between gap-2 mb-3">
                <div><h2 className="h4 mb-0">{monthLabel(selectedMonth, { month: 'long', year: 'numeric' })}</h2></div>
            </div>

            {isPastMonth && <p className="small text-muted mb-3">This month’s saved budget is locked. Changes to transaction dates or categories still update actual spending and rollover calculations.</p>}

            {selectedMonth === currentMonth && !hasSavedBudget && <div className="alert alert-warning" role="status"><strong>Your budget for this month awaits review.</strong> Review the suggested amounts and save your plan.</div>}

            <div className="row g-3 mb-4">
                {[
                    ['Income', monthIncome, 'Assigned to the Income category'],
                    ['Planned', plannedTotal, `${budgetCategories.length} spending categories`],
                    ['Spent', monthSpending, 'Categorized transactions'],
                    ['Remaining', monthRemaining, 'Budget plus assigned income minus spending'],
                ].map(([label, value, hint]) => <div className="col-6 col-xl-3" key={label}>
                    {label === 'Income' ? <button type="button" className="card h-100 w-100 text-start p-0 bg-white" onClick={() => { setTransactionFlow('Income'); setTransactionCategory('Income') }} aria-label={`View income transactions for ${monthLabel(selectedMonth, { month: 'long', year: 'numeric' })}`}><div className="card-body py-3"><div className="small text-muted">Income</div><div className="fs-4 fw-semibold text-body">{money(value)}</div><div className="small text-primary">View income events</div></div></button> : <div className="card h-100"><div className="card-body py-3"><div className="small text-muted">{label}</div><div className="fs-4 fw-semibold">{money(value)}</div><div className="small text-muted">{hint}</div></div></div>}
                </div>)}
            </div>

            <section className="card mb-4" aria-labelledby="category-budgets-heading">
                <div className="card-header d-flex flex-wrap justify-content-between align-items-center gap-2"><div><h2 id="category-budgets-heading" className="h5 mb-0">Monthly budgets</h2><div className="small text-muted">Suggestions average recent spending; rollover categories carry forward last month’s remaining balance plus their monthly increase.</div></div>{canEditBudget && <div className="d-flex gap-2">{editingBudget ? <><button className="btn btn-outline-secondary btn-sm" type="button" onClick={() => { setBudgetValues(savedBudgetValues); setEditingBudget(false) }} disabled={savingBudget}>Cancel</button><button className="btn btn-primary btn-sm" type="button" onClick={saveMonthlyBudget} disabled={savingBudget}>{savingBudget ? 'Saving…' : 'Save budget'}</button></> : <button className="btn btn-outline-primary btn-sm" type="button" onClick={() => setEditingBudget(true)}>{hasSavedBudget ? 'Edit' : 'Create budget'}</button>}</div>}</div>
                <div className="table-responsive">
                    <table className="table align-middle mb-0">
                        <thead><tr><th scope="col">Category</th><th scope="col" style={{ minWidth: 150 }}>Budget</th><th scope="col" className="text-end">Spent</th><th scope="col" className="text-end">Remaining</th></tr></thead>
                        <tbody>{budgetCategories.map((category) => {
                            const spent = outflowFor(transactions, category.name, selectedMonth)
                            const addedIncome = inflowFor(transactions, category.name, selectedMonth)
                            const netSpent = spent - addedIncome
                            const planned = Number(budgetValues[category.name]) || 0
                            const remaining = planned - spent + addedIncome
                            const suggestion = suggestedAmount(category)
                            return <tr key={category.id}>
                                <th scope="row"><span className="d-inline-block rounded-circle me-2" style={{ width: 10, height: 10, backgroundColor: category.color }} /><button type="button" className="btn btn-link p-0 text-start text-body fw-semibold text-decoration-none" onClick={() => { setTransactionFlow('All transactions'); setTransactionCategory(category.name) }} aria-label={`View ${category.name} transactions for ${monthLabel(selectedMonth, { month: 'long', year: 'numeric' })}`}>{category.name}</button>{category.rolloverEnabled && <span className="badge text-bg-light border ms-2">Rollover</span>}</th>
                                <td><div className="input-group input-group-sm"><span className="input-group-text">$</span><input className="form-control text-end" type="number" min="0" step="0.01" aria-label={`${category.name} budget`} value={budgetValues[category.name] ?? ''} readOnly={!canEditBudget || !editingBudget} onChange={(event) => setBudgetValues((current) => ({ ...current, [category.name]: event.target.value }))} /></div>{editingBudget && canEditBudget && <div className="form-text text-end">Suggested: {money(suggestion)}</div>}</td>
                                <td className="text-end">{netSpent < 0 ? <span className="text-success">+{money(Math.abs(netSpent))}</span> : money(netSpent)}</td><td className={`text-end ${remaining < 0 ? 'text-danger' : 'text-success'}`}>{money(remaining)}</td>
                            </tr>
                        })}</tbody>
                    </table>
                    {!budgetCategories.length && <p className="text-muted p-3 mb-0">Enable transaction categories in Settings to budget them here.</p>}
                </div>
                <div className="card-footer small text-muted">Transactions assigned to a category reduce its remaining amount; incoming transactions assigned to it increase the amount available. For rollover categories, next month’s suggestion is this month’s saved budget minus net transaction activity, plus the monthly increase.</div>
            </section>

            <div className="row g-3 mb-4">
                <div className="col-12 col-xl-6"><TrendPanel title="Income over time" subtitle="Incoming transactions across categories" months={historyMonths.map((month) => monthLabel(month))} values={incomeByMonth} color="#16A34A" /></div>
                <div className="col-12 col-xl-6"><TrendPanel title="Spending over time" subtitle={trendCategory || 'All categories'} months={historyMonths.map((month) => monthLabel(month))} values={trendValues} color={categoryColors[trendCategory] || '#2563EB'} control={<select className="form-select form-select-sm" style={{ width: 'auto' }} aria-label="Spending trend category" value={trendCategory} onChange={(event) => setTrendCategory(event.target.value)}><option value="">All categories</option>{budgetCategories.map((category) => <option key={category.id} value={category.name}>{category.name}</option>)}</select>} /></div>
            </div>

        </>}
        {transactionCategory && <TransactionsComponent
            key={`${selectedMonth}-${transactionCategory}`}
            title={transactionFlow === 'Income' ? 'Income events' : `${transactionCategory} transactions`}
            initialRange={transactionRangeForMonth(selectedMonth)}
            initialCategoryFilter={transactionFlow === 'Income' ? 'All categories' : transactionCategory}
            initialFlowFilter={transactionFlow}
            inDialog
            onClose={() => setTransactionCategory(null)}
        />}
    </div>
}
