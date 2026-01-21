/**
 * Archivo: src/services/api.js
 * Propósito: Configurar Axios como cliente HTTP para comunicarse con el backend
 * 
 * Este archivo centraliza la configuración de las peticiones HTTP.
 * Usamos interceptores para agregar automáticamente el token a cada petición.
 */

import axios from 'axios'

// Crear instancia de Axios con configuración base
// baseURL: Todas las peticiones usarán esta URL como prefijo
// Ejemplo: api.get('/auth/login') → GET http://localhost:3000/auth/login
const api = axios.create({
    baseURL: 'http://localhost:3000',
    headers: {
        'Content-Type': 'application/json'
    }
})

/**
 * INTERCEPTOR DE PETICIONES (Request Interceptor)
 * 
 * Se ejecuta ANTES de cada petición HTTP.
 * Aquí agregamos el token de autenticación si existe.
 */
api.interceptors.request.use(
    (config) => {
        // Buscar el token en localStorage
        const token = localStorage.getItem('access_token')

        // Si existe un token, agregarlo al header Authorization
        if (token) {
            config.headers.Authorization = `Bearer ${token}`
        }

        return config
    },
    (error) => {
        // Si hay un error en la configuración de la petición
        return Promise.reject(error)
    }
)

/**
 * INTERCEPTOR DE RESPUESTAS (Response Interceptor)
 * 
 * Se ejecuta DESPUÉS de recibir cada respuesta.
 * Útil para manejar errores globales como token expirado.
 */
api.interceptors.response.use(
    (response) => {
        // Si la respuesta es exitosa, simplemente la retornamos
        return response
    },
    (error) => {
        // Si el error es 401 (No autorizado), el token probablemente expiró
        if (error.response && error.response.status === 401) {
            // Limpiar el token inválido
            localStorage.removeItem('access_token')

            // Opcional: Redirigir al login
            // window.location.href = '/login'
        }

        return Promise.reject(error)
    }
)

// Exportar la instancia configurada para usar en toda la aplicación
export default api
