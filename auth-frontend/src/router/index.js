/**
 * Archivo: src/router/index.js
 * Propósito: Configurar las rutas de la aplicación y proteger las que requieren autenticación
 * 
 * Vue Router permite:
 * - Definir qué componente se muestra en cada URL
 * - Proteger rutas con Guards de navegación
 * - Redirigir usuarios según su estado de autenticación
 */

import { createRouter, createWebHistory } from 'vue-router'
import authService from '../services/authService'

// Importar las vistas
import HomeView from '../views/HomeView.vue'
import LoginView from '../views/LoginView.vue'
import RegisterView from '../views/RegisterView.vue'
import ProfileView from '../views/ProfileView.vue'

/**
 * Definición de rutas
 * Cada ruta tiene:
 * - path: La URL
 * - name: Nombre único para referencias
 * - component: El componente Vue a mostrar
 * - meta: Información adicional (como si requiere autenticación)
 */
const routes = [
    {
        path: '/',
        name: 'Home',
        component: HomeView
    },
    {
        path: '/login',
        name: 'Login',
        component: LoginView,
        meta: {
            requiresGuest: true  // Solo accesible si NO está autenticado
        }
    },
    {
        path: '/register',
        name: 'Register',
        component: RegisterView,
        meta: {
            requiresGuest: true  // Solo accesible si NO está autenticado
        }
    },
    {
        path: '/profile',
        name: 'Profile',
        component: ProfileView,
        meta: {
            requiresAuth: true   // Solo accesible si ESTÁ autenticado
        }
    },
    // Ruta comodín: cualquier URL no definida redirige a Home
    {
        path: '/:pathMatch(.*)*',
        redirect: '/'
    }
]

// Crear la instancia del router
const router = createRouter({
    // createWebHistory: Usa URLs limpias (sin #)
    history: createWebHistory(),
    routes
})

/**
 * NAVIGATION GUARD: beforeEach
 * Se ejecuta ANTES de cada navegación
 * 
 * @param {Object} to - Ruta de destino
 * @param {Object} from - Ruta de origen
 * @param {Function} next - Función para continuar o redirigir
 */
router.beforeEach((to, from, next) => {
    // Verificar si el usuario está autenticado
    const isAuthenticated = authService.isAuthenticated()

    // Si la ruta requiere autenticación y el usuario NO está autenticado
    if (to.meta.requiresAuth && !isAuthenticated) {
        // Redirigir al login
        next({ name: 'Login' })
        return
    }

    // Si la ruta es solo para invitados y el usuario ESTÁ autenticado
    if (to.meta.requiresGuest && isAuthenticated) {
        // Redirigir al perfil
        next({ name: 'Profile' })
        return
    }

    // En cualquier otro caso, continuar normalmente
    next()
})

export default router
