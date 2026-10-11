import { useEffect, useRef, useState } from "react";
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
  if (!state || typeof state !== "object" || !("returnTo" in state) || typeof state.returnTo !== "string") return "/";
  const path = state.returnTo;
  if (!path.startsWith("/") || path.startsWith("//")) return "/";
  try {
    const url = new URL(path, window.location.origin);
    return url.origin === window.location.origin ? `${url.pathname}${url.search}${url.hash}` : "/";
  } catch {
    return "/";
  }
}

export function OffersPage({ repository }: Readonly<{ repository: Pick<MenuRepository, "getEntry" | "listOffers" | "setOfferStatus" | "deleteInactiveOffer"> }>) {
  const { entryId } = useParams();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const page = selectedPage(searchParams.get("page"));
  const [entry, setEntry] = useState<MenuEntryDetail | null>(null);
  const [result, setResult] = useState<Page<MenuOffer> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionError, setActionError] = useState("");
  const [notice, setNotice] = useState("");
  const [retry, setRetry] = useState(0);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [offerToDelete, setOfferToDelete] = useState<MenuOffer | null>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);
  const backTo = returnPath(location.state);
  const offerPath = `/entries/${encodeURIComponent(entryId ?? "")}/offers`;

  useEffect(() => {
    if (!entryId) return;
    const controller = new AbortController();
    setLoading(true);
    setError("");
    Promise.all([
      repository.getEntry(entryId, controller.signal),
      repository.listOffers(entryId, page, pageSize, controller.signal),
    ]).then(([loadedEntry, offers]) => {
      if (!controller.signal.aborted) {
        setEntry(loadedEntry);
        setResult(offers);
      }
    }).catch(() => {
      if (!controller.signal.aborted) setError("No se pudieron cargar las ofertas de esta entrada.");
    }).finally(() => {
      if (!controller.signal.aborted) setLoading(false);
    });
    return () => controller.abort();
  }, [repository, entryId, page, retry]);

  useEffect(() => {
    if (!offerToDelete) return;
    const previousFocus = document.activeElement as HTMLElement | null;
    const dialog = dialogRef.current;
    if (typeof dialog?.showModal === "function") dialog.showModal();
    else dialog?.setAttribute("open", "");
    cancelRef.current?.focus();
    return () => {
      if (dialog?.open && typeof dialog.close === "function") dialog.close();
      previousFocus?.focus();
    };
  }, [offerToDelete]);

  async function changeStatus(offer: MenuOffer, status: OfferStatus) {
    setBusyId(offer.id);
    setActionError("");
    setNotice("");
    try {
      await repository.setOfferStatus(offer.id, status);
      setNotice(status === "ACTIVE" ? "Oferta activada." : "Oferta inactivada.");
      setRetry((current) => current + 1);
    } catch {
      setActionError("No se pudo cambiar el estado. Comprueba la composición y recarga la lista.");
    } finally {
      setBusyId(null);
    }
  }

  async function confirmDelete() {
    if (!offerToDelete) return;
    setBusyId(offerToDelete.id);
    setActionError("");
    setNotice("");
    try {
      await repository.deleteInactiveOffer(offerToDelete.id);
      setNotice("Oferta eliminada.");
      setRetry((current) => current + 1);
    } catch {
      setActionError("No se pudo eliminar la oferta. Recarga la lista y comprueba su estado.");
    } finally {
      setOfferToDelete(null);
      setBusyId(null);
    }
  }

  function goToPage(next: number) {
    const params = new URLSearchParams(searchParams);
    params.set("page", String(next));
    setSearchParams(params);
  }

  const offers = result?.data ?? [];
  const totalPages = result?.meta.totalPages ?? 0;
  const first = offers.length ? (page - 1) * pageSize + 1 : 0;
  const last = first ? first + offers.length - 1 : 0;

  return (
    <div className="app-shell">
      <nav className="global-nav" aria-label="Navegación principal">
        <Link className="brand" to="/"><span className="brand__mark" aria-hidden="true">F</span><span>FMAT <strong>Restaurant</strong></span></Link>
        <span className="global-nav__section">Administración del menú</span>
      </nav>
      <main className="offers-page">
        <Link className="back-link" to={backTo}>← Volver a entradas</Link>
        <header className="catalog-header offers-page__header">
          <div>
            <p className="eyebrow">Administración / Menú / Ofertas</p>
            <h1>Ofertas de {entry?.brandName ?? "la entrada"}</h1>
            <p className="catalog-header__intro">Cada presentación conserva la identidad comercial de esta entrada.</p>
          </div>
          <Link className="button button--primary" to={`${offerPath}/new`} state={{ returnTo: location.pathname + location.search }}>Nueva oferta</Link>
        </header>
        {entry && <p className="offers-page__context">Estado administrativo de la entrada: <strong>{entryStatusLabel[entry.status]}</strong>. Una oferta activa solo se publica si la entrada está activa y cumple las reglas de publicación.</p>}
        {error && <div className="feedback feedback--error" role="alert">{error} <button type="button" onClick={() => setRetry((current) => current + 1)}>Reintentar</button></div>}
        {actionError && <div className="feedback feedback--error" role="alert">{actionError}</div>}
        {notice && <output className="feedback feedback--success">{notice}</output>}
        {loading && <output className="feedback">Cargando ofertas…</output>}
        {!loading && !error && (
          <>
            <p className="offers-page__count">Mostrando {first}–{last} de {result?.meta.total ?? 0} ofertas</p>
            {offers.length > 0 ? (
              <section className="offer-grid" aria-label="Ofertas de la entrada">
                {offers.map((offer) => <OfferCard key={offer.id} offer={offer} busy={busyId === offer.id} onStatusChange={changeStatus} onDelete={setOfferToDelete} />)}
              </section>
            ) : (
              <section className="empty-state">
                <span className="empty-state__icon" aria-hidden="true">＋</span>
                <h2>{page > 1 ? "No hay ofertas en esta página." : "Esta entrada aún no tiene ofertas."}</h2>
                <p>{page > 1 ? "Vuelve a la primera página para consultar las ofertas." : "Crea una presentación para definir su precio y composición."}</p>
                {page > 1 ? <button className="button button--primary" type="button" onClick={() => goToPage(1)}>Primera página</button> : <Link className="button button--primary" to={`${offerPath}/new`} state={{ returnTo: location.pathname + location.search }}>Crear primera oferta</Link>}
              </section>
            )}
            {totalPages > 1 && <nav className="pagination" aria-label="Páginas de ofertas">
              <button className="button button--secondary" type="button" disabled={page <= 1} onClick={() => goToPage(page - 1)}>Anterior</button>
              <span className="offers-page__page">Página {page} de {totalPages}</span>
              <button className="button button--secondary" type="button" disabled={page >= totalPages} onClick={() => goToPage(page + 1)}>Siguiente</button>
            </nav>}
          </>
        )}
        {offerToDelete && <div className="dialog-backdrop">
          <dialog ref={dialogRef} className="confirm-dialog" aria-modal="true" aria-labelledby="offer-delete-title" aria-describedby="offer-delete-description" onCancel={(event) => { event.preventDefault(); setOfferToDelete(null); }}>
            <h2 id="offer-delete-title">Eliminar oferta inactiva</h2>
            <p id="offer-delete-description">¿Eliminar definitivamente la presentación “{offerToDelete.presentationTag}” de {offerToDelete.entryName}?</p>
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
