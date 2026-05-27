import axios from 'axios';
import type {
  PublicBranch,
  PublicCustomerAuth,
  PublicCustomerLoginPayload,
  PublicCustomerRegisterPayload,
  PublicPaymentSimulationPayload,
  PublicPaymentSimulationResult,
  PublicReservation,
  PublicReservationPayload,
  PublicReview,
  PublicReviewPayload,
  PublicRoom,
  PublicService,
} from './types';
import { serviceUrls } from '../app/serviceUrls';

const customerAuthStorageKey = 'hotel-customer-auth';

type ApiEnvelope<T> = {
  success?: boolean;
  message?: string;
  data?: T;
  errors?: unknown;
};

type InternalPagedEnvelope<T> = {
  data?: T[];
  Data?: T[];
  metadata?: Record<string, unknown>;
  Metadata?: Record<string, unknown>;
};

type InternalClienteLookup = {
  idCliente?: number;
  IdCliente?: number;
  clienteGuid?: string;
  ClienteGuid?: string;
  correo?: string;
  Correo?: string;
  numeroIdentificacion?: string;
  NumeroIdentificacion?: string;
  tipoIdentificacion?: string;
  TipoIdentificacion?: string;
};

type SearchItemRaw = {
  sucursalGuid: string;
  nombre: string;
  ciudad?: string;
  provincia?: string;
  pais?: string;
  direccion?: string;
  descripcion?: string;
  categoria?: string;
  estrellas?: number;
  tipoAlojamiento?: string;
  precioDesde?: number;
  moneda?: string;
  imagenPrincipalUrl?: string;
  promedioValoracion?: number;
  totalValoraciones?: number;
  habitacionesDisponibles?: number;
  serviciosDestacados?: string[];
  horaCheckIn?: string;
  horaCheckOut?: string;
  aceptaNinos?: boolean;
  permiteMascotas?: boolean;
  descripcionCompleta?: string;
  politicas?: {
    horaCheckIn?: string;
    horaCheckOut?: string;
    aceptaNinos?: boolean;
    permiteMascotas?: boolean;
  };
};

type SearchResponseRaw = {
  items: SearchItemRaw[];
  pagina: number;
  limite: number;
  totalResultados: number;
  totalPaginas: number;
  tieneSiguiente: boolean;
  tieneAnterior: boolean;
};

type DetailRoomTypeRaw = {
  tipoHabitacionGuid: string;
  nombre: string;
  tipoCama?: string;
  capacidadAdultos?: number;
  capacidadNinos?: number;
  areaM2?: number;
  precioBase?: number;
  imagenes?: string[];
  disponiblesEnRango?: number | null;
};

type AccommodationDetailRaw = {
  sucursalGuid: string;
  nombre: string;
  ciudad?: string;
  provincia?: string;
  pais?: string;
  direccion?: string;
  descripcion?: string;
  descripcionCompleta?: string;
  categoria?: string;
  estrellas?: number;
  tipoAlojamiento?: string;
  precioDesde?: number;
  moneda?: string;
  imagenPrincipalUrl?: string;
  promedioValoracion?: number;
  totalValoraciones?: number;
  habitacionesDisponibles?: number;
  serviciosDestacados?: string[];
  horaCheckIn?: string;
  horaCheckOut?: string;
  aceptaNinos?: boolean;
  permiteMascotas?: boolean;
  amenities?: string[];
  imagenes?: string[];
  tiposHabitacion?: DetailRoomTypeRaw[];
  politicas?: {
    horaCheckIn?: string;
    horaCheckOut?: string;
    aceptaNinos?: boolean;
    permiteMascotas?: boolean;
    politicas?: string;
  };
};

type ReviewsResponseRaw = {
  items: Array<{
    valoracionGuid: string;
    puntuacion: number;
    comentarioPositivo?: string;
    comentarioNegativo?: string;
    tipoViaje?: string;
    fecha?: string;
    nombreVisibleCliente?: string;
    respuestaPropiedad?: string;
  }>;
  pagina: number;
  limite: number;
  totalResultados: number;
  totalPaginas: number;
  tieneSiguiente: boolean;
  tieneAnterior: boolean;
};

