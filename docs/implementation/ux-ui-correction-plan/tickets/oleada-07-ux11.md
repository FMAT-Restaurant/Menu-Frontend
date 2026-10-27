# UX11. Proteger cambios al cerrar y navegar

**Estado:** Pendiente de implementación.
**Oleada:** 7 · **Prioridad:** P2 · **Complejidad:** L.
**Requisitos previos:** [UX10](oleada-06-ux10.md)
**Hallazgos propios:** U15
**Aportes o condiciones que conserva:** U26, U27, U28
**Casos de verificación:** V09, V10, V16, V17, V18 de la sección 7.2 del plan.
**Habilita:** [UX12](oleada-08-ux12.md), [UX13](oleada-09-ux13.md), [UX17](oleada-12-ux17.md)
**Plan fuente:** [Plan de implementación](../ux-ui-implementation-plan.md), ficha UX11, matriz de la sección 4, reservas de la sección 5.1 y verificaciones de las secciones 7 a 9.
**Evidencia de origen:** [Auditoría UX/UI](../audit/ux-ui-audit-2026-10-23.md).
**Reglas comunes:** [Índice de tickets](README.md), [DESIGN.md](../../../DESIGN.md) y [AGENTS.md](../../../../AGENTS.md).

## Instrucciones

1. Reservar `src/App.tsx` y `src/main.tsx`, formularios de `src/features/categories/`, `src/features/entries/`, `src/features/offers/` y `src/features/recipes/`, `src/features/entries/useEntryForm.ts` y sus tests. Añadir una política común de edición modificada basada en el borrador inicial confirmado, incluido archivo de imagen, categorías y composición. Conservar los borradores de pasos; regresar de un selector no equivale a abandonar el formulario.

2. Migrar el montaje autónomo de `BrowserRouter` a un router de datos compatible con `useBlocker`, manteniendo las rutas actuales, carga diferida, inyección de repositorio y query params. La instancia del router debe ser estable. Si el anfitrión ya aporta router, usar su contrato en lugar de anidarlo. UX00 registra esta variante en D01. Los tests de rutas deben cubrir ambos contratos que se soporten.

3. Aplicar "Seguir editando" y "Descartar cambios" a cruz, Cancelar, Escape, enlaces y atrás o adelante del navegador. En un diálogo abierto, sustituir temporalmente su contenido o usar una confirmación interna; no crear un segundo fondo. Un formulario intacto cierra sin pregunta. Un guardado exitoso permite navegar sin una nueva advertencia.

4. Para recarga o cierre del documento, registrar `beforeunload` solo mientras haya cambios y aceptar la advertencia nativa del navegador. No prometer texto personalizado. No interceptar la navegación con una combinación de saltos de historial que pierda la URL de destino.

5. Mantener el tratamiento de envíos pendientes e inciertos, las referencias de operación y la prohibición de doble envío. Probar receta con nombre escrito, categoría editada, entrada con imagen nueva, oferta con composición y opción/grupo modificados. Reabrir tras "Seguir editando" conserva todo; descartar exige decisión explícita. Ejecutar pruebas de rutas, formularios y recuperación.

## Invariantes

- Intacto cierra directamente; modificado ofrece Seguir editando y Descartar cambios. Un guardado confirmado permite navegar sin advertencia adicional.
- El borrador incluye archivos, categorías, composición, opciones y datos de pasos, comparados con la base confirmada.
- Una confirmación interna sustituye contenido del diálogo o vive dentro del mismo contenedor, sin otro fondo.
- Envío pendiente o resultado incierto conserva su política de recuperación, referencia de operación y prohibición de doble envío.
- No añadas useBlocker al BrowserRouter actual sin la adaptación de contexto. El router debe ser estable y no anidarse con el del shell.
- Cada test debe comprobar un caso real. Ante un fallo, investiga el código. Informa un defecto o incompatibilidad del test antes de modificarlo y conserva sus garantías funcionales.

## Tests conceptuales

- Prueba cruz, Cancelar, Escape, enlaces, atrás y adelante con receta escrita, categoría editada, entrada con imagen nueva y categorías, oferta con composición y opción/grupo modificados.
- Elige Seguir editando y comprueba todos los datos y foco. Elige Descartar cambios y comprueba la salida prevista. Repite con formulario intacto y tras guardado confirmado.
- Prueba navegación y carga diferida sobre router de datos, manteniendo rutas, repositorio, query params y destino de regreso. Cubre los contratos de montaje que realmente se soporten.
- Comprueba beforeunload solo mientras hay cambios. Acepta el aviso nativo en recarga/cierre sin afirmar un texto personalizado.
- Prueba cierre durante envío e incertidumbre y cuenta máximo un modal/fondo. Ejecuta rutas, formularios y recuperación.
- Documenta la incompatibilidad del caso histórico de EntryFormPage.test.tsx, línea 245, que esperaba descarte inmediato, y de montajes de memoria sin contexto de datos. Conserva escenarios y aserciones funcionales.

## Criterios de aceptación

- [ ] U15 protege los cambios de todas las familias y acciones de salida, con conservación íntegra al continuar y descarte explícito.
- [ ] La adaptación del router conserva rutas, lazy loading, inyección de repositorio y parámetros, y respeta el contrato D01 soportado.
- [ ] Recarga y cierre usan beforeunload solo cuando corresponde; la navegación interna conserva la URL de destino sin saltos de historial.
- [ ] Las confirmaciones no vuelven a acumular fondos ni permiten abandonar o repetir operaciones en estados que lo impiden.
- [ ] Los cambios justificados de infraestructura o contrato de interacción de tests están documentados; las garantías de payload, versiones y recuperación permanecen.

## Entrega

Registra base, archivos reales, reservas, comandos y resultados, casos y evidencia por ID según la [entrega común](README.md#entrega-y-cierre). Distingue integración del ticket y cierre de hallazgos. Las instrucciones anteriores describen trabajo futuro y no acreditan una corrección ya ejecutada.
