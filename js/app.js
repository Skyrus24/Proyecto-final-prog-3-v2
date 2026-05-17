/**
 * app.js - Utilidades Globales TECNORIVAS
 * Persistencia, sesión, validaciones y helpers compartidos
 */

// ============================================================
// PERSISTENCIA
// ============================================================
function guardarDatos(clave, datos) {
    localStorage.setItem(clave, JSON.stringify(datos));
}

function obtenerDatos(clave) {
    return JSON.parse(localStorage.getItem(clave)) || [];
}

function guardarSesion(usuario) {
    localStorage.setItem('sesion_tecnorivas', JSON.stringify(usuario));
}

function obtenerSesion() {
    return JSON.parse(localStorage.getItem('sesion_tecnorivas'));
}

function cerrarSesion() {
    localStorage.removeItem('sesion_tecnorivas');
}

// ============================================================
// PROTECCIÓN DE PÁGINAS
// ============================================================
function protegerPagina() {
    const sesion = obtenerSesion();
    if (!sesion) {
        window.location.href = '../login.html';
        return null;
    }
    return sesion;
}

function soloAdmin() {
    const sesion = obtenerSesion();
    if (!sesion || sesion.rol !== 'admin') {
        Swal.fire({ icon: 'warning', title: 'Acceso restringido', text: 'Solo administradores pueden acceder a esta sección.' });
        return false;
    }
    return true;
}