type ReservationInvoiceRaw = {
  facturaGuid: string;
  numeroFactura: string;
  tipoFactura?: string;
  fechaEmision?: string;
  total?: number;
  saldoPendiente?: number;
  moneda?: string;
  estado?: string;
};

type ReservationLineRaw = {
  reservaHabitacionGuid: string;
  habitacionGuid?: string;
  idHabitacion?: number;
  fechaInicio: string;
  fechaFin: string;
  numAdultos: number;
  numNinos: number;
  precioNocheAplicado?: number;
  subtotalLinea?: number;
  valorIvaLinea?: number;
  descuentoLinea?: number;
  totalLinea?: number;
  estadoDetalle?: string;
};

type ReservationRaw = {
  reservaGuid: string;
  codigoReserva: string;
  estadoReserva?: string;
  sucursalGuid?: string;
  clienteGuid?: string;
  fechaReservaUtc?: string;
  fechaInicio: string;
  fechaFin: string;
  fechaConfirmacionUtc?: string;
  fechaCancelacionUtc?: string;
  motivoCancelacion?: string;
  origenCanalReserva?: string;
  observaciones?: string;
  subtotalReserva?: number;
  valorIva?: number;
  totalReserva?: number;
  descuentoAplicado?: number;
  saldoPendiente?: number;
  factura?: ReservationInvoiceRaw | null;
  habitaciones?: ReservationLineRaw[];
};

const gatewayHttp = axios.create({
  baseURL: serviceUrls.gateway,
});

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function readValue<T = unknown>(source: unknown, ...keys: string[]) {
  if (!isRecord(source)) {
    return undefined as T | undefined;
  }

  for (const key of keys) {
    if (source[key] !== undefined && source[key] !== null) {
      return source[key] as T;
    }
  }

  return undefined as T | undefined;
}

function readString(source: unknown, ...keys: string[]) {
  const value = readValue(source, ...keys);
  return value === undefined || value === null ? '' : String(value);
}

function readNumber(source: unknown, ...keys: string[]) {
  const value = readValue(source, ...keys);
  return value === undefined || value === null || value === '' ? 0 : Number(value);
}

function readArray<T = unknown>(source: unknown, ...keys: string[]) {
  const value = readValue(source, ...keys);
  return Array.isArray(value) ? (value as T[]) : [];
}

function unwrapData<T>(payload: unknown): T {
  if (isRecord(payload) && 'data' in payload) {
    return payload.data as T;
  }

  return payload as T;
}

function mapApiError(error: unknown): never {
  if (!axios.isAxiosError(error)) {
    throw error;
  }

  const payload = error.response?.data;
  const message =
    readString(payload, 'message', 'title', 'error') ||
    error.message ||
    'No pudimos completar la solicitud.';

  const details =
    readArray<string>(payload, 'details', 'errors')
      .map((item) => String(item))
      .filter(Boolean);

  const next = new Error(message) as Error & {
    response?: typeof error.response;
    details?: string[];
  };

  next.response = error.response;
  next.details = details;
  throw next;
}

function customerAuthHeaders(accessToken?: string) {
  const token = accessToken?.trim() || getStoredPublicCustomerAuth()?.accessToken;
  return token ? { Authorization: `Bearer ${token}` } : undefined;
}

