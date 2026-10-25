# Checkpoint seguro de UX/UI

Checkpoint vigente: [UX13,25 de octubre de2026](checkpoint-ux13.md). El contenido siguiente conserva el checkpoint histórico de UX04. La implementación actual llega hasta UX13 y queda detenida a petición del usuario.

Fecha:24 de octubre de2026. Detenido a petición del usuario tras terminar las tareas que ya estaban en ejecución. No se iniciará ninguna tarea siguiente sin reanudación del usuario.

## Referencias guardadas

- Rama local: `feature/ux-ui-improvement`.
- UX01: `e785b41`, contención de imágenes y visibilidad comercial.
- UX02: `8c95f64`, base visual compartida y controles según ancho útil.
- UX03: `f7330b0`, fondo modal único, foco y restauración de scroll.
- UX04: `810f5d9`, cabeceras locales y corrección del clic de guardado con categorías abiertas.
- Etiqueta local del checkpoint: `checkpoint/ux-ui-2026-10-24-ux04`. Se crea sobre el commit que guarda este documento y el registro actualizado. No se ha publicado esta rama ni la etiqueta durante este cierre.

UX00 a UX04 están integradas. UX05 a UX17 permanecen pendientes. Este checkpoint no declara terminada la auditoría ni acreditados los28 hallazgos.

## Verificación de la base de implementación

| Comprobación | Resultado | Evidencia |
| --- | --- | --- |
| Tipos y build | Aprobados | `evidence/UX04/typecheck-final.log`, `evidence/oleada-03-build-final.log` |
| Lint global | Aprobado | `evidence/oleada-03-lint-final.log` |
| Suites de páginas | 7 suites,171 pruebas aprobadas | `evidence/UX04/unit-pages.log` |
| Entrada y selector después de corregir guardado | 2 suites,57 pruebas aprobadas; se solapan con las páginas | `evidence/UX04/category-click-unit-positive.log` |
| Demo Chromium | 24 de24 aprobadas en35,1s | `evidence/oleada-03-demo-final.log` |
| Producción preview con fixtures HTTP | 47 de47 aprobadas en18,6s | `evidence/oleada-03-production-preview-final.log`, `evidence/UX04/production-final-junit.xml` |
| Revisión visual y funcional | Favorable para UX04 | `evidence/reviews/oleada-03.md`, capturas y JSON en `evidence/UX04/browser-final/` |

El build terminó antes del inicio de los casos HTTP, contrastado con sus timestamps. Las dos pruebas de guardado que fallaron al cambiar la geometría pasan sin modificar sus escenarios. La evidencia negativa muestra el botón desplazándose73px entre pointerdown y pointerup; la positiva conserva el clic sobre el botón y registra submit.

La validación de este checkpoint usa preview, demo y fixtures. No reemplaza el cierre final de UX17 sobre Nginx ni acredita backend real. No se repitió cobertura completa en UX04; la línea base de CI y los resultados por ticket permanecen identificados en el registro.

## Conservación y recursos

Todo el trabajo implementado y la evidencia quedan en commits. La auditoría histórica, DESIGN.md y planning-method.png mantienen los hashes iniciales. El stash `699919c62fa3c894fa027a85523c3411a1e22863` permanece intacto y las otras ramas locales conservan sus referencias.

Los tres subagentes terminaron sus turnos. La inspección de procesos y puertos no encuentra servidores propios de pruebas en4173/5174 ni procesos de Node/Chromium del repositorio. El proyecto Compose aislado `menu-ux-ui-baseline` está detenido y sin contenedores. Las reservas quedan liberadas.

Algunas evidencias conservan rutas largas de Windows. Se guardaron con `git -c core.longpaths=true` sin cambiar configuración global ni eliminar archivos. Usar esa opción si una operación Git sobre estas evidencias encuentra el límite de longitud.

## Reanudación

1. Comprobar la rama, HEAD, estado local, [registry.md](registry.md), agentes y procesos realmente activos. No asumir actividad por una fila histórica del registro.
2. Continuar con UX05, UX06 y UX07 sobre la base integrada. Pueden desplegarse en paralelo sólo con sus reservas de categorías, catálogo y entradas separadas y capacidad disponible para el orquestador. No hay agentes asignados actualmente a esos tickets.
3. Conservar el contrato modal de UX03 y el cierre exterior del selector después del clic. Mantener las regresiones de imágenes, guardado, versiones, idempotencia y recuperación. Los cambios de tests anteriores están justificados en la preparación y entrega UX04.
4. D01 excluye shell real por indicación del usuario. D02 fija MXN con dos decimales, presentación es-MX. D03 fija rondas de selección. D04 conserva la protección de cambios acordada. D05 conserva los tipos de imagen y10MiB.
5. Dispositivo físico, teclado virtual y lector de pantalla quedan como [validación manual pendiente](manual-validation.md), expresamente solicitada por el usuario. No convertir emulación en aprobación manual.

U06 y U28 requieren el flujo final de UX10; los hallazgos compartidos esperan adopción de consumidores. [closure.md](closure.md) conserva su resultado provisional por ID.
