<!--
  Archivo: src/App.vue
  Propósito: Componente raíz de la aplicación
  
  <router-view> es donde Vue Router renderiza el componente
  correspondiente a la ruta actual
-->
<template>
  <div id="app">
    <!-- Barra de navegación simple -->
    <nav class="navbar">
      <router-link to="/" class="brand">🏠 Mi App</router-link>
      
      <div class="nav-links">
        <router-link to="/">Inicio</router-link>
        
        <!-- Mostrar según estado de autenticación -->
        <template v-if="!isAuthenticated">
          <router-link to="/login">Login</router-link>
          <router-link to="/register">Registro</router-link>
        </template>
        
        <template v-else>
          <router-link to="/profile">Perfil</router-link>
          <a href="#" @click.prevent="logout">Salir</a>
        </template>
      </div>
    </nav>

    <!-- Aquí se renderizan las vistas según la ruta -->
    <main>
      <router-view />
    </main>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import authService from './services/authService'

const router = useRouter()

const isAuthenticated = computed(() => authService.isAuthenticated())

const logout = () => {
  authService.logout()
  router.push('/login')
}
</script>

<style>
/* Estilos globales */
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
  background-color: #f5f5f5;
}

#app {
  min-height: 100vh;
}

/* Navbar */
.navbar {
  background: white;
  padding: 16px 24px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.brand {
  font-size: 20px;
  font-weight: bold;
  text-decoration: none;
  color: #333;
}

.nav-links {
  display: flex;
  gap: 20px;
}

.nav-links a {
  text-decoration: none;
  color: #666;
  transition: color 0.3s;
}

.nav-links a:hover {
  color: #333;
}

.nav-links a.router-link-active {
  color: #667eea;
  font-weight: 500;
}

/* Main content */
main {
  /* El contenido principal no necesita estilos aquí */
  /* Cada vista define su propio contenedor */
}
</style>