function mapAuth(raw: unknown, cliente?: PublicCustomerRegisterPayload): PublicCustomerAuth {
  const roles = readArray<string>(raw, 'roles', 'Roles').map((role) => String(role).toLowerCase());
  return {
    usuarioGuid: readString(raw, 'usuarioGuid', 'usuario_guid', 'UsuarioGuid', 'Usuario_guid'),
    clienteGuid: readString(raw, 'clienteGuid', 'cliente_guid', 'ClienteGuid', 'Cliente_guid') || undefined,
    username: readString(raw, 'username', 'Username'),
    correo: readString(raw, 'correo', 'Correo'),
    nombres: readString(raw, 'nombres', 'Nombres'),
    accessToken: readString(raw, 'token', 'accessToken', 'Token', 'AccessToken'),
    refreshToken: readString(raw, 'refreshToken', 'RefreshToken'),
    expiresIn: readNumber(raw, 'expiresIn', 'ExpiresIn'),
    roles,
    cliente: cliente
      ? {
          TipoIdentificacion: cliente.TipoIdentificacion,
          NumeroIdentificacion: cliente.NumeroIdentificacion,
          Nombres: cliente.Nombres,
          Apellidos: cliente.Apellidos,
          RazonSocial: cliente.RazonSocial,
          Correo: cliente.Correo,
          Telefono: cliente.Telefono,
          Direccion: cliente.Direccion,
        }
      : undefined,
  };
}

function toIsoDateTime(value: string, fallbackTime: 'checkin' | 'checkout') {
  if (!value) {
    return value;
  }

  if (value.includes('T')) {
    return value;
  }

  return fallbackTime === 'checkin' ? `${value}T15:00:00.000Z` : `${value}T12:00:00.000Z`;
}

function uniqueText(values: string[]) {
  return Array.from(new Set(values.map((value) => value.trim()).filter(Boolean)));
}

