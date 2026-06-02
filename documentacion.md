# Documentación Extendida del Sistema TECNORIVAS

Este documento provee una visión técnica exhaustiva de la arquitectura, flujos de datos, reglas de negocio y estructuras subyacentes del sistema administrativo web TECNORIVAS.

---

## 1. Visión Arquitectónica y Persistencia

TECNORIVAS es una aplicación web *Client-Side Rendering (CSR)* orientada al administrador. Funciona de manera autónoma en el navegador, delegando el almacenamiento de datos íntegramente a la API nativa de `localStorage`.

### 1.1 El Motor de Persistencia (Wrapper)
En el archivo `app.js`, toda la interacción con `localStorage` está abstraída a través de un par de funciones globales:
- `guardarDatos(clave, datos)`: Serializa en formato JSON y sobreescribe la clave.
- `obtenerDatos(clave)`: Deserializa desde JSON, retornando un arreglo vacío `[]` si la clave no existe, previniendo errores de variables no definidas en los bucles.

### 1.2 Entidades del Modelo de Datos (Claves de Storage)
Los datos se almacenan en las siguientes colecciones clave:

1. **`usuarios_tecnorivas`**: `[ { id, cedula, nombre, usuario, contrasena, rol } ]`
2. **`clientes_tecnorivas`**: `[ { id, documento, nombre, direccion, email, telefono } ]`
3. **`proveedores_tecnorivas`**: `[ { id, ruc, nombre, direccion, contacto, telefono, email } ]`
4. **`categorias_tecnorivas`**: `[ { id, nombre, descripcion } ]`
5. **`articulos_tecnorivas`**: `[ { id, codigo, nombre, idCategoria, marca, idProveedor, precioCosto, precioVenta, stock } ]`
6. **`compras_tecnorivas`**: `[ { id, fecha, idProveedor, comprobante, total, estado, detalles: [...] } ]`
7. **`presupuestos_tecnorivas`**: `[ { id, fecha, idCliente, total, estado ("pendiente", "aprobado", "cobrado"), detalles: [...] } ]`
8. **`movimientos_inventario`**: `[ { fecha, idArticulo, tipo ("entrada", "salida", "ajuste"), cantidad, saldoA, saldoB, motivo } ]`
9. **`cajas_tecnorivas`**: `[ { id, fechaApertura, fechaCierre, cajero, montoInicial, ingresos, egresos, estado ("abierta", "cerrada"), movimientos: [...] } ]`

---

## 2. Flujos de Trabajo y Lógica de Negocio (Casos de Uso)

### 2.1 Flujo de Compra y Afectación de Stock
1. El usuario (Admin/Supervisor) registra un artículo en el módulo **Inventario**.
2. En el módulo **Compras**, inicia una "Nueva Compra" y selecciona el Proveedor.
3. Se añaden ítems al carrito de compra.
4. Al confirmar (script `compras.js`), el sistema guarda la compra en `compras_tecnorivas`.
5. Simultáneamente, itera sobre los detalles y dispara una actualización en `articulos_tecnorivas`, sumando la cantidad comprada al `stock` del producto.
6. Se genera un registro histórico en `movimientos_inventario` documentando la "entrada".

### 2.2 Flujo de Venta: Presupuesto y Cobranza
Este flujo distribuye el trabajo entre un vendedor (Asesor) y un encargado de cobros (Cajero).
1. El **Asesor** accede a **Presupuestos**, selecciona un cliente y añade ítems (validando que no supere el stock actual).
2. Se genera el Presupuesto en estado `"pendiente"`. El asesor no puede cobrarlo.
3. El **Cajero** ingresa al sistema y **Abre su Caja** desde `caja.html` (`caja.js`), definiendo un saldo base.
4. El Cajero va a **Presupuestos**, visualiza la lista, lo "Aprueba" y presiona **"Cobrar"**.
5. Tras el cobro:
   - El estado del presupuesto cambia a `"cobrado"`.
   - Se inyecta un objeto `movimiento` tipo `"ingreso"` directamente al array de movimientos de la sesión de caja actual abierta (`cajas_tecnorivas`).
   - Se rebaja el inventario de los artículos involucrados y se genera el respectivo registro de `"salida"` en `movimientos_inventario`.

---

## 3. Matriz de Roles y Control de Acceso (ACL)

El control de acceso (`app.js` -> `protegerPagina()`) opera bajo un modelo de *Allowlist* (Lista de permitidos).

