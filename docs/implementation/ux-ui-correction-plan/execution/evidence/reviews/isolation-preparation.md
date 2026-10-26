# Preparación de aislamiento CSS para V18

Lectura de `/root/ux17_isolation_review`, 25 de octubre de 2026. UX14 y UX15 siguen en revisión. Esta preparación no modifica la aplicación ni acredita una prueba de navegador o integración con el shell real.

Se aplicaron pre-change-dependency-analysis y ui-ux-pro-max. La decisión concreta es cómo limitar las hojas de área al módulo sin cambiar su diseño interior. Se inspeccionaron sus selectores, importaciones, configuración de Vite, límites DOM y tests existentes. Esa evidencia basta para identificar el riesgo y proponer la verificación; no hace falta un grafo nuevo de llamadas.

## Evidencia de fuente

`main.tsx` importa `src/styles.css`, que importa las primitivas compartidas. Las páginas y formularios importan `styles.css` de su área como CSS ordinario. `vite.config.ts` usa el plugin React, sin transformación de ámbito CSS. No se encontró configuración propia de PostCSS o browserslist. El paquete no declara una biblioteca para encapsular estilos. La carga diferida de una hoja no limita sus selectores a la página que la importó.

Las reglas compartidas de `styles.css` y `shared/primitives.css` están acotadas mediante `.menu-module`. `shared/editGuard.css` también usa ese ámbito. Las cinco hojas de área conservan numerosos selectores sin ese ancestro. La inspección de lectura con el PostCSS ya instalado contó reglas, no ramas individuales de listas de selectores:

| Hoja | Reglas | Reglas cuyo selector contiene menu-module |
| --- | --- | --- |
| catalog/styles.css | 50 | 0 |
| categories/styles.css | 33 | 0 |
| entries/styles.css | 74 | 3 |
| offers/styles.css | 161 | 3 |
| recipes/styles.css | 67 | 0 |

Las seis reglas ya acotadas corresponden a acciones y margen de scroll incorporados por UX13. El conteo no acredita por sí solo que cada rama esté aislada. Antes de corregir, se debe comprobar cada selector de una lista.

## Colisiones concretas

| Fuente y selector | Declaraciones que pueden aplicarse fuera del módulo | Fixture externo útil |
| --- | --- | --- |
| offers/styles.css:664, `.modal-header` y su h2 | Flex, padding16×20, fondo#f9fafb; h2 a16px, mayúsculas y espaciado de letras | Cabecera de diálogo del documento con texto h2 y botón de cierre |
| offers/styles.css:682–709, `.modal-close`, `.modal-body`, `.modal-footer` | Bordes, padding, color, overflow, flex, gap y fondo | Diálogo externo abierto, cuerpo desplazable y acciones |
| offers/styles.css:712–735, `.form-row .form-field` y controles | Grid de dos columnas, etiquetas mínimas38px, input/select40px y ancho100% | Fila de formulario externa con input/select y etiqueta |
| catalog/styles.css:5, `.filters` | Grid, columnas mínimas, padding16px, borde y radio12px | Filtros externos con la misma clase |
| categories/styles.css:5–42, `.category-list`, `.category-row` y descendientes | Grid/flex, gaps, margen/padding, tamaños de texto | Lista de categorías ajena al módulo |
| entries/styles.css:5–92, `.entry-form`, layout y campos | Contenedor, grid, padding, dimensiones de inputs y borde de error | Formulario externo con el mismo nombre de clase |
| recipes/styles.css:10–57, `.recipe-list`, `.recipe-card` y h3 | Grid, padding20px, borde, sombra, título16/24 | Tarjeta externa de receta |

Estas son coincidencias de selectores de fuente. No dependen de que el host herede tokens: padding, display, fondo literal, overflow o tamaño de texto siguen siendo aplicables aunque alguna declaración con `var()` resulte inválida. La prueba de navegador debe medir el efecto real y conservar el negativo antes de corregir.

## Dependencias y límites DOM