function mapServiceFromName(name: string, sucursalGuid?: string): PublicService {
  const code = name
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/[^a-zA-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .toUpperCase();

  return {
    CatalogoGuid: '',
    SucursalGuid: sucursalGuid,
    Codigo: code || 'SERVICIO',
    Nombre: name,
    Categoria: 'GENERAL',
    Tipo: 'AMENITY',
    Descripcion: undefined,
    PrecioBase: 0,
    AplicaIva: false,
    Disponible24h: true,
  };
}

function mapBranch(summary: SearchItemRaw, detail?: AccommodationDetailRaw): PublicBranch {
  const source = detail ?? summary;
  return {
    SucursalGuid: summary.sucursalGuid,
    CodigoSucursal: '',
    NombreSucursal: source.nombre,
    DescripcionSucursal: source.descripcionCompleta ?? source.descripcion,
    DescripcionCorta: source.descripcion,
    TipoAlojamiento: source.tipoAlojamiento ?? '',
    Estrellas: source.estrellas,
    CategoriaViaje: source.categoria,
    Pais: source.pais ?? '',
    Provincia: source.provincia,
    Ciudad: source.ciudad ?? '',
    Ubicacion: [source.ciudad, source.provincia, source.pais].filter(Boolean).join(', '),
    Direccion: source.direccion ?? '',
    CodigoPostal: undefined,
    Telefono: '',
    Correo: '',
    Latitud: undefined,
    Longitud: undefined,
    HoraCheckin: source.politicas?.horaCheckIn ?? source.horaCheckIn,
    HoraCheckout: source.politicas?.horaCheckOut ?? source.horaCheckOut,
    CheckinAnticipado: false,
    CheckoutTardio: false,
    AceptaNinos: source.politicas?.aceptaNinos ?? source.aceptaNinos ?? true,
    EdadMinimaHuesped: undefined,
    PermiteMascotas: source.politicas?.permiteMascotas ?? source.permiteMascotas ?? false,
    SePermiteFumar: false,
  };
}

function mapRoomServices(detail: AccommodationDetailRaw) {
  return uniqueText([...(detail.serviciosDestacados ?? []), ...(detail.amenities ?? [])]).map((name) =>
    mapServiceFromName(name, detail.sucursalGuid),
  );
}

function mapRoomsFromDetail(
  detail: AccommodationDetailRaw,
  filters: { fechaInicio?: string; fechaFin?: string; adultos?: number; ninos?: number; numHabitaciones?: number } = {},
) {
  const services = mapRoomServices(detail);
  const requestedRooms = Math.max(1, filters.numHabitaciones ?? 1);
  const hasStayRange = Boolean(filters.fechaInicio && filters.fechaFin);

  return (detail.tiposHabitacion ?? [])
    .filter((item) => {
      const availableCount = readNumber(item, 'disponiblesEnRango');

      if (filters.adultos && readNumber(item, 'capacidadAdultos') < filters.adultos) {
        return false;
      }

      if (filters.ninos !== undefined && readNumber(item, 'capacidadNinos') < filters.ninos) {
        return false;
      }

      if (!hasStayRange) {
        return true;
      }

      return availableCount > 0 && availableCount >= requestedRooms;
    })
    .map<PublicRoom>((item) => ({
      HabitacionGuid: item.tipoHabitacionGuid,
      SucursalGuid: detail.sucursalGuid,
      TipoHabitacionGuid: item.tipoHabitacionGuid,
      NombreSucursal: detail.nombre,
      DescripcionSucursal: detail.descripcionCompleta ?? detail.descripcion,
      DescripcionCortaSucursal: detail.descripcion,
      TipoAlojamiento: detail.tipoAlojamiento ?? '',
      Pais: detail.pais ?? '',
      Ciudad: detail.ciudad ?? '',
      Direccion: detail.direccion ?? '',
      NombreTipoHabitacion: item.nombre,
      NumeroHabitacion: '',
      DescripcionHabitacion: detail.descripcion,
      TipoCama: item.tipoCama,
      CapacidadAdultos: readNumber(item, 'capacidadAdultos'),
      CapacidadNinos: readNumber(item, 'capacidadNinos'),
      CapacidadTotal: readNumber(item, 'capacidadAdultos') + readNumber(item, 'capacidadNinos'),
      AreaM2: readNumber(item, 'areaM2') || undefined,
      PrecioPorNoche: readNumber(item, 'precioBase') || readNumber(detail, 'precioDesde'),
      PrecioTotalConImpuestos: readNumber(item, 'precioBase') || readNumber(detail, 'precioDesde'),
      PorcentajeIva: 0,
      Moneda: detail.moneda ?? 'USD',
      EstadoHabitacion: hasStayRange && readNumber(item, 'disponiblesEnRango') > 0 ? 'DIS' : 'PUB',
      DisponiblesEnRango: hasStayRange ? readNumber(item, 'disponiblesEnRango') : undefined,
      Imagenes: item.imagenes?.length ? item.imagenes : detail.imagenes ?? [],
      Servicios: services,
    }));
}

function mapReview(raw: ReviewsResponseRaw['items'][number], fallbackBranchName?: string): PublicReview {
  return {
    ValoracionGuid: raw.valoracionGuid,
    SucursalGuid: '',
    NombreSucursal: fallbackBranchName ?? '',
    NombreHuesped: raw.nombreVisibleCliente ?? '',
    TipoViaje: raw.tipoViaje,
    PuntuacionGeneral: raw.puntuacion,
    PuntuacionLimpieza: undefined,
    PuntuacionConfort: undefined,
    PuntuacionUbicacion: undefined,
    ComentarioPositivo: raw.comentarioPositivo,
    ComentarioNegativo: raw.comentarioNegativo,
    RespuestaHotel: raw.respuestaPropiedad,
    FechaRespuestaUtc: undefined,
    FechaPublicacion: raw.fecha ?? '',
  };
}

function mapReservation(raw: ReservationRaw): PublicReservation {
  return {
    ReservaGuid: raw.reservaGuid,
    CodigoReserva: raw.codigoReserva,
    EstadoReserva: raw.estadoReserva ?? '',
    SucursalGuid: raw.sucursalGuid ?? '',
    ClienteGuid: raw.clienteGuid ?? '',
    FechaReservaUtc: raw.fechaReservaUtc ?? '',
    FechaInicio: raw.fechaInicio,
    FechaFin: raw.fechaFin,
    OrigenCanalReserva: raw.origenCanalReserva ?? '',
    Observaciones: raw.observaciones,
    SubtotalReserva: raw.subtotalReserva ?? 0,
    ValorIva: raw.valorIva ?? 0,
    TotalReserva: raw.totalReserva ?? 0,
    DescuentoAplicado: raw.descuentoAplicado ?? 0,
    SaldoPendiente: raw.saldoPendiente ?? raw.totalReserva ?? 0,
    Factura: raw.factura
      ? {
          FacturaGuid: raw.factura.facturaGuid,
          NumeroFactura: raw.factura.numeroFactura,
          TipoFactura: raw.factura.tipoFactura ?? '',
          FechaEmision: raw.factura.fechaEmision ?? '',
          Total: raw.factura.total ?? 0,
          SaldoPendiente: raw.factura.saldoPendiente ?? 0,
          Moneda: raw.factura.moneda ?? 'USD',
          Estado: raw.factura.estado ?? '',
        }
      : undefined,
    Habitaciones: (raw.habitaciones ?? []).map((line) => ({
      ReservaHabitacionGuid: line.reservaHabitacionGuid,
      HabitacionGuid: line.habitacionGuid,
      IdHabitacion: line.idHabitacion,
      FechaInicio: line.fechaInicio,
      FechaFin: line.fechaFin,
      NumAdultos: line.numAdultos,
      NumNinos: line.numNinos,
      PrecioNocheAplicado: line.precioNocheAplicado ?? 0,
      SubtotalLinea: line.subtotalLinea ?? 0,
      ValorIvaLinea: line.valorIvaLinea ?? 0,
      DescuentoLinea: line.descuentoLinea ?? 0,
      TotalLinea: line.totalLinea ?? 0,
      EstadoDetalle: line.estadoDetalle ?? '',
    })),
  };
}

async function getSearchResponse(params: Record<string, unknown> = {}) {
  try {
    const response = await gatewayHttp.get<SearchResponseRaw>('/api/v1/accommodations/search', { params });
    return response.data;
  } catch (error) {
    mapApiError(error);
  }
}

async function getAccommodationDetail(
  sucursalGuid: string,
  params?: { fechaInicio?: string; fechaFin?: string },
) {
  try {
    const response = await gatewayHttp.get<AccommodationDetailRaw>(`/api/v1/accommodations/${sucursalGuid}`, { params });
    return response.data;
  } catch (error) {
    mapApiError(error);
  }
}

async function getReviewsPage(sucursalGuid: string, pagina = 1, limite = 20) {
  try {
    const response = await gatewayHttp.get<ReviewsResponseRaw>(`/api/v1/accommodations/${sucursalGuid}/reviews`, {
      params: { pagina, limite },
    });
    return response.data;
  } catch (error) {
    mapApiError(error);
  }
}

export function getStoredPublicCustomerAuth() {
  const raw = localStorage.getItem(customerAuthStorageKey);
  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw) as PublicCustomerAuth & {
      token?: string;
      refresh_token?: string;
      refreshToken?: string;
      usuarioGuid?: string;
      usuario_guid?: string;
      cliente_guid?: string;
    };
    const accessToken = String(parsed.accessToken ?? parsed.token ?? '').trim();
    if (!accessToken) {
      localStorage.removeItem(customerAuthStorageKey);
      return null;
    }

    return {
      ...parsed,
      accessToken,
      refreshToken: String(parsed.refreshToken ?? parsed.refresh_token ?? '').trim(),
      usuarioGuid: String(parsed.usuarioGuid ?? parsed.usuario_guid ?? '').trim(),
      clienteGuid: parsed.clienteGuid ? String(parsed.clienteGuid).trim() : parsed.cliente_guid ? String(parsed.cliente_guid).trim() : undefined,
    };
  } catch {
    localStorage.removeItem(customerAuthStorageKey);
    return null;
  }
}

