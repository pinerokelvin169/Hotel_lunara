import { useEffect, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { ArrowLeft, BadgeCheck, BedDouble, CalendarDays, CreditCard, LockKeyhole, Receipt, ShieldCheck, Sparkles, UserRound } from 'lucide-react';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { brand } from '../app/brand';
import { StatusMessage } from '../components/StatusMessage';
import { getPublicReservation, getStoredPublicCustomerAuth, storePublicCustomerAuth } from './publicApi';
import type { PublicReservation, PublicReservationPayload, PublicRoom } from './types';

function money(value: number, currency = 'USD') {
  return new Intl.NumberFormat('es-EC', { style: 'currency', currency }).format(value);
}

function formatCardNumber(value: string) {
  const digits = value.replace(/\D/g, '').slice(0, 16);
  return digits.replace(/(\d{4})(?=\d)/g, '$1 ').trim();
}

function formatExpiry(value: string) {
  const digits = value.replace(/\D/g, '').slice(0, 4);
  if (digits.length <= 2) {
    return digits;
  }
  return `${digits.slice(0, 2)}/${digits.slice(2)}`;
}

function isFutureExpiry(value: string) {
  const digits = value.replace(/\D/g, '');
  if (digits.length !== 4) {
    return false;
  }

  const month = Number(digits.slice(0, 2));
  const year = 2000 + Number(digits.slice(2));
  const now = new Date();
  const currentMonth = now.getMonth() + 1;
  const currentYear = now.getFullYear();

  return month >= 1 && month <= 12 && (year > currentYear || (year === currentYear && month > currentMonth));
}

function maskCardNumber(value: string) {
  const digits = value.replace(/\D/g, '');
  if (digits.length < 4) {
    return '**** **** **** ****';
  }
  return `**** **** **** ${digits.slice(-4)}`;
}

function generateReference() {
  return `PAY-${Math.random().toString(36).slice(2, 8).toUpperCase()}-${Date.now().toString().slice(-6)}`;
}

function readError(error: unknown, fallback: string) {
  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }
  return fallback;
}

type PaymentLocationState = {
  accessToken?: string;
  reservation?: PublicReservation;
  draftReservationPayload?: PublicReservationPayload;
  draftRoom?: PublicRoom;
  draftDates?: { start: string; end: string };
  draftGuests?: { adults: number; children: number };
} | null;

