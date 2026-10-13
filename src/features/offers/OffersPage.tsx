import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useLocation, useParams, useSearchParams } from "react-router-dom";
import type { MenuEntryDetail, MenuOffer, MenuRepository, OfferStatus, Page } from "../../application/catalog";
import { OfferCard } from "./OfferCard";

const pageSize = 12;
const entryStatusLabel = { ACTIVE: "Activa", INACTIVE: "Inactiva", ARCHIVED: "Archivada" };

function selectedPage(value: string | null) {
  const number = Number(value);
  return Number.isSafeInteger(number) && number > 0 ? number : 1;
}

function returnPath(state: unknown) {
  if (!state || typeof state !== "object") return "/";
  let path = "/";
  if ("catalogReturnTo" in state && typeof state.catalogReturnTo === "string") {
    path = state.catalogReturnTo;
  } else if ("returnTo" in state && typeof state.returnTo === "string") {
    path = state.returnTo;
  }
  if (!path.startsWith("/") || path.startsWith("//")) return "/";
  try {
    const url = new URL(path, window.location.origin);
    return url.origin === window.location.origin ? `${url.pathname}${url.search}${url.hash}` : "/";
  } catch {
    return "/";
  }
}

type ErrorScope = "entry" | "offers" | "status" | "delete";

function httpStatus(error: unknown) {
  if (!error || typeof error !== "object" || !("response" in error)) return undefined;
  const response = error.response;
  if (!response || typeof response !== "object" || !("status" in response)) return undefined;
  return typeof response.status === "number" ? response.status : undefined;
}

function transportCode(error: unknown) {
  if (!error || typeof error !== "object" || !("code" in error)) return undefined;
  return typeof error.code === "string" ? error.code : undefined;
}

function failureMessage(error: unknown, scope: ErrorScope) {
  const status = httpStatus(error);
  const code = transportCode(error);
  if (status === 401 || status === 403) return "No tienes acceso a esta operación. Verifica tu sesión y permisos.";
  if (status === 404) return scope === "entry" ? "La entrada solicitada ya no existe." : "La entrada u oferta solicitada ya no existe.";
  if (status === 409 || status === 412) return "Los datos cambiaron desde que se cargaron. Actualiza la lista antes de volver a intentarlo.";
  if (status === 422) return "El servidor rechazó los datos de la oferta. Revisa su estado y composición.";
  if (status === 429 || (status !== undefined && status >= 500)) return "El servicio está temporalmente indisponible. Inténtalo de nuevo en unos momentos.";
  if (code === "ECONNABORTED" || code === "ETIMEDOUT") return "La operación agotó el tiempo de espera. Actualiza los datos para confirmar su estado antes de volver a intentarlo.";
  if (code === "ERR_NETWORK") return "No se pudo conectar con el servicio. Comprueba tu conexión e inténtalo de nuevo.";
  if (scope === "entry") return "No se pudo consultar la entrada.";
  if (scope === "offers") return "No se pudieron cargar las ofertas.";
  if (scope === "status") return "No se pudo cambiar el estado de la oferta.";
  return "No se pudo eliminar la oferta.";
}

type Repository = Pick<MenuRepository, "getEntry" | "listOffers" | "setOfferStatus" | "deleteInactiveOffer">;
type LoadError = "entry" | "offers" | null;

function statusNotice(status: OfferStatus, refreshFailed: boolean) {
  let action = "inactivada";
  if (status === "ACTIVE") action = "activada";
  if (refreshFailed) return `Oferta ${action}, pero no se pudo actualizar la lista.`;
  return `Oferta ${action}.`;
}

function deleteNotice(refreshFailed: boolean) {
  if (refreshFailed) return "Oferta eliminada, pero no se pudo actualizar la lista.";
  return "Oferta eliminada.";
}

function loadErrorForView(entryError: boolean, entry: MenuEntryDetail | null, offersError: boolean): LoadError {
  if (entryError && !entry) return "entry";
  if (offersError) return "offers";
  return null;
}

function errorMessageForLoad(error: LoadError, entryMessage: string, offersMessage: string) {
  if (error === "entry") return entryMessage;
  return `${offersMessage} La información anterior se conserva.`;
}

function retryLabelForLoad(error: LoadError) {
  if (error === "entry") return "entrada";
  return "ofertas";
}

