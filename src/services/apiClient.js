import axios from 'axios'
import { supabase } from '../supabaseClient.js'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8081/api'

const apiClient = axios.create({
    baseURL: API_BASE_URL
})

apiClient.interceptors.request.use(async (config) => {
    if (!supabase) {
        return config
    }

    const { data } = await supabase.auth.getSession()
    const accessToken = data.session?.access_token

    if (accessToken) {
        config.headers.Authorization = `Bearer ${accessToken}`
    }

    return config
})

export default apiClient
