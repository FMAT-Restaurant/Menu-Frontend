# UX16. Definir cargas locales sobre el layout final

**Estado:** Pendiente de implementación.
**Oleada:** 11 · **Prioridad:** P3 · **Complejidad:** M.
**Requisitos previos:** [UX14](oleada-10-ux14.md), [UX15](oleada-10-ux15.md)
**Hallazgos propios:** U25
**Casos de verificación:** V08, V15, V18 de la sección 7.2 del plan.
**Habilita:** [UX17](oleada-12-ux17.md)
**Plan fuente:** [Plan de implementación](../ux-ui-implementation-plan.md), ficha UX16, matriz de la sección 4, reservas de la sección 5.1 y verificaciones de las secciones 7 a 9.
**Evidencia de origen:** [Auditoría UX/UI](../audit/ux-ui-audit-2026-10-23.md).
**Reglas comunes:** [Índice de tickets](README.md), [DESIGN.md](../../../DESIGN.md) y [AGENTS.md](../../../../AGENTS.md).

## Instrucciones

1. Reservar el fallback de `src/App.tsx` y `src/main.tsx`, estados de carga de páginas y formularios, y sus estilos. Puede añadirse `src/shared/LoadingState.tsx`, nuevo, con variantes acotadas para listado, detalle y formulario.

2. La carga inicial reserva zonas de título, filtros, imagen o contenido que corresponden a cada pantalla. La actualización conserva datos disponibles y contexto. Las categorías lentas no sustituyen todo el formulario de entrada por un bloqueo. Mantener texto de estado accesible y deshabilitar solo acciones dependientes de la operación.

3. Usar superficies neutras, sin métricas falsas ni brillo decorativo. Respetar movimiento reducido. La demora se controla en el test o adaptador de prueba; no se agrega a la demo ni a producción para mostrar el esqueleto.

4. Probar carga inicial, actualización, error después de demora y llegada de respuestas antiguas. Adjuntar comparación de zonas reservadas y layout resuelto. Medir cambios reales sin adjudicar a la auditoría una cifra de CLS que nunca observó. No añadir una máscara global de carga.

## Invariantes

- La carga se diseña sobre el layout final. Una actualización conserva datos disponibles, contexto y selecciones.
- Categorías lentas no sustituyen todo el formulario de entrada por un bloqueo.
- Los estados son locales y neutros, con texto accesible y movimiento reducido. No añadas máscaras globales, brillo decorativo ni métricas simuladas.
- La demora se controla en tests o adaptadores de prueba. No se agrega a demo ni a producción para exhibir esqueletos.
- La excepción de D03 permite preparar cargas sin declarar integrado el cierre completo de UX14 o U20.
- Cada test debe comprobar un caso real. Ante un fallo, investiga el código. Informa un defecto o incompatibilidad del test antes de modificarlo y conserva sus garantías funcionales.

## Tests conceptuales

- Controla demora en listado, detalle, formulario y ruta diferida. Compara las zonas reservadas con el layout resuelto.
- Durante actualización mantén datos visibles y contexto, y deshabilita solo acciones dependientes.
- Prueba error después de demora, categorías lentas y respuestas antiguas; los datos vigentes no se sustituyen por una respuesta obsoleta.
- Comprueba reduced motion y anuncio accesible sin robar foco ni bloquear la interacción local independiente.
- Ejecuta suites de consumidores afectadas y regresiones de navegador seleccionadas. Si se mide desplazamiento de layout, registra método y resultado actual sin atribuir una cifra a la auditoría.

## Criterios de aceptación

- [ ] U25 tiene esqueletos locales para carga inicial de las áreas previstas, ajustados a la geometría final.
- [ ] Las actualizaciones conservan contenido y contexto y las cargas independientes no bloquean toda la pantalla.
- [ ] Demora, error y respuesta tardía tienen comportamiento y evidencia distintos, con estado accesible y movimiento reducido.
- [ ] No existe demora artificial en aplicación ni máscara global de carga.
- [ ] Las capturas y mediciones indican ancho útil, estado y entorno; cualquier condición pendiente de D03 permanece visible en el registro.

## Entrega

Registra base, archivos reales, reservas, comandos y resultados, casos y evidencia por ID según la [entrega común](README.md#entrega-y-cierre). Distingue integración del ticket y cierre de hallazgos. Las instrucciones anteriores describen trabajo futuro y no acreditan una corrección ya ejecutada.
