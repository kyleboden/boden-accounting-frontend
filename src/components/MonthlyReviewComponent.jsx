import React, { useEffect, useState } from 'react'
import { getMonthlyReview, listMonthlyReviews } from '../services/MonthlyReviewService.js'
import { useLocation, useNavigate, useParams } from 'react-router-dom'

const MonthlyReviewComponent = () => {
    const { id } = useParams()
    const { state } = useLocation()
    const initialReview = state?.review && String(state.review.id) === String(id) ? state.review : null
    const navigator = useNavigate()
    const [errors, setErrors] = useState({})

    const [kyleIncome, setKyleIncome] = useState(() => String(initialReview?.kyleIncome ?? ''))
    const [sarahIncome, setSarahIncome] = useState(() => String(initialReview?.sarahIncome ?? ''))
    const [giftCardIncome, setGiftCardIncome] = useState(() => String(initialReview?.giftCardIncome ?? ''))
    const [brokerageWithdrawal, setBrokerageWithdrawal] = useState(() => String(initialReview?.brokerageWithdrawal ?? ''))
    const [hsaWithdrawal, setHsaWithdrawal] = useState(() => String(initialReview?.hsaWithdrawal ?? ''))
    const [totalBank, setTotalBank] = useState(() => String(initialReview?.totalBank ?? ''))
    const [totalBrokerage, setTotalBrokerage] = useState(() => String(initialReview?.totalBrokerage ?? ''))
    const [tithingPaid, setTithingPaid] = useState(() => String(initialReview?.tithingPaid ?? ''))
    const [investedTithed, setInvestedTithed] = useState(() => String(initialReview?.investedTithed ?? ''))
    const [investedNontithed, setInvestedNontithed] = useState(() => String(initialReview?.investedNontithed ?? ''))
    const [date, setDate] = useState(() => initialReview?.date ?? new Date().toISOString().substring(0, 10))
    const [notes, setNotes] = useState(() => initialReview?.notes ?? '')
    const [addAllowed, setAddAllowed] = useState(true)
    const [blockedReason, setBlockedReason] = useState('')
    const [requiredMonth, setRequiredMonth] = useState(null)

    useEffect(() => {
        // only applies to add mode
        if (id) return

        listMonthlyReviews().then((res) => {
            const reviews = Array.isArray(res.data) ? res.data.slice() : []
            if (reviews.length === 0) {
                // no prior months seeded
                setAddAllowed(false)
                setBlockedReason('No previous monthly review found. Please seed the first month in the database before using this UI.')
                return
            }

            reviews.sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0))
            const latest = reviews[0]?.date ? reviews[0].date.substring(0,7) : null
            if (!latest) {
                setAddAllowed(false)
                setBlockedReason('Unable to determine latest month; cannot add new month via UI.')
                return
            }

            const [y, m] = latest.split('-')
            const dt = new Date(`${y}-${m}-01T00:00:00`)
            dt.setMonth(dt.getMonth() + 1)
            const nextMonth = dt.toISOString().substring(0,7)
            setRequiredMonth(nextMonth)

            const currentMonth = date ? date.substring(0,7) : null
            if (currentMonth !== nextMonth) {
                setAddAllowed(false)
                setBlockedReason(`You may only add the month directly after the latest existing month (${latest}). The allowed month is ${nextMonth}.`)
            } else {
                setAddAllowed(true)
                setBlockedReason('')
            }
        }).catch((error) => {
            console.error(error)
            setAddAllowed(false)
            setBlockedReason('Unable to verify previous months. Please try again later.')
        })
    }, [id, date])

    useEffect(() => {
        if (!id) {
            return
        }

        getMonthlyReview(id).then((response) => {
            const review = response.data

            setKyleIncome(String(review.kyleIncome ?? ''))
            setSarahIncome(String(review.sarahIncome ?? ''))
            setGiftCardIncome(String(review.giftCardIncome ?? ''))
            setBrokerageWithdrawal(String(review.brokerageWithdrawal ?? ''))
            setHsaWithdrawal(String(review.hsaWithdrawal ?? ''))
            setTotalBank(String(review.totalBank ?? ''))
            setTotalBrokerage(String(review.totalBrokerage ?? ''))
            setTithingPaid(String(review.tithingPaid ?? ''))
            setInvestedTithed(String(review.investedTithed ?? ''))
            setInvestedNontithed(String(review.investedNontithed ?? ''))
            setDate(review.date ?? '')
            setNotes(review.notes ?? '')
            // ensure only the most recent monthly review month is editable
            listMonthlyReviews().then((res) => {
                const reviews = Array.isArray(res.data) ? res.data.slice() : []
                reviews.sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0))
                const latest = reviews[0]?.date ? reviews[0].date.substring(0,7) : null
                const reviewMonth = review.date ? review.date.substring(0,7) : null
                if (latest && reviewMonth && latest !== reviewMonth) {
                    window.alert('Editing historical monthly reviews is disabled. You can only edit the most recent month.')
                    navigator('/monthly-reviews')
                }
            }).catch(() => {/* ignore */})
        }).catch((error) => {
            console.error(error)
        })
    }, [id, navigator])

    function validateForm() {
        const nextErrors = {}
        const requiredNumberFields = {
            kyleIncome,
            sarahIncome,
            giftCardIncome,
            brokerageWithdrawal,
            hsaWithdrawal,
            totalBank,
            totalBrokerage
        }

        Object.entries(requiredNumberFields).forEach(([fieldName, fieldValue]) => {
            if (fieldValue === '' || Number.isNaN(Number(fieldValue))) {
                nextErrors[fieldName] = 'This field is required'
            }
        })

        if (!date.trim()) {
            nextErrors.date = 'Date is required'
        }

        setErrors(nextErrors)
        return Object.keys(nextErrors).length === 0
    }

    function goToConfirmation(e) {
        e.preventDefault()

        if (!validateForm()) {
            return
        }

        const monthlyReview = {
            kyleIncome: Number(kyleIncome),
            sarahIncome: Number(sarahIncome),
            giftCardIncome: Number(giftCardIncome),
            brokerageWithdrawal: Number(brokerageWithdrawal),
            hsaWithdrawal: Number(hsaWithdrawal),
            totalBank: Number(totalBank),
            totalBrokerage: Number(totalBrokerage),
            tithingPaid: tithingPaid === '' ? null : Number(tithingPaid),
            investedTithed: investedTithed === '' ? null : Number(investedTithed),
            investedNontithed: investedNontithed === '' ? null : Number(investedNontithed),
            date,
            notes
        }

        navigator('/monthly-review-confirmation', {
            state: {
                id,
                monthlyReview
            }
        })
    }

    function cancel(e) {
        e.preventDefault()
        navigator('/monthly-reviews')
    }

    function pageTitle() {
        const reviewDate = date ? new Date(`${date}T00:00:00`) : new Date()
        const month = reviewDate.toLocaleString('en-US', { month: 'long' })
        const year = reviewDate.getFullYear()

        return id
            ? <h2 className='text-center'>Update Monthly Review - {month} {year}</h2>
            : <h2 className='text-center'>Add Monthly Review - {month} {year}</h2>
    }

    function renderNumberField(label, name, value, setter, disabled = false) {
        return (
            <div className='form-group col-md-6 mb-2'>
                <label className='form-label'>{label}:</label>
                <input
                    type='number'
                    step='1.00'
                    placeholder={`Enter ${label}`}
                    name={name}
                    value={value}
                    disabled={disabled}
                    className={`form-control ${errors[name] ? 'is-invalid' : ''}`}
                    onChange={(e) => setter(e.target.value)}
                />
                {errors[name] && <div className='invalid-feedback'>{errors[name]}</div>}
            </div>
        )
    }

    return (
        <div className='container'>
            <br></br>
            <div className='row'>
                <div className='card col-lg-10 offset-lg-1'>
                    <div className='card-body pb-0'>
                        <button className='btn btn-link p-0 text-decoration-none' onClick={cancel}>X</button>
                    </div>
                    {pageTitle()}
                    <div className='card-body'>
                        {/* Month chooser is always visible */}
                        <div className='form-group col-12 mb-3'>
                            <label className='form-label'>Month:</label>
                            <div className='d-flex gap-2'>
                                <input
                                    type='month'
                                    className='form-control'
                                    value={date ? date.substring(0, 7) : new Date().toISOString().substring(0, 7)}
                                    onChange={(e) => {
                                        const monthValue = e.target.value // format YYYY-MM
                                        if (monthValue) {
                                            setDate(`${monthValue}-01`)
                                        }
                                    }}
                                />
                                {requiredMonth && !addAllowed && (
                                    <button
                                        className='btn btn-outline-secondary'
                                        onClick={(e) => {
                                            e.preventDefault()
                                            setDate(`${requiredMonth}-01`)
                                            setAddAllowed(true)
                                            setBlockedReason('')
                                        }}
                                    >Set to allowed month</button>
                                )}
                            </div>
                        </div>

                        {/* If adding and not allowed, show warning under the month chooser and hide the inputs */}
                        {(!id && !addAllowed) ? (
                            <div className='alert alert-warning'>
                                <h5>Cannot add this month</h5>
                                <p>{blockedReason}</p>
                                <div className='d-flex justify-content-end'>
                                    <button className='btn btn-secondary' onClick={cancel}>Back</button>
                                </div>
                            </div>
                        ) : (
                            <form>
                                <div className='row'>
                                    {renderNumberField('Kyle Income', 'kyleIncome', kyleIncome, setKyleIncome, (!addAllowed && !id))}
                                    {renderNumberField('Sarah Income', 'sarahIncome', sarahIncome, setSarahIncome, (!addAllowed && !id))}
                                    {renderNumberField('Misc Income', 'giftCardIncome', giftCardIncome, setGiftCardIncome, (!addAllowed && !id))}

                                    {/* empty column to the right of Misc Income so next two fields (withdrawals) share the following row */}
                                    <div className='form-group col-md-6 mb-2'></div>

                                    {renderNumberField('Brokerage Withdrawal', 'brokerageWithdrawal', brokerageWithdrawal, setBrokerageWithdrawal, (!addAllowed && !id))}
                                    {renderNumberField('HSA Withdrawal', 'hsaWithdrawal', hsaWithdrawal, setHsaWithdrawal, (!addAllowed && !id))}
                                    {renderNumberField('Total Bank (Last day of Month)', 'totalBank', totalBank, setTotalBank, (!addAllowed && !id))}
                                    {renderNumberField('Total Brokerage (Last day of Month)', 'totalBrokerage', totalBrokerage, setTotalBrokerage, (!addAllowed && !id))}

                                    <div className='form-group col-12 mb-2'>
                                        <label className='form-label'>Notes:</label>
                                        <textarea
                                            placeholder='Enter monthly review notes'
                                            name='notes'
                                            value={notes}
                                            className='form-control'
                                            onChange={(e) => setNotes(e.target.value)}
                                            disabled={(!addAllowed && !id)}
                                            rows='4'
                                        ></textarea>
                                    </div>

                                    <div className='col-12 d-flex justify-content-end'>
                                        <button className='btn btn-success' onClick={goToConfirmation} disabled={(!addAllowed && !id)}>Next</button>
                                    </div>
                                </div>
                            </form>
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}

export default MonthlyReviewComponent
