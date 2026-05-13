import React, { useMemo, useState } from 'react'
import { formatCurrency } from '../utils/formatCurrency.js'

const CHART_MODES = [
    { value: 'total-balance', label: 'Total brokerage balance' },
    { value: 'monthly-contributions', label: 'Monthly invested' },
    { value: 'balance-breakdown', label: 'Tithed vs non-tithed vs interest' },
    { value: 'interest-total', label: 'Interest total' },
    { value: 'interest-change', label: 'Interest increase month to month' }
]

const chartColors = {
    totalBalance: '#0d6efd',
    totalNet: '#0d6efd',
    tithed: '#198754',
    nonTithed: '#f0ad4e',
    interest: '#6f42c1',
    interestChange: '#20c997'
}

function formatMonthLabel(monthKey) {
    if (!monthKey) return '-'
    const [year, month] = String(monthKey).split('-')
    if (!year || !month) return monthKey
    return `${month}/${year.slice(-2)}`
}

function buildLinePath(points) {
    if (!points.length) return ''
    return points.map((point, idx) => `${idx === 0 ? 'M' : 'L'} ${point.x} ${point.y}`).join(' ')
}

function buildAreaPath(upperPoints, lowerPoints) {
    if (!upperPoints.length || !lowerPoints.length) return ''
    const forward = upperPoints.map((point, idx) => `${idx === 0 ? 'M' : 'L'} ${point.x} ${point.y}`).join(' ')
    const backward = lowerPoints.slice().reverse().map((point) => `L ${point.x} ${point.y}`).join(' ')
    return `${forward} ${backward} Z`
}

