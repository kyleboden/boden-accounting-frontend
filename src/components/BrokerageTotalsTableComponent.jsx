import React from 'react'
import { formatCurrency } from '../utils/formatCurrency.js'

const BrokerageTotalsTableComponent = ({
    brokerageTotals,
    computeBalancesUpToMonth,
    formatDayMonthYear,
    lastDayOfMonthIso
}) => {
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

    return (
        <>
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
                        const totalInValue = total.totalBrokerage ?? total.totalInAccount ?? 0
                        const totalIn = Number(totalInValue ?? 0)
                        const monthKey = total.date ? String(total.date).substring(0, 7) : null
                        const { tithed, invest } = monthKey ? computeBalancesUpToMonth(monthKey) : { tithed: 0, invest: 0 }
                        const interest = totalIn - (tithed + invest)
                        const interestPercent = (totalIn && !Number.isNaN(totalIn)) ? (interest / totalIn) * 100 : null

                        const prev = brokerageTotals[idx + 1]
                        const prevInValue = prev ? (prev.totalBrokerage ?? prev.totalInAccount ?? 0) : null
                        const prevIn = prevInValue !== null ? Number(prevInValue) : null
                        const prevMonthKey = prev && prev.date ? String(prev.date).substring(0, 7) : null
                        const prevBalances = prevMonthKey ? computeBalancesUpToMonth(prevMonthKey) : null
                        const prevTithed = prevBalances ? prevBalances.tithed : null
                        const prevInvest = prevBalances ? prevBalances.invest : null
                        const prevInterest = (prevIn !== null && prevTithed !== null && prevInvest !== null) ? (prevIn - (prevTithed + prevInvest)) : null

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
        </>
    )
}

export default BrokerageTotalsTableComponent
