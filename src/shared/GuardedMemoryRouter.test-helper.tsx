import "./dataRouter.test-helper";
import { createContext, useContext, useEffect, useRef, useState, type ComponentProps, type ReactNode } from "react";
import { createMemoryRouter, RouterProvider, type MemoryRouter } from "react-router-dom";
import { EditGuardProvider } from "./editGuard";

const Content = createContext<ReactNode>(null);
function TestRoute() { return <EditGuardProvider>{useContext(Content)}</EditGuardProvider>; }

/** Data-router counterpart of MemoryRouter, preserving rerendered test children. */
export function GuardedMemoryRouter({ children, initialEntries, initialIndex }: ComponentProps<typeof MemoryRouter>) {
  const initial = useRef({ initialEntries, initialIndex });
  const [router, setRouter] = useState<ReturnType<typeof createMemoryRouter> | null>(null);
  useEffect(() => {
    const owned = createMemoryRouter([{ path: "*", element: <TestRoute /> }], initial.current);
    setRouter(owned);
    return () => owned.dispose();
  }, []);
  return <Content.Provider value={children}>{router && <RouterProvider router={router} />}</Content.Provider>;
}
