# Entrega de UX11

Implementación `a9408b8`, sobre UX10 `81fc2fe`. El ejecutor inició el ticket y root lo continuó tras un límite de uso, conservando sus cambios. La revisión y los resultados se detallan en root-continuation.md.

El router autónomo usa datos y una instancia estable por repositorio. Su ciclo de efecto dispone listeners al desmontar o al repetir StrictMode. Las rutas, la carga diferida y la inyección permanecen. Los formularios y pasos registran estado modificado y bloqueo de recuperación en un proveedor agregado. La confirmación reutiliza el diálogo abierto, conserva foco y datos al continuar y requiere descarte explícito. Los formularios intactos y los guardados confirmados salen directamente. Beforeunload usa el aviso nativo, sin texto personalizado.

La comparación incluye archivo, categorías y composición; detecta reversión a la base confirmada. Los pasos conservados siguen protegidos. Pendiente, incertidumbre y expiración con posible escritura tienen prioridad. No se modificaron API, payloads, idempotencia ni la máquina o el almacenamiento de operaciones.

## Resultados

| Comprobación | Resultado |
| --- | --- |
| Focalizadas de guard, router, formularios y recuperación | 205/205 |
| Jest completo sin cobertura | 42 suites,535/535 en38,198s |
| Build, con tipos | Pasa, build-final-root.log |
| Lint global | Pasa, lint-global-root.log |
| Demo completa | 47/47 en1,2min, demo-all-final-root.log |
| HTTP controlado sobre preview | 55/55 en40,4s, http-final-root.log |

Las cinco pruebas nuevas de navegador acreditan categoría/receta, archivo y categorías de entrada, atrás/adelante con URL exacta, receta retenida con padre intacto y aviso nativo de recarga sólo mientras corresponde. Root inspeccionó capturas de confirmación y conservó negativos separados de positivos. Los tests históricos incompatibles se comunicaron antes de editar; mantienen escenarios, cero escrituras inválidas, versiones, claves y recuperación. No se crean pruebas sólo para cobertura.

## Dependencias y límites

Grafo actualizado `.analysis/ux-ui-wave07-integrated.json`, ámbito src, configuración existente y SHA256 `BBE1D09DE6AC6BC43AA093A437C711FEC484A0EA62A2EEE796124A032BDFB3DF`. Vecinos en dependencies.txt. La revisión de fuente y el navegador complementan el índice estático.

Shell real excluido por el usuario. Dispositivo físico, teclado virtual y lector de pantalla siguen pendientes manuales. HTTP usa fixtures; preview no acredita backend real ni Nginx. La cobertura completa y Compose se repetirán sobre la base final en UX17. UX12 a UX17 no se dan por implementados en esta entrega.
