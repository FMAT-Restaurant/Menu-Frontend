import { toSpanishErrorMessage } from "./errorMessage";

describe("toSpanishErrorMessage", () => {
  test("translates common Axios and network errors in English to Spanish", () => {
    expect(toSpanishErrorMessage(new Error("Network Error"))).toBe(
      "No se pudo conectar con el servicio. Comprueba tu conexión e inténtalo de nuevo.",
    );
    expect(toSpanishErrorMessage(new Error("Request failed with status code 500"))).toBe(
      "El servicio está temporalmente indisponible. Inténtalo de nuevo en unos momentos.",
    );
    expect(toSpanishErrorMessage(new Error("Request failed with status code 404"))).toBe(
      "El recurso solicitado ya no existe.",
    );
    expect(toSpanishErrorMessage(new Error("timeout of 10000ms exceeded"))).toBe(
      "La operación agotó el tiempo de espera. Inténtalo de nuevo en unos momentos.",
    );
    expect(toSpanishErrorMessage({ response: { status: 403 } })).toBe(
      "No tienes acceso a esta operación. Verifica tu sesión y permisos.",
    );
  });

  test("preserves Spanish error messages and falls back when empty", () => {
    expect(toSpanishErrorMessage(new Error("La receta ya existe."))).toBe("La receta ya existe.");
    expect(toSpanishErrorMessage(null, "Error por defecto.")).toBe("Error por defecto.");
  });
});