const BrokerageHistoryChartComponent = ({ monthlyData }) => {
    const [chartMode, setChartMode] = useState('total-balance')

    const chartConfig = useMemo(() => {
        if (!monthlyData.length) {
            return null
        }

        switch (chartMode) {
            case 'monthly-contributions':
                return {
                    title: 'Monthly invested',
                    subtitle: 'Net monthly contribution activity from brokerage transactions.',
                    type: 'bar',
                    series: [
                        { key: 'monthlyTithedNet', label: 'Tithed', color: chartColors.tithed },
                        { key: 'monthlyNonTithedNet', label: 'Non-tithed', color: chartColors.nonTithed },
                        { key: 'monthlyNetContribution', label: 'Net total', color: chartColors.totalNet }
                    ]
                }
            case 'balance-breakdown':
                return {
                    title: 'Brokerage balance breakdown',
                    subtitle: 'How the account total is composed over time.',
                    type: 'stacked-area',
                    series: [
                        { key: 'tithed', label: 'Tithed', color: chartColors.tithed },
                        { key: 'nonTithed', label: 'Non-tithed', color: chartColors.nonTithed },
                        { key: 'interest', label: 'Interest', color: chartColors.interest }
                    ]
                }
            case 'interest-total':
                return {
                    title: 'Interest total',
                    subtitle: 'Cumulative interest embedded in the brokerage balance.',
                    type: 'line',
                    series: [
                        { key: 'interest', label: 'Interest total', color: chartColors.interest }
                    ]
                }
            case 'interest-change':
                return {
                    title: 'Interest increase month to month',
                    subtitle: 'Month-over-month change in the interest portion of the balance.',
                    type: 'bar',
                    series: [
                        { key: 'monthlyInterestChange', label: 'Interest change', color: chartColors.interestChange }
                    ]
                }
            case 'total-balance':
            default:
                return {
                    title: 'Total brokerage balance',
                    subtitle: 'Authoritative monthly account total from reviews.',
                    type: 'line',
                    series: [
                        { key: 'totalBrokerage', label: 'Total balance', color: chartColors.totalBalance }
                    ]
                }
        }
    }, [chartMode, monthlyData])

    const chartGeometry = useMemo(() => {
        if (!chartConfig) return null

        const width = 900
        const height = 320
        const padding = { top: 20, right: 20, bottom: 42, left: 72 }
        const innerWidth = width - padding.left - padding.right
        const innerHeight = height - padding.top - padding.bottom
        const count = monthlyData.length
        const getX = (index) => {
            if (count <= 1) return padding.left + innerWidth / 2
            return padding.left + (index / (count - 1)) * innerWidth
        }

        let yMin = 0
        let yMax = 0

        if (chartConfig.type === 'stacked-area') {
            yMax = Math.max(...monthlyData.map((row) => (
                chartConfig.series.reduce((sum, series) => sum + Number(row[series.key] ?? 0), 0)
            )), 0)
        } else {
            const allValues = monthlyData.flatMap((row) => chartConfig.series.map((series) => Number(row[series.key] ?? 0)))
            yMin = Math.min(...allValues, 0)
            yMax = Math.max(...allValues, 0)
        }

        if (yMax === yMin) {
            if (yMax === 0) {
                yMax = 1
            } else if (yMax > 0) {
                yMin = 0
            } else {
                yMax = 0
            }
        }

        const yRange = yMax - yMin || 1
        const getY = (value) => padding.top + ((yMax - value) / yRange) * innerHeight
        const zeroY = getY(0)

        const ticks = Array.from({ length: 5 }, (_, idx) => {
            const value = yMin + (idx / 4) * yRange
            return {
                value,
                y: getY(value)
            }
        })

        return {
            width,
            height,
            padding,
            innerWidth,
            innerHeight,
            zeroY,
            ticks,
            getX,
            getY
        }
    }, [chartConfig, monthlyData])

    const latestRow = monthlyData[monthlyData.length - 1] ?? null

    if (!monthlyData.length) {
        return (
            <div className='card p-3 mb-4'>
                <div className='small text-muted'>Brokerage History</div>
                <div className='text-muted'>Add monthly reviews to populate the chart.</div>
            </div>
        )
    }

    const { width, height, padding, innerWidth, zeroY, ticks, getX, getY } = chartGeometry

    return (
        <div className='card p-3 mb-4'>
            <div className='d-flex flex-column flex-lg-row justify-content-between align-items-lg-start gap-3 mb-3'>
                <div>
                    <div className='small text-muted'>Brokerage History</div>
                    <h3 className='h5 mb-1'>{chartConfig.title}</h3>
                    <div className='text-muted small'>{chartConfig.subtitle}</div>
                </div>
                <div className='brokerage-chart-controls'>
                    <label className='form-label mb-1' htmlFor='brokerage-chart-mode'>Show</label>
                    <select
                        id='brokerage-chart-mode'
                        className='form-select'
                        value={chartMode}
                        onChange={(e) => setChartMode(e.target.value)}
                    >
                        {CHART_MODES.map((mode) => (
                            <option key={mode.value} value={mode.value}>{mode.label}</option>
                        ))}
                    </select>
                </div>
            </div>

            <div className='brokerage-chart-legend'>
                {chartConfig.series.map((series) => (
                    <div key={series.key} className='brokerage-chart-legend-item'>
                        <span className='brokerage-chart-swatch' style={{ backgroundColor: series.color }}></span>
                        <span>{series.label}</span>
                    </div>
                ))}
            </div>

            <div className='brokerage-chart-shell'>
                <svg viewBox={`0 0 ${width} ${height}`} className='brokerage-chart-svg' role='img' aria-label={chartConfig.title}>
                    {ticks.map((tick) => (
                        <g key={tick.value}>
                            <line
                                x1={padding.left}
                                y1={tick.y}
                                x2={padding.left + innerWidth}
                                y2={tick.y}
                                stroke='#e9ecef'
                                strokeWidth='1'
                            />
                            <text x={padding.left - 10} y={tick.y + 4} textAnchor='end' fontSize='11' fill='#6c757d'>
                                {formatCurrency(tick.value)}
                            </text>
                        </g>
                    ))}

                    <line
                        x1={padding.left}
                        y1={zeroY}
                        x2={padding.left + innerWidth}
                        y2={zeroY}
                        stroke='#adb5bd'
                        strokeWidth='1'
                    />

                    {monthlyData.map((row, idx) => (
                        <text
                            key={row.monthKey}
                            x={getX(idx)}
                            y={height - 14}
                            textAnchor='middle'
                            fontSize='11'
                            fill='#6c757d'
                        >
                            {formatMonthLabel(row.monthKey)}
                        </text>
                    ))}

                    {chartConfig.type === 'line' && chartConfig.series.map((series) => {
                        const points = monthlyData.map((row, idx) => ({
                            x: getX(idx),
                            y: getY(Number(row[series.key] ?? 0)),
                            value: Number(row[series.key] ?? 0)
                        }))

                        return (
                            <g key={series.key}>
                                <path
                                    d={buildLinePath(points)}
                                    fill='none'
                                    stroke={series.color}
                                    strokeWidth='3'
                                    strokeLinecap='round'
                                    strokeLinejoin='round'
                                />
                                {points.map((point, idx) => (
                                    <circle
                                        key={`${series.key}-${monthlyData[idx].monthKey}`}
                                        cx={point.x}
                                        cy={point.y}
                                        r='4'
                                        fill='white'
                                        stroke={series.color}
                                        strokeWidth='2'
                                    />
                                ))}
                            </g>
                        )
                    })}

                    {chartConfig.type === 'bar' && (() => {
                        const seriesCount = chartConfig.series.length
                        const slotWidth = monthlyData.length > 1 ? innerWidth / (monthlyData.length - 1) : innerWidth
                        const groupWidth = Math.min(54, slotWidth * 0.7)
                        const barWidth = Math.max(8, groupWidth / Math.max(seriesCount, 1) - 4)

                        return chartConfig.series.map((series, seriesIdx) => (
                            <g key={series.key}>
                                {monthlyData.map((row, idx) => {
                                    const value = Number(row[series.key] ?? 0)
                                    const xCenter = getX(idx)
                                    const groupStart = xCenter - groupWidth / 2
                                    const x = groupStart + (seriesIdx * (barWidth + 4))
                                    const y = value >= 0 ? getY(value) : zeroY
                                    const barHeight = Math.abs(getY(value) - zeroY)

                                    return (
                                        <rect
                                            key={`${series.key}-${row.monthKey}`}
                                            x={x}
                                            y={y}
                                            width={barWidth}
                                            height={Math.max(barHeight, 1)}
                                            fill={series.color}
                                            rx='3'
                                        />
                                    )
                                })}
                            </g>
                        ))
                    })()}

                    {chartConfig.type === 'stacked-area' && (() => {
                        let runningTotals = monthlyData.map(() => 0)

                        return chartConfig.series.map((series) => {
                            const upperPoints = monthlyData.map((row, idx) => {
                                const nextValue = runningTotals[idx] + Number(row[series.key] ?? 0)
                                return {
                                    x: getX(idx),
                                    y: getY(nextValue)
                                }
                            })

                            const lowerPoints = monthlyData.map((row, idx) => ({
                                x: getX(idx),
                                y: getY(runningTotals[idx])
                            }))

                            runningTotals = monthlyData.map((row, idx) => runningTotals[idx] + Number(row[series.key] ?? 0))

                            return (
                                <g key={series.key}>
                                    <path
                                        d={buildAreaPath(upperPoints, lowerPoints)}
                                        fill={series.color}
                                        fillOpacity='0.22'
                                        stroke='none'
                                    />
                                    <path
                                        d={buildLinePath(upperPoints)}
                                        fill='none'
                                        stroke={series.color}
                                        strokeWidth='2.5'
                                    />
                                </g>
                            )
                        })
                    })()}
                </svg>
            </div>

            <div className='brokerage-chart-metrics'>
                <div className='brokerage-chart-metric'>
                    <div className='brokerage-chart-metric-label'>Latest month</div>
                    <div className='brokerage-chart-metric-value'>{formatMonthLabel(latestRow?.monthKey)}</div>
                </div>
                {chartConfig.series.map((series) => (
                    <div key={series.key} className='brokerage-chart-metric'>
                        <div className='brokerage-chart-metric-label'>{series.label}</div>
                        <div className='brokerage-chart-metric-value'>{formatCurrency(latestRow?.[series.key] ?? 0)}</div>
                    </div>
                ))}
            </div>
        </div>
    )
}

export default BrokerageHistoryChartComponent