// ============================================================
// DATOS INICIALES (SEED)
// ============================================================
function inicializarDatos() {
    // Usuarios por defecto
    if (!localStorage.getItem('usuarios_tecnorivas')) {
        const usuarios = [
            { id: 1, cedula: '001-0000001-1', nombre: 'Administrador Principal', celular: '809-000-0001', usuario: 'admin', contrasena: 'admin123', rol: 'admin', fechaCreacion: new Date().toISOString() },
            { id: 2, cedula: '001-0000002-2', nombre: 'Vendedor Demo', celular: '809-000-0002', usuario: 'vendedor', contrasena: 'vendedor123', rol: 'vendedor', fechaCreacion: new Date().toISOString() },
            { id: 3, cedula: '001-0000003-3', nombre: 'Carlos Ruiz', celular: '809-000-0003', usuario: 'cruiz', contrasena: 'Vendedor1@', rol: 'vendedor', fechaCreacion: new Date().toISOString() },
            { id: 4, cedula: '001-0000004-4', nombre: 'Ana Gómez', celular: '809-000-0004', usuario: 'agomez', contrasena: 'Vendedor1@', rol: 'vendedor', fechaCreacion: new Date().toISOString() },
            { id: 5, cedula: '001-0000005-5', nombre: 'Luis Felipe', celular: '809-000-0005', usuario: 'lfelipe', contrasena: 'Vendedor1@', rol: 'admin', fechaCreacion: new Date().toISOString() },
            { id: 6, cedula: '001-0000006-6', nombre: 'María Pérez', celular: '809-000-0006', usuario: 'mperez', contrasena: 'Vendedor1@', rol: 'vendedor', fechaCreacion: new Date().toISOString() },
            { id: 7, cedula: '001-0000007-7', nombre: 'Jorge Díaz', celular: '809-000-0007', usuario: 'jdiaz', contrasena: 'Vendedor1@', rol: 'vendedor', fechaCreacion: new Date().toISOString() },
            { id: 8, cedula: '001-0000008-8', nombre: 'Laura Medina', celular: '809-000-0008', usuario: 'lmedina', contrasena: 'Vendedor1@', rol: 'vendedor', fechaCreacion: new Date().toISOString() },
            { id: 9, cedula: '001-0000009-9', nombre: 'Pedro Sánchez', celular: '809-000-0009', usuario: 'psanchez', contrasena: 'Vendedor1@', rol: 'vendedor', fechaCreacion: new Date().toISOString() },
            { id: 10, cedula: '001-0000010-0', nombre: 'Elena Castillo', celular: '809-000-0010', usuario: 'ecastillo', contrasena: 'Vendedor1@', rol: 'vendedor', fechaCreacion: new Date().toISOString() }
        ];
        guardarDatos('usuarios_tecnorivas', usuarios);
    }

    // Categorías por defecto
    if (!localStorage.getItem('categorias_tecnorivas')) {
        const categorias = [
            { id: 1, nombre: 'Refrigeración', descripcion: 'Equipos y repuestos de refrigeración' },
            { id: 2, nombre: 'Electricidad', descripcion: 'Materiales eléctricos' },
            { id: 3, nombre: 'Construcción', descripcion: 'Materiales de construcción' },
            { id: 4, nombre: 'Herramientas', descripcion: 'Herramientas generales' },
            { id: 5, nombre: 'Plomería', descripcion: 'Tuberías y accesorios de agua' },
            { id: 6, nombre: 'Pintura', descripcion: 'Pinturas y solventes' },
            { id: 7, nombre: 'Iluminación', descripcion: 'Lámparas y bombillas' },
            { id: 8, nombre: 'Seguridad', descripcion: 'Equipos de protección y alarmas' },
            { id: 9, nombre: 'Jardinería', descripcion: 'Equipos para mantenimiento exterior' },
            { id: 10, nombre: 'Automotriz', descripcion: 'Accesorios y repuestos básicos' }
        ];
        guardarDatos('categorias_tecnorivas', categorias);
    }

    // Servicios por defecto
    if (!localStorage.getItem('servicios_tecnorivas')) {
        const servicios = [
            { id: 1, nombre: 'Mantenimiento de Aire Acondicionado', categoriaId: 1, precio: 150000, iva: 10 },
            { id: 2, nombre: 'Instalación de Compresor', categoriaId: 1, precio: 250000, iva: 10 },
            { id: 3, nombre: 'Instalación Eléctrica Básica', categoriaId: 2, precio: 300000, iva: 10 },
            { id: 4, nombre: 'Cambio de Panel Eléctrico', categoriaId: 2, precio: 450000, iva: 10 },
            { id: 5, nombre: 'Mano de Obra Construcción (Día)', categoriaId: 3, precio: 180000, iva: 10 },
            { id: 6, nombre: 'Reparación de Fugas de Agua', categoriaId: 5, precio: 120000, iva: 10 },
            { id: 7, nombre: 'Pintura de Interiores (m2)', categoriaId: 6, precio: 25000, iva: 10 },
            { id: 8, nombre: 'Instalación de Lámparas', categoriaId: 7, precio: 80000, iva: 10 },
            { id: 9, nombre: 'Instalación de Cámaras', categoriaId: 8, precio: 350000, iva: 10 },
            { id: 10, nombre: 'Mantenimiento de Jardín', categoriaId: 9, precio: 90000, iva: 10 }
        ];
        guardarDatos('servicios_tecnorivas', servicios);
    }

    // Proveedores por defecto
    if (!localStorage.getItem('proveedores_tecnorivas')) {
        const proveedores = [
            { id: 1, nombre: 'Distribuidora Fría S.A.', rnc: '130-12345-6', telefono: '809-555-0101', email: 'ventas@fria.com', direccion: 'Av. Principal #10', contacto: 'Juan Pérez' },
            { id: 2, nombre: 'ElectroSupplies RD', rnc: '130-67890-1', telefono: '809-555-0202', email: 'info@electro.com', direccion: 'Calle 5 #22', contacto: 'María López' },
            { id: 3, nombre: 'Materiales Constanza', rnc: '130-22222-3', telefono: '809-555-0303', email: 'ventas@constanza.com', direccion: 'Av. Industrial #1', contacto: 'Pedro Gil' },
            { id: 4, nombre: 'Herramientas Globales', rnc: '130-33333-4', telefono: '809-555-0404', email: 'contacto@hglobales.com', direccion: 'Calle Nueva #3', contacto: 'Luis Roa' },
            { id: 5, nombre: 'Tuberías y Más', rnc: '130-44444-5', telefono: '809-555-0505', email: 'ventas@tuberiasymas.com', direccion: 'Plaza Central L2', contacto: 'Ana Rivas' },
            { id: 6, nombre: 'Pinturas Caribe', rnc: '130-55555-6', telefono: '809-555-0606', email: 'info@pcaribe.com', direccion: 'Av. Duarte #45', contacto: 'Carlos Mora' },
            { id: 7, nombre: 'Luz y Diseño', rnc: '130-66666-7', telefono: '809-555-0707', email: 'ventas@luzdiseno.com', direccion: 'Calle 8 #12', contacto: 'Elena Cruz' },
            { id: 8, nombre: 'Seguridad Total', rnc: '130-77777-8', telefono: '809-555-0808', email: 'info@seguridadt.com', direccion: 'Plaza Las Américas', contacto: 'José Mateo' },
            { id: 9, nombre: 'Jardines del Sur', rnc: '130-88888-9', telefono: '809-555-0909', email: 'ventas@jardines.com', direccion: 'Av. Sur #90', contacto: 'Lucía Peña' },
            { id: 10, nombre: 'Autopartes Rápidas', rnc: '130-99999-0', telefono: '809-555-1010', email: 'ventas@autopartes.com', direccion: 'Av. Máximo Gómez', contacto: 'Roberto Gil' }
        ];
        guardarDatos('proveedores_tecnorivas', proveedores);
    }

    // Artículos por defecto
    if (!localStorage.getItem('articulos_tecnorivas')) {
        const articulos = [
            { id: 1,  codigo: '7501000001001', nombre: 'Compresor 1/2 HP',               categoriaId: 1, precio: 8500,  stock: 10,  stockMinimo: 3,  unidad: 'und',   iva: 18 },
            { id: 2,  codigo: '7501000001002', nombre: 'Gas Refrigerante R22',            categoriaId: 1, precio: 1200,  stock: 25,  stockMinimo: 5,  unidad: 'lb',    iva: 18 },
            { id: 3,  codigo: '7501000002003', nombre: 'Cable #12 AWG',                  categoriaId: 2, precio: 85,    stock: 200, stockMinimo: 50, unidad: 'm',     iva: 18 },
            { id: 4,  codigo: '7501000002004', nombre: 'Breaker 20A',                    categoriaId: 2, precio: 450,   stock: 30,  stockMinimo: 10, unidad: 'und',   iva: 18 },
            { id: 5,  codigo: '7501000003005', nombre: 'Cemento Portland',               categoriaId: 3, precio: 650,   stock: 100, stockMinimo: 20, unidad: 'saco',  iva: 18 },
            { id: 6,  codigo: '7501000004006', nombre: 'Taladro Percutor 800W',          categoriaId: 4, precio: 3500,  stock: 15,  stockMinimo: 4,  unidad: 'und',   iva: 18 },
            { id: 7,  codigo: '7501000005007', nombre: 'Tubo PVC 1/2"',                 categoriaId: 5, precio: 250,   stock: 150, stockMinimo: 30, unidad: 'm',     iva: 18 },
            { id: 8,  codigo: '7501000006008', nombre: 'Galón Pintura Blanca Acrílica', categoriaId: 6, precio: 1800,  stock: 40,  stockMinimo: 10, unidad: 'galon', iva: 18 },
            { id: 9,  codigo: '7501000007009', nombre: 'Bombillo LED 12W',               categoriaId: 7, precio: 150,   stock: 300, stockMinimo: 50, unidad: 'und',   iva: 18 },
            { id: 10, codigo: '7501000008010', nombre: 'Cámara IP 1080p',               categoriaId: 8, precio: 2200,  stock: 20,  stockMinimo: 5,  unidad: 'und',   iva: 18 }
        ];
        guardarDatos('articulos_tecnorivas', articulos);
    }

    // Clientes por defecto
    if (!localStorage.getItem('clientes_tecnorivas')) {
        const clientes = [
            { id: 1, cedula: '001-1111111-1', nombre: 'Cliente General', telefono: '809-111-1111', email: 'cliente@email.com', direccion: 'Sin dirección' },
            { id: 2, cedula: '001-2222222-2', nombre: 'Empresa ABC S.R.L.', telefono: '809-222-2222', email: 'abc@empresa.com', direccion: 'Zona Industrial #5' },
            { id: 3, cedula: '001-3333333-3', nombre: 'Juan Francisco', telefono: '809-333-3333', email: 'juanf@email.com', direccion: 'Calle 10 #20' },
            { id: 4, cedula: '001-4444444-4', nombre: 'Constructora del Sol', telefono: '809-444-4444', email: 'info@csol.com', direccion: 'Av. Kennedy' },
            { id: 5, cedula: '001-5555555-5', nombre: 'María Almonte', telefono: '809-555-5555', email: 'malmonte@email.com', direccion: 'Residencial Las Praderas' },
            { id: 6, cedula: '001-6666666-6', nombre: 'Ferretería Popular', telefono: '809-666-6666', email: 'ferrep@email.com', direccion: 'Av. Independencia #100' },
            { id: 7, cedula: '001-7777777-7', nombre: 'José Liranzo', telefono: '809-777-7777', email: 'jliranzo@email.com', direccion: 'Sector Los Ríos' },
            { id: 8, cedula: '001-8888888-8', nombre: 'Plaza del Pollo', telefono: '809-888-8888', email: 'plazap@email.com', direccion: 'Av. Luperón' },
            { id: 9, cedula: '001-9999999-9', nombre: 'Rosa Tavares', telefono: '809-999-9999', email: 'rosat@email.com', direccion: 'Ensanche Naco' },
            { id: 10, cedula: '001-0000000-0', nombre: 'Inversiones Múltiples', telefono: '809-000-1111', email: 'invm@email.com', direccion: 'Bella Vista' }
        ];
        guardarDatos('clientes_tecnorivas', clientes);
    }

    // Inicializar arrays vacíos si no existen
    ['compras_tecnorivas', 'ventas_tecnorivas', 'movimientos_inventario', 'pagos_compras', 'cobros_ventas', 'cajas_tecnorivas'].forEach(clave => {
        if (!localStorage.getItem(clave)) {
            guardarDatos(clave, []);
        }
    });
}