export function storePublicCustomerAuth(auth: PublicCustomerAuth) {
  localStorage.setItem(customerAuthStorageKey, JSON.stringify(auth));
}

export function clearStoredPublicCustomerAuth() {
  localStorage.removeItem(customerAuthStorageKey);
}

export async function resolveStoredPublicCustomerGuid(accessToken?: string) {
  const auth = getStoredPublicCustomerAuth();
  if (!auth) {
    return undefined;
  }

  if (auth.clienteGuid) {
    return auth.clienteGuid;
  }

  const customerInfo = auth.cliente;
  if (customerInfo?.Correo && customerInfo?.TipoIdentificacion && customerInfo?.NumeroIdentificacion) {
    try {
      const response = await gatewayHttp.get<ApiEnvelope<InternalClienteLookup>>('/api/v1/internal/clientes/lookup', {
        headers: customerAuthHeaders(accessToken),
        params: {
          correo: customerInfo.Correo,
          tipoIdentificacion: customerInfo.TipoIdentificacion,
          numeroIdentificacion: customerInfo.NumeroIdentificacion,
        },
      });
      const data = unwrapData<InternalClienteLookup>(response.data);
      const clienteGuid = readString(data, 'clienteGuid', 'ClienteGuid');
      if (clienteGuid) {
        storePublicCustomerAuth({ ...auth, clienteGuid });
        return clienteGuid;
      }
    } catch {
      // fallback below
    }
  }

  if (!auth.correo) {
    return undefined;
  }

  try {
    const response = await gatewayHttp.get<InternalPagedEnvelope<InternalClienteLookup>>('/api/v1/internal/clientes', {
      headers: customerAuthHeaders(accessToken),
      params: { pagina: 1, limite: 500 },
    });
    const envelope = response.data;
    const clients = Array.isArray(envelope.data)
      ? envelope.data
      : Array.isArray(envelope.Data)
        ? envelope.Data
        : [];
    const match = clients.find((item) => readString(item, 'correo', 'Correo').toLowerCase() === auth.correo.toLowerCase());
    const clienteGuid = match ? readString(match, 'clienteGuid', 'ClienteGuid') : '';
    if (clienteGuid) {
      storePublicCustomerAuth({ ...auth, clienteGuid });
      return clienteGuid;
    }
  } catch {
    return undefined;
  }

  return undefined;
}