export function CustomerPaymentPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const locationState = (location.state as PaymentLocationState) ?? null;
  const accessToken = locationState?.accessToken || getStoredPublicCustomerAuth()?.accessToken || '';
  const [createdReservation, setCreatedReservation] = useState<PublicReservation | null>(locationState?.reservation ?? null);
  const draftReservationPayload = locationState?.draftReservationPayload ?? null;
  const draftRoom = locationState?.draftRoom ?? null;
  const draftDates = locationState?.draftDates ?? null;
  const draftGuests = locationState?.draftGuests ?? null;
  const initialReservationGuid = searchParams.get('reserva') ?? locationState?.reservation?.ReservaGuid ?? '';
  const reservationGuid = createdReservation?.ReservaGuid || initialReservationGuid;
  const [form, setForm] = useState({
    cardholder: '',
    cardNumber: '',
    expiry: '',
    cvv: '',
    reference: generateReference(),
  });
  const [error, setError] = useState<string | null>(null);
  const [completedReservation, setCompletedReservation] = useState<PublicReservation | null>(null);

  const reservationQuery = useQuery({
    queryKey: ['public-reservation', reservationGuid, accessToken],
    queryFn: () => getPublicReservation(reservationGuid, accessToken),
    enabled: Boolean(reservationGuid),
    initialData: locationState?.reservation ?? undefined,
  });

  const reservation = reservationQuery.data ?? createdReservation ?? locationState?.reservation ?? null;
  const invoice = reservation?.Factura;

  useEffect(() => {
    if (!reservation?.ClienteGuid) {
      return;
    }

    const currentAuth = getStoredPublicCustomerAuth();
    if (!currentAuth || currentAuth.clienteGuid === reservation.ClienteGuid) {
      return;
    }

    storePublicCustomerAuth({
      ...currentAuth,
      clienteGuid: reservation.ClienteGuid,
    });
  }, [reservation?.ClienteGuid]);

  useEffect(() => {
    setForm((current) => ({ ...current, reference: generateReference() }));
  }, [reservationGuid]);

  const paymentReady =
    form.cardholder.trim().length >= 4 &&
    form.cardNumber.replace(/\D/g, '').length === 16 &&
    form.expiry.replace(/\D/g, '').length === 4 &&
    isFutureExpiry(form.expiry) &&
    form.cvv.replace(/\D/g, '').length >= 3;
  const expiryComplete = form.expiry.replace(/\D/g, '').length === 4;
  const expiryInvalid = expiryComplete && !isFutureExpiry(form.expiry);

  const draftStayLabel = draftDates ? `${draftDates.start} al ${draftDates.end}` : '';
  const reservationStayLabel = reservation ? `${reservation.FechaInicio.slice(0, 10)} al ${reservation.FechaFin.slice(0, 10)}` : draftStayLabel;
  const displayedLineItems = reservation?.Habitaciones ?? [];
  const estimatedTotal = reservation?.TotalReserva || draftRoom?.PrecioTotalConImpuestos || 145.00;
  const estimatedCurrency = reservation?.Factura?.Moneda ?? draftRoom?.Moneda ?? 'USD';

  const mutation = useMutation({
    mutationFn: async () => {
      if (!paymentReady) {
        throw new Error(expiryInvalid ? 'La fecha de vencimiento debe ser posterior al mes actual.' : 'Completa los datos de la tarjeta para continuar.');
      }

      setError(null);

      // Simular un retraso de red de 2 segundos para dar un realismo absoluto
      await new Promise((resolve) => setTimeout(resolve, 2000));

      const mockPaidReservation: PublicReservation = reservation ?? {
        ReservaGuid: reservationGuid || 'RES-DEMO-' + Math.random().toString(36).substring(2, 9).toUpperCase(),
        CodigoReserva: 'LR-DEMO-999',
        EstadoReserva: 'CON',
        SucursalGuid: '',
        ClienteGuid: '',
        FechaReservaUtc: '',
        OrigenCanalReserva: 'PUBLIC_WEB',
        DescuentoAplicado: 0,
        FechaInicio: draftDates?.start || '2026-06-01',
        FechaFin: draftDates?.end || '2026-06-03',
        TotalReserva: estimatedTotal,
        SubtotalReserva: estimatedTotal * 0.88,
        ValorIva: estimatedTotal * 0.12,
        SaldoPendiente: 0,
        Habitaciones: displayedLineItems,
        Factura: {
          FacturaGuid: 'FAC-DEMO-' + Math.random().toString(36).substring(2, 9).toUpperCase(),
          NumeroFactura: 'FAC-001-' + String(Math.floor(100000 + Math.random() * 900000)),
          TipoFactura: 'CON',
          FechaEmision: new Date().toISOString(),
          Total: estimatedTotal,
          SaldoPendiente: 0,
          Moneda: estimatedCurrency,
          Estado: 'PAG',
        }
      };

      return {
        payment: {
          Pago: {
            Referencia: form.reference,
            TransaccionExterna: `TX-${Math.random().toString(36).slice(2, 9).toUpperCase()}`,
            CodigoAutorizacion: String(Math.floor(100000 + Math.random() * 900000)),
          }
        },
        reservation: mockPaidReservation
      };
    },
    onError: (requestError) => {
      setError(readError(requestError, 'No pudimos procesar el pago simulado.'));
    },
    onSuccess: ({ payment, reservation: paidReservation }) => {
      setCreatedReservation(paidReservation);
      setCompletedReservation(paidReservation);
      return payment;
    },
  });

  // Redirección automática de lujo después de aprobar el pago simulado
  useEffect(() => {
    if (!mutation.isSuccess) {
      return;
    }
    const timer = setTimeout(() => {
      const finalReservation = completedReservation ?? createdReservation ?? reservation;
      navigate(`/reserva-confirmada?reserva=${encodeURIComponent(finalReservation?.ReservaGuid || '')}`, {
        replace: true,
        state: {
          accessToken,
          reservation: finalReservation,
        },
      });
    }, 2800);
    return () => clearTimeout(timer);
  }, [mutation.isSuccess, completedReservation, createdReservation, reservation, accessToken, navigate]);

  const cardBrand = form.cardNumber.startsWith('4') ? 'Visa' : form.cardNumber.startsWith('5') ? 'Mastercard' : 'Tarjeta';
  const canRenderCheckout = !mutation.isSuccess;
  const actionAmount = invoice?.SaldoPendiente ?? estimatedTotal;

  if (!reservationGuid && !draftReservationPayload) {
    return (
      <div className="customer-site payment-site">
        <main className="customer-section">
          <StatusMessage kind="error" title="No encontramos una reserva pendiente para pagar." />
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
            <span>Checkout seguro</span>
          </div>
        </div>
        <nav>
          <button type="button" className="customer-secondary-button icon-text" onClick={() => navigate('/')}>
            <ArrowLeft size={16} />
            <span>Volver al hotel</span>
          </button>
        </nav>
      </header>

      <main className="customer-section payment-layout polished">
        <section className="payment-panel payment-main-panel">
          <div className="payment-intro payment-intro-polished">
            <div>
              <span className="eyebrow">Pago de reserva</span>
              <h1>Finaliza tu confirmacion.</h1>
              <p>Revisa los datos de tu estadia y completa el pago simulado con tarjeta. La reserva se registrará cuando confirmes el cobro.</p>
            </div>
            <div className="payment-badges">
              <span><ShieldCheck size={16} /> Pago simulado</span>
              <span><LockKeyhole size={16} /> Datos protegidos</span>
            </div>
          </div>

          {reservationQuery.isLoading && reservationGuid ? <div className="empty-state">Cargando informacion de la reserva...</div> : null}
          {reservationQuery.isError && !reservation && !draftReservationPayload ? <StatusMessage kind="error" title="No pudimos cargar la reserva para pago." /> : null}

          <div className="payment-summary-card refined payment-summary-rich">
            <div>
              <small>Reserva</small>
              <strong>{reservation?.CodigoReserva ?? 'Se generará al pagar'}</strong>
            </div>
            <div>
              <small>Estadia</small>
              <strong>{reservationStayLabel || 'Fechas pendientes'}</strong>
            </div>
            <div>
              <small>Huespedes</small>
              <strong>{draftGuests ? `${draftGuests.adults} adulto(s) · ${draftGuests.children} niño(s)` : `${displayedLineItems[0]?.NumAdultos ?? 0} adulto(s)`}</strong>
            </div>
            <div>
              <small>Total estimado</small>
              <strong>{money(actionAmount, invoice?.Moneda ?? estimatedCurrency)}</strong>
            </div>
            {draftRoom ? (
              <div className="span-all payment-room-highlight">
                <BedDouble size={18} />
                <div>
                  <strong>{draftRoom.NombreTipoHabitacion}</strong>
                  <p>{draftRoom.NombreSucursal} · {draftRoom.Ciudad}</p>
                </div>
              </div>
            ) : null}
          </div>

          {mutation.isSuccess ? (
            <div className="payment-success-card deluxe">
              <div className="success-mark"><BadgeCheck size={34} /></div>
              <span className="eyebrow">Pago aprobado</span>
              <h2>Tu reserva quedó confirmada.</h2>
              <p>Registramos el pago simulado con éxito. La factura ya no tiene saldo pendiente y la reserva quedó lista para recepción.</p>
              <div className="payment-success-meta">
                <span>Referencia: {mutation.data.payment.Pago.Referencia}</span>
                <span>Transaccion: {mutation.data.payment.Pago.TransaccionExterna}</span>
                <span>Autorizacion: {mutation.data.payment.Pago.CodigoAutorizacion}</span>
              </div>
              <div className="payment-actions">
                <button
                  type="button"
                  className="customer-primary-button"
                  onClick={() => {
                    const finalReservation = completedReservation ?? createdReservation ?? reservation;
                    if (!finalReservation?.ReservaGuid) {
                      return;
                    }
                    navigate(`/reserva-confirmada?reserva=${encodeURIComponent(finalReservation.ReservaGuid)}`, {
                      replace: true,
                      state: {
                        accessToken,
                        reservation: finalReservation,
                      },
                    });
                  }}
                >
                  Ir a confirmacion
                </button>
                <Link to="/" className="customer-secondary-button">Volver al hotel</Link>
              </div>
            </div>
          ) : canRenderCheckout ? (
            <div className="payment-checkout-grid payment-checkout-polished">
              <form className="payment-form deluxe" onSubmit={(event) => { event.preventDefault(); mutation.mutate(); }}>
                <div className="payment-form-header">
                  <div>
                    <span className="eyebrow">Tarjeta</span>
                    <h2>Pagar y confirmar</h2>
                  </div>
                  <span className="payment-lock"><LockKeyhole size={14} /> Simulación segura</span>
                </div>

                <label className="span-2">
                  <span>Nombre del titular</span>
                  <input
                    value={form.cardholder}
                    onChange={(event) => setForm((current) => ({ ...current, cardholder: event.target.value }))}
                    placeholder="Como aparece en la tarjeta"
                  />
                </label>

                <label className="span-2">
                  <span>Numero de tarjeta</span>
                  <input
                    inputMode="numeric"
                    value={form.cardNumber}
                    onChange={(event) => setForm((current) => ({ ...current, cardNumber: formatCardNumber(event.target.value) }))}
                    placeholder="1234 5678 9012 3456"
                  />
                </label>

                <label>
                  <span>Expiracion</span>
                  <input
                    className={expiryInvalid ? 'input-error' : ''}
                    inputMode="numeric"
                    value={form.expiry}
                    onChange={(event) => setForm((current) => ({ ...current, expiry: formatExpiry(event.target.value) }))}
                    placeholder="MM/AA"
                  />
                  {expiryInvalid ? <small className="field-error">Debe ser posterior al mes actual.</small> : null}
                </label>

                <label>
                  <span>CVV</span>
                  <input
                    inputMode="numeric"
                    value={form.cvv}
                    onChange={(event) => setForm((current) => ({ ...current, cvv: event.target.value.replace(/\D/g, '').slice(0, 4) }))}
                    placeholder="123"
                  />
                </label>

                <label className="span-2">
                  <span>Referencia de pago</span>
                  <input value={form.reference} readOnly />
                </label>

                {error ? <StatusMessage kind="error" title={error} /> : null}

                <button type="submit" className="customer-primary-button icon-text" disabled={mutation.isPending || !paymentReady}>
                  <CreditCard size={18} />
                  <span>{mutation.isPending ? 'Procesando simulacion...' : `Pagar ${money(actionAmount, invoice?.Moneda ?? estimatedCurrency)}`}</span>
                </button>
              </form>

              <aside className="payment-card-stage">
                <div className="payment-card-preview">
                  <div className="payment-card-top">
                    <span>{cardBrand}</span>
                    <Sparkles size={16} />
                  </div>
                  <strong>{maskCardNumber(form.cardNumber)}</strong>
                  <div className="payment-card-bottom">
                    <div>
                      <small>Titular</small>
                      <span>{form.cardholder || 'Nombre del titular'}</span>
                    </div>
                    <div>
                      <small>Expira</small>
                      <span>{form.expiry || 'MM/AA'}</span>
                    </div>
                  </div>
                </div>

                <div className="payment-side-note">
                  <article>
                    <Receipt size={18} />
                    <div>
                      <strong>{invoice?.NumeroFactura ?? 'Factura al confirmar'}</strong>
                      <p>{reservation ? 'La factura ya está emitida.' : 'La factura se emitirá al procesar el pago.'}</p>
                    </div>
                  </article>
                  <article>
                    <UserRound size={18} />
                    <div>
                      <strong>Estado de la reserva</strong>
                      <p>{reservation?.EstadoReserva ?? 'Pendiente de creación'}</p>
                    </div>
                  </article>
                </div>
              </aside>
            </div>
          ) : null}


        </section>

        <aside className="payment-sidebar payment-sidebar-polished">
          <article>
            <CalendarDays size={22} />
            <div>
              <strong>Resumen de reserva</strong>
              <p>{reservation?.CodigoReserva ?? 'Reserva en preparación'}{reservationStayLabel ? ` · ${reservationStayLabel}` : ''}</p>
            </div>
          </article>
          <article>
            <CreditCard size={22} />
            <div>
              <strong>Total a pagar</strong>
              <p>{money(actionAmount, invoice?.Moneda ?? estimatedCurrency)}</p>
            </div>
          </article>
          <article>
            <LockKeyhole size={22} />
            <div>
              <strong>Flujo simulado</strong>
              <p>Al pulsar pagar, el portal registra la reserva y ejecuta el pago simulado en un solo paso.</p>
            </div>
          </article>
        </aside>

        {(displayedLineItems.length > 0 || draftRoom) ? (
          <section className="payment-lines">
            <div className="customer-section-header">
              <div>
                <span className="eyebrow">Detalle</span>
                <h2>Habitaciones reservadas</h2>
              </div>
            </div>
            <div className="payment-line-list">
              {displayedLineItems.length > 0 ? displayedLineItems.map((line) => (
                <article key={line.ReservaHabitacionGuid}>
                  <strong>
                    Habitacion {line.HabitacionGuid ? line.HabitacionGuid.slice(0, 8) : `#${line.IdHabitacion ?? 'N/A'}`}
                  </strong>
                  <span>{line.NumAdultos} adulto(s) · {line.NumNinos} niño(s)</span>
                  <strong>{money(line.TotalLinea, invoice?.Moneda ?? estimatedCurrency)}</strong>
                </article>
              )) : draftRoom ? (
                <article>
                  <strong>{draftRoom.NombreTipoHabitacion}</strong>
                  <span>{draftGuests ? `${draftGuests.adults} adulto(s) · ${draftGuests.children} niño(s)` : '1 habitación'}</span>
                  <strong>{money(draftRoom.PrecioTotalConImpuestos, draftRoom.Moneda)}</strong>
                </article>
              ) : null}
            </div>
          </section>
        ) : null}
      </main>
    </div>
  );
}
