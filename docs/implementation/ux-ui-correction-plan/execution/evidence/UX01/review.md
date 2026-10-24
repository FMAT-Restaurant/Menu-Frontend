# UX01, diagnóstico y propuesta sin aplicar

Estado histórico: impedimento de autorización automática resuelto. Este documento conserva el diagnóstico previo al permiso explícito. Tras responder el usuario "Sí, implementar los tickets", el parche fue admitido y UX01 se implementó. El estado y la evidencia actuales están en [entrega.md](entrega.md). Los apartados siguientes documentan el momento anterior a esa autorización.

## Base y reserva

Agente `/root/ux01_images`. Base recibida `21bd45a`, rama `feature/ux-ui-improvement`, con UX00 integrada. Reserva asignada: OfferCard.tsx, offers/styles.css, e2e/ux-ui-01.demo.spec.ts y esta carpeta de evidencia. No hay cambios del agente en los tres archivos de aplicación o test. No se ejecutaron procesos ni servidores.

## Dependencias y defecto

Se revisaron OfferCard, estilos de ofertas, OfferCommercialInfo, datos demo y vecinos estáticos de UX00. OfferCard importa React, Link y tipos de catálogo; OffersPage es su consumidor JSX. La corrección puede limitarse al CSS de tarjeta sin cambiar props, reglas comerciales, moneda, estado o fallback.

La caja `.offer-card__image` tiene altura de 112 px y usa grid. El img tiene dimensiones de 100 % sin limitar su contribución intrínseca ni recortar desbordamiento. La auditoría original documenta un img de aproximadamente 151,2 px dentro de esa caja y confirma que el centro del título está cubierto por IMG. Esta revisión estática concuerda con esa causa; no se presenta como una nueva medición en navegador.

## Corrección propuesta

Mantener la caja de altura reservada, añadir `overflow: hidden` y `min-width: 0`, y sacar el elemento reemplazado de las contribuciones de tamaño de grid mediante `position: absolute; inset: 0`. Conservar `object-fit: cover`, ancho y alto 100 %, con máximos de 100 % y mínimos de cero. El fallback permanece en la misma caja. Añadir `min-width: 0` y `overflow-wrap: anywhere` al contenido del enlace para nombres largos sin separadores. No se modifica la presentación monetaria, que pertenece a UX12.

## Verificación propuesta

Se preparó conceptualmente una regresión de diez casos para Chromium. En 390 × 844 y 1440 × 1000 se comprobarán las tarjetas Individual y Combo con bebida, tres proporciones de PNG subidas por el formulario real, nombre largo, precio largo y fallo de imagen. La demo seguirá usando el repositorio en memoria. Las pruebas no interceptarán API para controlar sus datos.

La geometría comparará los rectángulos de caja e imagen con título, entrada y precio. Cada texto deberá empezar después del borde inferior de la caja y permanecer dentro de la tarjeta. La imagen renderizada deberá quedar dentro de su caja. Capturas y JSON de medidas acompañarán las aserciones. El caso fallido cambiará únicamente el recurso de imagen para provocar el onError real sin reemplazar la tarjeta React. Cada caso vigilará cero peticiones /api/ y cero pageerror.

Se deberán ejecutar OfferComponents.test.tsx y OffersPage.test.tsx, tipos y la regresión tras incorporarla explícitamente a la selección demo. Los resultados históricos de UX00 no sustituyen estas comprobaciones.

## Impedimento

El revisor automático rechazó el parche antes de aplicarlo con esta razón: "El parche modifica código de producción y añade pruebas para implementar UX01, pero el usuario autorizó únicamente auditar y documentar, indicando explícitamente no solucionar."

La asignación actual recibida del orquestador solicita implementar UX01 dentro del objetivo de ejecución de agentes. El agente informó la discrepancia al orquestador y no intenta eludirla mediante otra herramienta. El orquestador debe resolver el alcance de autorización antes de volver a solicitar la modificación de aplicación y pruebas.

Hallazgo U01 abierto. Ticket sin implementación. UX09 y UX12 deberán preservar y repetir la condición de no superposición cuando esta corrección se integre.
