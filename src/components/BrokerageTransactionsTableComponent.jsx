import React from 'react'
import { formatCurrency } from '../utils/formatCurrency.js'

const BrokerageTransactionsTableComponent = ({
    transactions,
    formatDayMonthYear,
    onAddTransaction,
    onUpdateTransaction,
    onDeleteTransaction
}) => {
    return (
        <>
            <hr />

            <h2 className='text-center'>Brokerage Transactions</h2>
            <div className='mb-2'>
                <button className='btn btn-primary' onClick={onAddTransaction}>Add Transaction</button>
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
                    {transactions.map((tx) => (
                        <tr key={tx.id}>
                            <td>{formatDayMonthYear(tx.date)}</td>
                            <td>{tx.type}</td>
                            <td>{formatCurrency(tx.amount ?? 0)}</td>
                            <td>{tx.tithed ? 'Yes' : 'No'}</td>
                            <td>{tx.notes}</td>
                            <td>
                                <button className='btn btn-info' onClick={() => onUpdateTransaction(tx)}>Update</button>
                                <button className='btn btn-danger' style={{ marginLeft: '10px' }} onClick={() => onDeleteTransaction(tx.id)}>Delete</button>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </>
    )
}

export default BrokerageTransactionsTableComponent
