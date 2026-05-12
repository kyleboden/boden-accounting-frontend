import React, { useEffect, useState } from 'react'
import { getMonthlyReview } from '../services/MonthlyReviewService.js'
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
    const [investedNontithed, setInvestedNontithed] = useState(() => String(initialReview?.investedNontithed ?? ''))
    const [date, setDate] = useState(() => initialReview?.date ?? new Date().toISOString().substring(0, 10))
    const [notes, setNotes] = useState(() => initialReview?.notes ?? '')

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
            setInvestedNontithed(String(review.investedNontithed ?? ''))
            setDate(review.date ?? '')
            setNotes(review.notes ?? '')
        }).catch((error) => {
            console.error(error)
        })
    }, [id])

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

    function renderNumberField(label, name, value, setter) {
        return (
            <div className='form-group col-md-6 mb-2'>
                <label className='form-label'>{label}:</label>
                <input
                    type='number'
                    step='1.00'
                    placeholder={`Enter ${label}`}
                    name={name}
                    value={value}
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
                        {/* simple month picker so user can adjust month/year without changing layout */}
                        <div className='form-group col-12 mb-3'>
                            <label className='form-label'>Month:</label>
                            <input
                                type='month'
                                className='form-control'
                                value={date ? date.substring(0, 7) : new Date().toISOString().substring(0, 7)}
                                onChange={(e) => {
                                    // keep date as YYYY-MM-DD (set to first of month)
                                    const monthValue = e.target.value // format YYYY-MM
                                    if (monthValue) {
                                        setDate(`${monthValue}-01`)
                                    }
                                }}
                            />
                        </div>

                        <form>
                            <div className='row'>
                                {renderNumberField('Kyle Income', 'kyleIncome', kyleIncome, setKyleIncome)}
                                {renderNumberField('Sarah Income', 'sarahIncome', sarahIncome, setSarahIncome)}
                                {renderNumberField('Misc Income', 'giftCardIncome', giftCardIncome, setGiftCardIncome)}

                                {/* empty column to the right of Misc Income so next two fields (withdrawals) share the following row */}
                                <div className='form-group col-md-6 mb-2'></div>

                                {renderNumberField('Brokerage Withdrawal', 'brokerageWithdrawal', brokerageWithdrawal, setBrokerageWithdrawal)}
                                {renderNumberField('HSA Withdrawal', 'hsaWithdrawal', hsaWithdrawal, setHsaWithdrawal)}
                                {renderNumberField('Total Bank (Last day of Month)', 'totalBank', totalBank, setTotalBank)}
                                {renderNumberField('Total Brokerage (Last day of Month)', 'totalBrokerage', totalBrokerage, setTotalBrokerage)}

                                <div className='form-group col-12 mb-2'>
                                    <label className='form-label'>Notes:</label>
                                    <textarea
                                        placeholder='Enter monthly review notes'
                                        name='notes'
                                        value={notes}
                                        className='form-control'
                                        onChange={(e) => setNotes(e.target.value)}
                                        rows='4'
                                    ></textarea>
                                </div>

                                <div className='col-12 d-flex justify-content-end'>
                                    <button className='btn btn-success' onClick={goToConfirmation}>Next</button>
                                </div>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default MonthlyReviewComponent