// ============================================================
// GENERADOR DE ID
// ============================================================
function generarId(lista) {
    if (!lista || lista.length === 0) return 1;
    return Math.max(...lista.map(i => i.id || 0)) + 1;
}

// ============================================================
// FORMATEO
// ============================================================
function formatearMoneda(valor) {
    return new Intl.NumberFormat('es-PY', { style: 'currency', currency: 'PYG', maximumFractionDigits: 0 }).format(valor || 0);
}

function formatearFecha(fechaISO) {
    if (!fechaISO) return '-';
    return new Date(fechaISO).toLocaleDateString('es-DO', { year: 'numeric', month: '2-digit', day: '2-digit' });
}

function fechaHoy() {
    return new Date().toISOString().split('T')[0];
}

function fechaHoraAhora() {
    return new Date().toISOString();
}

// ============================================================
// PAGINACIÓN GENÉRICA
// ============================================================
class Paginador {
    constructor(contenedorId, paginacionId, porPagina = 10) {
        this.contenedorId = contenedorId;
        this.paginacionId = paginacionId;
        this.porPagina = porPagina;
        this.paginaActual = 1;
        this.datos = [];
        this.renderFn = null;
    }

    setDatos(datos, renderFn) {
        this.datos = datos;
        this.renderFn = renderFn;
        this.paginaActual = 1;
        this.render();
    }

