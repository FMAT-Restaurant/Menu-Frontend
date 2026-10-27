# UX02. Definir y limitar la base visual compartida

**Estado:** Pendiente de implementación.
**Oleada:** 1 · **Prioridad:** P2, con aporte de P3 en U22 · **Complejidad:** M.
**Requisitos previos:** [UX00](oleada-00-ux00.md)
**Hallazgos propios:** U03, U07, U08, U22
**Casos de verificación:** V02, V03, V13, V18 de la sección 7.2 del plan.
**Habilita:** [UX03](oleada-02-ux03.md), [UX17](oleada-12-ux17.md)
**Plan fuente:** [Plan de implementación](../ux-ui-implementation-plan.md), ficha UX02, matriz de la sección 4, reservas de la sección 5.1 y verificaciones de las secciones 7 a 9.
**Evidencia de origen:** [Auditoría UX/UI](../audit/ux-ui-audit-2026-10-23.md).
**Reglas comunes:** [Índice de tickets](README.md), [DESIGN.md](../../../DESIGN.md) y [AGENTS.md](../../../../AGENTS.md).

## Instrucciones

1. Reservar `src/styles.css`, `src/shared/primitives.css` y `src/shared/SearchField.tsx`, el ámbito de montaje en `src/App.tsx` y `src/main.tsx` y tests nuevos de los componentes compartidos que lo necesiten. Añadir un contenedor identificable del módulo. Limitar tokens, resets y selectores generales a su ámbito; documentar cualquier regla que deba pertenecer al montaje autónomo. No declarar probada la ausencia de fugas al shell sin la verificación de D01.

2. Definir roles de texto 28/36, 22/30, 18/26, 16/24, 14/20 y 12/16; radios 4, 8 y 12; espacios de base 4; controles estándar de 40 px y variante táctil de 48 px. Los botones de icono tienen al menos 40 × 40 px y la presentación táctil usa 48 px. Evitar excepciones compactas en los controles que la auditoría encontró insuficientes.

3. Definir estados con punto y texto, focus visible, campos con error y familia SVG pequeña para buscar, cerrar, agregar e imagen. Puede añadirse `src/shared/Icon.tsx`, nuevo, sin instalar una biblioteca para cuatro símbolos. Los SVG decorativos se ocultan al lector; los controles conservan nombre accesible.

4. Preparar también el contrato de marcador de cabecera y de origen de navegación que consumirán UX04, UX06, UX09 y UX15. El punto de corte depende del ancho útil del módulo o componente. Preferir contenedores CSS cuando el viewport no represente ese ancho. Los diálogos y los paneles de insumos necesitan evaluar su propio espacio.

5. La salida es una base utilizada por controles existentes, con comparación de todas las rutas. El cierre de los cuatro hallazgos espera los aportes de consumidores de la matriz y su verificación en UX17.

## Invariantes

- DESIGN.md mantiene la autoridad sobre paleta, tipografía, radios y espacio. No generes otro sistema de diseño ni instales una biblioteca para cuatro iconos.
- La base compartida no cierra U03, U07, U08 o U22 hasta que todos los consumidores obligatorios de la matriz la adopten.
- D01 condiciona la comprobación de fugas al shell. El montaje autónomo no demuestra por sí solo aislamiento real.
- Cada test debe comprobar un caso real. Ante un fallo, investiga el código. Informa un defecto o incompatibilidad del test antes de modificarlo y conserva sus garantías funcionales.

## Tests conceptuales

- Mide roles 28/36, 22/30, 18/26, 16/24, 14/20 y 12/16, radios 4/8/12 y espacio de base 4 en controles reales.
- Comprueba controles estándar de 40 px y táctiles de 48 px, iconos de al menos 40 × 40 y 48 px en presentación táctil, foco visible y nombre accesible.
- Inspecciona todas las rutas después de cambiar estilos compartidos. Compara viewport y ancho útil del módulo, incluidos contenedores reducidos dentro de un host ancho.
- Comprueba el nombre de botones con icono y que los SVG decorativos no agregan anuncios redundantes. Acredita el contrato de marcadores que consumirán UX04, UX06, UX09 y UX15.

## Criterios de aceptación

- [ ] Existe un ámbito identificable del módulo y los tokens, resets y selectores generales quedan limitados a él. Las reglas del montaje autónomo están documentadas.
- [ ] Controles existentes usan la base compartida, con tamaños y foco medidos. Los destinos nuevos, como Icon.tsx, se identifican como nuevos si se necesitan.
- [ ] Marcadores de cabecera e identidades de origen tienen un contrato utilizable por los siguientes tickets.
- [ ] La comparación de rutas y los consumidores pendientes están registrados. Los cuatro hallazgos compartidos conservan su estado hasta completar los aportes.
- [ ] UX01 puede integrarse sin editar los mismos archivos de aplicación; cualquier ampliación de reserva se coordina antes de editar.

## Entrega

Registra base, archivos reales, reservas, comandos y resultados, casos y evidencia por ID según la [entrega común](README.md#entrega-y-cierre). Distingue integración del ticket y cierre de hallazgos. Las instrucciones anteriores describen trabajo futuro y no acreditan una corrección ya ejecutada.
