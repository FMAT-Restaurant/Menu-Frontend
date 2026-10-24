# Checkpoint seguro después de UX07

Fecha: 24 de octubre de 2026. Todas las tareas desplegadas de la oleada4 terminaron, incluidas sus revisiones y comprobaciones integradas. UX08 a UX17 siguen sin iniciar. No hay reservas de implementación activas.
El usuario confirmó "Checkpoint actual y parar". No se desplegarán nuevos tickets sin reanudación explícita. Los tres subagentes terminaron y la inspección final no encontró procesos propios de Node/Chromium ni listeners de prueba en4173/5174. El proyecto Compose aislado está detenido. El stash699919c62fa3c894fa027a85523c3411a1e22863 y las demás ramas locales conservan sus referencias.

## Referencias

- Rama local: `feature/ux-ui-improvement`.
- UX05, categorías: `6e09554`.
- UX06, catálogo: `487340e`.
- UX07, entradas: `bf7d6cb`.
- Etiqueta local del commit de este registro: `checkpoint/ux-ui-2026-10-24-ux07`.
- El checkpoint anterior `checkpoint/ux-ui-2026-10-24-ux04` permanece intacto en `0e375aa`.

Los commits de implementación están separados por ticket. No se publicó esta rama ni la etiqueta al preparar este checkpoint. El historial anterior, el stash y la auditoría original se conservan.

## Resultado comprobado

| Comprobación | Resultado | Evidencia |
| --- | --- | --- |
| Tipos, lint y build | Aprobados | `evidence/oleada-04-types.log`, `oleada-04-lint.log`, `oleada-04-build-final.log` y lint focalizado del ajuste de altura |
| Categorías | 16 pruebas focalizadas aprobadas; dos demo y dos HTTP | `evidence/UX05/` |
| Catálogo | 32 pruebas focalizadas aprobadas; tres recorridos demo con límites de ancho y teclado | `evidence/UX06/` |
| Entradas | 75 pruebas focalizadas aprobadas; tres demo y tres HTTP | `evidence/UX07/` |
| Demo integrada | 32 de 32 aprobadas en 43,3s | `evidence/oleada-04-demo-final.log` |
| Producción preview con fixtures HTTP | 52 de 52 aprobadas en 18,6s | `evidence/oleada-04-production-preview-final.log`, `evidence/oleada-04-http-final-junit.xml` |
| Revisión | Favorable dentro del alcance de la oleada | `evidence/reviews/oleada-04.md`, `ux06-wave04.md`, `ux07-wave04.md` |

La revisión corrigió controles de una línea de 42/43px a 40/48px y conservó el crecimiento necesario cuando el texto ocupa dos líneas. Las medidas anteriores permanecen separadas en UX07/height-before. Los tests que exigían ocultar Ver ofertas o navegar por coordenadas sobre su enlace invisible se adaptaron después de documentar la incompatibilidad, conservando identidad, destinos, estados, query y retorno.

Se repitieron las regresiones de imágenes, cabeceras, guardado, diálogos, foco y scroll. La suite de preview usa respuestas HTTP controladas y no acredita backend real ni Nginx. No se ejecutó otra cobertura global en esta oleada; los resultados de CI de línea base y las comprobaciones focalizadas permanecen identificados.

## Alcance pendiente

UX00 a UX07 están integradas. U11 y U14 quedan acreditados para los escenarios observados. U04 conserva el aporte de categorías y espera recetas; los hallazgos compartidos esperan sus consumidores restantes. Este archivo no declara terminado el plan ni cerrados los 28 hallazgos.

Quedan UX08 a UX17: recetas, ofertas/composición, flujo de receta en un modal, protección de cambios, importes, guardado, microcopia, contexto de rutas, cargas y verificación final. La siguiente oleada es UX08 y UX09, con archivos separados de recetas y ofertas.

El shell real está excluido por el usuario. MXN con dos decimales y el término rondas de selección están confirmados para sus tickets. Dispositivo físico, teclado virtual y lector de pantalla continúan como [validación manual pendiente](manual-validation.md).

## Para retomar

1. Comprobar rama, estado local, HEAD, [registro](registry.md), agentes y procesos reales. No inferir actividad por documentos históricos.
2. Usar `git -c core.longpaths=true` si las rutas largas de evidencia exceden el límite de Windows. No borrar evidencias ni restablecer el checkout completo.
3. Mantener las reservas y el orden de la guía. UX08 recibe las pruebas de validación de categorías; UX09 recibe el responsive y las acciones de catálogo y entradas. Repetir U01 al cambiar tarjetas de ofertas.
4. Conservar el cierre exterior de categorías después del clic, el ciclo modal de UX03 y las claves de retorno `entry:<id>` con sufijos únicos de acción. UX15 debe consumir esas identidades.
5. El cierre por hallazgo sigue en [closure.md](closure.md). Las pruebas finales sobre una misma base y las condiciones restantes pertenecen a UX17.
