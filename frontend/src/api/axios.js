import axios from 'axios'
import { useAuthStore } from '../store/authStore'

const api = axios.create({
    baseURL: import.meta.env.VITE_API_URL ?? 'http://localhost:8000',
})

api.interceptors.request.use((config) => {
    const token = useAuthStore.getState().token
    if (token) config.headers.Authorization = `Bearer ${token}`
    return config
})

api.interceptors.response.use(
    res => res,
    err => {
        if (!err.response) {
            // Server down atau tidak ada koneksi
            import('sonner').then(({ toast }) => {
                toast.error('Gagal terhubung ke server. Periksa koneksi atau pastikan server aktif.')
            })
        } else if (err.response?.status === 401) {
            useAuthStore.getState().logout()
            if (window.location.pathname !== '/login') {
                window.location.href = '/login'
            }
        }
        return Promise.reject(err)
    }
)

export default api