export async function loginPublicCustomer(payload: PublicCustomerLoginPayload) {
  try {
    const response = await gatewayHttp.post<ApiEnvelope<Record<string, unknown>>>('/api/v1/auth/login', {
      username: payload.usernameOrEmail,
      usernameOrEmail: payload.usernameOrEmail,
      password: payload.password,
    });
    const auth = mapAuth(unwrapData<Record<string, unknown>>(response.data));
    storePublicCustomerAuth(auth);
    return auth;
  } catch (error) {
    mapApiError(error);
  }
}

export async function registerPublicCustomer(payload: PublicCustomerRegisterPayload) {
  try {
    const response = await gatewayHttp.post<ApiEnvelope<Record<string, unknown>>>('/api/v1/auth/registro-cliente', payload);
    const auth = mapAuth(unwrapData<Record<string, unknown>>(response.data), payload);
    storePublicCustomerAuth(auth);
    return auth;
  } catch (error) {
    mapApiError(error);
  }
}

export async function getPublicBranches() {
  const search = await getSearchResponse({ Pagina: 1, Limite: 20 });
  const detailResponses = await Promise.allSettled(
    search.items.map((item) => getAccommodationDetail(item.sucursalGuid)),
  );

  return search.items.map((item, index) => {
    const detail = detailResponses[index]?.status === 'fulfilled' ? detailResponses[index].value : undefined;
    return mapBranch(item, detail);
  });
}

export async function getPublicServices(sucursalGuid?: string) {
  if (sucursalGuid) {
    const detail = await getAccommodationDetail(sucursalGuid);
    return mapRoomServices(detail);
  }

  const branches = await getPublicBranches();
  const details = await Promise.allSettled(branches.map((branch) => getAccommodationDetail(branch.SucursalGuid)));
  const services = new Map<string, PublicService>();

  for (const result of details) {
    if (result.status !== 'fulfilled') {
      continue;
    }

    for (const service of mapRoomServices(result.value)) {
      services.set(service.Codigo || service.Nombre, service);
    }
  }

  return Array.from(services.values());
}

