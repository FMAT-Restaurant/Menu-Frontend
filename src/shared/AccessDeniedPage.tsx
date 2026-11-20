export function AccessDeniedPage() {
  return (
    <div className="app-shell not-found-page">
      <main className="menu-page menu-page--message not-found-page__content">
        <header className="task-header">
          <div className="task-header__content">
            <h1 data-route-heading tabIndex={-1}>Sin acceso</h1>
            <p className="task-header__intro">No tienes permiso para consultar esta sección.</p>
          </div>
        </header>
        <a href="/" className="button button--primary">Volver al menú</a>
      </main>
    </div>
  );
}
