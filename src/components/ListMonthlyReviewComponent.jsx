import React, {useEffect, useState} from 'react'
import { deleteMonthlyReview, listMonthlyReviews } from '../services/MonthlyReviewService.js'
import { useNavigate } from 'react-router-dom'
import { formatCurrency } from '../utils/formatCurrency.js'

const ListMonthlyReviewComponent = () => {

    const [monthlyReviews, setMonthlyReviews] = useState([])

    const navigator = useNavigate();

    function getAllMonthlyReviews () {
        listMonthlyReviews().then((response) => {
            const reviews = Array.isArray(response.data) ? response.data.slice() : []
            // sort by date descending (newest first). dates are ISO-like (YYYY-MM-DD) so string compare works
            reviews.sort((a, b) => {
                const da = a.date ?? ''
                const db = b.date ?? ''
                if (da < db) return 1
                if (da > db) return -1
                return 0
            })
            setMonthlyReviews(reviews);
        }).catch(error => {
            console.error(error);
        })
    }

    function formatMonthYear(dateStr) {
        if (!dateStr) return '-'
        // Prefer simple parsing for ISO-like strings (YYYY-MM or YYYY-MM-DD)
        const parts = String(dateStr).split('-')
        if (parts.length >= 2) {
            const year = parts[0]
            const month = parts[1].padStart(2, '0')
            return `${month}/${year}`
        }

        // Fallback to Date parsing for other formats
        const d = new Date(`${dateStr}T00:00:00`)
        if (Number.isNaN(d.getTime())) return dateStr
        const monthNum = String(d.getMonth() + 1).padStart(2, '0')
        return `${monthNum}/${d.getFullYear()}`
    }

    useEffect(() => {
        getAllMonthlyReviews();
    }, [])

    function addNewMonthlyReview(){
        navigator('/add-monthly-review')
    }

    function updateMonthlyReviewEntry(review){
        navigator(`/edit-monthly-review/${review.id}`, { state: { review } })
    }

    function removeMonthlyReview(id){
        if (!window.confirm('Are you sure you want to delete this monthly review?')) {
            return
        }
        console.log(id);
        deleteMonthlyReview(id).then(() => {
            getAllMonthlyReviews();
        }).catch(error => {
            console.error(error);
        })
    }

  return (
    <div className='container'>
        
        <h2 className='text-center'>Monthly Reviews</h2>
        <button className='btn btn-primary mb-2' onClick={addNewMonthlyReview}>Add Monthly Review</button>
        <table className='table table-striped table-bordered'>
            <thead>
                <tr>
                    <th>Date</th>
                    <th>Total Income</th>
                    <th>Total Withdrawal</th>
                    <th>Total Bank</th>
                    <th>Total Brokerage</th>
                    <th>Tithing Paid</th>
                    <th>Total Invested</th>
                    <th>Notes</th>
                    <th>Actions</th>
                </tr>
            </thead>
            <tbody>
                {monthlyReviews.map((review) => {
                    const totalIncome = Number(review.kyleIncome ?? 0) + Number(review.sarahIncome ?? 0) + Number(review.giftCardIncome ?? 0)
                    const totalWithdrawal = Number(review.hsaWithdrawal ?? 0) + Number(review.brokerageWithdrawal ?? 0)

                    return (
                        <tr key={review.id}>
                            <td>{formatMonthYear(review.date)}</td>
                            <td>{formatCurrency(totalIncome)}</td>
                            <td>{formatCurrency(totalWithdrawal)}</td>
                            <td>{formatCurrency(review.totalBank ?? 0)}</td>
                            <td>{formatCurrency(review.totalBrokerage ?? 0)}</td>
                            <td>{formatCurrency(review.tithingPaid ?? 0)}</td>
                            <td>{formatCurrency(review.investedNontithed ?? 0)}</td>
                            <td>{review.notes}</td>
                            <td>
                                <button className='btn btn-info' onClick={() => updateMonthlyReviewEntry(review)}>Update</button>
                                <button className='btn btn-danger' onClick={() => removeMonthlyReview(review.id)} style={{marginLeft: '10px'}}>Delete</button>
                            </td>
                        </tr>
                    )
                })}
            </tbody>
        </table>
    </div>
  )
}

export default ListMonthlyReviewComponent