1. **Superusuario**: Acceso total y absoluto (`usuarios`, `compras`, `inventario`, `presupuestos`, `reportes`, `caja`). Único rol capaz de borrar auditorías de alto impacto (futuro).
2. **Admin**: Acceso idéntico al superusuario en términos de interfaz, pensado para la gerencia diaria.
3. **Supervisor**: Orientado al control de almacén. Tiene acceso a `compras`, `inventario` y a los `reportes`. No toca dinero ni presupuestos.
4. **Asesor**: Comercial. Accede a `inventario` (solo lectura de stock) y `presupuestos` (para crearlos). No cobra, no ve reportes de negocio.
5. **Cajero**: Administrativo financiero. Accede a `presupuestos` (solo para cobrarlos) y a su `caja`.

**Mecanismo Frontend Security:** 
Si un usuario intenta forzar la navegación (ej. un *Cajero* ingresando a `/pages/usuarios.html` mediante la barra de direcciones), la función `protegerPagina()` lee el rol desde el `localStorage` en el primer ciclo de renderizado, identifica la violación y dispara un `window.location.href = 'dashboard.html'` instantáneo, negando la visualización del HTML bloqueado.

---

## 4. Descripción Técnica de Scripts Críticos

### `app.js`
- **Renderizado Dinámico de Navegación**: A través del mapeo del rol, busca el árbol del DOM en el `<aside>` (clases `.nav-item-sidebar` y `.nav-sub`) aplicando `style.setProperty('display', 'none', 'important')` en los nodos no autorizados.
- **Formateador de Monedas (`formatearMoneda`)**: Utiliza `Intl.NumberFormat('es-PY', { style: 'currency', currency: 'PYG' })` para garantizar uniformidad en toda la app ("Gs. 10.000").
- **Auto-exportación `exportarExcel()`**: Lógica que evalúa si el objeto `window.XLSX` existe. De no existir, incrusta dinámicamente un `<script>` hacia un CDN, descarga la librería y delega la ejecución de la conversión CSV/XLSX en una función Promesa (lazy loading).

### `caja.js`
- Construye su vista principal basándose siempre en el último elemento (sesión) del arreglo global `cajas_tecnorivas` que posea el `estado: 'abierta'`.
- Evita que múltiples usuarios o incluso el mismo usuario pueda abrir más de una caja paralela.
- `renderHistorialCajas()`: Función de auditoría que renderiza en la segunda pestaña todos los balances cerrados históricos (Ingresos vs Egresos = Saldo en Caja), sirviendo como control contable definitivo para gerencia.

### `reportes.js`
- Agrupa 4 motores de reporte en un solo archivo.
- Generación PDF: Emplea la sintaxis de *jsPDF* junto con *autoTable*. Intercepta los arrays en crudo desde `localStorage`, formatea las fechas en el acto, suma las columnas y genera un blob que activa la descarga automática de un archivo como `reporte_presupuestos.pdf`.
- Su interfaz HTML consta de 4 botones unificados (Pantalla, PDF, Excel, Imprimir) mediante clases `btn-group`, los cuales despachan eventos hacia la función exportadora específica.

### `seeds.js`
- *Mock Data Engine*. Actúa antes de cargar `login.html`. Si la llave `usuarios_tecnorivas` resulta un valor falso o indefinido, empuja 10 diccionarios enteros de JSON hacia el localstorage para poblar de Inmediato Usuarios, Clientes, Artículos y Presupuestos iniciales, dotando a la aplicación de características "Plug-And-Play" para el desarrollador.

---

## 5. Ecosistema de Librerías y Dependencias

A diferencia de entornos NPM, este proyecto consume librerías a través de referencias clásicas para maximizar compatibilidad y evitar pasos de compilación/bundle.

1. **Bootstrap 5 (UI Framework)** 
   - Provee el sistema de componentes atómicos.
   - Modales (Modal.getInstance), Botones (btn-outline), y Grillas (col-lg-6).
2. **Bootstrap Icons (Iconografía)**
   - Elementos visuales `<i>` a través de SVG o fuentes ligeras utilizadas en la barra lateral superior.
3. **SweetAlert2 (Micro-interacciones)**
   - Reemplaza los aburridos y bloqueantes `prompt()` y `alert()`.
   - Utilizado en `caja.js` para recibir el "Monto Inicial" integrando validación *preConfirm*.
4. **jsPDF y autoTable (Generador Documental)**
   - Librerías hermanas para pintar PDFs vectoriales usando Javascript directamente en el cliente, respetando bordes de página y paginación.
5. **SheetJS - xlsx (Analítica y Data)**
   - Potente procesador tabular. Permite extraer información en memoria (`aoa_to_sheet`) y empaquetarla con las cabeceras XML correspondientes en un archivo funcional que puede abrir Excel, Google Sheets y LibreOffice sin causar advertencias de corrupción.