interface OffersFeedbackProps {
  loadError: LoadError;
  entryErrorMessage: string;
  offersErrorMessage: string;
  actionError: string;
  notice: string;
  onRetryEntry(): void;
  onRetryOffers(): void;
}

function OffersFeedback({ loadError, entryErrorMessage, offersErrorMessage, actionError, notice, onRetryEntry, onRetryOffers }: Readonly<OffersFeedbackProps>) {
  const message = errorMessageForLoad(loadError, entryErrorMessage, offersErrorMessage);
  const retryLabel = retryLabelForLoad(loadError);
  const onRetry = loadError === "entry" ? onRetryEntry : onRetryOffers;

  return <>
    {loadError && <div className="feedback feedback--error" role="alert">
      {message}
      <button type="button" onClick={onRetry}>Reintentar {retryLabel}</button>
    </div>}
    {actionError && <div className="feedback feedback--error" role="alert">{actionError} <button type="button" onClick={onRetryOffers}>Actualizar datos</button></div>}
    {notice && <output className="feedback feedback--success">{notice}</output>}
  </>;
}

interface OffersCollectionProps {
  isEmpty: boolean;
  offers: MenuOffer[];
  updatingOffers: boolean;
  busy: boolean;
  offerPath: string;
  returnTo: string;
  catalogReturnTo: string;
  onStatusChange(offer: MenuOffer, status: OfferStatus): void;
  onDelete(offer: MenuOffer): void;
  onReload(): void;
}

function OffersCollection({ isEmpty, offers, updatingOffers, busy, offerPath, returnTo, catalogReturnTo, onStatusChange, onDelete, onReload }: Readonly<OffersCollectionProps>) {
  if (isEmpty) {
    return <section className="empty-state offers-empty">
      <h2>No hay ofertas configuradas.</h2>
      <p>La creación de ofertas estará disponible en V4.</p>
      <Link className="button button--primary" to={`${offerPath}/new`} state={{ returnTo, catalogReturnTo }}>Crear primera oferta</Link>
    </section>;
  }

  if (offers.length === 0) {
    return <div className="feedback feedback--error" role="alert">La respuesta no contiene ofertas para la página solicitada. <button type="button" onClick={onReload}>Actualizar lista</button></div>;
  }

  return <section className={`offer-grid${updatingOffers ? " offer-grid--updating" : ""}`} aria-label="Ofertas de la entrada" aria-busy={updatingOffers}>
    {offers.map((offer) => <OfferCard key={offer.id} offer={offer} busy={busy} returnTo={returnTo} catalogReturnTo={catalogReturnTo} onStatusChange={onStatusChange} onDelete={onDelete} />)}
  </section>;
}

interface OffersPaginationProps {
  totalPages: number;
  isEmpty: boolean;
  page: number;
  displayedPage: number;
  offersLoading: boolean;
  onPageChange(nextPage: number): void;
}

function OffersPagination({ totalPages, isEmpty, page, displayedPage, offersLoading, onPageChange }: Readonly<OffersPaginationProps>) {
  if (totalPages <= 1 || isEmpty) return null;

  return <nav className="pagination" aria-label="Páginas de ofertas">
    <button className="button button--secondary" type="button" disabled={page <= 1 || offersLoading} onClick={() => onPageChange(page - 1)}>Anterior</button>
    <span className="offers-page__page">Página {displayedPage} de {totalPages}</span>
    <button className="button button--secondary" type="button" disabled={page >= totalPages || offersLoading} onClick={() => onPageChange(page + 1)}>Siguiente</button>
  </nav>;
}

interface OffersResultsProps extends OffersCollectionProps, OffersPaginationProps {
  initialLoading: boolean;
  result: Page<MenuOffer> | null;
  offersLoading: boolean;
  first: number;
  last: number;
}

function OffersResults({ initialLoading, result, offersLoading, first, last, ...collectionProps }: Readonly<OffersResultsProps>) {
  if (initialLoading) return <output className="feedback">Cargando ofertas…</output>;
  if (!result) return null;

  return <>
    {offersLoading && <output className="feedback" aria-live="polite">Actualizando ofertas…</output>}
    {!collectionProps.isEmpty && <p className="offers-page__count">Mostrando {first}–{last} de {result.meta.total} ofertas</p>}
    <OffersCollection {...collectionProps} />
    <OffersPagination totalPages={collectionProps.totalPages} isEmpty={collectionProps.isEmpty} page={collectionProps.page} displayedPage={collectionProps.displayedPage} offersLoading={offersLoading} onPageChange={collectionProps.onPageChange} />
  </>;
}

