import React, { useEffect, useMemo, useState } from 'react'
import { createMonthlyReview, updateMonthlyReview } from '../services/MonthlyReviewService.js'
import { createBrokerageTransaction, updateBrokerageTransaction } from '../services/BrokerageTransactionService.js'
import { formatCurrency } from '../utils/formatCurrency.js'
import { useLocation, useNavigate } from 'react-router-dom'

const MonthlyReviewConfirmationComponent = () => {
    const { state } = useLocation()
    const navigator = useNavigate()

    const id = state?.id
    const monthlyReview = state?.monthlyReview
    const MIN_BANK_AMOUNT = 12000
    const TRANSACTION_TYPE = 'DEPOSIT'

    const calculations = useMemo(() => {
        if (!monthlyReview) {
            return null
        }

        const totalIncome =
            Number(monthlyReview.kyleIncome ?? 0) +
            Number(monthlyReview.sarahIncome ?? 0) +
            Number(monthlyReview.giftCardIncome ?? 0) +
            Number(monthlyReview.brokerageWithdrawal ?? 0) +
            Number(monthlyReview.hsaWithdrawal ?? 0)

        const excessInBank = monthlyReview.totalBank - MIN_BANK_AMOUNT
        const suggestedInvestment = Math.max(0, excessInBank)

        const amountToBeTithed = totalIncome - suggestedInvestment
        const suggestedTithing = Math.ceil(amountToBeTithed * 0.1)

        return {
            totalIncome,
            amountToBeTithed,
            suggestedTithing,
            suggestedInvestment
        }
    }, [monthlyReview])

    const [confirmedTithing, setConfirmedTithing] = useState(() => {
        if (!monthlyReview || !calculations) {
            return ''
        }

        if (monthlyReview.tithingPaid !== null && monthlyReview.tithingPaid !== undefined) {
            return String(monthlyReview.tithingPaid)
        }

        return String(calculations.suggestedTithing)
    })

    const [confirmedInvestment, setConfirmedInvestment] = useState(() => {
        if (!monthlyReview || !calculations) {
            return ''
        }

        if (monthlyReview.investedTithed !== null && monthlyReview.investedTithed !== undefined) {
            return String(monthlyReview.investedTithed)
        }

        return String(calculations.suggestedInvestment)
    })

    const [isTithingConfirmed, setIsTithingConfirmed] = useState(false)
    const [isInvestmentConfirmed, setIsInvestmentConfirmed] = useState(false)
    const [errors, setErrors] = useState({})

    useEffect(() => {
        if (!monthlyReview) {
            navigator('/add-monthly-review')
        }
    }, [monthlyReview, navigator])

    if (!monthlyReview || !calculations) {
        return null
    }

    function validateConfirmation() {
        const nextErrors = {}

        if (confirmedTithing === '' || Number.isNaN(Number(confirmedTithing))) {
            nextErrors.confirmedTithing = 'Enter exact tithing amount'
        }

        if (!isTithingConfirmed) {
            nextErrors.isTithingConfirmed = 'Confirm the exact tithing amount'
        }

        if (confirmedInvestment === '' || Number.isNaN(Number(confirmedInvestment))) {
            nextErrors.confirmedInvestment = 'Enter exact investment amount'
        }

        if (!isInvestmentConfirmed) {
            nextErrors.isInvestmentConfirmed = 'Confirm the exact investment amount'
        }

        setErrors(nextErrors)
        return Object.keys(nextErrors).length === 0
    }

    function saveMonthlyReview(e) {
        e.preventDefault()

        if (!validateConfirmation()) {
            return
        }

        const payload = {
            ...monthlyReview,
            tithingPaid: Number(confirmedTithing),
            investedTithed: Number(confirmedInvestment),
            investedNontithed: 0
        }

        const request = id
            ? updateMonthlyReview(id, payload)
            : createMonthlyReview(payload)

        // After the monthly review is saved, create/update a brokerage transaction to record the investment.
        request.then((response) => {
            // response.data is the saved monthly review (backend may return it)
            const savedMonthly = response.data || payload

            const brokerageDto = {
                // backend expects LocalDate like 'YYYY-MM-DD'
                date: savedMonthly.date || monthlyReview.date,
                type: TRANSACTION_TYPE,
                amount: Number(confirmedInvestment),
                tithed: false,
                notes: `From monthly review ${savedMonthly.date || monthlyReview.date}: ` + (savedMonthly.notes || '')
            }

            // If the draft included a brokerageTransactionId, update that transaction; otherwise create a new one.
            const brokerageRequest = savedMonthly.brokerageTransactionId
                ? updateBrokerageTransaction(savedMonthly.brokerageTransactionId, brokerageDto)
                : createBrokerageTransaction(brokerageDto)

            return brokerageRequest
        }).then(() => {
            navigator('/monthly-reviews')
        }).catch((error) => {
            console.error('Error saving monthly review or brokerage transaction', error)
            // still navigate back but log the error — change behavior if you prefer stricter failure handling
            navigator('/monthly-reviews')
        })
    }

    function backToEdit(e) {
        e.preventDefault()
        // Navigate back to the edit/add form and pass the draft review so the form is populated
        if (id) {
            navigator(`/edit-monthly-review/${id}`, { state: { review: monthlyReview } })
        } else {
            navigator('/add-monthly-review', { state: { review: monthlyReview } })
        }
    }

    // using shared formatCurrency from utils

    function pageTitle() {
        const reviewDate = monthlyReview.date ? new Date(`${monthlyReview.date}T00:00:00`) : new Date()
        const month = reviewDate.toLocaleString('en-US', { month: 'long' })
        const year = reviewDate.getFullYear()

        return id
            ? <h2 className='text-center'>Confirm Monthly Review - {month} {year}</h2>
            : <h2 className='text-center'>Confirm Monthly Review - {month} {year}</h2>
    }

    return (
        <div className='container'>
            <br></br>
            <div className='row'>
                <div className='card col-lg-10 offset-lg-1'>
                    <div className='card-body pb-0'>
                        <button className='btn btn-link p-0 text-decoration-none' onClick={backToEdit}>Back</button>
                    </div>
                    {pageTitle()}
                    <div className='card-body'>
                        <form>
                            <div className='row'>
                                <div className='col-md-6 mb-2'>
                                    <label className='form-label'>Total Income:</label>
                                    <div className='form-control bg-light'>{formatCurrency(calculations.totalIncome)}</div>
                                </div>
                                <div className='col-md-6 mb-2'>
                                    <label className='form-label'>Amount To Be Tithed:</label>
                                    <div className='form-control bg-light'>{formatCurrency(calculations.amountToBeTithed)}</div>
                                </div>
                                <div className='col-md-6 mb-2'>
                                    <label className='form-label'>Suggested Tithing (10%):</label>
                                    <div className='form-control bg-light'>{formatCurrency(calculations.suggestedTithing)}</div>
                                </div>
                                <div className='col-md-6 mb-2'>
                                    <label className='form-label'>Suggested Investment:</label>
                                    <div className='form-control bg-light'>{formatCurrency(calculations.suggestedInvestment)}</div>
                                </div>

                                <div className='col-md-6 mb-2'>
                                    <label className='form-label'>Confirm Exact Tithing Amount:</label>
                                    <input
                                        type='number'
                                        step='1.00'
                                        value={confirmedTithing}
                                        className={`form-control ${errors.confirmedTithing ? 'is-invalid' : ''}`}
                                        onChange={(e) => setConfirmedTithing(e.target.value)}
                                    />
                                    {errors.confirmedTithing && <div className='invalid-feedback'>{errors.confirmedTithing}</div>}
                                    <div className='form-check mt-2'>
                                        <input
                                            className={`form-check-input ${errors.isTithingConfirmed ? 'is-invalid' : ''}`}
                                            type='checkbox'
                                            checked={isTithingConfirmed}
                                            onChange={(e) => setIsTithingConfirmed(e.target.checked)}
                                            id='confirm-tithing'
                                        />
                                        <label className='form-check-label' htmlFor='confirm-tithing'>
                                            I confirm this exact tithing amount
                                        </label>
                                        {errors.isTithingConfirmed && <div className='invalid-feedback d-block'>{errors.isTithingConfirmed}</div>}
                                    </div>
                                </div>

                                <div className='col-md-6 mb-2'>
                                    <label className='form-label'>Confirm Exact Investment Amount:</label>
                                    <input
                                        type='number'
                                        step='1.00'
                                        value={confirmedInvestment}
                                        className={`form-control ${errors.confirmedInvestment ? 'is-invalid' : ''}`}
                                        onChange={(e) => setConfirmedInvestment(e.target.value)}
                                    />
                                    {errors.confirmedInvestment && <div className='invalid-feedback'>{errors.confirmedInvestment}</div>}
                                    <div className='form-check mt-2'>
                                        <input
                                            className={`form-check-input ${errors.isInvestmentConfirmed ? 'is-invalid' : ''}`}
                                            type='checkbox'
                                            checked={isInvestmentConfirmed}
                                            onChange={(e) => setIsInvestmentConfirmed(e.target.checked)}
                                            id='confirm-investment'
                                        />
                                        <label className='form-check-label' htmlFor='confirm-investment'>
                                            I confirm this exact investment amount
                                        </label>
                                        {errors.isInvestmentConfirmed && <div className='invalid-feedback d-block'>{errors.isInvestmentConfirmed}</div>}
                                    </div>
                                </div>

                                <div className='form-group col-12 mb-2'>
                                    <label className='form-label'>Notes:</label>
                                    <div className='form-control bg-light' style={{ minHeight: '110px', whiteSpace: 'pre-wrap' }}>
                                        {monthlyReview.notes || '-'}
                                    </div>
                                </div>

                                <div className='col-12 d-flex justify-content-end gap-2'>
                                    <button className='btn btn-secondary' onClick={backToEdit}>Back</button>
                                    <button className='btn btn-success' onClick={saveMonthlyReview}>Confirm & Save</button>
                                </div>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default MonthlyReviewConfirmationComponent

