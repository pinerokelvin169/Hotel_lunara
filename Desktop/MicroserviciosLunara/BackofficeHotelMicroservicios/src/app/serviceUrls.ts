const normalizeBaseUrl = (value?: string) => value?.trim().replace(/\/+$/, '');

export const serviceUrls = {
  gateway: normalizeBaseUrl(import.meta.env.VITE_GATEWAY_URL) ?? 'https://localhost:44361',
  seguridad: normalizeBaseUrl(import.meta.env.VITE_SEGURIDAD_URL) ?? 'https://localhost:44366',
  reservas: normalizeBaseUrl(import.meta.env.VITE_RESERVAS_URL) ?? 'https://localhost:44375',
  facturacion: normalizeBaseUrl(import.meta.env.VITE_FACTURACION_URL) ?? 'https://localhost:44390',
  hospedaje: normalizeBaseUrl(import.meta.env.VITE_HOSPEDAJE_URL) ?? 'https://localhost:44321',
  alojamiento: normalizeBaseUrl(import.meta.env.VITE_ALOJAMIENTO_URL) ?? 'https://localhost:44394',
};

export function resolveInternalServiceBaseUrl(path: string) {
  if (path.startsWith('/api/v1/internal/auth') ||
      path.startsWith('/api/v1/internal/usuarios') ||
      path.startsWith('/api/v1/internal/roles') ||
      path.startsWith('/api/v1/internal/auditoria')) {
    return serviceUrls.seguridad;
  }

  if (path.startsWith('/api/v1/internal/clientes') ||
      path.startsWith('/api/v1/internal/reservas')) {
    return serviceUrls.reservas;
  }

  if (path.startsWith('/api/v1/internal/estadias') ||
      path.startsWith('/api/v1/internal/cargos-estadia')) {
    return serviceUrls.hospedaje;
  }

  if (path.startsWith('/api/v1/internal/pagos') ||
      path.startsWith('/api/v1/internal/facturas') ||
      path.startsWith('/api/v1/internal/valoraciones')) {
    return serviceUrls.facturacion;
  }

  if (path.startsWith('/api/v1/internal/sucursales') ||
      path.startsWith('/api/v1/internal/tipos-habitacion') ||
      path.startsWith('/api/v1/internal/habitaciones') ||
      path.startsWith('/api/v1/internal/tarifas') ||
      path.startsWith('/api/v1/internal/catalogo-servicios')) {
    return serviceUrls.alojamiento;
  }

  return serviceUrls.gateway;
}

export function resolvePublicServiceBaseUrl(path: string) {
  if (path.startsWith('/api/v1/auth') || path.startsWith('/api/v1/payments')) {
    return serviceUrls.gateway;
  }

  if (path.startsWith('/api/v1/accommodations')) {
    return serviceUrls.gateway;
  }

  if (path.startsWith('/api/v1/public/reservas') ||
      path.startsWith('/api/v1/accomodations/reservas')) {
    return serviceUrls.reservas;
  }

  if (path.startsWith('/api/v1/public/pagos') ||
      path.startsWith('/api/v1/public/valoraciones')) {
    return serviceUrls.facturacion;
  }

  if (path.startsWith('/api/v1/public/sucursales') ||
      path.startsWith('/api/v1/public/servicios') ||
      path.startsWith('/api/v1/public/habitaciones') ||
      path.startsWith('/api/v1/public/accommodations') ||
      path.startsWith('/api/v1/public/tipos-habitacion') ||
      path.startsWith('/api/v1/alojamientos')) {
    return serviceUrls.alojamiento;
  }

  return serviceUrls.gateway;
}

export const API_URL = serviceUrls.gateway;
