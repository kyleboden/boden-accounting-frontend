import React, { useMemo, useState } from 'react'
import { formatCurrency } from '../utils/formatCurrency.js'

const TITHE_RATE = 0.1
const POST_TITHE_RATE = 1 - TITHE_RATE

const formatMonths = (months) => {
    if (!Number.isFinite(months)) return '-'
    if (months <= 0) return '0 months'

    const roundedMonths = Math.ceil(months)
    const years = Math.floor(roundedMonths / 12)
    const remainingMonths = roundedMonths % 12

    if (years === 0) {
        return `${roundedMonths} month${roundedMonths === 1 ? '' : 's'}`
    }

    if (remainingMonths === 0) {
        return `${years} year${years === 1 ? '' : 's'}`
    }

    return `${years} year${years === 1 ? '' : 's'} ${remainingMonths} month${remainingMonths === 1 ? '' : 's'}`
}

const formatCurrencyInput = (value) => {
    if (value === null || value === undefined || value === '') return ''

    const digits = String(value).replace(/[^\d]/g, '')
    if (!digits) return ''

    return `$${Number(digits).toLocaleString('en-US')}`
}

const parseCurrencyInput = (value) => String(value).replace(/[^\d]/g, '')

const BrokerageGoalCalculatorComponent = ({
    currentGrossBalance,
    currentPostTithingBalance,
    defaultMonthlySavings,
    averageMonthlyInvested,
}) => {
    const [monthlySavingsInput, setMonthlySavingsInput] = useState(null)
    const [goalInput, setGoalInput] = useState(null)
    const defaultMonthlySavingsDisplay = String(Math.max(0, Math.round(defaultMonthlySavings)))
    const displayedMonthlySavings = formatCurrencyInput(monthlySavingsInput ?? defaultMonthlySavingsDisplay)
    const monthlySavings = monthlySavingsInput === null
        ? (Number(defaultMonthlySavingsDisplay) || 0)
        : (Number(monthlySavingsInput) || 0)
    const displayedGoal = formatCurrencyInput(goalInput)
    const postTitheGoal = Number(goalInput) || 0

    const calculation = useMemo(() => {
        const remainingPostTithe = Math.max(0, postTitheGoal - currentPostTithingBalance)
        const requiredGrossContribution = remainingPostTithe <= 0
            ? 0
            : remainingPostTithe / POST_TITHE_RATE
        const monthsToGoal = monthlySavings > 0
            ? requiredGrossContribution / monthlySavings
            : Number.POSITIVE_INFINITY
        const grossGoalBalance = postTitheGoal <= 0
            ? 0
            : currentGrossBalance + requiredGrossContribution

        return {
            remainingPostTithe,
            requiredGrossContribution,
            grossGoalBalance,
            monthsToGoal,
        }
    }, [currentGrossBalance, currentPostTithingBalance, monthlySavings, postTitheGoal])

    return (
        <div className='card mb-4 p-3'>
            <div className='mb-3'>
                <div className='small text-muted'>Goal Calculator</div>
                <div>Estimate how long it will take to reach a post-tithe brokerage goal.</div>
            </div>

            <div className='row g-3'>
                <div className='col-md-6'>
                    <label className='form-label'>Monthly Savings</label>
                    <input
                        type='text'
                        inputMode='numeric'
                        className='form-control'
                        value={displayedMonthlySavings}
                        onChange={(event) => setMonthlySavingsInput(parseCurrencyInput(event.target.value))}
                    />
                    <div className='form-text'>
                        Defaulted to the average monthly brokerage increase over the last 6 months.
                    </div>
                    <div className='small text-muted mt-2'>
                        Avg increase (6 mo): {formatCurrency(defaultMonthlySavings)}
                    </div>
                    <div className='small text-muted mt-2'>
                        Avg invested (6 mo): {formatCurrency(averageMonthlyInvested)}
                    </div>
                </div>

                <div className='col-md-6'>
                    <label className='form-label'>Goal</label>
                    <input
                        type='text'
                        inputMode='numeric'
                        className='form-control'
                        value={displayedGoal}
                        onChange={(event) => setGoalInput(parseCurrencyInput(event.target.value))}
                    />
                    <div className='form-text'>This goal is treated as the post-tithe balance target.</div>
                </div>
            </div>

            <div className='row g-3 mt-1'>

                <div className='col-md-4'>
                    <div className='border rounded p-3 h-100'>
                        <div className='small text-muted'>Goal Balance</div>
                        <div>{formatCurrency(calculation.grossGoalBalance)} gross</div>
                        <div>{formatCurrency(postTitheGoal)} post tithe</div>
                    </div>
                </div>

                <div className='col-md-4'>
                    <div className='border rounded p-3 h-100'>
                        <div className='small text-muted'>Remaining</div>
                        <div>{formatCurrency(calculation.requiredGrossContribution)} gross</div>
                        <div>{formatCurrency(calculation.remainingPostTithe)} post tithe</div>
                    </div>
                </div>
                <div className='col-md-4'>
                    <div className='border rounded p-3 h-100'>
                        <div className='small text-muted'>Estimated Time</div>
                        <div style={{ fontSize: '1.5rem', fontWeight: 700 }}>
                            {calculation.remainingPostTithe <= 0 ? "" : formatMonths(calculation.monthsToGoal)}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default BrokerageGoalCalculatorComponent
