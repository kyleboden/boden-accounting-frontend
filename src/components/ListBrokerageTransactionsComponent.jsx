import React, { useEffect, useState } from 'react'
import { listBrokerageTransactions, deleteBrokerageTransaction } from '../services/BrokerageTransactionService.js'
import { useNavigate } from 'react-router-dom'
import { formatCurrency } from '../utils/formatCurrency.js'
import { listMonthlyReviews } from '../services/MonthlyReviewService.js'

const ListBrokerageTransactionsComponent = () => {
    const [transactions, setTransactions] = useState([])
    const [brokerageTotals, setBrokerageTotals] = useState([])

    const navigator = useNavigate()

    function getAllTransactions() {
        listBrokerageTransactions().then((response) => {
            const items = Array.isArray(response.data) ? response.data.slice() : []
            // sort by date descending (newest first)
            items.sort((a, b) => {
                const da = a.date ?? ''
                const db = b.date ?? ''
                if (da < db) return 1
                if (da > db) return -1
                return 0
            })
            setTransactions(items)
        }).catch((error) => {
            console.error(error)
        })
    }

    function getAllBrokerageTotals() {
        listMonthlyReviews()
            .then((response) => {
                const items = Array.isArray(response.data) ? response.data.slice() : []

                // sort by date descending (newest first)
                items.sort((a, b) => {
                    const da = a.date ?? ''
                    const db = b.date ?? ''
                    if (da < db) return 1
                    if (da > db) return -1
                    return 0
                })

                const simplified = items.map(item => ({
                    date: item.date,
                    totalBrokerage: item.totalBrokerage
                }))

                setBrokerageTotals(simplified)
            })
            .catch((error) => {
                console.error(error)
            })
    }

    useEffect(() => {
        getAllTransactions()
        getAllBrokerageTotals()
    }, [])


    // derive latest month (YYYY-MM) from loaded transactions (list is sorted newest-first)
    const latestMonth = transactions[0]?.date ? transactions[0].date.substring(0,7) : null

    // We'll compute cumulative tithed / non-tithed balances up to each month
    // using plain numbers (dollars) for simplicity per user request.
    const toNumber = (v) => Number(v ?? 0)

    // Prepare transactions sorted oldest-first for cumulative processing
    const txsAsc = [...transactions].sort((a, b) => {
        const da = a.date ?? ''
        const db = b.date ?? ''
        if (da < db) return -1
        if (da > db) return 1
        return 0
    })

    // Helper to compute cumulative tithed/investments balances up to and including monthKey (YYYY-MM)
    function computeBalancesUpToMonth(monthKey) {
        let tithed = 0
        let invest = 0

        for (const tx of txsAsc) {
            if (!tx.date) continue
            const txMonth = tx.date.substring(0,7)
            if (txMonth > monthKey) break

            const amount = Math.abs(Number(tx.amount ?? 0))
            const isWithdrawal = String(tx.type ?? '').toUpperCase().includes('WITHDRAW') || (Number(tx.amount) < 0)

            if (isWithdrawal) {
                // Withdrawals reduce tithed first, then investments
                const takeFromTithed = Math.min(tithed, amount)
                tithed -= takeFromTithed
                const remaining = amount - takeFromTithed
                if (remaining > 0) {
                    invest = Math.max(0, invest - remaining)
                }
            } else {
                // Deposits: allocate to tithed or investments based on tx.tithed flag
                if (tx.tithed) {
                    tithed += amount
                } else {
                    invest += amount
                }
            }
        }

        return { tithed, invest }
    }

    function addNewTransaction() {
        navigator('/add-brokerage-transaction')
    }

    function updateTransactionEntry(tx) {
        navigator(`/edit-brokerage-transaction/${tx.id}`, { state: { transaction: tx } })
    }

    function removeTransaction(id) {
        if (!window.confirm('Are you sure you want to delete this brokerage transaction?')) return
        // find the transaction locally so we can update totals optimistically
        const tx = transactions.find((t) => t.id === id)

        // if we don't have the transaction locally, fall back to server refresh after delete
        if (!tx) {
            deleteBrokerageTransaction(id)
                .then(() => {
                    getAllTransactions()
                    getAllBrokerageTotals()
                })
                .catch((error) => console.error(error))
            return
        }


        // Optimistically remove the transaction from the UI; totals are derived
        // from monthly reviews (totalInAccount) and cumulative transactions.
        setTransactions((prev) => prev.filter((t) => t.id !== id))


        // perform server delete; on failure revert by reloading from server
        deleteBrokerageTransaction(id)
            .then(() => {
                // successful on server; nothing else to do (UI already updated)
            })
            .catch((error) => {
                console.error(error)
                // revert to authoritative server state
                getAllTransactions()
                getAllBrokerageTotals()
            })
    }

    // Simplified: we expect dates in YYYY-MM-DD (e.g. 2026-04-25).
    // Return MM/DD/YYYY. Keep a small fallback for Date objects.
    function formatDayMonthYear(dateStr) {
        if (!dateStr) return '-'

        if (dateStr instanceof Date) {
            const d = dateStr
            const monthNum = String(d.getMonth() + 1).padStart(2, '0')
            const dayNum = String(d.getDate()).padStart(2, '0')
            const yearNum = d.getFullYear()
            return `${monthNum}/${dayNum}/${yearNum}`
        }

        const s = String(dateStr).trim()
        // Expect format YYYY-MM-DD; return MM/DD/YYYY
        const m = s.match(/^(\d{4})-(\d{2})-(\d{2})$/)
        if (m) {
            return `${m[2]}/${m[3]}/${m[1]}`
        }

        // If it doesn't match expected pattern, return original value
        return dateStr
    }

    // Return ISO date string for the last day of the month for a given YYYY-MM or YYYY-MM-DD input.
    // If input is invalid, return the original value.
    function lastDayOfMonthIso(dateStr) {
        if (!dateStr) return dateStr
        const s = String(dateStr).trim()
        const m = s.match(/^(\d{4})-(\d{2})/)
        if (!m) return dateStr
        const y = Number(m[1])
        const mo = Number(m[2]) // 1-12
        if (Number.isNaN(y) || Number.isNaN(mo) || mo < 1 || mo > 12) return dateStr
        const last = new Date(y, mo, 0) // day 0 of next month -> last day of month
        const yyyy = last.getFullYear()
        const mm = String(last.getMonth() + 1).padStart(2, '0')
        const dd = String(last.getDate()).padStart(2, '0')
        return `${yyyy}-${mm}-${dd}`
    }

    // Compute top summary values from latest monthly review (authoritative total)
    const latestTotal = brokerageTotals[0]
    const latestMonthKey = latestTotal?.date ? latestTotal.date.substring(0,7) : null
    const latestIn = latestTotal ? toNumber(latestTotal.totalBrokerage ?? 0) : 0
    const latestBalances = latestMonthKey ? computeBalancesUpToMonth(latestMonthKey) : { tithed: 0, invest: 0 }
    const grossBalance = latestIn
    const alreadyTithed = latestBalances.tithed
    const preTithe = grossBalance - alreadyTithed
    const suggestedTithing = Math.ceil(Math.max(0, preTithe) * 0.1)
    const postTithingBalance = grossBalance - suggestedTithing

    return (
        <div className='container'>
            {/* Top summary */}
            <div className='row mb-3 mt-3'>
                <div className='col-md-6'>
                    <div className='card p-3'>
                        <div className='small text-muted'>Gross Balance</div>
                        <div style={{ fontSize: '2rem', fontWeight: 700 }}>{formatCurrency(grossBalance)}</div>
                    </div>
                </div>
                <div className='col-md-6'>
                    <div className='card p-3'>
                        <div className='small text-muted'>Post-Tithing Balance</div>
                        <div style={{ fontSize: '2rem', fontWeight: 700 }}>{formatCurrency(postTithingBalance)}</div>
                    </div>
                </div>
            </div>

            {/* Balance breakdown bar */}
            <div className='card mb-4 p-3'>
                <div className='mb-2 small text-muted'>Balance Breakdown</div>
                <div style={{ display: 'flex', height: '40px', width: '100%', borderRadius: '4px', overflow: 'hidden' }}>
                    {grossBalance > 0 ? (
                        <>
                            <div style={{ backgroundColor: '#00b050', width: `${(alreadyTithed / grossBalance) * 100}%`, minWidth: '1px' }} title={`Already Tithed: ${formatCurrency(alreadyTithed)}`} />
                            <div style={{ backgroundColor: '#f0ad4e', width: `${(preTithe / grossBalance) * 100}%`, minWidth: '1px' }} title={`Pre-Tithe: ${formatCurrency(preTithe)}`} />
                        </>
                    ) : (
                        <div style={{ backgroundColor: '#e9ecef', width: '100%' }} />
                    )}
                </div>
                <div className='mt-2 d-flex gap-3 align-items-center'>
                    <div className='d-flex align-items-center'>
                        <div style={{ width: '16px', height: '12px', backgroundColor: '#00b050', marginRight: '8px' }}></div>
                        <div>Already Tithed: {formatCurrency(alreadyTithed)}</div>
                    </div>
                    <div className='d-flex align-items-center'>
                        <div style={{ width: '16px', height: '12px', backgroundColor: '#f0ad4e', marginRight: '8px' }}></div>
                        <div>Pre-Tithe: {formatCurrency(preTithe)}</div>
                    </div>
                </div>
            </div>

            {/* Brokerage Totals */}
            <h2 className='text-center'>Brokerage Totals</h2>

            <table className='table table-striped table-bordered'>
                <thead>
                <tr>
                    <th>Date</th>
                    <th>Total In Brokerage</th>
                    <th>Total Tithed</th>
                    <th>Non-Tithed Investments</th>
                    <th>Interest Growth</th>
                </tr>
                </thead>
                <tbody>
                {brokerageTotals.map((total, idx) => {
                    // authoritative total in brokerage (from monthly review)
                    // monthly reviews may expose this value under different property names
                    // (e.g. totalBrokerage or totalInAccount). Accept either.
                    const totalInValue = (total.totalBrokerage ?? total.totalInAccount ?? 0)
                    const totalIn = Number(totalInValue ?? 0)

                    // month key for this totals row (YYYY-MM)
                    const monthKey = total.date ? String(total.date).substring(0,7) : null

                    // compute cumulative balances up to this month (tithed + investments)
                    const { tithed, invest } = monthKey ? computeBalancesUpToMonth(monthKey) : { tithed: 0, invest: 0 }

                    const interest = totalIn - (tithed + invest)
                    const interestPercent = (totalIn && !Number.isNaN(totalIn)) ? (interest / totalIn) * 100 : null

                    // previous month (older)
                    const prev = brokerageTotals[idx + 1]
                    const prevInValue = prev ? (prev.totalBrokerage ?? prev.totalInAccount ?? 0) : null
                    const prevIn = prevInValue !== null ? Number(prevInValue) : null
                    const prevMonthKey = prev && prev.date ? String(prev.date).substring(0,7) : null
                    const prevBalances = prevMonthKey ? computeBalancesUpToMonth(prevMonthKey) : null
                    const prevTithed = prevBalances ? prevBalances.tithed : null
                    const prevInvest = prevBalances ? prevBalances.invest : null
                    const prevInterest = (prevIn !== null && prevTithed !== null && prevInvest !== null) ? (prevIn - (prevTithed + prevInvest)) : null

                    function renderDelta(current, previous) {
                        if (previous === null || previous === undefined) return null
                        const delta = current - previous
                        if (delta === 0) {
                            return <small className="delta delta-zero">({delta >= 0 ? '+' : '-'}{formatCurrency(Math.abs(delta))})</small>
                        }
                        const cls = delta > 0 ? 'delta-positive' : 'delta-negative'
                        return <small className={`delta ${cls}`}>({delta > 0 ? '+' : '-'}{formatCurrency(Math.abs(delta))})</small>
                    }

                    function renderPercent(pct) {
                        if (pct === null || pct === undefined || Number.isNaN(pct)) return null
                        const sign = pct > 0 ? '' : '-'
                        return <small className="text-muted"> ({sign}{Math.abs(pct).toFixed(2)}%)</small>
                    }

                    const displayDateIso = lastDayOfMonthIso(total.date)

                    return (
                        <tr key={total.id}>
                            <td>{formatDayMonthYear(displayDateIso)}</td>
                            <td>{formatCurrency(totalIn)} {renderDelta(totalIn, prevIn)}</td>
                            <td>{formatCurrency(tithed)} {renderDelta(tithed, prevTithed)}</td>
                            <td>{formatCurrency(invest)} {renderDelta(invest, prevInvest)}</td>
                            <td>{formatCurrency(interest)} {renderDelta(interest, prevInterest)} {renderPercent(interestPercent)}</td>
                        </tr>
                    )
                })}
                </tbody>
            </table>

            <hr />

            {/* Brokerage Transactions */}
            <h2 className='text-center'>Brokerage Transactions</h2>
            <div className='mb-2'>
                <button className='btn btn-primary' onClick={addNewTransaction}>Add Transaction</button>
            </div>

            <table className='table table-striped table-bordered'>
                <thead>
                <tr>
                    <th>Date</th>
                    <th>Type</th>
                    <th>Amount</th>
                    <th>Tithed</th>
                    <th>Notes</th>
                    <th>Actions</th>
                </tr>
                </thead>
                <tbody>
                {transactions.map((tx) => {
                    const txMonth = tx.date ? tx.date.substring(0,7) : null
                    const isEditable = latestMonth && txMonth === latestMonth

                    return (
                        <tr key={tx.id}>
                            <td>{formatDayMonthYear(tx.date)}</td>
                            <td>{tx.type}</td>
                            <td>{formatCurrency(tx.amount ?? 0)}</td>
                            <td>{tx.tithed ? 'Yes' : 'No'}</td>
                            <td>{tx.notes}</td>
                            <td>
                                <button className='btn btn-info' onClick={() => updateTransactionEntry(tx)} disabled={!isEditable}>Update</button>
                                <button className='btn btn-danger' style={{ marginLeft: '10px' }} onClick={() => removeTransaction(tx.id)} disabled={!isEditable}>Delete</button>
                            </td>
                        </tr>
                    )
                })}
                </tbody>
            </table>
        </div>
    )
}

export default ListBrokerageTransactionsComponent

