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
        const ruta = location.pathname.includes('/pages/') ? '../login.html' : 'login.html';
        window.location.href = ruta;
        return null;
    }
    
    // Validar accesos según rol y página actual
    const pagina = location.pathname.split('/').pop();
    if (pagina && pagina !== 'dashboard.html' && pagina !== 'login.html' && pagina !== '') {
        const accesos = {
            'usuarios.html': ['superusuario', 'admin'],
            'compras.html': ['superusuario', 'admin', 'supervisor'],
            'reportes.html': ['superusuario', 'admin', 'supervisor'],
            'inventario.html': ['superusuario', 'admin', 'supervisor', 'asesor'],
            'presupuestos.html': ['superusuario', 'admin', 'asesor'],
            'caja.html': ['superusuario', 'admin', 'cajero']
        };
        const rolesPermitidos = accesos[pagina];
        if (rolesPermitidos && !rolesPermitidos.includes(sesion.rol)) {
            const rutaDash = location.pathname.includes('/pages/') ? 'dashboard.html' : 'pages/dashboard.html';
            window.location.href = rutaDash;
            return null;
        }
    }
    
    return sesion;
}

function soloAdmin() {
    const sesion = obtenerSesion();
    if (!sesion || (sesion.rol !== 'admin' && sesion.rol !== 'superusuario')) {
        Swal.fire({ icon: 'warning', title: 'Acceso restringido', text: 'Solo superusuarios pueden acceder a esta sección o realizar esta acción.' });
        return false;
    }
    return true;
}

window.confirmarAccion = async function(msj, titulo = 'Atención') {
    return Swal.fire({
        title: titulo,
        text: msj,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#d33',
        cancelButtonColor: '#3085d6',
        confirmButtonText: 'Sí, continuar',
        cancelButtonText: 'Cancelar'
    }).then((result) => result.isConfirmed);
};



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
    let tablaOriginal = null;
    
    // Primero, buscar tabla en una pestaña activa si existen pestañas
    const activeTab = document.querySelector('.tab-pane.active.show');
    if (activeTab) {
        tablaOriginal = activeTab.querySelector('table');
    }
    
    // Si no hay pestaña activa, buscar la primera tabla que no esté oculta
    if (!tablaOriginal) {
        const tablas = document.querySelectorAll('table:not(.d-none)');
        for (let t of tablas) {
            if (t.offsetParent !== null) { // visible
                tablaOriginal = t;
                break;
            }
        }
    }
    
    if (!tablaOriginal) { 
        alertaError('No hay tabla visible para exportar'); 
        return; 
    }

    // Clonar la tabla para no afectar la vista
    const tablaClon = tablaOriginal.cloneNode(true);
    
    // Eliminar columnas de 'Acción'
    const ths = tablaClon.querySelectorAll('th');
    let indexAccion = -1;
    ths.forEach((th, idx) => {
        if (th.textContent.trim().toLowerCase().includes('acción') || 
            th.textContent.trim().toLowerCase().includes('acciones')) {
            indexAccion = idx;
            th.remove();
        }
    });
    
    if (indexAccion !== -1) {
        const trs = tablaClon.querySelectorAll('tbody tr');
        trs.forEach(tr => {
            const tds = tr.querySelectorAll('td');
            if (tds[indexAccion]) tds[indexAccion].remove();
        });
    }

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
        html: tablaClon,
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

