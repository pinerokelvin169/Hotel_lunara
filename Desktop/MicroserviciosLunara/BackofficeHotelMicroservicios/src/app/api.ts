import axios from 'axios';
import type { ApiEnvelope, ApiErrorPayload, AuthUser, LoginPayload, PagedResponse } from './types';
import { API_URL, resolveInternalServiceBaseUrl } from './serviceUrls';

export class ApiError extends Error {
  details: string[];

  constructor(message: string, details: string[] = []) {
    super(message);
    this.name = 'ApiError';
    this.details = details;
  }
}

const http = axios.create({
  headers: {
    'Content-Type': 'application/json',
  },
});

const authStorageKey = 'hotel-backoffice-auth';

http.interceptors.request.use((config) => {
  const raw = localStorage.getItem(authStorageKey);
  if (!raw) {
    return config;
  }

  try {
    const parsed = JSON.parse(raw) as { accessToken?: string };
    const token = String(parsed.accessToken ?? '').trim();
    if (token) {
      config.headers = config.headers ?? {};
      config.headers.Authorization = `Bearer ${token}`;
    }
  } catch {
    localStorage.removeItem(authStorageKey);
  }

  return config;
});

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function toPascalCaseKey(key: string) {
  if (!key) return key;
  return key.charAt(0).toUpperCase() + key.slice(1);
}

function normalizeApiShape<T>(value: T): T {
  if (Array.isArray(value)) {
    return value.map((item) => normalizeApiShape(item)) as T;
  }

  if (!isPlainObject(value)) {
    return value;
  }

  return Object.entries(value).reduce<Record<string, unknown>>((accumulator, [key, item]) => {
    accumulator[toPascalCaseKey(key)] = normalizeApiShape(item);
    return accumulator;
  }, {}) as T;
}

export function setAuthToken(token: string | null) {
  if (token) {
    http.defaults.headers.common.Authorization = `Bearer ${token}`;
  } else {
    delete http.defaults.headers.common.Authorization;
  }
}

function parseError(error: unknown): ApiError {
  if (axios.isAxiosError<ApiErrorPayload>(error)) {
    if (!error.response) {
      return new ApiError('No fue posible conectarse con la API.');
    }

    const responseData = error.response.data as unknown;
    const payload = isPlainObject(responseData) ? (responseData as ApiErrorPayload) : undefined;
    const rawErrors = payload?.details ?? payload?.errors ?? [];
    const details: string[] = [];
    const pushUniqueDetail = (value: unknown) => {
      const text = String(value ?? '').trim();
      if (!text || details.includes(text)) {
        return;
      }

      details.push(text);
    };

    if (Array.isArray(rawErrors)) {
      rawErrors.forEach((item) => pushUniqueDetail(item));
    } else if (rawErrors && typeof rawErrors === 'object') {
      for (const [field, value] of Object.entries(rawErrors)) {
        if (Array.isArray(value)) {
          value.forEach((item) => pushUniqueDetail(`${field}: ${String(item)}`));
          continue;
        }

        pushUniqueDetail(`${field}: ${String(value)}`);
      }
    }

    if (payload?.title) {
      pushUniqueDetail(payload.title);
    }

    if (payload?.detail) {
      pushUniqueDetail(payload.detail);
    }

    if (payload?.downstreamPath) {
      pushUniqueDetail(`Ruta downstream: ${payload.downstreamPath}`);
    }

    if (payload?.downstreamBaseUrl) {
      pushUniqueDetail(`Servicio downstream: ${payload.downstreamBaseUrl}`);
    }

    if (payload?.statusCode) {
      pushUniqueDetail(`HTTP downstream: ${payload.statusCode}`);
    }

    if (error.response.status) {
      pushUniqueDetail(`HTTP gateway: ${error.response.status}`);
    }

    const requestUrl = String(error.config?.url ?? '').trim();
    if (requestUrl) {
      pushUniqueDetail(`Ruta gateway: ${requestUrl}`);
    }

    const knownKeys = new Set([
      'success',
      'message',
      'error',
      'title',
      'detail',
      'details',
      'errors',
      'downstreamBaseUrl',
      'downstreamPath',
      'statusCode',
      'traceId',
      'timestamp',
      'status',
      'type',
    ]);

    if (payload && isPlainObject(payload)) {
      const extraEntries = Object.entries(payload).filter(([key, value]) => !knownKeys.has(key) && value !== undefined);
      if (extraEntries.length > 0) {
        pushUniqueDetail(`Respuesta backend: ${JSON.stringify(Object.fromEntries(extraEntries))}`);
      }
    } else if (typeof responseData === 'string' && responseData.trim()) {
      pushUniqueDetail(`Respuesta backend: ${responseData.trim()}`);
    }

    if (details.length === 0 && error.response.status >= 500) {
      pushUniqueDetail('El servicio devolvio un error interno sin detalles adicionales.');
    }

    const message = String(payload?.message ?? payload?.error ?? error.message ?? 'No fue posible completar la solicitud.');
    return new ApiError(message, details);
  }

  if (error instanceof ApiError) return error;
  if (error instanceof Error) return new ApiError(error.message);

  return new ApiError('No fue posible completar la solicitud.');
}