El contenedor `.menu-module[data-menu-module]` de App contiene las páginas, formularios y diálogos nativos. Pasar un diálogo a la capa superior no cambia su ascendencia DOM. Las confirmaciones de editGuard se montan en su diálogo propio o mediante portal dentro del diálogo de tarea existente. No se encontró un portal de estas áreas que las sacara a un nodo de `document.body` ajeno al módulo.

Los consumidores que deben repetirse después de una corrección son catálogo, categorías, entrada, ofertas, composición, biblioteca y selector/creación de receta. Las reglas de los cinco archivos se solapan dentro del módulo, por ejemplo `.modal-*` y reglas más específicas del diálogo. Conservar su orden y especificidad es necesario para mantener geometría y controles48px en diálogos estrechos.

## Corrección mínima propuesta

Después de integrar UX16 y liberar sus hojas, prefijar cada selector de área todavía global con `:where(.menu-module[data-menu-module]) `, sin cambiar declaraciones, orden de reglas, media/container queries ni valores. `:where()` añade el límite sin incrementar la especificidad del selector original. Las reglas ya acotadas se conservan para evitar duplicar ancestros o alterar la relación con los selectores compartidos.

La implementación debe operar por selector de lista, no mediante un reemplazo por línea o por coma. `:is()` y otras funciones también contienen comas. El PostCSS ya disponible permite inspeccionar las reglas sin instalar dependencias. En las hojas leídas hay media/container queries, sin keyframes; si UX16 añade animaciones, no prefijar selectores de pasos de keyframes. No modificar nombres de contenedor ni los parámetros de las consultas.

No se recomienda envolver ahora las hojas en `@scope`. Introduciría otra regla de proximidad en la cascada y requeriría decidir soporte de navegador que el repositorio no documenta. Tampoco hace falta convertir las hojas a nesting ni añadir un plugin de build. El prefijo explícito sigue el mecanismo ya usado por la base compartida.

La corrección propuesta limita las hojas del módulo. No impide que CSS externo del host afecte descendientes del módulo y no debe presentarse como aislamiento bidireccional o equivalente a Shadow DOM.

## Verificación real propuesta

1. Añadir fuera de `[data-menu-module]` un fixture controlado con cabecera/cuerpo/footer de diálogo, form-row/form-field, filters, category-row, entry-form y recipe-card. El fixture debe tener medidas de referencia explícitas y variables propias para evitar que la ausencia de tokens o valores predeterminados oculte una colisión.
2. Cargar las rutas de las cinco áreas mediante navegación SPA para acumular sus hojas. Comparar computed styles y dimensiones del fixture antes y después de cada carga. Mantener referencias por control, no sólo una captura global. Las propiedades clave son display, padding, font-size, text-transform, overflow, altura de input y grid-template-columns.
3. Probar una anchura de escritorio y una estrecha, más un fixture externo dentro de un contenedor con nombre coincidente para cubrir reglas de container queries. Una regla dentro de `@container` también necesita el prefijo.
4. Comprobar positivamente los consumidores internos a esos mismos anchos: las reglas deben seguir aplicándose. Repetir controles40/48px, geometría de imagen, columnas por ancho útil, errores y modales con un fondo, foco y scroll. La corrección no debe resolverse haciendo que las hojas de área dejen de cargar.
5. Conservar PNG/JSON físicos antes y después, la fuente final y los comandos. El resultado es una prueba de documento controlado, no del shell real excluido por el usuario.

El test `ux-ui-02.demo.spec.ts` comprueba fuera del módulo sólo un botón `.button--primary` y un campo `.form-field`. Sus resultados no cubren las colisiones de área anteriores. El caso R07 de `audit-layout.spec.ts:259` navega entre pantallas, toma capturas y comprueba el overflow final; no crea controles externos ni compara sus estilos. Ninguno debe citarse como prueba completa de este requisito sin ampliar evidencia.

Única escritura: este documento. No se ejecutaron tests, build, navegador, E2E, servidores o cobertura; no se editaron aplicación, configuración, registro ni auditoría histórica. D01 mantiene el shell real fuera del alcance. Las verificaciones físicas con teclado virtual y lector de pantalla continúan pendientes según la decisión del usuario.