    get totalPaginas() {
        return Math.max(1, Math.ceil(this.datos.length / this.porPagina));
    }

    get datosPagina() {
        const inicio = (this.paginaActual - 1) * this.porPagina;
        return this.datos.slice(inicio, inicio + this.porPagina);
    }

    render() {
        const contenedor = document.getElementById(this.contenedorId);
        const paginacion = document.getElementById(this.paginacionId);
        if (!contenedor || !this.renderFn) return;

        contenedor.innerHTML = '';
        this.renderFn(this.datosPagina, contenedor);

        if (paginacion) {
            paginacion.innerHTML = '';
            if (this.totalPaginas <= 1) return;

            const crear = (texto, pagina, activo = false, deshabilitado = false) => {
                const li = document.createElement('li');
                li.className = `page-item ${activo ? 'active' : ''} ${deshabilitado ? 'disabled' : ''}`;
                li.innerHTML = `<a class="page-link" href="#">${texto}</a>`;
                if (!deshabilitado) li.addEventListener('click', e => { e.preventDefault(); this.paginaActual = pagina; this.render(); });
                return li;
            };

            paginacion.appendChild(crear('«', this.paginaActual - 1, false, this.paginaActual === 1));
            for (let i = 1; i <= this.totalPaginas; i++) {
                paginacion.appendChild(crear(i, i, i === this.paginaActual));
            }
            paginacion.appendChild(crear('»', this.paginaActual + 1, false, this.paginaActual === this.totalPaginas));
        }
    }
}

