type LoadingVariant = "entries" | "offers" | "rows" | "entry-form" | "offer-form" | "options" | "task";

function EntryReservation() {
  return <div className="menu-loading__item"><div className="menu-loading__image" /><div className="menu-loading__card-body">{Array.from({ length: 6 }, (_, index) => <span key={index} />)}</div></div>;
}
function OfferReservation() {
  return <div className="menu-loading__item">
    <div className="menu-loading__offer-content"><div className="menu-loading__image" /><span className="menu-loading__title" /><span className="menu-loading__entry" /><span className="menu-loading__money" /></div>
    <div className="menu-loading__offer-details"><span className="menu-loading__state" /><span className="menu-loading__status-action" /><span className="menu-loading__composition-count" /></div>
    <div className="menu-loading__offer-actions"><span /></div>
    <div className="menu-loading__offer-hint"><span /></div>
  </div>;
}
function Fields() { return <div className="menu-loading__fields"><span /><span /><span /></div>; }

/** The surrounding page owns the real heading, filters and actions. */
export function LoadingState({ label, variant = "rows" }: Readonly<{ label?: string; variant?: LoadingVariant }>) {
  const entryForm = variant === "entry-form";
  const offerForm = variant === "offer-form";
  const rootClass = entryForm ? " entry-form__layout" : offerForm ? " offer-form" : "";
  return <div className={`menu-loading menu-loading--${variant}${rootClass}`} data-loading-state={variant} aria-hidden={label ? undefined : true}>
    {label && <p className={variant === "task" ? "menu-loading__message" : "sr-only"} role="status">{label}</p>}
    {offerForm ? <div className="menu-loading__offer-regions" aria-hidden="true">
      <div className="offer-commercial-info">
        <div className="offer-commercial-info__title">1. Información comercial</div>
        <div className="offer-commercial-info__grid"><Fields /><div className="menu-loading__image-column"><span className="menu-loading__label" /><div className="menu-loading__image" /></div></div>
      </div>
      <div className="composition-editor"><div className="composition-editor__title">2. Composición</div><div className="menu-loading__composition" /></div>
    </div> : <div className="menu-loading__shapes" aria-hidden="true">
      {entryForm ? <><div className="menu-loading__entry-primary"><span className="menu-loading__section-title" /><Fields /><div className="menu-loading__category" /></div><div className="menu-loading__entry-secondary"><span className="menu-loading__section-title" /><div className="menu-loading__image-zone"><div className="menu-loading__image" /><span /></div></div></>
        : variant === "task" ? <><Fields /><div className="menu-loading__image" /></>
        : Array.from({ length: variant === "options" ? 2 : 3 }, (_, index) => variant === "entries" ? <EntryReservation key={index} /> : variant === "offers" ? <OfferReservation key={index} /> : <div className="menu-loading__item" key={index}><span /><span /><span /></div>)}
    </div>}
  </div>;
}
