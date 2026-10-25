# Revisión de importes

UX12 integrado en `6f40514`, sobre UX11 verificado. D02 conserva la respuesta del usuario MXN y dos decimales; presentación adoptada es-MX con código de moneda visible. No se deduce moneda de los ejemplos o del símbolo anterior.

`formatMoney` es una instancia común de Intl.NumberFormat. Tarjeta, texto adyacente al campo y revisión remota usan el mismo formato, alineación derecha y peso 600 o 700. El input mantiene string, step=any y validación existente. La presentación no altera el número almacenado o enviado. Los casos prueban 145.125 enviado, guardado y reabierto como 145.125, aunque su presentación sea MXN 145.13.

Se corrigió una elección semántica durante revisión: output tenía role=status implícito y adelantaba una espera de éxito de recuperación. Se sustituyó por texto asociado al campo, sin región viva. La garantía de recuperación se conservó. Las expectativas antiguas de precio y etiquetas se informaron antes de adaptar sólo su presentación.

## Evidencia

- 135 pruebas focalizadas en 7 suites, tipos, lint global y build aprobados.
- 19 demo en 31,5 s: diez casos U01, dos recorridos originales y siete matrices monetarias. Sin API ni errores JavaScript. Se conserva imagen, fallback, texto largo y precio separado.
- 55 regresiones HTTP anteriores pasan sobre el mismo build. Los siete casos nuevos fallaron primero por thumbnailUrl ausente en su fixture, obligatorio según el parser existente. Se corrigió sólo el fixture, ahora tipado MenuOfferDetail. La repetición aprueba 7/7 en 6,8 s. No se modificó el parser ni la regla de precio.

Las matrices registran 320, 390, 600, 740, 1024, 1440 y módulo de 390 px en host de 1440. Root inspeccionó tarjeta/editor y revisión remota a 320 px. El importe largo cabe y no invade imagen o nombre. El HTTP acredita lectura de cero válida, PATCH con 145.125 y la versión de apertura, revisión de otra versión sin envío automático y precio local conservado al adoptar composición/versión.

PNG/JSON finales en UX12/browser-money y UX12/http-money. Negativos separados en UX12/http-first. Los controles completos se repetirán sobre la base final en UX17; no se presenta la tanda inicial con fixture inválido como 62/62 aprobadas.

Índice actualizado `.analysis/ux-ui-wave08-integrated.json`, SHA256 `0C6F37A7B4751FBDE2411BA319CC01EA82124D3961DF0B6F4EE9B906DF3DD8D0`. Vecinos en UX12/dependencies-root.txt. Se contrastaron los tres consumidores reales además del grafo estático.

Se libera la reserva para UX13. Shell real excluido; dispositivo físico, teclado virtual y lector de pantalla permanecen pendientes manuales. No se afirma integración con backend real por fixtures HTTP.
