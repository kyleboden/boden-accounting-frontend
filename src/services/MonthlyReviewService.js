import apiClient from './apiClient.js'

const REST_API_BASE_URL = '/monthly-reviews'

export const listMonthlyReviews = () => apiClient.get(REST_API_BASE_URL)

export const createMonthlyReview = (monthlyReview) => apiClient.post(REST_API_BASE_URL, monthlyReview)

export const getMonthlyReview = (monthlyReviewId) => apiClient.get(REST_API_BASE_URL + '/' + monthlyReviewId)

export const updateMonthlyReview = (monthlyReviewId, monthlyReview) => apiClient.put(REST_API_BASE_URL + '/' + monthlyReviewId, monthlyReview)

export const deleteMonthlyReview = (monthlyReviewId) => apiClient.delete(REST_API_BASE_URL + '/' + monthlyReviewId)
