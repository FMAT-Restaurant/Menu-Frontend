# Entrega UX01

Ticket UX01. Agente `/root/ux01_images`. Rol de contención de imagen y visibilidad comercial. Estado solicitado: en revisión.

## Base y autorización

Base inicial `21bd45a`. Reanudación sobre `c7b5482` y UX00 integrada, en checkout compartido `feature/ux-ui-improvement`. La restricción inicial de no solucionar produjo el rechazo documentado en [review.md](review.md). El orquestador comunicó la respuesta explícita posterior del usuario: "Sí, implementar los tickets". El parche se volvió a solicitar tras esa respuesta y fue admitido.

Se conservaron los cambios concurrentes de UX02. No se editaron archivos ajenos, configuración compartida, registro común ni auditoría histórica. No se hicieron commits.

## Cambios

- `src/features/offers/styles.css`: once líneas para limitar el contenido intrínseco del img al área de 112 px y permitir ajuste de nombres largos. La caja recorta desbordamiento y el img ocupa su área mediante posicionamiento absoluto, con límites de tamaño. `object-fit: cover` permanece.
- `e2e/ux-ui-01.demo.spec.ts`: diez casos reales sobre rutas demo. Mantienen observación de cero peticiones API y cero errores JavaScript. Cubren Individual y Combo con bebida, PNG cuadrados, verticales y apaisados cargados mediante formulario real, etiqueta y precio largos, y un recurso inválido que activa el onError del componente montado.
- Evidencia individual en esta carpeta. `OfferCard.tsx` no cambió. Props, fallback, estados, precios, recuperación y escritura conservan su contrato.

El análisis estático de UX00 y la inspección JSX identificaron OffersPage como consumidor. No hay imports nuevos de producción ni cambios en los servicios. La búsqueda local de ui-ux-pro-max, `image overlap --domain ux`, aportó la recomendación específica de ajustar imágenes al contenedor. DESIGN.md conserva la autoridad visual.

## Verificación

| Comprobación | Resultado y alcance |
| --- | --- |
| Typecheck | Pasa, [log](typecheck.log). |
| OfferComponents y OffersPage | 2 suites y 55 tests aprobados, [log](unit-direct.log). Ejecución directa de Jest 6,338 s. |
| Demo integrada con UX02 | Primera ejecución 14 tests aprobados en 27,7 s. Repetición final 14 aprobados en 29,3 s, incluidos los diez UX01, dos UX02 y dos demo previos. [Log final del orquestador](../oleada-01-demo-final.log). |
| Inspección visual | Vistas las diez capturas de [primera ejecución](browser-first-run/) y contrastadas con las capturas históricas 11 y 17. Nombre, entrada y precio ya se leen en 390 y 1440 px. Las tres proporciones y el fallback conservan separación. |
| Medidas geométricas | Las diez pruebas aprobaron los rectángulos calculados de imagen y texto. La primera ejecución no persistió los attachments JSON con reporter list. Se añadió escritura explícita de geometry.json sin cambiar aserciones y se repitió. [Evidencia final](browser-final/) conserva diez PNG y diez JSON, sin duplicar attachments. |
| Tipos y lint integrados | El orquestador confirma ambos con código cero sobre la base final de la oleada. |

El [resumen geométrico](geometry-summary.json) reúne las doce observaciones de tarjetas de los diez casos. Las cajas de imagen miden 112 px, el título empieza 12 px después y el desbordamiento inferior del img es cero. Los recursos subidos conservan dimensiones intrínsecas de 800 × 800, 320 × 1600 y 1600 × 320. También se inspeccionaron las capturas finales comparables de 390 y 1440 px.

El comando npm test con argumento `--silent` terminó con código 1 y sin salida en dos intentos. Se investigó mediante ejecución directa del mismo binario instalado y las mismas dos suites, que sí terminó con código cero. No se modificaron tests para evitar esa condición de invocación.

## Hallazgo y continuidad

Se propone acreditar U01 mediante la repetición final, los JSON persistidos y las capturas inspeccionadas. El integrador decide su estado tras revisión. Los otros defectos visibles de las capturas pertenecen a tickets posteriores. La foto usa cover y puede recortar su contenido dentro de la caja; no invade las zonas comerciales.

UX09 y UX12 deben conservar y repetir las diez regresiones al cambiar la tarjeta y presentar MXN. La prueba del precio largo identifica un importe previo a UX12. Al cambiar el formato monetario por el requisito nuevo deberá conservarse el caso de importe largo y su geometría. El ticket no decide moneda ni precisión.

No hay procesos propios activos. El orquestador controla servidor, puerto, salidas y ejecución E2E. La revisión final y liberación de reserva corresponden al integrador.
