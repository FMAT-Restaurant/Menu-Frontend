import { useEffect, useState } from "react";
import type { MenuOffer, MenuOfferDetail, MenuRepository } from "../../application/catalog";

export interface CopyCompositionOverlayProps {
  repository: Pick<MenuRepository, "listOffers" | "getOffer">;
  excludeOfferId?: string;
  onCopyComposition: (sourceOffer: MenuOfferDetail) => void;
  onClose: () => void;
}

export function CopyCompositionOverlay({
  repository,
  excludeOfferId,
  onCopyComposition,
  onClose,
}: Readonly<CopyCompositionOverlayProps>) {
  const [offers, setOffers] = useState<MenuOffer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);
  const [copyingOfferId, setCopyingOfferId] = useState<string | null>(null);
  const [copyError, setCopyError] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError("");

    repository
      .listOffers(undefined, 1, 100, controller.signal, excludeOfferId)
      .then((page) => {
        if (!controller.signal.aborted) {
          const candidates = (page.data || []).filter((off) => off.id !== excludeOfferId);
          setOffers(candidates);
        }
      })
      .catch(() => {
        if (!controller.signal.aborted) {
          setError("No se pudieron cargar las ofertas.");
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      });

    return () => controller.abort();
  }, [repository, excludeOfferId, retry]);

  async function handleCopy(offer: MenuOffer) {
    setCopyingOfferId(offer.id);
    setCopyError("");
    try {
      const response = await repository.getOffer(offer.id);
      onCopyComposition(response.data);
    } catch {
      setCopyError("No se pudo obtener la composición de la oferta seleccionada.");
    } finally {
      setCopyingOfferId(null);
    }
  }

  return (
    <div
      className="fullscreen-overlay category-screen"
      role="dialog"
      aria-modal="true"
      aria-labelledby="copy-composition-title"
    >
      <header className="fullscreen-overlay__header category-screen__header">
        <div>
          <p className="eyebrow" style={{ color: "#9ca3af", margin: 0, fontSize: "12px" }}>
            Administración del menú
          </p>
          <h2 id="copy-composition-title">Copiar composición desde otra oferta</h2>
        </div>
        <button
          type="button"
          className="button button--secondary button--quiet category-screen__back"
          onClick={onClose}
          disabled={Boolean(copyingOfferId)}
        >
          [ X Cancelar ]
        </button>
      </header>

      <div className="fullscreen-overlay__body category-screen__main">
        {loading && <p className="feedback">Cargando ofertas disponibles…</p>}

        {error && (
          <div className="feedback feedback--error" role="alert">
            {error}{" "}
            <button type="button" onClick={() => setRetry((r) => r + 1)}>
              Reintentar
            </button>
          </div>
        )}

        {copyError && (
          <div className="feedback feedback--error" role="alert">
            {copyError}
          </div>
        )}

        {!loading && !error && (
          <div className="fullscreen-overlay__table-wrapper">
            {offers.length === 0 ? (
              <div className="empty-state category-empty" style={{ padding: "32px", textAlign: "center" }}>
                <span className="empty-state__icon" aria-hidden="true">
                  ⌕
                </span>
                <h3>No hay otras ofertas para copiar composición.</h3>
                <p>No se encontraron ofertas en el catálogo disponibles como fuente de copia.</p>
              </div>
            ) : (
              <table className="selection-table" aria-label="Ofertas candidatas para copia">
                <thead>
                  <tr>
                    <th scope="col">Entrada</th>
                    <th scope="col">Etiqueta de presentación</th>
                    <th scope="col">Precio</th>
                    <th scope="col" className="selection-table__action-col">
                      Acción
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {offers.map((off) => (
                    <tr key={off.id} className="offer-selection-row">
                      <td>
                        <strong>{off.entryName}</strong>
                      </td>
                      <td>{off.presentationTag || "Sin etiqueta"}</td>
                      <td>$ {off.basePrice}</td>
                      <td className="selection-table__action-col">
                        <button
                          type="button"
                          className="button button--secondary button--small"
                          onClick={() => void handleCopy(off)}
                          disabled={Boolean(copyingOfferId)}
                          aria-label={`Copiar composición de ${off.entryName} ${off.presentationTag || ""}`.trim()}
                        >
                          {copyingOfferId === off.id ? "Copiando…" : "[ Copiar composición ]"}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
