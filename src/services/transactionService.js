import apiClient from './apiClient.js'

const inFlightRequests = new Map()
let refreshPlaidOnFirstRequest = true

export function getTransactions(range) {
    const key = `${range.from}:${range.to}`
    const existingRequest = inFlightRequests.get(key)
    if (existingRequest) return existingRequest

    const refresh = refreshPlaidOnFirstRequest
    refreshPlaidOnFirstRequest = false
    const request = apiClient.get('/plaid/transactions', { params: { ...range, refresh } })
        .then(({ data }) => data)
        .catch((error) => {
            if (refresh) refreshPlaidOnFirstRequest = true
            throw error
        })
        .finally(() => inFlightRequests.delete(key))
    inFlightRequests.set(key, request)
    return request
}
