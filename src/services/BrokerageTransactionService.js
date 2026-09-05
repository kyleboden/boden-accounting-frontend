import apiClient from './apiClient.js'

const REST_API_BASE_URL = '/brokerage-transactions'

export const listBrokerageTransactions = () => apiClient.get(REST_API_BASE_URL)

export const createBrokerageTransaction = (transaction) => apiClient.post(REST_API_BASE_URL, transaction)

export const getBrokerageTransaction = (transactionId) => apiClient.get(`${REST_API_BASE_URL}/${transactionId}`)

export const updateBrokerageTransaction = (transactionId, transaction) => apiClient.put(`${REST_API_BASE_URL}/${transactionId}`, transaction)

export const deleteBrokerageTransaction = (transactionId) => apiClient.delete(`${REST_API_BASE_URL}/${transactionId}`)
