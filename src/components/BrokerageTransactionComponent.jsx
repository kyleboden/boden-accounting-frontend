import React, { useEffect, useState } from 'react'
import { createBrokerageTransaction, getBrokerageTransaction, updateBrokerageTransaction, listBrokerageTransactions } from '../services/BrokerageTransactionService.js'
import { useLocation, useNavigate, useParams } from 'react-router-dom'

const BrokerageTransactionComponent = () => {
    const { id } = useParams()
    const { state } = useLocation()
    const initialTransaction = state?.transaction && String(state.transaction.id) === String(id) ? state.transaction : null
    const navigator = useNavigate()
    const [errors, setErrors] = useState({})

    const [date, setDate] = useState(() => initialTransaction?.date ?? new Date().toISOString().substring(0, 10))
    const [type, setType] = useState(() => initialTransaction?.type ?? 'DEPOSIT')
    const [amount, setAmount] = useState(() => String(initialTransaction?.amount ?? ''))
    const [tithed, setTithed] = useState(() => Boolean(initialTransaction?.tithed ?? false))
    const [notes, setNotes] = useState(() => initialTransaction?.notes ?? '')

    useEffect(() => {
        if (!id) return

        getBrokerageTransaction(id).then((response) => {
            const tx = response.data
            setDate(tx.date ?? '')
            setType(tx.type ?? 'DEPOSIT')
            setAmount(String(tx.amount ?? ''))
            setTithed(Boolean(tx.tithed ?? false))
            setNotes(tx.notes ?? '')
            // ensure only latest-month transactions are editable
            listBrokerageTransactions().then((listRes) => {
                const items = Array.isArray(listRes.data) ? listRes.data.slice() : []
                items.sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0))
                const latest = items[0]?.date ? items[0].date.substring(0,7) : null
                const txMonth = tx.date ? tx.date.substring(0,7) : null
                if (latest && txMonth && latest !== txMonth) {
                    window.alert('Editing historical transactions is disabled. You can only edit transactions in the most recent month.')
                    navigator('/brokerage-transactions')
                }
            }).catch(() => {/* ignore */})
        }).catch((error) => {
            console.error(error)
        })
    }, [id, navigator])

    function validateForm() {
        const nextErrors = {}

        if (!date || !date.trim()) nextErrors.date = 'Date is required'
        if (!type) nextErrors.type = 'Type is required'
        if (amount === '' || Number.isNaN(Number(amount))) nextErrors.amount = 'Amount is required'

        setErrors(nextErrors)
        return Object.keys(nextErrors).length === 0
    }

    function saveOrUpdateTransaction(e) {
        e.preventDefault()

        if (!validateForm()) return

        // enforce only latest-month edits/creates (allow create if no transactions exist yet)
        listBrokerageTransactions().then((listRes) => {
            const items = Array.isArray(listRes.data) ? listRes.data.slice() : []
            items.sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0))
            const latest = items[0]?.date ? items[0].date.substring(0,7) : null
            const payloadMonth = date ? date.substring(0,7) : null
            const allowCreateWhenEmpty = items.length === 0
            // if (latest && payloadMonth && payloadMonth !== latest && !allowCreateWhenEmpty) {
            //     window.alert('You can only create or edit transactions in the most recent month.')
            //     return
            // }

            const payload = {
                date,
                type,
                amount: Number(amount),
                tithed,
                notes
            }

            const request = id ? updateBrokerageTransaction(id, payload) : createBrokerageTransaction(payload)

            request.then(() => {
                navigator('/brokerage-transactions')
            }).catch((error) => {
                console.error(error)
            })
        }).catch((err) => {
            console.error('Failed to validate latest month', err)
        })
    }

    function cancel(e) {
        e.preventDefault()
        navigator('/brokerage-transactions')
    }

    function pageTitle() {
        const reviewDate = date ? new Date(`${date}T00:00:00`) : new Date()
        const month = reviewDate.toLocaleString('en-US', { month: 'long' })
        const year = reviewDate.getFullYear()

        return id
            ? <h2 className='text-center'>Update Brokerage Transaction - {month} {year}</h2>
            : <h2 className='text-center'>Add Brokerage Transaction - {month} {year}</h2>
    }

    return (
        <div className='container'>
            <br />
            <div className='row'>
                <div className='card col-lg-8 offset-lg-2'>
                    <div className='card-body pb-0'>
                        <button className='btn btn-link p-0 text-decoration-none' onClick={cancel}>X</button>
                    </div>
                    {pageTitle()}
                    <div className='card-body'>
                        <form>
                            <div className='row'>
                                <div className='form-group col-md-6 mb-2'>
                                    <label className='form-label'>Date:</label>
                                    <input
                                        type='date'
                                        className={`form-control ${errors.date ? 'is-invalid' : ''}`}
                                        value={date}
                                        onChange={(e) => setDate(e.target.value)}
                                    />
                                    {errors.date && <div className='invalid-feedback'>{errors.date}</div>}
                                </div>

                                <div className='form-group col-md-6 mb-2'>
                                    <label className='form-label d-block'>Type:</label>
                                    <div className='form-check form-check-inline'>
                                        <input className='form-check-input' type='radio' id='type-deposit' name='type' value='DEPOSIT' checked={type === 'DEPOSIT'} onChange={() => setType('DEPOSIT')} />
                                        <label className='form-check-label' htmlFor='type-deposit'>Deposit</label>
                                    </div>
                                    <div className='form-check form-check-inline'>
                                        <input className='form-check-input' type='radio' id='type-withdrawal' name='type' value='WITHDRAWAL' checked={type === 'WITHDRAWAL'} onChange={() => setType('WITHDRAWAL')} />
                                        <label className='form-check-label' htmlFor='type-withdrawal'>Withdrawal</label>
                                    </div>
                                    {errors.type && <div className='invalid-feedback d-block'>{errors.type}</div>}
                                </div>

                                <div className='form-group col-md-6 mb-2'>
                                    <label className='form-label'>Amount:</label>
                                    <input
                                        type='number'
                                        step='0.01'
                                        placeholder='Enter amount'
                                        value={amount}
                                        className={`form-control ${errors.amount ? 'is-invalid' : ''}`}
                                        onChange={(e) => setAmount(e.target.value)}
                                    />
                                    {errors.amount && <div className='invalid-feedback'>{errors.amount}</div>}
                                </div>

                                <div className='form-group col-md-6 mb-2'>
                                    <label className='form-label d-block'>Tithed:</label>
                                    <div className='form-check'>
                                        <input className='form-check-input' type='checkbox' id='tithed' checked={tithed} onChange={(e) => setTithed(e.target.checked)} />
                                        <label className='form-check-label' htmlFor='tithed'>Tithed</label>
                                    </div>
                                </div>

                                <div className='form-group col-12 mb-2'>
                                    <label className='form-label'>Notes:</label>
                                    <textarea
                                        placeholder='Enter notes'
                                        name='notes'
                                        value={notes}
                                        className='form-control'
                                        onChange={(e) => setNotes(e.target.value)}
                                        rows='4'
                                    ></textarea>
                                </div>

                                <div className='col-12 d-flex justify-content-end'>
                                    <button className='btn btn-secondary me-2' onClick={cancel}>Cancel</button>
                                    <button className='btn btn-success' onClick={saveOrUpdateTransaction}>{id ? 'Update' : 'Create'}</button>
                                </div>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default BrokerageTransactionComponent

