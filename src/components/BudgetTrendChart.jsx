const WIDTH = 600
const HEIGHT = 230
const LEFT = 42
const RIGHT = 14
const TOP = 14
const BOTTOM = 42

export default function BudgetTrendChart({ months, values, color = '#2563EB', currency = 'USD' }) {
    const max = Math.max(1, ...values)
    const chartWidth = WIDTH - LEFT - RIGHT
    const chartHeight = HEIGHT - TOP - BOTTOM
    const points = values.map((value, index) => ({
        x: LEFT + (months.length <= 1 ? chartWidth / 2 : index * chartWidth / (months.length - 1)),
        y: TOP + chartHeight - (value / max) * chartHeight,
        value,
    }))
    const path = points.map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`).join(' ')
    const money = (value) => new Intl.NumberFormat(undefined, { style: 'currency', currency, maximumFractionDigits: 0 }).format(value)

    return <div className="w-100" role="img" aria-label={`Monthly trend: ${months.map((month, index) => `${month}: ${money(values[index] || 0)}`).join(', ')}`}>
        <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} className="w-100" aria-hidden="true">
            {[0, 0.33, 0.66, 1].map((fraction) => {
                const y = TOP + chartHeight - fraction * chartHeight
                const value = max * fraction
                return <g key={fraction}>
                    <line x1={LEFT} x2={WIDTH - RIGHT} y1={y} y2={y} stroke="#E5E7EB" strokeDasharray="3 4" />
                    <text x={LEFT - 8} y={y + 4} textAnchor="end" fill="#6B7280" fontSize="10">{money(value)}</text>
                </g>
            })}
            <path d={path} fill="none" stroke={color} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
            {points.map((point, index) => <g key={months[index]}>
                <circle cx={point.x} cy={point.y} r="4" fill="white" stroke={color} strokeWidth="2"><title>{months[index]}: {money(point.value)}</title></circle>
                <text x={point.x} y={HEIGHT - 13} textAnchor="middle" fill="#6B7280" fontSize="10">{months[index]}</text>
            </g>)}
        </svg>
    </div>
}
