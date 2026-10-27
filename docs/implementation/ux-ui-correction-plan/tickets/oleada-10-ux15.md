# UX15. Restaurar foco y contexto al navegar

**Estado:** Pendiente de implementación.
**Oleada:** 10 · **Prioridad:** P2 · **Complejidad:** M, con cierre de integración L.
**Requisitos previos:** [UX13](oleada-09-ux13.md)
**Condiciones adicionales:** Contrato D01 definido; evidencia en shell y lector de pantalla para cierre integrado.
**Hallazgos propios:** U24
**Casos de verificación:** V06, V14, V18 de la sección 7.2 del plan.
**Habilita:** [UX16](oleada-11-ux16.md), [UX17](oleada-12-ux17.md)
**Plan fuente:** [Plan de implementación](../ux-ui-implementation-plan.md), ficha UX15, matriz de la sección 4, reservas de la sección 5.1 y verificaciones de las secciones 7 a 9.
**Evidencia de origen:** [Auditoría UX/UI](../audit/ux-ui-audit-2026-10-23.md).
**Reglas comunes:** [Índice de tickets](README.md), [DESIGN.md](../../../DESIGN.md) y [AGENTS.md](../../../../AGENTS.md).

## Instrucciones

1. Reservar `src/App.tsx` y `src/main.tsx`, `src/App.test.tsx` y un coordinador nuevo, por ejemplo `src/shared/RouteContext.tsx`. Consumir los marcadores ya añadidos por UX04 y las identidades de origen de UX06 y UX09. No añadir una nueva cabecera ni un segundo enlace global de salto dentro de las pantallas.

2. Al cambiar de tarea, enfocar el título o inicio de contenido local. Al regresar, recuperar el elemento de origen si aún existe; si se eliminó o filtró, usar el título o resultados como alternativa. Cambiar filtros o página de resultados no se trata automáticamente como entrar en otra pantalla. El foco de un error y el de un diálogo tienen prioridad sobre el anuncio de ruta.

3. Coordinar título de documento con el anfitrión. En demo conservar el prefijo `[DEMO]` y añadir el nombre de tarea. El shell define su enlace global de salto cuando sea dueño del documento. Verificar con lector de pantalla el anuncio en ambos montajes y que no haya dos coordinadores compitiendo.

4. Probar catálogo, recetas, edición, regreso, ruta inexistente y retorno a un elemento que ya no está. Verificar rutas diferidas y atrás o adelante tras la migración de UX11. El resultado de una búsqueda no debe lanzar el foco a `BODY` ni reiniciar sin necesidad el recorrido del usuario.

## Invariantes

- El coordinador consume los marcadores de UX04 y orígenes de UX06 y UX09. No duplica cabeceras ni el enlace de salto global del shell.
- El foco de diálogo y de error tiene prioridad sobre el foco de ruta. Cambiar filtros o página no se trata automáticamente como nueva tarea.
- En demo, el título conserva [DEMO]. En shell, título, anuncios y enlace global de salto siguen el contrato del anfitrión.
- Este ticket edita APP y el coordinador nuevo. UX14 edita textos de formularios; amplía las reservas y usa turnos si esa separación deja de ser suficiente.
- Cada test debe comprobar un caso real. Ante un fallo, investiga el código. Informa un defecto o incompatibilidad del test antes de modificarlo y conserva sus garantías funcionales.

## Tests conceptuales

- Entra en catálogo, recetas, edición y ruta inexistente. Comprueba título, foco en inicio local y anuncio con lector de pantalla.
- Regresa al origen existente y a uno eliminado o filtrado. El primero recupera su identidad; el segundo usa título o resultados como alternativa.
- Busca y cambia página sin salto innecesario de foco ni retorno a BODY. Comprueba que un error o diálogo no pierde su foco por un efecto de ruta.
- Prueba rutas diferidas y atrás/adelante después de UX11, manteniendo el contexto de regreso y sin dos coordinadores compitiendo.
- Ejecuta App.test.tsx y regresiones de navegación. Registra lector, navegador, sistema y montaje real, sin presentar la demo como validación del shell.

## Criterios de aceptación

- [ ] U24 restaura un contexto útil al entrar y regresar, incluido el caso de origen ausente.
- [ ] Filtros, paginación, validación y diálogos conservan su foco y no compiten con el coordinador.
- [ ] Título y anuncios cumplen D01, conservan [DEMO] en demostración y no duplican funciones del shell.
- [ ] Hay evidencia con lector de pantalla en ambos montajes soportados para cerrar la integración; lo no comprobado sigue pendiente.
- [ ] La entrega no modifica textos de formularios reservados a UX14 sin coordinar un turno.

## Entrega

Registra base, archivos reales, reservas, comandos y resultados, casos y evidencia por ID según la [entrega común](README.md#entrega-y-cierre). Distingue integración del ticket y cierre de hallazgos. Las instrucciones anteriores describen trabajo futuro y no acreditan una corrección ya ejecutada.
