type LoadingVariant = "entries" | "offers" | "category-rows" | "recipe-rows" | "recipe-selection" | "options";

function EntryReservation() {
  return <div className="entry-card menu-loading__entry">
    <div className="menu-loading__image" />
    <div className="entry-card__body">
      <span className="menu-loading__row-title" />
      <div className="menu-loading__description"><span /><span /></div>
      <span className="menu-loading__chip" />
      <div className="entry-card__meta"><span /><span /></div>
      <div className="entry-card__actions"><RowAction label="Ver ofertas" /><RowAction label="Editar" /></div>
    </div>
  </div>;
}
function OfferReservation() {
  return <div className="offer-card menu-loading__offer">
    <div className="menu-loading__image" />
    <div className="offer-card__body">
      <div className="offer-card__summary">
        <div><span className="menu-loading__row-title" /><span className="menu-loading__row-description" /></div>
        <span className="menu-loading__price" />
      </div>
      <div className="offer-card__details"><span className="menu-loading__state" /><span className="menu-loading__count" /></div>
      <div className="offer-card__edit"><span className="menu-loading__edit" /></div>
    </div>
    <div className="offer-card__actions"><RowAction label="Activar oferta" /></div>
  </div>;
}

/** A decorative reservation for a single value; its real label stays visible. */
export function LoadingValue({ kind = "field" }: Readonly<{ kind?: "field" | "multiline" | "image" | "line" | "composition" }>) {
  return <span className={`loading-value loading-value--${kind}`} aria-hidden="true" />;
}

function RowAction({ label }: Readonly<{ label: string }>) {
  // Invisible static action labels provide the same intrinsic size as the real
  // controls. This remains a decorative div, without a role or tab stop.
  return <div className="menu-loading__row-action"><span className="menu-loading__action-measure">{label}</span></div>;
}
function RowReservation({ variant }: Readonly<{ variant: "category-rows" | "recipe-rows" | "recipe-selection" }>) {
  const text = <div className="menu-loading__row-text"><span className="menu-loading__row-title" /><span className="menu-loading__row-description" />{variant === "category-rows" && <div className="menu-loading__row-meta"><span /></div>}</div>;
  if (variant === "category-rows") return <div className="category-row menu-loading__row">{text}<RowAction label="Editar" /></div>;
  return <div className="recipe-card menu-loading__row"><div className="recipe-card__header">{text}<div className="recipe-card__actions">{variant === "recipe-selection" ? <RowAction label="Asignar" /> : <><RowAction label="Editar" /><RowAction label="Eliminar" /></>}</div></div><div className="recipe-card__supplies"><span className="menu-loading__supplies-line" /></div></div>;
}

/** The surrounding page owns the real heading, filters and actions. */
export function LoadingState({ label, variant }: Readonly<{ label?: string; variant: LoadingVariant }>) {
  return <div className={`menu-loading menu-loading--${variant}`} data-loading-state={variant} aria-hidden={label ? undefined : true}>
    {label && <p className="sr-only" role="status">{label}</p>}
    <div className="menu-loading__shapes" aria-hidden="true">
      {Array.from({ length: variant === "options" ? 2 : 3 }, (_, index) => variant === "entries" ? <EntryReservation key={index} /> : variant === "offers" ? <OfferReservation key={index} /> : variant === "category-rows" || variant === "recipe-rows" || variant === "recipe-selection" ? <RowReservation key={index} variant={variant} /> : <div className="menu-loading__option" key={index}><span /><span /></div>)}
    </div>
  </div>;
}
