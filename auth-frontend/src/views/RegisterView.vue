<!--
  Archivo: src/views/RegisterView.vue
  Propósito: Página de registro para nuevos usuarios
  
  Funcionalidad:
  - Formulario con nombre, email y password
  - Confirmación de contraseña
  - Validación de que las contraseñas coincidan
  - Envío de datos al backend para crear cuenta
  - Redirección a login después de registro exitoso
-->
<template>
  <div class="register-container">
    <div class="register-card">
      <h1>Crear Cuenta</h1>
      
      <!-- Mensaje de éxito -->
      <div v-if="successMessage" class="success-message">
        {{ successMessage }}
      </div>
      
      <!-- Mensaje de error -->
      <div v-if="errorMessage" class="error-message">
        {{ errorMessage }}
      </div>

      <form @submit.prevent="handleRegister">
        
        <!-- Campo de nombre -->
        <div class="form-group">
          <label for="name">Nombre Completo</label>
          <input
            id="name"
            v-model="name"
            type="text"
            placeholder="Tu nombre"
            required
            :disabled="isLoading"
          />
        </div>

        <!-- Campo de email -->
        <div class="form-group">
          <label for="email">Correo Electrónico</label>
          <input
            id="email"
            v-model="email"
            type="email"
            placeholder="correo@ejemplo.com"
            required
            :disabled="isLoading"
          />
        </div>

        <!-- Campo de contraseña -->
        <div class="form-group">
          <label for="password">Contraseña</label>
          <input
            id="password"
            v-model="password"
            type="password"
            placeholder="Mínimo 6 caracteres"
            required
            minlength="6"
            :disabled="isLoading"
          />
        </div>

        <!-- Campo de confirmar contraseña -->
        <div class="form-group">
          <label for="confirmPassword">Confirmar Contraseña</label>
          <input
            id="confirmPassword"
            v-model="confirmPassword"
            type="password"
            placeholder="Repite tu contraseña"
            required
            :disabled="isLoading"
          />
          <!-- Mensaje de validación de contraseñas -->
          <span v-if="confirmPassword && password !== confirmPassword" class="validation-error">
            Las contraseñas no coinciden
          </span>
        </div>

        <!-- Botón de submit -->
        <button 
          type="submit" 
          :disabled="isLoading || (confirmPassword && password !== confirmPassword)"
          class="btn-primary"
        >
          {{ isLoading ? 'Creando cuenta...' : 'Crear Cuenta' }}
        </button>
      </form>

      <!-- Link para ir a login -->
      <p class="login-link">
        ¿Ya tienes cuenta? 
        <router-link to="/login">Inicia sesión aquí</router-link>
      </p>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import authService from '../services/authService'

const router = useRouter()

// Variables reactivas del formulario
const name = ref('')
const email = ref('')
const password = ref('')
const confirmPassword = ref('')
const errorMessage = ref('')
const successMessage = ref('')
const isLoading = ref(false)

/**
 * Manejar el registro de nuevo usuario
 */
const handleRegister = async () => {
  // Validar que las contraseñas coincidan
  if (password.value !== confirmPassword.value) {
    errorMessage.value = 'Las contraseñas no coinciden'
    return
  }

  // Limpiar mensajes
  errorMessage.value = ''
  successMessage.value = ''
  isLoading.value = true

  try {
    // Intentar registrar al usuario
    await authService.register({
      name: name.value,
      email: email.value,
      password: password.value
    })

    // Registro exitoso
    successMessage.value = '¡Cuenta creada exitosamente! Redirigiendo al login...'
    
    // Esperar 2 segundos y redirigir al login
    setTimeout(() => {
      router.push('/login')
    }, 2000)

  } catch (error) {
    errorMessage.value = error.message || 'Error al crear la cuenta'
  } finally {
    isLoading.value = false
  }
}
</script>

<style scoped>
/* Los estilos son similares al login, con algunas adiciones */

.register-container {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: #f5f5f5;
  padding: 20px;
}

.register-card {
  background: white;
  padding: 40px;
  border-radius: 8px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
  width: 100%;
  max-width: 400px;
}

h1 {
  margin-bottom: 24px;
  text-align: center;
  color: #333;
  font-size: 24px;
}

.form-group {
  margin-bottom: 20px;
}

label {
  display: block;
  margin-bottom: 8px;
  color: #555;
  font-size: 14px;
  font-weight: 500;
}

input {
  width: 100%;
  padding: 12px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 16px;
  transition: border-color 0.3s;
  box-sizing: border-box;
}

input:focus {
  outline: none;
  border-color: #2196F3;
}

input:disabled {
  background-color: #f5f5f5;
  cursor: not-allowed;
}

.btn-primary {
  width: 100%;
  padding: 14px;
  background-color: #2196F3;
  color: white;
  border: none;
  border-radius: 4px;
  font-size: 16px;
  cursor: pointer;
  transition: background-color 0.3s;
}

.btn-primary:hover:not(:disabled) {
  background-color: #1976D2;
}

.btn-primary:disabled {
  background-color: #cccccc;
  cursor: not-allowed;
}

.error-message {
  background-color: #ffebee;
  color: #c62828;
  padding: 12px;
  border-radius: 4px;
  margin-bottom: 20px;
  font-size: 14px;
  text-align: center;
}

.success-message {
  background-color: #e8f5e9;
  color: #2e7d32;
  padding: 12px;
  border-radius: 4px;
  margin-bottom: 20px;
  font-size: 14px;
  text-align: center;
}

.validation-error {
  color: #c62828;
  font-size: 12px;
  margin-top: 4px;
  display: block;
}

.login-link {
  text-align: center;
  margin-top: 20px;
  color: #666;
  font-size: 14px;
}

.login-link a {
  color: #2196F3;
  text-decoration: none;
}

.login-link a:hover {
  text-decoration: underline;
}
</style>
