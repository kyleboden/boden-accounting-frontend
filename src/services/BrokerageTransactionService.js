import axios from 'axios'

const REST_API_BASE_URL = 'http://localhost:8080/api/brokerage-transactions'

export const listBrokerageTransactions = () => axios.get(REST_API_BASE_URL)

export const createBrokerageTransaction = (transaction) => axios.post(REST_API_BASE_URL, transaction)

export const getBrokerageTransaction = (transactionId) => axios.get(`${REST_API_BASE_URL}/${transactionId}`)

export const updateBrokerageTransaction = (transactionId, transaction) => axios.put(`${REST_API_BASE_URL}/${transactionId}`, transaction)

export const deleteBrokerageTransaction = (transactionId) => axios.delete(`${REST_API_BASE_URL}/${transactionId}`)

