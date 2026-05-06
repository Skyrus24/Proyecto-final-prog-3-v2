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
            { id: 2, cedula: '001-0000002-2', nombre: 'Vendedor Demo', celular: '809-000-0002', usuario: 'vendedor', contrasena: 'vendedor123', rol: 'vendedor', fechaCreacion: new Date().toISOString() }
        ];
        guardarDatos('usuarios_tecnorivas', usuarios);
    }

    // Categorías por defecto
    if (!localStorage.getItem('categorias_tecnorivas')) {
        const categorias = [
            { id: 1, nombre: 'Refrigeración', descripcion: 'Equipos y repuestos de refrigeración' },
            { id: 2, nombre: 'Electricidad', descripcion: 'Materiales eléctricos' },
            { id: 3, nombre: 'Construcción', descripcion: 'Materiales de construcción' },
            { id: 4, nombre: 'Herramientas', descripcion: 'Herramientas generales' }
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
            { id: 5, nombre: 'Mano de Obra Construcción (Día)', categoriaId: 3, precio: 180000, iva: 10 }
        ];
        guardarDatos('servicios_tecnorivas', servicios);
    }

    // Proveedores por defecto
    if (!localStorage.getItem('proveedores_tecnorivas')) {
        const proveedores = [
            { id: 1, nombre: 'Distribuidora Fría S.A.', rnc: '130-12345-6', telefono: '809-555-0101', email: 'ventas@fria.com', direccion: 'Av. Principal #10', contacto: 'Juan Pérez' },
            { id: 2, nombre: 'ElectroSupplies RD', rnc: '130-67890-1', telefono: '809-555-0202', email: 'info@electro.com', direccion: 'Calle 5 #22', contacto: 'María López' }
        ];
        guardarDatos('proveedores_tecnorivas', proveedores);
    }

    // Artículos por defecto
    if (!localStorage.getItem('articulos_tecnorivas')) {
        const articulos = [
            { id: 1, nombre: 'Compresor 1/2 HP', categoriaId: 1, precio: 850000, stock: 10, stockMinimo: 3, unidad: 'und', iva: 10 },
            { id: 2, nombre: 'Gas Refrigerante R22', categoriaId: 1, precio: 120000, stock: 25, stockMinimo: 5, unidad: 'lb', iva: 10 },
            { id: 3, nombre: 'Cable #12 AWG', categoriaId: 2, precio: 8500, stock: 200, stockMinimo: 50, unidad: 'm', iva: 10 },
            { id: 4, nombre: 'Breaker 20A', categoriaId: 2, precio: 45000, stock: 30, stockMinimo: 10, unidad: 'und', iva: 10 },
            { id: 5, nombre: 'Cemento Portland', categoriaId: 3, precio: 65000, stock: 100, stockMinimo: 20, unidad: 'saco', iva: 10 }
        ];
        guardarDatos('articulos_tecnorivas', articulos);
    }

    // Clientes por defecto
    if (!localStorage.getItem('clientes_tecnorivas')) {
        const clientes = [
            { id: 1, cedula: '001-1111111-1', nombre: 'Cliente General', telefono: '809-111-1111', email: 'cliente@email.com', direccion: 'Sin dirección' },
            { id: 2, cedula: '001-2222222-2', nombre: 'Empresa ABC S.R.L.', telefono: '809-222-2222', email: 'abc@empresa.com', direccion: 'Zona Industrial #5' }
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
// EXPORTAR CSV GENÉRICO
// ============================================================
function exportarCSV(datos, nombre, columnas) {
    const cabecera = columnas.map(c => c.label).join(',');
    const filas = datos.map(fila => columnas.map(c => `"${(fila[c.key] || '')}"`).join(','));
    const csv = [cabecera, ...filas].join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${nombre}_${fechaHoy()}.csv`;
    link.click();
}

// ============================================================
// IMPRIMIR TABLA
// ============================================================
function imprimirTabla(titulo) {
    const contenido = document.getElementById('tabla-body') || document.querySelector('tbody');
    const tabla = contenido ? contenido.closest('table') : null;
    if (!tabla) return;
    const ventana = window.open('', '_blank');
    ventana.document.write(`
        <html><head><title>${titulo}</title>
        <style>
            body { font-family: Arial, sans-serif; font-size: 12px; }
            table { width: 100%; border-collapse: collapse; }
            th, td { border: 1px solid #ddd; padding: 6px 8px; text-align: left; }
            th { background: #1e3a5f; color: white; }
            h2 { color: #1e3a5f; }
            .empresa { font-size: 10px; color: #666; margin-bottom: 10px; }
        </style></head>
        <body>
            <h2>TECNORIVAS - ${titulo}</h2>
            <p class="empresa">Fecha: ${new Date().toLocaleString('es-DO')}</p>
            ${tabla.outerHTML}
        </body></html>
    `);
    ventana.document.close();
    ventana.print();
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
    inicializarDatos();
    renderizarSesionNavbar();
    configurarLogout();
    inicializarSidebarSubmenus();
});
