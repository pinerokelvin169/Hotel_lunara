<!--
  Archivo: src/views/ProfileView.vue
  Propósito: Página de perfil del usuario autenticado
  
  Esta página solo es accesible para usuarios autenticados.
  Muestra los datos del usuario obtenidos del endpoint protegido /auth/profile
-->
<template>
  <div class="profile-container">
    <div class="profile-card">
      <h1>Mi Perfil</h1>
      
      <!-- Estado de carga -->
      <div v-if="isLoading" class="loading">
        Cargando información del perfil...
      </div>

      <!-- Mensaje de error -->
      <div v-else-if="errorMessage" class="error-message">
        {{ errorMessage }}
      </div>

      <!-- Contenido del perfil (solo si hay datos) -->
      <div v-else-if="user" class="profile-content">
        
        <!-- Avatar simple con inicial -->
        <div class="avatar">
          {{ getInitial(user.nombre) }}
        </div>
        <!-- Información del usuario -->
        <div class="user-info">
          <div class="info-item">
            <span class="label">Nombre:</span>
            <span class="value">{{ user.nombre }}</span>
          </div>
          
          <div class="info-item">
            <span class="label">Email:</span>
            <span class="value">{{ user.email }}</span>
          </div>
          
          <div class="info-item">
            <span class="label">ID de Usuario:</span>
            <span class="value">{{ user.sub || user.userId }}</span>
          </div>
        </div>

        <!-- Botón de cerrar sesión -->
        <button @click="handleLogout" class="btn-logout">
          Cerrar Sesión
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import authService from '../services/authService'

const router = useRouter()

// Variables reactivas
const user = ref(null)
const isLoading = ref(true)
const errorMessage = ref('')

/**
 * Obtener la inicial del nombre para el avatar
 * @param {string} name - Nombre del usuario
 * @returns {string} - Primera letra en mayúscula
 */
const getInitial = (name) => {
  return name ? name.charAt(0).toUpperCase() : '?'
}

/**
 * Cargar los datos del perfil al montar el componente
 */
const loadProfile = async () => {
  try {
    // Llamar al endpoint protegido /auth/profile
    const profileData = await authService.getProfile()
    user.value = profileData.user;
  } catch (error) {
    errorMessage.value = 'No se pudo cargar el perfil. Por favor, inicia sesión nuevamente.'
    
    // Si hay error de autenticación, redirigir al login después de 2 segundos
    setTimeout(() => {
      authService.logout()
      router.push('/login')
    }, 2000)
  } finally {
    isLoading.value = false
  }
}

/**
 * Cerrar sesión
 */
const handleLogout = () => {
  authService.logout()
  router.push('/login')
}

/**
 * onMounted: Hook del ciclo de vida
 * Se ejecuta cuando el componente se monta en el DOM
 */
onMounted(() => {
  loadProfile()
})
</script>

<style scoped>
.profile-container {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: #f5f5f5;
  padding: 20px;
}

.profile-card {
  background: white;
  padding: 40px;
  border-radius: 8px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
  width: 100%;
  max-width: 500px;
  text-align: center;
}

h1 {
  margin-bottom: 30px;
  color: #333;
}

.loading {
  color: #666;
  padding: 40px 0;
}

.error-message {
  background-color: #ffebee;
  color: #c62828;
  padding: 12px;
  border-radius: 4px;
  margin-bottom: 20px;
}

.avatar {
  /* Círculo con la inicial del usuario */
  width: 80px;
  height: 80px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 24px;
  color: white;
  font-size: 36px;
  font-weight: bold;
}

.user-info {
  text-align: left;
  margin-bottom: 30px;
}

.info-item {
  padding: 16px;
  border-bottom: 1px solid #eee;
}

.info-item:last-child {
  border-bottom: none;
}

.label {
  display: block;
  color: #888;
  font-size: 12px;
  text-transform: uppercase;
  margin-bottom: 4px;
}

.value {
  color: #333;
  font-size: 16px;
}

.btn-logout {
  width: 100%;
  padding: 14px;
  background-color: #ff5722;
  color: white;
  border: none;
  border-radius: 4px;
  font-size: 16px;
  cursor: pointer;
  transition: background-color 0.3s;
}

.btn-logout:hover {
  background-color: #e64a19;
}
</style>