// ============================================================
// EXPORTAR EXCEL GENÉRICO
// ============================================================
function exportarExcel(datos, nombre, columnas) {
    if (!window.XLSX) {
        const script = document.createElement('script');
        script.src = 'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js';
        script.onload = () => _generarExcel(datos, nombre, columnas);
        document.head.appendChild(script);
    } else {
        _generarExcel(datos, nombre, columnas);
    }
}

function _generarExcel(datos, nombre, columnas) {
    const ws_data = [];
    ws_data.push([nombre.toUpperCase()]); // Título
    
    const headers = columnas.map(c => c.label);
    ws_data.push(headers);
    
    datos.forEach(fila => {
        const row = columnas.map(c => fila[c.key] || '');
        ws_data.push(row);
    });
    
    const ws = XLSX.utils.aoa_to_sheet(ws_data);
    
    if (!ws['!merges']) ws['!merges'] = [];
    ws['!merges'].push({s: {r:0, c:0}, e: {r:0, c:headers.length-1}});
    
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Datos");
    
    XLSX.writeFile(wb, `${nombre}_${fechaHoy()}.xlsx`);
}

// ============================================================
// GENERAR PDF TABLA
// ============================================================
function generarPDF(titulo) {
    if (!window.jspdf) {
        Swal.fire({ title: 'Generando PDF...', text: 'Cargando librerías necesarias...', allowOutsideClick: false, didOpen: () => { Swal.showLoading(); }});
        const script1 = document.createElement('script');
        script1.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';
        script1.onload = () => {
            const script2 = document.createElement('script');
            script2.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.5.31/jspdf.plugin.autotable.min.js';
            script2.onload = () => { Swal.close(); _crearPDF(titulo); };
            document.head.appendChild(script2);
        };
        document.head.appendChild(script1);
    } else {
        _crearPDF(titulo);
    }
}

function _crearPDF(titulo) {
    const contenido = document.getElementById('tabla-body') || document.querySelector('tbody');
    const tabla = contenido ? contenido.closest('table') : null;
    if (!tabla) { alertaError('No hay tabla para exportar'); return; }

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF('p', 'pt', 'a4');

    doc.setFontSize(16);
    doc.setTextColor(30, 58, 95);
    doc.text("TECNORIVAS", 40, 40);

    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    doc.text("Sistema Administrativo", 40, 55);

    doc.setFontSize(14);
    doc.setTextColor(30, 58, 95);
    doc.text(titulo, 40, 80);

    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    doc.text(`Fecha y hora: ${new Date().toLocaleString('es-DO')}`, doc.internal.pageSize.width - 40, 80, { align: 'right' });

    doc.autoTable({
        html: tabla,
        startY: 100,
        theme: 'striped',
        headStyles: { fillColor: [30, 58, 95] },
        styles: { fontSize: 9 },
        didDrawPage: function (data) {
            const str = 'Página ' + doc.internal.getNumberOfPages();
            doc.setFontSize(8);
            doc.text(str, data.settings.margin.left, doc.internal.pageSize.height - 20);
        }
    });

    doc.save(`${titulo.replace(/ /g, '_')}_${fechaHoy()}.pdf`);
}

// ============================================================
// RENDERIZAR INFO DE SESIÓN EN NAVBAR
// ============================================================
function renderizarSesionNavbar() {
    const sesion = obtenerSesion();
    const elNombre = document.getElementById('nav-usuario-nombre');
    const elRol = document.getElementById('nav-usuario-rol');
    if (elNombre && sesion) elNombre.textContent = sesion.nombre;
    if (elRol && sesion) elRol.textContent = sesion.rol === 'admin' ? 'Administrador' : 'Vendedor';

    if (sesion && sesion.rol !== 'admin') {
        const toHide = document.querySelectorAll('.admin-only, #nav-usuarios, #nav-reportes');
        toHide.forEach(el => el.style.display = 'none');
    }
}

