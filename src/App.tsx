import { BrowserRouter, Link, Route, Routes } from "react-router-dom";

function MenuHome() {
  return (
    <main className="page-shell">
      <header className="brand-row">
        <span className="brand-mark" aria-hidden="true">F</span>
        <span>FMAT Restaurant</span>
      </header>
      <section className="welcome-card" aria-labelledby="page-title">
        <p className="eyebrow">Servicio de menú</p>
        <h1 id="page-title">Menú</h1>
        <p className="intro-copy">
          El menú del restaurante estará disponible aquí.
        </p>
        <Link className="menu-link" to="/menu">Ver menú</Link>
      </section>
    </main>
  );
}

function MenuRoute() {
  return (
    <main className="page-shell">
      <Link className="back-link" to="/">Volver al inicio</Link>
      <section className="welcome-card" aria-labelledby="page-title">
        <p className="eyebrow">Servicio de menú</p>
        <h1 id="page-title">Menú</h1>
        <p className="intro-copy">
          La carta se conectará al catálogo del restaurante.
        </p>
      </section>
    </main>
  );
}

export function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<MenuHome />} />
        <Route path="/menu" element={<MenuRoute />} />
      </Routes>
    </BrowserRouter>
  );
}
