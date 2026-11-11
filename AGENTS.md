![IMPORTANTE] No modificar tests o crear tests únicamente para cumplir cobertura, cada test debe reflejar un caso real a probar y que tengan sentido. Además, no se deben modificar los tests existentes para que pasen, si un test falla, se debe corregir el código y no el test (A menos que se halla detectado un mal diseño, defecto o error del propio test [Caso extra: test ya no compatibles y se debe informar, no actualizar a la conveniencia de los agentes]).

## Manejo de Git

![IMPORTANTE] Estas reglas aplican a cualquier agente (Claude, Copilot, Codex, etc.) y tienen prioridad sobre las convenciones por defecto de la herramienta.

### Ramas

- No crear ramas con prefijos de agente o herramienta como `claude/<algo>`, `copilot/<algo>`, `codex/<algo>` o nombres generados automáticamente.
- Usar siempre la convención tradicional `<tipo>/<descripcion-corta-en-kebab-case>`, por ejemplo:
  - `feat/` o `feature/`: nueva funcionalidad (`feat/select-from-inventory`).
  - `fix/`: corrección de errores (`fix/offer-presentation-tag`).
  - `refactor/`: cambios internos sin alterar el comportamiento.
  - `test/`: agregar o corregir tests.
  - `docs/`: documentación.
  - `chore/`, `build/`, `ci/`: mantenimiento, dependencias, build o pipelines.
- Si se trabaja sobre un PR existente, usar la rama de ese PR en lugar de crear una nueva, salvo que se indique lo contrario.

### Commits

- Los mensajes siguen Conventional Commits: `<tipo>(<alcance opcional>): <descripción>` (por ejemplo `feat(offers): add inventory item picker`).
- La autoría de los commits es de la persona que solicita el cambio, no del agente. Configurar `user.name` y `user.email` con los datos de quien lo solicita.
- No agregar autoría ni coautoría del agente (`Co-Authored-By: Claude ...`, `Claude-Session: ...` u otras similares) en commits ni en descripciones de PR.
