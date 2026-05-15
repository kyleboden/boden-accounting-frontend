import axios from "axios";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8081/api';
const REST_API_BASE_URL = `${API_BASE_URL}/monthly-reviews`;

export const listMonthlyReviews = () => axios.get(REST_API_BASE_URL);

export const createMonthlyReview = (monthlyReview) => axios.post(REST_API_BASE_URL, monthlyReview);

export const getMonthlyReview = (monthlyReviewId) => axios.get(REST_API_BASE_URL + '/' + monthlyReviewId);

export const updateMonthlyReview = (monthlyReviewId, monthlyReview) => axios.put(REST_API_BASE_URL + '/' + monthlyReviewId,monthlyReview);

export const deleteMonthlyReview = (monthlyReviewId) => axios.delete(REST_API_BASE_URL + '/' + monthlyReviewId);
