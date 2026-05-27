import { BadgeCheck, BedDouble, CalendarDays, CreditCard, Receipt, ShieldCheck } from 'lucide-react';
import { Link, useLocation, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { brand } from '../app/brand';
import { StatusMessage } from '../components/StatusMessage';
import { getPublicReservation, getStoredPublicCustomerAuth } from './publicApi';
import type { PublicReservation } from './types';

function money(value: number, currency = 'USD') {
  return new Intl.NumberFormat('es-EC', { style: 'currency', currency }).format(value);
}

type ConfirmationLocationState = {
  accessToken?: string;
  reservation?: PublicReservation;
} | null;

export function CustomerReservationConfirmationPage() {
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const state = (location.state as ConfirmationLocationState) ?? null;
  const accessToken = state?.accessToken || getStoredPublicCustomerAuth()?.accessToken || '';
  const reservationGuid = searchParams.get('reserva') ?? state?.reservation?.ReservaGuid ?? '';

  const reservationQuery = useQuery({
    queryKey: ['public-reservation-confirmation', reservationGuid, accessToken],
    queryFn: () => getPublicReservation(reservationGuid, accessToken),
    enabled: Boolean(reservationGuid),
    initialData: state?.reservation ?? undefined,
  });

  const reservation = reservationQuery.data ?? state?.reservation ?? null;
  const invoice = reservation?.Factura;

  if (!reservationGuid) {
    return (
      <div className="customer-site payment-site">
        <main className="customer-section">
          <StatusMessage kind="error" title="No encontramos la reserva confirmada." />
          <Link to="/" className="customer-secondary-button">Volver al hotel</Link>
        </main>
      </div>
    );
  }

  return (
    <div className="customer-site payment-site">
      <header className="customer-nav">
        <div className="brand">
          <div className="brand-mark">{brand.mark}</div>
          <div>
            <strong>{brand.name}</strong>
            <span>Confirmacion final</span>
          </div>
        </div>
      </header>

      <main className="customer-section payment-layout polished">
        <section className="payment-panel payment-main-panel">
          <div className="payment-success-card deluxe">
            <div className="success-mark"><BadgeCheck size={34} /></div>
            <span className="eyebrow">Reserva confirmada</span>
            <h1>Tu pago fue registrado con exito.</h1>
            <p>Tu estadia ya quedó confirmada. Guarda este resumen para presentarlo en recepción si lo necesitas.</p>
          </div>

          {reservationQuery.isLoading ? <div className="empty-state">Cargando confirmacion...</div> : null}
          {reservationQuery.isError && !reservation ? <StatusMessage kind="error" title="No pudimos cargar la confirmacion de la reserva." /> : null}

          {reservation ? (
            <div className="payment-summary-card refined payment-summary-rich">
              <div>
                <small>Codigo</small>
                <strong>{reservation.CodigoReserva}</strong>
              </div>
              <div>
                <small>Estado</small>
                <strong>{reservation.EstadoReserva}</strong>
              </div>
              <div>
                <small>Llegada</small>
                <strong>{reservation.FechaInicio.slice(0, 10)}</strong>
              </div>
              <div>
                <small>Salida</small>
                <strong>{reservation.FechaFin.slice(0, 10)}</strong>
              </div>
              <div className="span-all payment-room-highlight">
                <BedDouble size={18} />
                <div>
                  <strong>{reservation.Habitaciones.length} habitacion(es) reservada(s)</strong>
                  <p>Reserva {reservation.ReservaGuid}</p>
                </div>
              </div>
            </div>
          ) : null}
        </section>

        <aside className="payment-sidebar payment-sidebar-polished">
          <article>
            <ShieldCheck size={22} />
            <div>
              <strong>Confirmacion completada</strong>
              <p>La reserva ya fue tomada y el pago simulado quedó aplicado.</p>
            </div>
          </article>
          <article>
            <CalendarDays size={22} />
            <div>
              <strong>Fechas</strong>
              <p>{reservation ? `${reservation.FechaInicio.slice(0, 10)} al ${reservation.FechaFin.slice(0, 10)}` : 'Pendiente'}</p>
            </div>
          </article>
          <article>
            <CreditCard size={22} />
            <div>
              <strong>Total pagado</strong>
              <p>{reservation ? money(reservation.TotalReserva, invoice?.Moneda ?? 'USD') : '-'}</p>
            </div>
          </article>
          {invoice ? (
            <article>
              <Receipt size={22} />
              <div>
                <strong>Factura</strong>
                <p>{invoice.NumeroFactura}</p>
              </div>
            </article>
          ) : null}
          <Link to="/" className="customer-primary-button">Volver al hotel</Link>
        </aside>
      </main>
    </div>
  );
}
