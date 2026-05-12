import axios from 'axios'

const REST_API_BASE_URL = 'http://localhost:8080/api/brokerage-totals'

export const listBrokerageTotals = () => axios.get(REST_API_BASE_URL)

export const createBrokerageTotal = (total) => axios.post(REST_API_BASE_URL, total)

export const getBrokerageTotal = (id) => axios.get(`${REST_API_BASE_URL}/${id}`)

export const updateBrokerageTotal = (id, total) => axios.put(`${REST_API_BASE_URL}/${id}`, total)

export const deleteBrokerageTotal = (id) => axios.delete(`${REST_API_BASE_URL}/${id}`)