export function OffersPage({ repository }: Readonly<{ repository: Repository }>) {
  const { entryId } = useParams();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const page = selectedPage(searchParams.get("page"));
  const currentContext = `${entryId ?? ""}:${page}`;
  const currentContextRef = useRef(currentContext);
  currentContextRef.current = currentContext;
  const [entry, setEntry] = useState<MenuEntryDetail | null>(null);
  const [entryDataId, setEntryDataId] = useState<string | null>(null);
  const [result, setResult] = useState<Page<MenuOffer> | null>(null);
  const [resultEntryId, setResultEntryId] = useState<string | null>(null);
  const [entryLoading, setEntryLoading] = useState(true);
  const [offersLoading, setOffersLoading] = useState(true);
  const [entryError, setEntryError] = useState(false);
  const [entryErrorMessage, setEntryErrorMessage] = useState("");
  const [entryErrorId, setEntryErrorId] = useState<string | null>(null);
  const [offersError, setOffersError] = useState(false);
  const [offersErrorMessage, setOffersErrorMessage] = useState("");
  const [offersErrorContext, setOffersErrorContext] = useState<string | null>(null);
  const [actionError, setActionError] = useState("");
  const [notice, setNotice] = useState("");
  const [pendingAction, setPendingAction] = useState("");
  const [entryRetry, setEntryRetry] = useState(0);
  const [offersRetry, setOffersRetry] = useState(0);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [updatingOffers, setUpdatingOffers] = useState(false);
  const [offerToDelete, setOfferToDelete] = useState<MenuOffer | null>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);
  const deleteTriggerRef = useRef<HTMLElement | null>(null);
  const backTo = returnPath(location.state);
  const offerPath = `/entries/${encodeURIComponent(entryId ?? "")}/offers`;

  useEffect(() => {
    if (!entryId) return;
    const controller = new AbortController();
    setEntryLoading(true);
    setEntryError(false);
    repository.getEntry(entryId, controller.signal).then((loadedEntry) => {
      if (!controller.signal.aborted) {
        setEntry(loadedEntry);
        setEntryDataId(entryId);
      }
    }).catch((error: unknown) => {
      if (!controller.signal.aborted) {
        setEntryError(true);
        setEntryErrorMessage(failureMessage(error, "entry"));
        setEntryErrorId(entryId);
      }
    }).finally(() => {
      if (!controller.signal.aborted) setEntryLoading(false);
    });
    return () => controller.abort();
  }, [repository, entryId, entryRetry]);

  useEffect(() => {
    setActionError("");
    setNotice("");
    setBusyId(null);
    setUpdatingOffers(false);
    setPendingAction("");
    setOfferToDelete(null);
  }, [entryId, page]);

  const reloadOffers = useCallback(async (signal: AbortSignal) => {
    if (!entryId) return;
    setOffersLoading(true);
    setOffersError(false);
    setOffersErrorMessage("");
    try {
      const offers = await repository.listOffers(entryId, page, pageSize, signal);
      if (signal.aborted) return;
      const lastPage = Math.max(1, offers.meta.totalPages);
      if (offers.meta.total === 0 && page !== 1) {
        const params = new URLSearchParams(searchParams);
        params.delete("page");
        setSearchParams(params, { replace: true });
        return;
      }
      if (offers.meta.total > 0 && page > lastPage) {
        const params = new URLSearchParams(searchParams);
        params.set("page", String(lastPage));
        setSearchParams(params, { replace: true });
        return;
      }
      setResult(offers);
      setResultEntryId(entryId);
    } catch (error: unknown) {
      if (!signal.aborted) {
        setOffersError(true);
        setOffersErrorMessage(failureMessage(error, "offers"));
        setOffersErrorContext(currentContext);
      }
    } finally {
      if (!signal.aborted) setOffersLoading(false);
    }
  }, [currentContext, entryId, page, repository, searchParams, setSearchParams]);

  useEffect(() => {
    const controller = new AbortController();
    void reloadOffers(controller.signal);
    return () => controller.abort();
  }, [reloadOffers, offersRetry]);

  useEffect(() => {
    if (!offerToDelete) return;
    const dialog = dialogRef.current;
    if (typeof dialog?.showModal === "function") dialog.showModal();
    else dialog?.setAttribute("open", "");
    cancelRef.current?.focus();
    return () => {
      if (dialog?.open && typeof dialog.close === "function") dialog.close();
      if (!document.contains(deleteTriggerRef.current)) document.querySelector<HTMLElement>(".offers-page h1")?.focus();
      else deleteTriggerRef.current?.focus();
    };
  }, [offerToDelete]);

  async function reconcileOffers(signal?: AbortSignal, expectedContext = currentContext): Promise<"updated" | "navigating" | "failed" | "stale"> {
    setUpdatingOffers(true);
    try {
      const offers = await repository.listOffers(entryId ?? "", page, pageSize, signal);
      if (signal?.aborted || currentContextRef.current !== expectedContext) return "stale";
      const lastPage = Math.max(1, offers.meta.totalPages);
      if (offers.meta.total === 0 && page !== 1) {
        const params = new URLSearchParams(searchParams);
        params.delete("page");
        setSearchParams(params, { replace: true });
        setOffersLoading(false);
        setUpdatingOffers(false);
        setBusyId(null);
        return "navigating";
      } else if (offers.meta.total > 0 && page > lastPage) {
        const params = new URLSearchParams(searchParams);
        params.set("page", String(lastPage));
        setSearchParams(params, { replace: true });
        setOffersLoading(false);
        setUpdatingOffers(false);
        setBusyId(null);
        return "navigating";
      } else {
        setResult(offers);
        setResultEntryId(entryId ?? null);
        setOffersError(false);
        setOffersErrorMessage("");
        return "updated";
      }
    } catch (error: unknown) {
      if (signal?.aborted || currentContextRef.current !== expectedContext) return "stale";
      setOffersError(true);
      setOffersErrorMessage(failureMessage(error, "offers"));
      setOffersErrorContext(expectedContext);
      return "failed";
    } finally {
      if (!signal?.aborted) {
        setUpdatingOffers(false);
        setBusyId(null);
      }
    }
  }

  async function changeStatus(offer: MenuOffer, status: OfferStatus) {
    if (busyId) return;
    const expectedContext = currentContextRef.current;
    setBusyId(offer.id);
    setUpdatingOffers(true);
    setActionError("");
    setNotice("");
    setPendingAction("Actualizando estado de la oferta…");
    try {
      await repository.setOfferStatus(offer.id, status);
      if (currentContextRef.current !== expectedContext) return;
      const updated = await reconcileOffers(new AbortController().signal, expectedContext);
      if (updated === "stale") return;
      setNotice(statusNotice(status, updated === "failed"));
    } catch (error: unknown) {
      if (currentContextRef.current !== expectedContext) return;
      setActionError(failureMessage(error, "status"));
      setBusyId(null);
      setUpdatingOffers(false);
      setPendingAction("");
    }
  }

  async function confirmDelete() {
    if (!offerToDelete || busyId) return;
    const expectedContext = currentContextRef.current;
    setBusyId(offerToDelete.id);
    setUpdatingOffers(true);
    setActionError("");
    setNotice("");
    setPendingAction("Eliminando oferta…");
    try {
      await repository.deleteInactiveOffer(offerToDelete.id);
      if (currentContextRef.current !== expectedContext) return;
      setPendingAction("Actualizando lista…");
      const controller = new AbortController();
      const updated = await reconcileOffers(controller.signal, expectedContext);
      if (updated === "stale") return;
      deleteTriggerRef.current = null;
      setOfferToDelete(null);
      setNotice(deleteNotice(updated === "failed"));
      setPendingAction("");
    } catch (error: unknown) {
      if (currentContextRef.current !== expectedContext) return;
      setActionError(failureMessage(error, "delete"));
      setBusyId(null);
      setUpdatingOffers(false);
      setPendingAction("");
    }
  }

  function goToPage(next: number) {
    const params = new URLSearchParams(searchParams);
    if (next <= 1) params.delete("page");
    else params.set("page", String(next));
    setSearchParams(params);
  }

  const visibleEntry = entryDataId === entryId ? entry : null;
  const visibleResult = resultEntryId === entryId ? result : null;
  const offers = visibleResult?.data ?? [];
  const displayedPage = visibleResult?.meta.page ?? page;
  const totalPages = visibleResult?.meta.totalPages ?? 0;
  const first = offers.length ? (displayedPage - 1) * pageSize + 1 : 0;
  const last = first ? first + offers.length - 1 : 0;
  const initialLoading = (entryLoading && !visibleEntry) || (offersLoading && !visibleResult);
  const currentEntryError = entryError && entryErrorId === entryId;
  const currentOffersError = offersError && offersErrorContext === currentContext;
  const loadError = loadErrorForView(currentEntryError, visibleEntry, currentOffersError);
  const isEmpty = !initialLoading && !loadError && visibleResult?.meta.total === 0;

  return (
    <div className="app-shell">
      <nav className="global-nav" aria-label="Navegación principal">
        <Link className="brand" to="/"><span className="brand__mark" aria-hidden="true">F</span><span>FMAT <strong>Restaurant</strong></span></Link>
        <span className="global-nav__section">Administración del menú</span>
      </nav>
      <main className="offers-page" aria-busy={entryLoading || offersLoading || updatingOffers}>
        <Link className="back-link" to={backTo}>← Volver a entradas</Link>
        <header className="offers-header">
          <div>
            <p className="eyebrow">Administración / Menú / Ofertas</p>
            <h1 tabIndex={-1}>Ofertas de {visibleEntry?.brandName ?? "la entrada"}</h1>
            <p className="catalog-header__intro">Presentaciones vendibles de la misma identidad comercial.</p>
          </div>
          {!isEmpty && <Link className="button button--primary offers-header__action" to={`${offerPath}/new`} state={{ returnTo: location.pathname + location.search, catalogReturnTo: backTo }}>Nueva oferta · V4</Link>}
        </header>
        {visibleEntry && <p className="offers-page__context">Estado administrativo de la entrada: <strong>{entryStatusLabel[visibleEntry.status]}</strong>. Una oferta activa solo se publica si la entrada está activa y cumple las reglas de publicación.</p>}
        <OffersFeedback loadError={loadError} entryErrorMessage={entryErrorMessage} offersErrorMessage={offersErrorMessage} actionError={actionError} notice={notice} onRetryEntry={() => setEntryRetry((current) => current + 1)} onRetryOffers={() => setOffersRetry((current) => current + 1)} />
        <OffersResults initialLoading={initialLoading} result={visibleResult} offersLoading={offersLoading} first={first} last={last} isEmpty={isEmpty} offers={offers} updatingOffers={updatingOffers} busy={Boolean(busyId)} offerPath={offerPath} returnTo={location.pathname + location.search} catalogReturnTo={backTo} onStatusChange={changeStatus} onDelete={(selected) => { deleteTriggerRef.current = document.activeElement as HTMLElement; setOfferToDelete(selected); }} onReload={() => setOffersRetry((current) => current + 1)} totalPages={totalPages} page={page} displayedPage={displayedPage} onPageChange={goToPage} />
        {offerToDelete && <div className="dialog-backdrop">
          <dialog ref={dialogRef} className="confirm-dialog" aria-modal="true" aria-labelledby="offer-delete-title" aria-describedby="offer-delete-description" onCancel={(event) => { event.preventDefault(); if (busyId !== offerToDelete.id) setOfferToDelete(null); }}>
            <h2 id="offer-delete-title">Eliminar oferta inactiva</h2>
            <p id="offer-delete-description">¿Eliminar definitivamente la presentación “{offerToDelete.presentationTag}” de {offerToDelete.entryName}?</p>
            {pendingAction && <output className="feedback" aria-live="polite">{pendingAction}</output>}
            {actionError && <p className="feedback feedback--error" role="alert">{actionError}</p>}
            <div className="confirm-dialog__actions">
              <button ref={cancelRef} className="button button--secondary" type="button" disabled={busyId === offerToDelete.id} onClick={() => setOfferToDelete(null)}>Cancelar</button>
              <button className="button button--danger" type="button" disabled={busyId === offerToDelete.id} onClick={() => { void confirmDelete(); }}>Eliminar oferta</button>
            </div>
          </dialog>
        </div>}
      </main>
    </div>
  );
}