export async function searchPublicRooms(filters: {
  fechaInicio?: string;
  fechaFin?: string;
  sucursalGuid?: string;
  adultos?: number;
  ninos?: number;
  soloCatalogo?: boolean;
}) {
  const fechaInicio = filters.fechaInicio ? toIsoDateTime(filters.fechaInicio, 'checkin') : undefined;
  const fechaFin = filters.fechaFin ? toIsoDateTime(filters.fechaFin, 'checkout') : undefined;

  if (filters.sucursalGuid) {
    const detail = await getAccommodationDetail(filters.sucursalGuid, { fechaInicio, fechaFin });
    return mapRoomsFromDetail(detail, {
      fechaInicio,
      fechaFin,
      adultos: filters.adultos,
      ninos: filters.ninos,
      numHabitaciones: 1,
    });
  }

  const search = await getSearchResponse({
    fechaInicio,
    fechaFin,
    NumAdultos: filters.adultos,
    NumNinos: filters.ninos,
    NumHabitaciones: 1,
    Pagina: 1,
    Limite: filters.soloCatalogo ? 12 : 20,
  });

  const details = await Promise.allSettled(
    search.items.map((item) => getAccommodationDetail(item.sucursalGuid, { fechaInicio, fechaFin })),
  );

  const rooms = details.flatMap((result) =>
    result.status === 'fulfilled'
      ? mapRoomsFromDetail(result.value, {
          fechaInicio,
          fechaFin,
          adultos: filters.adultos,
          ninos: filters.ninos,
          numHabitaciones: 1,
        })
      : [],
  );

  const availableOnly = fechaInicio && fechaFin
    ? rooms.filter((room) => room.EstadoHabitacion === 'DIS' && Number(room.DisponiblesEnRango ?? 0) > 0)
    : rooms;

  return availableOnly.sort((left, right) => left.PrecioTotalConImpuestos - right.PrecioTotalConImpuestos);
}

export async function getCurrentPublicRoomAvailability(filters: {
  sucursalGuid: string;
  tipoHabitacionGuid: string;
  fechaInicio: string;
  fechaFin: string;
  adultos?: number;
  ninos?: number;
  numHabitaciones?: number;
}) {
  const fechaInicio = toIsoDateTime(filters.fechaInicio, 'checkin');
  const fechaFin = toIsoDateTime(filters.fechaFin, 'checkout');
  const detail = await getAccommodationDetail(filters.sucursalGuid, { fechaInicio, fechaFin });
  const rooms = mapRoomsFromDetail(detail, {
    fechaInicio,
    fechaFin,
    adultos: filters.adultos,
    ninos: filters.ninos,
    numHabitaciones: filters.numHabitaciones ?? 1,
  });

  return rooms.find((room) => room.TipoHabitacionGuid === filters.tipoHabitacionGuid) ?? null;
}

export async function createPublicReservation(payload: PublicReservationPayload) {
  try {
    const reservationPayload = {
      clienteGuid: payload.ClienteGuid,
      sucursalGuid: payload.SucursalGuid,
      fechaInicio: payload.FechaInicio,
      fechaFin: payload.FechaFin,
      descuentoAplicado: payload.DescuentoAplicado ?? 0,
      esWalkin: payload.EsWalkin ?? false,
      origenCanalReserva: payload.OrigenCanalReserva,
      observaciones: payload.Observaciones,
      cliente: {
        tipoIdentificacion: payload.Cliente.TipoIdentificacion,
        numeroIdentificacion: payload.Cliente.NumeroIdentificacion,
        nombres: payload.Cliente.Nombres,
        apellidos: payload.Cliente.Apellidos,
        razonSocial: payload.Cliente.RazonSocial,
        correo: payload.Cliente.Correo,
        telefono: payload.Cliente.Telefono,
        direccion: payload.Cliente.Direccion,
      },
      habitaciones: payload.Habitaciones.map((room) => ({
        habitacionGuid: room.HabitacionGuid || undefined,
        tipoHabitacionGuid: room.TipoHabitacionGuid || room.HabitacionGuid,
        numHabitaciones: room.NumHabitaciones ?? 1,
        fechaInicio: room.FechaInicio ?? payload.FechaInicio,
        fechaFin: room.FechaFin ?? payload.FechaFin,
        numAdultos: room.NumAdultos,
        numNinos: room.NumNinos,
        descuentoLinea: room.DescuentoLinea ?? 0,
      })),
    };

    const response = await gatewayHttp.post<ApiEnvelope<ReservationRaw>>(
      '/api/v1/accommodations/reservas',
      reservationPayload,
      { headers: customerAuthHeaders() },
    );

    return mapReservation(unwrapData<ReservationRaw>(response.data));
  } catch (error) {
    mapApiError(error);
  }
}