// ============================================================
// LOGOUT CON SWEETALERT
// ============================================================
function configurarLogout() {
    document.querySelectorAll('[data-logout]').forEach(btn => {
        btn.addEventListener('click', e => {
            e.preventDefault();
            Swal.fire({
                title: '¿Cerrar sesión?',
                text: 'Tu sesión actual se cerrará.',
                icon: 'question',
                showCancelButton: true,
                confirmButtonText: 'Sí, salir',
                cancelButtonText: 'Cancelar',
                confirmButtonColor: '#e74c3c'
            }).then(result => {
                if (result.isConfirmed) {
                    cerrarSesion();
                    window.location.href = '../login.html';
                }
            });
        });
    });
}

// ============================================================
// ALERTA SWAL RÁPIDA
// ============================================================
function alertaExito(msg) { Swal.fire({ icon: 'success', title: 'Éxito', text: msg, timer: 2000, showConfirmButton: false }); }
function alertaError(msg) { Swal.fire({ icon: 'error', title: 'Error', text: msg }); }
function alertaInfo(msg) { Swal.fire({ icon: 'info', title: 'Información', text: msg }); }
function alertaAdvertencia(msg) { Swal.fire({ icon: 'warning', title: 'Atención', text: msg }); }

async function confirmarEliminar(nombre) {
    const result = await Swal.fire({
        title: '¿Eliminar registro?',
        html: `Se eliminará: <strong>${nombre}</strong><br>Esta acción no se puede deshacer.`,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: 'Sí, eliminar',
        cancelButtonText: 'Cancelar',
        confirmButtonColor: '#e74c3c'
    });
    return result.isConfirmed;
}

// ============================================================
// SIDEBAR SUBMENÚS COLAPSABLES
// ============================================================
function inicializarSidebarSubmenus() {
    // Toggle accordion
    document.querySelectorAll('.nav-parent').forEach(btn => {
        btn.addEventListener('click', e => {
            e.preventDefault();
            const subId = btn.dataset.sub;
            const sub = document.getElementById(subId);
            if (!sub) return;
            const yaAbierto = sub.classList.contains('abierto');
            // Cerrar todos
            document.querySelectorAll('.nav-sub').forEach(s => s.classList.remove('abierto'));
            document.querySelectorAll('.nav-parent').forEach(b => b.classList.remove('abierto'));
            // Abrir este si estaba cerrado
            if (!yaAbierto) {
                sub.classList.add('abierto');
                btn.classList.add('abierto');
            }
        });
    });

    // Auto-detectar página y hash actuales
    const pagina = location.pathname.split('/').pop().replace('.html', '');
    const hash = location.hash.replace('#', '');

    const mapa = { compras: 'sub-compras', ventas: 'sub-ventas', inventario: 'sub-inventario' };
    const subId = mapa[pagina];

    if (subId) {
        const sub = document.getElementById(subId);
        const btn = document.querySelector(`[data-sub="${subId}"]`);
        if (sub) sub.classList.add('abierto');
        if (btn) btn.classList.add('abierto');
    }

    // Marcar subitem activo por hash
    function marcarSubitem(h) {
        document.querySelectorAll('.nav-sub-item').forEach(el => {
            const href = el.getAttribute('href') || '';
            el.classList.toggle('activo', h ? href.includes(`#${h}`) : false);
        });
    }
    marcarSubitem(hash);
    window.addEventListener('hashchange', () => marcarSubitem(location.hash.replace('#', '')));

    // Marcar nav-item-sidebar activo (Usuarios, Dashboard, Reportes)
    const navEl = document.getElementById(`nav-${pagina}`);
    if (navEl) navEl.classList.add('activo');
}

// ============================================================
// PANELES POR HASH (reemplaza tabs)
// ============================================================
function inicializarPaneles(paneles, defecto) {
    function mostrarPanel(hash) {
        const tab = paneles.includes(hash) ? hash : defecto;
        paneles.forEach(p => {
            const panel = document.getElementById(`panel-${p}`);
            if (panel) panel.classList.toggle('d-none', p !== tab);
        });
    }
    mostrarPanel(location.hash.replace('#', ''));
    window.addEventListener('hashchange', () => mostrarPanel(location.hash.replace('#', '')));
}