export function getApiErrorMessage(error: unknown) {
  return parseError(error).message;
}

export function getApiErrorDetails(error: unknown) {
  return parseError(error).details;
}

function getEnvelopeData<T>(payload: unknown): T {
  if (isPlainObject(payload) && 'data' in payload) {
    return normalizeApiShape((payload as { data: T }).data);
  }

  const normalized = normalizeApiShape(payload as T);
  if (isPlainObject(normalized) && 'Data' in normalized) {
    return normalized.Data as T;
  }

  return normalized;
}

function toPagedMetadata(metadata: Record<string, unknown>, page: number, limit: number) {
  const currentPage = Number(
    metadata.pagina_actual ??
    metadata.Pagina_actual ??
    metadata.paginaActual ??
    metadata.PaginaActual ??
    page,
  );
  const totalPages = Number(
    metadata.total_paginas ??
    metadata.Total_paginas ??
    metadata.totalPaginas ??
    metadata.TotalPaginas ??
    1,
  );
  const rawHasNext =
    metadata.tiene_siguiente ??
    metadata.Tiene_siguiente ??
    metadata.tieneSiguiente ??
    metadata.TieneSiguiente;
  const rawHasPrevious =
    metadata.tiene_anterior ??
    metadata.Tiene_anterior ??
    metadata.tieneAnterior ??
    metadata.TieneAnterior;

  return {
    total_resultados: Number(
      metadata.total_resultados ??
      metadata.Total_resultados ??
      metadata.totalResultados ??
      metadata.TotalResultados ??
      0,
    ),
    pagina_actual: currentPage,
    total_paginas: totalPages,
    limite: Number(
      metadata.limite ??
      metadata.Limite ??
      metadata.pageSize ??
      metadata.PageSize ??
      limit,
    ),
    tiene_siguiente: rawHasNext === undefined ? currentPage < totalPages : rawHasNext === true || rawHasNext === 'true' || rawHasNext === 1 || rawHasNext === '1',
    tiene_anterior: rawHasPrevious === undefined ? currentPage > 1 : rawHasPrevious === true || rawHasPrevious === 'true' || rawHasPrevious === 1 || rawHasPrevious === '1',
  };
}

function toPagedResult<TRecord>(payload: unknown, page: number, limit: number): PagedResponse<TRecord> {
  const normalized = normalizeApiShape(payload);

  if (isPlainObject(normalized) && Array.isArray(normalized.data) && isPlainObject(normalized.metadata)) {
    return {
      status: Number(normalized.status ?? 200),
      message: String(normalized.message ?? 'Operacion exitosa.'),
      metadata: toPagedMetadata(normalized.metadata as Record<string, unknown>, page, limit),
      data: normalized.data as TRecord[],
    };
  }

  if (isPlainObject(normalized) && Array.isArray(normalized.Data) && isPlainObject(normalized.Metadata)) {
    const metadata = normalized.Metadata as Record<string, unknown>;
    return {
      status: Number(normalized.Status ?? 200),
      message: String(normalized.Message ?? 'Operacion exitosa.'),
      metadata: toPagedMetadata(metadata, page, limit),
      data: normalized.Data as TRecord[],
    };
  }

  if (isPlainObject(normalized) && Array.isArray(normalized.items) && isPlainObject(normalized.metadata)) {
    return {
      status: Number(normalized.status ?? 200),
      message: String(normalized.message ?? 'Operacion exitosa.'),
      metadata: toPagedMetadata(normalized.metadata as Record<string, unknown>, page, limit),
      data: normalized.items as TRecord[],
    };
  }

  if (isPlainObject(normalized) && Array.isArray(normalized.Items) && isPlainObject(normalized.Metadata)) {
    return {
      status: Number(normalized.Status ?? normalized.status ?? 200),
      message: String(normalized.Message ?? normalized.message ?? 'Operacion exitosa.'),
      metadata: toPagedMetadata(normalized.Metadata as Record<string, unknown>, page, limit),
      data: normalized.Items as TRecord[],
    };
  }

  const data = isPlainObject(normalized) && Array.isArray(normalized.data)
    ? normalized.data as TRecord[]
    : isPlainObject(normalized) && Array.isArray(normalized.Data)
      ? normalized.Data as TRecord[]
      : isPlainObject(normalized) && Array.isArray(normalized.items)
        ? normalized.items as TRecord[]
        : isPlainObject(normalized) && Array.isArray(normalized.Items)
          ? normalized.Items as TRecord[]
      : Array.isArray(normalized)
        ? normalized as TRecord[]
        : [];

  return {
    status: 200,
    message: 'Operacion exitosa.',
    metadata: {
      total_resultados: data.length,
      pagina_actual: page,
      total_paginas: 1,
      limite: limit,
      tiene_siguiente: false,
      tiene_anterior: false,
    },
    data,
  };
}