function renderizarSesionNavbar() {
    const sesion = obtenerSesion();
    const elNombre = document.getElementById('nav-usuario-nombre');
    const elRol = document.getElementById('nav-usuario-rol');
    
    const rolesMap = {
        'superusuario': 'Superusuario',
        'admin': 'Administrador',
        'supervisor': 'Supervisor',
        'asesor': 'Asesor',
        'cajero': 'Cajero',
        'tecnico': 'Técnico'
    };
    
    if (elNombre && sesion) elNombre.textContent = sesion.nombre;
    if (elRol && sesion) elRol.textContent = rolesMap[sesion.rol] || sesion.rol;

    if (sesion) {
        // Permisos de módulos principales
        const permisos = {
            'superusuario': ['usuarios', 'compras', 'inventario', 'presupuestos', 'reportes', 'caja'],
            'admin': ['usuarios', 'compras', 'inventario', 'presupuestos', 'reportes', 'caja'],
            'supervisor': ['compras', 'inventario', 'reportes'],
            'asesor': ['inventario', 'presupuestos'],
            'cajero': ['caja']
        };

        const modulosPermitidos = permisos[sesion.rol] || [];

        // Ocultar/mostrar elementos de nivel superior
        const navUsuarios = document.getElementById('nav-usuarios');
        if (navUsuarios) navUsuarios.style.setProperty('display', modulosPermitidos.includes('usuarios') ? '' : 'none', 'important');

        const parentCompras = document.querySelector('[data-sub="sub-compras"]');
        const subCompras = document.getElementById('sub-compras');
        if (parentCompras) parentCompras.style.setProperty('display', modulosPermitidos.includes('compras') ? '' : 'none', 'important');
        if (subCompras) subCompras.style.setProperty('display', modulosPermitidos.includes('compras') ? '' : 'none', 'important');

        const parentInventario = document.querySelector('[data-sub="sub-inventario"]');
        const subInventario = document.getElementById('sub-inventario');
        if (parentInventario) parentInventario.style.setProperty('display', modulosPermitidos.includes('inventario') ? '' : 'none', 'important');
        if (subInventario) subInventario.style.setProperty('display', modulosPermitidos.includes('inventario') ? '' : 'none', 'important');

        const parentPresupuestos = document.querySelector('[data-sub="sub-presupuestos"]');
        const subPresupuestos = document.getElementById('sub-presupuestos');
        if (parentPresupuestos) parentPresupuestos.style.setProperty('display', modulosPermitidos.includes('presupuestos') ? '' : 'none', 'important');
        if (subPresupuestos) subPresupuestos.style.setProperty('display', modulosPermitidos.includes('presupuestos') ? '' : 'none', 'important');

        const navReportes = document.getElementById('nav-reportes');
        if (navReportes) navReportes.style.setProperty('display', modulosPermitidos.includes('reportes') ? '' : 'none', 'important');
        
        const navCaja = document.getElementById('nav-caja');
        if (navCaja) navCaja.style.setProperty('display', modulosPermitidos.includes('caja') ? '' : 'none', 'important');
        
        // Ocultar sección de Reportes y Módulos del texto de la cabecera si no está permitido
        document.querySelectorAll('.sidebar-section').forEach(sect => {
            if (sect.textContent.trim().toLowerCase() === 'reportes' && !modulosPermitidos.includes('reportes')) {
                sect.style.setProperty('display', 'none', 'important');
            }
            if (sect.textContent.trim().toLowerCase() === 'módulos' && 
                !modulosPermitidos.includes('compras') && 
                !modulosPermitidos.includes('inventario') && 
                !modulosPermitidos.includes('presupuestos')) {
                sect.style.setProperty('display', 'none', 'important');
            }
        });

        // Ocultar sub-items específicos según rol
        if (sesion.rol === 'asesor') {
            document.querySelectorAll('#sub-inventario a').forEach(link => {
                if (link.getAttribute('href').includes('movimientos')) {
                    link.style.setProperty('display', 'none', 'important');
                }
            });
        }

        if (sesion.rol === 'cajero') {
            document.querySelectorAll('#sub-presupuestos a').forEach(link => {
                if (link.getAttribute('href').includes('clientes') || link.getAttribute('href').includes('categorias')) {
                    link.style.setProperty('display', 'none', 'important');
                }
            });
        }
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
    const sesion = obtenerSesion();
    if (!sesion || (sesion.rol !== 'admin' && sesion.rol !== 'superusuario')) {
        Swal.fire({
            icon: 'warning',
            title: 'Acceso Denegado',
            text: 'Tu rol no tiene permisos para eliminar registros.'
        });
        return false;
    }
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

    // Configurar clic en perfil para cambiar usuario y contraseña
    const usuarioInfo = document.querySelector('.usuario-info');
    const abrirPerfil = () => {
        const sesionActual = obtenerSesion();
        if (!sesionActual) return;
        
        Swal.fire({
            title: 'Mi Perfil',
            html: `
                <div class="text-start mb-3">
                    <label class="form-label font-bold text-xs" style="color:#1e3a5f;">Nombre Completo</label>
                    <input type="text" id="perfil-nombre" class="form-control" value="${sesionActual.nombre}" disabled>
                </div>
                <div class="text-start mb-3">
                    <label class="form-label font-bold text-xs" style="color:#1e3a5f;">Nombre de Usuario *</label>
                    <input type="text" id="perfil-usuario" class="form-control" value="${sesionActual.usuario}" placeholder="Mínimo 3 caracteres">
                </div>
                <div class="text-start mb-3">
                    <label class="form-label font-bold text-xs" style="color:#1e3a5f;">Nueva Contraseña (Dejar vacío para mantener actual)</label>
                    <input type="password" id="perfil-contrasena" class="form-control" placeholder="Min 8 carac, 2 mayús, 2 minús, 2 núm, 2 esp">
                </div>
                <div class="text-start mb-3">
                    <label class="form-label font-bold text-xs" style="color:#1e3a5f;">Confirmar Nueva Contraseña</label>
                    <input type="password" id="perfil-confirmar" class="form-control" placeholder="Confirmar contraseña">
                </div>
            `,
            showCancelButton: true,
            confirmButtonText: 'Guardar Cambios',
            cancelButtonText: 'Cancelar',
            preConfirm: () => {
                const nuevoUsuario = document.getElementById('perfil-usuario').value.trim();
                const nuevaContrasena = document.getElementById('perfil-contrasena').value;
                const confirmarContrasena = document.getElementById('perfil-confirmar').value;

                if (nuevoUsuario.length < 3) {
                    Swal.showValidationMessage('El nombre de usuario debe tener al menos 3 letras.');
                    return false;
                }

                if (nuevaContrasena) {
                    const passRegex = /^(?=(.*[A-Z]){2,})(?=(.*[a-z]){2,})(?=(.*\d){2,})(?=(.*[\W_]){2,}).{8,}$/;
                    if (!passRegex.test(nuevaContrasena)) {
                        Swal.showValidationMessage('La contraseña debe tener mínimo 8 caracteres, 2 mayúsculas, 2 minúsculas, 2 números y 2 caracteres especiales.');
                        return false;
                    }
                    if (nuevaContrasena !== confirmarContrasena) {
                        Swal.showValidationMessage('Las contraseñas no coinciden.');
                        return false;
                    }
                }

                // Validar duplicados de usuario
                const todosUsuarios = obtenerDatos('usuarios_tecnorivas');
                const existe = todosUsuarios.find(u => u.usuario.toLowerCase() === nuevoUsuario.toLowerCase() && u.id !== sesionActual.id);
                if (existe) {
                    Swal.showValidationMessage('El nombre de usuario ya está en uso.');
                    return false;
                }

                return { nuevoUsuario, nuevaContrasena };
            }
        }).then(result => {
            if (result.isConfirmed) {
                const { nuevoUsuario, nuevaContrasena } = result.value;
                const todosUsuarios = obtenerDatos('usuarios_tecnorivas');
                const idx = todosUsuarios.findIndex(u => u.id === sesionActual.id);
                if (idx !== -1) {
                    todosUsuarios[idx].usuario = nuevoUsuario;
                    if (nuevaContrasena) {
                        todosUsuarios[idx].contrasena = nuevaContrasena;
                    }
                    guardarDatos('usuarios_tecnorivas', todosUsuarios);
                    
                    // Actualizar sesión en localStorage
                    sesionActual.usuario = nuevoUsuario;
                    guardarSesion(sesionActual);
                    
                    alertaExito('Perfil actualizado exitosamente.');
                    renderizarSesionNavbar();
                }
            }
        });
    };

    if (usuarioInfo) {
        usuarioInfo.style.cursor = 'pointer';
        usuarioInfo.title = 'Editar perfil';
        usuarioInfo.addEventListener('click', abrirPerfil);
    }
    if (avatar) {
        avatar.style.cursor = 'pointer';
        avatar.title = 'Editar perfil';
        avatar.addEventListener('click', abrirPerfil);
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