// ============================================================
// COMPONENTE COMBOBOX CON BUSCADOR (SelectBuscador)
// ============================================================
class SelectBuscador {
    constructor(selectId) {
        this.select = document.getElementById(selectId);
        if (!this.select) return;

        // Ocultar select original
        this.select.style.display = 'none';

        // Contenedor principal
        this.container = document.createElement('div');
        this.container.className = 'select-search-wrapper position-relative w-100';

        // Input de búsqueda
        this.input = document.createElement('input');
        this.input.type = 'text';
        this.input.className = 'form-control select-search-input';
        this.input.placeholder = this.select.options[0] ? this.select.options[0].text : 'Buscar...';
        this.input.autocomplete = 'off';

        // Icono de búsqueda
        const icon = document.createElement('i');
        icon.className = 'bi bi-search position-absolute text-muted';
        icon.style.right = '12px';
        icon.style.top = '50%';
        icon.style.transform = 'translateY(-50%)';
        icon.style.pointerEvents = 'none';

        // Lista de opciones (Dropdown)
        this.dropdown = document.createElement('ul');
        this.dropdown.className = 'select-search-menu list-unstyled position-absolute w-100 bg-white border rounded shadow-sm d-none';
        this.dropdown.style.maxHeight = '200px';
        this.dropdown.style.overflowY = 'auto';
        this.dropdown.style.zIndex = '1050';
        this.dropdown.style.top = '100%';
        this.dropdown.style.left = '0';
        this.dropdown.style.marginTop = '4px';

        this.container.appendChild(this.input);
        this.container.appendChild(icon);
        this.container.appendChild(this.dropdown);
        this.select.parentNode.insertBefore(this.container, this.select);

        // Manejar validación HTML5 para campos requeridos
        if (this.select.hasAttribute('required')) {
            this.input.required = true;
            this.select.removeAttribute('required');
        }

        this.opciones = [];
        this.initEvents();
    }

    actualizar() {
        this.opciones = Array.from(this.select.options).filter(o => o.value !== '');
        this.renderMenu(this.opciones);
        
        if (this.select.value) {
            const opt = this.opciones.find(o => o.value === this.select.value);
            if (opt) {
                this.input.value = opt.text;
                this.input.setCustomValidity('');
            }
        } else {
            this.input.value = '';
            if (this.input.required) this.input.setCustomValidity('Por favor, selecciona una opción válida de la lista.');
        }
    }

    renderMenu(opcionesFiltradas) {
        this.dropdown.innerHTML = opcionesFiltradas.length === 0 
            ? '<li class="p-2 text-muted small text-center">No hay coincidencias</li>' 
            : '';
            
        opcionesFiltradas.forEach(opt => {
            const li = document.createElement('li');
            li.className = 'select-search-item p-2 border-bottom';
            li.textContent = opt.text;
            li.addEventListener('click', (e) => {
                e.stopPropagation();
                this.select.value = opt.value;
                this.input.value = opt.text;
                this.dropdown.classList.add('d-none');
                this.select.dispatchEvent(new Event('change'));
            });
            this.dropdown.appendChild(li);
        });
    }

    initEvents() {
        this.input.addEventListener('focus', () => {
            this.actualizar();
            this.dropdown.classList.remove('d-none');
            this.input.select();
        });

        this.input.addEventListener('input', (e) => {
            const val = e.target.value.toLowerCase();
            const filtradas = this.opciones.filter(o => o.text.toLowerCase().includes(val));
            this.renderMenu(filtradas);
            this.dropdown.classList.remove('d-none');
            
            if (val === '') {
                this.select.value = '';
                this.select.dispatchEvent(new Event('change'));
                if (this.input.required) this.input.setCustomValidity('Por favor, selecciona una opción válida de la lista.');
            } else {
                if (this.input.required) this.input.setCustomValidity('Selecciona una opción de la lista desplegable.');
            }
        });

        this.select.addEventListener('change', () => {
             if (this.input.required) {
                 this.input.setCustomValidity(this.select.value ? '' : 'Por favor, selecciona una opción válida de la lista.');
             }
        });

        // Cerrar al hacer click fuera
        document.addEventListener('click', (e) => {
            if (!this.container.contains(e.target)) {
                this.dropdown.classList.add('d-none');
                // Restaurar texto si no seleccionó nada nuevo
                const optSeleccionada = this.opciones.find(o => o.value === this.select.value);
                if (optSeleccionada) {
                    this.input.value = optSeleccionada.text;
                    if (this.input.required) this.input.setCustomValidity('');
                } else {
                    this.input.value = '';
                    if (this.input.required) this.input.setCustomValidity('Por favor, selecciona una opción válida de la lista.');
                }
            }
        });
    }
}