async function executeForInternalPath<T>(path: string, operation: (baseUrl: string) => Promise<T>) {
  const baseUrl = resolveInternalServiceBaseUrl(path);

  try {
    return await operation(baseUrl);
  } catch (error) {
    throw parseError(error);
  }
}

export async function login(payload: LoginPayload): Promise<AuthUser> {
  const response = await executeForInternalPath('/api/v1/internal/auth/login', (baseUrl) =>
    http.post<ApiEnvelope<Record<string, unknown>>>('/api/v1/internal/auth/login', payload, { baseURL: baseUrl }),
  );

  const raw = response.data.data;

  return {
    usuarioGuid: String(raw.usuario_guid ?? raw.Usuario_guid ?? raw.UsuarioGuid ?? ''),
    username: String(raw.username ?? raw.Username ?? ''),
    correo: String(raw.correo ?? raw.Correo ?? ''),
    nombres: String(raw.nombres ?? raw.Nombres ?? ''),
    accessToken: String(raw.access_token ?? raw.Access_token ?? raw.Token ?? ''),
    refreshToken: String(raw.refresh_token ?? raw.Refresh_token ?? raw.RefreshToken ?? ''),
    expiresIn: Number(raw.expires_in ?? raw.Expires_in ?? raw.ExpiresIn ?? 0),
    roles: Array.isArray(raw.roles)
      ? raw.roles.map((value) => String(value).toLowerCase()) as AuthUser['roles']
      : [],
  };
}

export async function fetchPaged<TRecord>(path: string, page: number, limit: number) {
  const response = await executeForInternalPath(path, (baseUrl) =>
    http.get(path, {
      baseURL: baseUrl,
      params: { pagina: page, limite: limit },
    }),
  );

  return toPagedResult<TRecord>(response.data, page, limit);
}

export async function createRecord<TRecord>(path: string, payload: Record<string, unknown>) {
  const response = await executeForInternalPath(path, (baseUrl) =>
    http.post(path, payload, { baseURL: baseUrl }),
  );

  return getEnvelopeData<TRecord>(response.data);
}

export async function updateRecord<TRecord>(path: string, id: string | number, payload: Record<string, unknown>) {
  const response = await executeForInternalPath(path, (baseUrl) =>
    http.put(`${path}/${id}`, payload, { baseURL: baseUrl }),
  );

  return getEnvelopeData<TRecord>(response.data);
}

export async function deleteRecord(path: string, id: string | number) {
  await executeForInternalPath(path, (baseUrl) =>
    http.delete(`${path}/${id}`, { baseURL: baseUrl }),
  );
}

export async function runAction<TResponse = unknown>(
  method: 'get' | 'post' | 'patch' | 'delete',
  path: string,
  payload?: Record<string, unknown>,
) {
  const response = await executeForInternalPath(path, (baseUrl) => {
    if (method === 'get') {
      return http.get(path, { baseURL: baseUrl });
    }

    if (method === 'delete') {
      return http.delete(path, { baseURL: baseUrl, data: payload });
    }

    if (method === 'patch') {
      return http.patch(path, payload, { baseURL: baseUrl });
    }

    return http.post(path, payload, { baseURL: baseUrl });
  });

  return normalizeApiShape(response.data as TResponse);
}

export { API_URL };
