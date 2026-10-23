# T12 — Compartir la validación de imágenes

**Estado:** Pendiente de implementación.
**Oleada:** 1 · **Prioridad:** P2 · **Complejidad:** S
**Requisitos previos:** [T00](oleada-00-t00.md).
**Hallazgos propios:** O05.
**Plan fuente:** [Plan de corrección](../audit-issues-correction-plan.md), ficha T12 y regla de cobertura 8.1.

## Instrucciones

1. Edita `src/features/entries/entryImage.ts`, `entryImage.test.ts`, `src/features/offers/offerImage.ts` y `offerImage.test.ts`.
2. Extrae las reglas comunes a `src/shared/imageValidation.ts` y crea su test: formatos, límites, decodificación, dimensiones y liberación del bitmap. Mantén las funciones públicas de entrada/oferta como envoltorios cuando sus mensajes difieran.
3. Centraliza los casos de límites y decodificación en el test compartido; conserva comprobaciones pequeñas de los envoltorios para sus mensajes.
4. Edita `jest.config.cjs` para mantener el 80 % de ramas, funciones, líneas y sentencias sobre la lógica extraída. Esta configuración está reservada exclusivamente a T12 en la oleada 1.

## Invariantes

- No cambies formatos aceptados, tamaño máximo, dimensiones ni inclusión de los límites existentes.
- Mantén las firmas de los consumidores, sin editar sus formularios ni añadir librerías.
- Libera el bitmap tras una decodificación tanto válida como rechazada. Restaura los globals y descriptores que alteren los tests.
- No retires archivos ni rebajes umbrales para compensar la extracción.

## Tests conceptuales

- Los mismos archivos se aceptan/rechazan antes y después de extraer las reglas.
- Casos justo en los límites y fuera de ellos, fallo de decodificación y cierre del bitmap en ambas salidas.
- Los envoltorios conservan su contrato y mensajes; ejecutar los casos por separado no depende del estado global de otro test.

## Criterios de aceptación

- [ ] O05: existe una única implementación de las reglas y ambos consumidores la utilizan sin duplicarlas.
- [ ] Límites, mensajes y liberación de recursos quedan acreditados por los tests apropiados.
- [ ] Typecheck, suites de imágenes y cobertura del módulo extraído pasan sin rebajar la garantía existente.
- [ ] Entrega evidencia y comunica la configuración integrada a las tareas que extraigan lógica después.