// INIT
document.addEventListener('DOMContentLoaded', () => {
    renderizarSesionNavbar();
    configurarLogout();
    inicializarSidebarSubmenus();

    // Inicializar menú móvil
    const btnMenu = document.getElementById('btn-menu');
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebar-overlay');
    if (btnMenu && sidebar && overlay) {
        btnMenu.addEventListener('click', () => {
            sidebar.classList.toggle('abierto');
            overlay.classList.toggle('visible');
        });
        overlay.addEventListener('click', () => {
            sidebar.classList.remove('abierto');
            overlay.classList.remove('visible');
        });
    }

    // Inicializar inicial del avatar de usuario en la sidebar
    const sesion = obtenerSesion();
    const avatar = document.getElementById('avatar-inicial');
    if (sesion && avatar) {
        avatar.textContent = sesion.nombre.charAt(0).toUpperCase();
    }
});

// ============================================================
// IMPRIMIR TABLA
// ============================================================
function imprimirTabla(titulo, customTbodyId = null) {
    const selector = customTbodyId ? `#${customTbodyId}` : 'tbody';
    const contenido = document.querySelector(selector);
    const tabla = contenido ? contenido.closest('table') : null;
    if (!tabla) { alertaError('No hay tabla para imprimir'); return; }

    const win = window.open('', '_blank');
    const tableHTML = tabla.outerHTML;

    win.document.write(`<html><head><title>Imprimir - ${titulo}</title><style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; padding: 20px; color: #333; }
        h1 { color: #1e3a5f; font-size: 20px; margin-bottom: 5px; font-weight: 700; }
        p { color: #666; font-size: 11px; margin-top: 0; margin-bottom: 20px; }
        table { width: 100%; border-collapse: collapse; margin-top: 10px; }
        th { background-color: #1e3a5f; color: white; text-align: left; padding: 8px 12px; font-size: 11px; text-transform: uppercase; font-weight: 600; }
        td { padding: 8px 12px; border-bottom: 1px solid #ddd; font-size: 11px; vertical-align: middle; }
        tr:nth-child(even) { background-color: #f9f9f9; }
        .badge { display: inline-block; padding: 3px 6px; font-size: 9px; font-weight: 600; border-radius: 4px; text-transform: uppercase; }
        .bg-success { background-color: #d1fae5; color: #065f46; }
        .bg-danger { background-color: #fee2e2; color: #991b1b; }
        .bg-warning { background-color: #fef3c7; color: #92400e; }
        .bg-info { background-color: #e0f2fe; color: #075985; }
    </style></head><body>
        <h1>TECNORIVAS - ${titulo}</h1>
        <p>Reporte generado el ${new Date().toLocaleString('es-DO')}</p>
        ${tableHTML}
    </body></html>`);
    win.document.close();

    // Eliminar columna de acciones en la impresión
    const ths = win.document.querySelectorAll('th');
    const trs = win.document.querySelectorAll('tr');
    let accionesColIdx = -1;
    ths.forEach((th, idx) => {
        if (th.textContent.toLowerCase().includes('acciones')) {
            accionesColIdx = idx;
            th.remove();
        }
    });
    if (accionesColIdx !== -1) {
        trs.forEach(tr => {
            const tds = tr.querySelectorAll('td');
            if (tds.length > accionesColIdx) {
                tds[accionesColIdx].remove();
            }
        });
    }

    setTimeout(() => {
        win.print();
        win.close();
    }, 300);
}