export async function getPublicReservation(reservaGuid: string, accessToken?: string) {
  try {
    const response = await gatewayHttp.get<ApiEnvelope<ReservationRaw>>(`/api/v1/accommodations/reservas/${reservaGuid}`, {
      headers: customerAuthHeaders(accessToken),
    });
    return mapReservation(unwrapData<ReservationRaw>(response.data));
  } catch (error) {
    mapApiError(error);
  }
}

export async function getPublicCustomerReservations(clienteGuid?: string) {
  try {
    const response = await gatewayHttp.get<ApiEnvelope<ReservationRaw[]>>('/api/v1/public/reservas/mis-reservas', {
      headers: customerAuthHeaders(),
      params: clienteGuid ? { clienteGuid } : undefined,
    });
    return unwrapData<ReservationRaw[]>(response.data).map(mapReservation);
  } catch (error) {
    mapApiError(error);
  }
}

export async function submitPublicReview(payload: PublicReviewPayload) {
  try {
    const response = await gatewayHttp.post<ApiEnvelope<unknown>>('/api/v1/public/valoraciones', payload, {
      headers: customerAuthHeaders(),
    });
    return unwrapData(response.data);
  } catch (error) {
    mapApiError(error);
  }
}

export async function getPublicReviews(sucursalGuid?: string) {
  if (sucursalGuid) {
    const reviews = await getReviewsPage(sucursalGuid, 1, 20);
    return reviews.items.map((item) => mapReview(item));
  }

  const branches = await getPublicBranches();
  const reviewPages = await Promise.allSettled(
    branches.slice(0, 6).map((branch) => getReviewsPage(branch.SucursalGuid, 1, 4).then((page) => ({ branch, page }))),
  );

  return reviewPages.flatMap((result) =>
    result.status === 'fulfilled'
      ? result.value.page.items.map((item) => mapReview(item, result.value.branch.NombreSucursal))
      : [],
  );
}

export async function simulatePublicPayment(payload: PublicPaymentSimulationPayload, accessToken?: string) {
  try {
    const response = await gatewayHttp.post<ApiEnvelope<Record<string, unknown>>>('/api/v1/payments', payload, {
      headers: customerAuthHeaders(accessToken),
    });
    const data = unwrapData<Record<string, unknown>>(response.data);

    return {
      Pago: {
        PagoGuid: readString(data, 'pagoGuid', 'PagoGuid'),
        FacturaGuid: readString(data, 'facturaGuid', 'FacturaGuid') || payload.FacturaGuid,
        ReservaGuid: readString(data, 'reservaGuid', 'ReservaGuid'),
        Monto: readNumber(data, 'monto', 'Monto'),
        MetodoPago: readString(data, 'metodoPago', 'MetodoPago') || payload.MetodoPago,
        EstadoPago: readString(data, 'estadoPago', 'EstadoPago') || 'APR',
        FechaPagoUtc: readString(data, 'fechaPagoUtc', 'FechaPagoUtc') || new Date().toISOString(),
        Moneda: readString(data, 'moneda', 'Moneda') || payload.Moneda || 'USD',
        Referencia: payload.Referencia,
        TransaccionExterna: readString(data, 'transaccionExterna', 'TransaccionExterna') || undefined,
        CodigoAutorizacion: readString(data, 'codigoAutorizacion', 'CodigoAutorizacion') || undefined,
      },
      Factura: undefined,
      ReservaGuid: readString(data, 'reservaGuid', 'ReservaGuid'),
    } satisfies PublicPaymentSimulationResult;
  } catch (error) {
    mapApiError(error);
  }
}
