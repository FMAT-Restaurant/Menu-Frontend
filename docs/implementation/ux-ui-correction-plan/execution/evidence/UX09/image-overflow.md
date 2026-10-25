# Diagnostico de desborde de vista previa

Primera pasada integrada: 15/16, con UX01 diez y UX08 tres aprobadas. Geometria UX09 detecta scrollHeight166 frente a clientHeight160 antes de poder guardar la primera medida. No se relaja la asercion.

La vista previa tiene caja de160px y un img width/height100% inline por defecto. Un img inline participa en la caja de linea y conserva el espacio de descendentes de la linea del padre, produciendo contenido adicional bajo sus160px. El button padre usa overflow hidden y recorta esos6px. El overlay absoluto no aporta altura al flujo. La correccion de produccion fija display:block en .image-preview img, eliminando la linea de texto/baseline residual sin cambiar imagen, selector, payload ni altura objetivo. OfferCard U01 ya usa display:block y no se modifica.

La regresion conserva scrollHeight<=clientHeight+1 y ahora identifica nombre, host y ancho en el error. La evidencia de viewport se guarda antes de las aserciones para retener las medidas si vuelve a fallar. Root conserva la evidencia negativa en resume-ux08/browser-first y centraliza la repeticion; el agente no ejecuta navegador ni build.
