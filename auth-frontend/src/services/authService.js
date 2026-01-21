/**
 * Archivo: src/services/authService.js
 * Propósito: Centralizar todas las operaciones relacionadas con autenticación
 * 
 * Este servicio encapsula:
 * - Login de usuarios
 * - Registro de nuevos usuarios
 * - Obtener perfil del usuario autenticado
 * - Logout
 */

import api from './api'

/**
 * Servicio de Autenticación
 * Contiene todos los métodos para manejar la autenticación de usuarios
 */
const authService = {

    /**
     * Registrar un nuevo usuario
     * @param {Object} userData - Datos del usuario {email, password, name}
     * @returns {Promise} - Promesa con la respuesta del servidor
     */
    async register(userData) {
        console.log(userData);
        try {
            const response = await api.post('/auth/register', userData)
            return response.data
        } catch (error) {
            // Re-lanzar el error para manejarlo en el componente
            throw error.response?.data || { message: 'Error de conexión' }
        }
    },

    /**
     * Iniciar sesión
     * @param {Object} credentials - Credenciales {email, password}
     * @returns {Promise} - Promesa con el token de acceso
     */
    async login(credentials) {
        try {
            const response = await api.post('/auth/login', credentials)

            // Si el login es exitoso, guardar el token
            if (response.data.access_token) {
                localStorage.setItem('access_token', response.data.access_token)
            }

            return response.data
        } catch (error) {
            throw error.response?.data || { message: 'Error de conexión' }
        }
    },

    /**
     * Obtener el perfil del usuario autenticado
     * @returns {Promise} - Promesa con los datos del usuario
     */
    async getProfile() {
        try {
            const response = await api.get('/auth/profile')
            return response.data
        } catch (error) {
            throw error.response?.data || { message: 'Error al obtener perfil' }
        }
    },

    /**
     * Cerrar sesión
     * Elimina el token del almacenamiento local
     */
    logout() {
        localStorage.removeItem('access_token')
    },

    /**
     * Verificar si hay un usuario autenticado
     * @returns {boolean} - true si existe un token guardado
     */
    isAuthenticated() {
        return !!localStorage.getItem('access_token')
    },

    /**
     * Obtener el token actual
     * @returns {string|null} - El token o null si no existe
     */
    getToken() {
        return localStorage.getItem('access_token')
    }
}

export default authService
