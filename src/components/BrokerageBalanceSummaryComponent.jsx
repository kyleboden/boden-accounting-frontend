import React from 'react'
import { formatCurrency } from '../utils/formatCurrency.js'

const BrokerageBalanceSummaryComponent = ({
    grossBalance,
    postTithingBalance,
    alreadyTithed,
    nonTithedInvestments,
    interest
}) => {
    return (
        <>
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

            <div className='card mb-4 p-3'>
                <div className='mb-2 small text-muted'>Balance Breakdown</div>
                <div style={{ display: 'flex', height: '40px', width: '100%', borderRadius: '4px', overflow: 'hidden' }}>
                    {grossBalance > 0 ? (
                        <>
                            <div style={{ backgroundColor: '#00b050', width: `${(alreadyTithed / grossBalance) * 100}%`, minWidth: '1px' }} title={`Already Tithed: ${formatCurrency(alreadyTithed)}`} />
                            <div style={{ backgroundColor: '#f0ad4e', width: `${(nonTithedInvestments / grossBalance) * 100}%`, minWidth: '1px' }} title={`Non-Tithed Investments: ${formatCurrency(nonTithedInvestments)}`} />
                            <div style={{ backgroundColor: '#5bc0de', width: `${(interest / grossBalance) * 100}%`, minWidth: '1px' }} title={`Interest: ${formatCurrency(interest)}`} />
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
                        <div>Non-Tithed Investments: {formatCurrency(nonTithedInvestments)}</div>
                    </div>
                    <div className='d-flex align-items-center'>
                        <div style={{ width: '16px', height: '12px', backgroundColor: '#5bc0de', marginRight: '8px' }}></div>
                        <div>Interest: {formatCurrency(interest)}</div>
                    </div>
                </div>
            </div>
        </>
    )
}

export default BrokerageBalanceSummaryComponent
