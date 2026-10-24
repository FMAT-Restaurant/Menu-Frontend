# Impacto y decisiones de UX07

Base recibida: `0e375aa`, rama `feature/ux-ui-improvement`. Ejecutor: `/root/ux02_foundation`. Alcance: recursos y formulario de entradas. UX05 y UX06 trabajan en categorías y catálogo, sin archivos compartidos con esta reserva.

## Error de carga

`entryFailure` ya clasifica HTTP 404 como `notFound`. `useEntryResources` convertía todo error en texto; su único consumidor de producción, `useEntryForm`, devuelve los recursos por spread al modelo de la página. Se conserva ahora `entryLoadFailure: EntryFailure | null` y se mantiene `entryError` como texto compatible. Esto permite distinguir el 404 de lectura sin cambiar `useEntryForm`, el error de escritura, las versiones ni la recuperación.

`EntryFormPage` muestra un estado de entrada inexistente con contexto y retorno al catálogo, conservando filtros en returnTo cuando apuntan al catálogo. No monta campos ni ofrece reintento para ese caso. El error temporal conserva la acción de reintento existente y la carga de categorías mantiene su ciclo independiente. Un 404 de escritura o de revisión sigue perteneciendo a sus flujos operativos y no se convierte en este estado de carga.

## Presentación

El formulario define un contenedor `entry-form` para decidir la columna única por su ancho útil, en vez del viewport. Mantiene los controles estándar y táctiles de la base, radios de tarjeta de 12 px y de control de 8 px, espacios de base 4 y roles tipográficos. Categorías usa búsqueda SVG y cierre SVG en chips, con nombres accesibles conservados. La imagen mantiene el archivo, URL actual y fallback; se añade el SVG de imagen al estado sin vista previa.

El selector conserva su cierre exterior en `click`, después de entregar el evento al botón de guardado. No cambia a pointerdown. El resumen de validación, revelación del foco por encima del footer, guardado, abandono y recuperación siguen sus mecanismos actuales. UX11 y UX13 mantienen sus alcances posteriores.

## Verificación

La lectura del grafo de reanudación se contrastó con imports y el spread real de `useEntryForm`. Se regeneró el índice src después de añadir imports de Icon y se guardaron vecinos en `neighbors.txt`; el grafo no acredita CSS ni comportamiento. No se modificó configuración de dependencias ni se instalaron paquetes.

Las suites `EntryFormPage.test.tsx`, `EntryFormPage.ux.test.tsx` y `entryError.test.ts` pasan con 75 tests. Los tres casos nuevos comprueban 404 sin formulario, recuperación de 503 sin repetir categorías y llegada tardía de categorías sin perder edición, asignaciones ni imagen existente. No se modificaron tests existentes.

Los nuevos recorridos de navegador separan demo en memoria de HTTP controlado. Incluyen 404 demo, 404 HTTP, reintento temporal, categorías retenidas y archivo seleccionado, geometría por ancho propio, resumen y foco por encima del footer. La ejecución Chromium centralizada terminó con 32 casos demo aprobados en 43,3 s y 52 normales en 18,6 s. Sus seis capturas y seis JSON propios están en `browser/`. La revisión corrigió además las alturas estándar desiguales y acreditó 40/48 exactos para una línea y crecimiento a 58 px con dos líneas en 320 px; véase `height-investigation.md`. Los dispositivos físicos y el lector mantienen validación manual pendiente; el shell real está excluido por el usuario.
