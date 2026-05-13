import React, { useEffect, useState } from 'react'
import { listBrokerageTransactions, deleteBrokerageTransaction } from '../services/BrokerageTransactionService.js'
import { useNavigate } from 'react-router-dom'
import { listMonthlyReviews } from '../services/MonthlyReviewService.js'
import BrokerageBalanceSummaryComponent from './BrokerageBalanceSummaryComponent.jsx'
import BrokerageTotalsTableComponent from './BrokerageTotalsTableComponent.jsx'
import BrokerageTransactionsTableComponent from './BrokerageTransactionsTableComponent.jsx'

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
        deleteBrokerageTransaction(id).then(() => getAllTransactions()).catch((error) => console.error(error))
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
            <BrokerageBalanceSummaryComponent
                grossBalance={grossBalance}
                postTithingBalance={postTithingBalance}
                alreadyTithed={alreadyTithed}
                preTithe={preTithe}
            />

            <BrokerageTotalsTableComponent
                brokerageTotals={brokerageTotals}
                computeBalancesUpToMonth={computeBalancesUpToMonth}
                formatDayMonthYear={formatDayMonthYear}
                lastDayOfMonthIso={lastDayOfMonthIso}
            />

            <BrokerageTransactionsTableComponent
                transactions={transactions}
                formatDayMonthYear={formatDayMonthYear}
                onAddTransaction={addNewTransaction}
                onUpdateTransaction={updateTransactionEntry}
                onDeleteTransaction={removeTransaction}
            />
        </div>
    )
}

export default ListBrokerageTransactionsComponent
