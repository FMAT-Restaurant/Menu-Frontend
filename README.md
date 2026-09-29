# Menu-Frontend (Restaurant Platform)

Este repositorio contiene la aplicación cliente (frontend) para la gestión del servicio de **Menu y Catálogo** de la **Restaurant Platform**.

## Propósito

El propósito de este proyecto es proveer a los administradores las interfaces necesarias para el mantenimiento de categorías, entradas comerciales, ofertas, composiciones estructurales, bibliotecas de recetas y personalizaciones, de acuerdo con las especificaciones del dominio del catálogo de la plataforma. La aplicación sirve como vista y controlador principal para la creación, publicación y modificación de productos disponibles en el restaurante.

## Documentación Relacionada

Todas las especificaciones técnicas, requisitos (ERS), los contratos de API y las decisiones de diseño se encuentran versionadas en el repositorio central de documentación. Es esencial revisar dichos documentos antes de implementar nuevas características:

* **[Documentación del Producto y Contratos (Repositorio Principal)](https://fmat-restaurant.github.io/Menu-Documentation/)**

## Tecnologías que Utilizamos

El proyecto está construido sobre las siguientes tecnologías principales:

* **React Native**: Framework principal para el desarrollo de la aplicación cliente, garantizando la compatibilidad multiplataforma y un rendimiento eficiente.
* **Node.js**: Entorno de ejecución para las herramientas de desarrollo y la gestión de paquetes.

## Requisitos Previos

Antes de ejecutar o contribuir al proyecto, asegúrese de contar con los siguientes elementos instalados en su entorno local:

* **Node.js**: Versión 24.x sugerida por la especificación del proyecto.
* **Gestor de paquetes**: `npm` (incluido con Node.js) o `yarn`.
* **Entorno de React Native**: Configuración adecuada de dependencias para desarrollo móvil (Android Studio / Xcode) o herramientas asociadas (por ejemplo, Expo CLI, si el proyecto lo define).
* **Git**: Para el control de versiones.

## Flujos de Trabajo y Ramas

El repositorio utiliza un flujo de trabajo basado en ramas (branching model) para organizar el desarrollo y las aprobaciones. Las ramas principales son:

* `main` / `master`: Contiene el código estable y las versiones de producción. Todas las integraciones a esta rama deben ser aprobadas mediante Pull Requests.
* `develop`: (Opcional, según el flujo del equipo) Rama de integración principal donde se prueban las nuevas características antes de pasar a producción.
* **Ramas de características (Feature branches):** Las nuevas funcionalidades, correcciones o mejoras deben realizarse en ramas individuales, partiendo de la rama principal de desarrollo, utilizando prefijos descriptivos como `feature/`, `fix/` o `docs/`.

## Convención de Commits

El proyecto sigue una convención estricta para los mensajes de los commits, con el objetivo de mantener un historial limpio y legible. Se deben utilizar los siguientes prefijos según la naturaleza del cambio:

* `feat:` Para la adición de una nueva funcionalidad.
  * *Ejemplo:* `feat: agregar endpoint de combos`
* `fix:` Para la corrección de errores o bugs.
  * *Ejemplo:* `fix: corregir validación de variantes`
* `docs:` Para la creación o actualización de documentación.
  * *Ejemplo:* `docs: actualizar README`
* `chore:` Para tareas de mantenimiento, dependencias o configuración que no modifican código de producción.

## Entorno de Desarrollo y Configuración

1. **Clonar el repositorio:**
   ```bash
   git clone https://github.com/FMAT-Restaurant/Menu-Frontend.git
   cd Menu-Frontend
   ```

2. **Instalación de dependencias:**
   ```bash
   npm install
   ```

3. **Ejecución del entorno local:**
   ```bash
   npm run start
   ```
