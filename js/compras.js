/**
 * compras.js - Módulo de Compras
 */

/**
 * Modulo de Compras
 * Administra el registro de proveedores, categorias y nuevas compras.
 * Al confirmar una compra, incrementa automaticamente el stock en el inventario.
 */
const CLAVE_PROVEEDORES = 'proveedores_tecnorivas';
const CLAVE_CATEGORIAS = 'categorias_tecnorivas';
const CLAVE_ARTICULOS = 'articulos_tecnorivas';
const CLAVE_COMPRAS = 'compras_tecnorivas';

function obtenerProveedores() { return obtenerDatos(CLAVE_PROVEEDORES); }
function guardarProveedores(l) { guardarDatos(CLAVE_PROVEEDORES, l); }
function obtenerCategorias() { return obtenerDatos(CLAVE_CATEGORIAS); }
function guardarCategorias(l) { guardarDatos(CLAVE_CATEGORIAS, l); }
function obtenerArticulos() { return obtenerDatos(CLAVE_ARTICULOS); }
function guardarArticulos(l) { guardarDatos(CLAVE_ARTICULOS, l); }
function obtenerCompras() { return obtenerDatos(CLAVE_COMPRAS); }
function guardarCompras(l) { guardarDatos(CLAVE_COMPRAS, l); }

// ============================================================
// TAB ACTIVO
// ============================================================
const PANELES_COMPRAS = ['proveedores', 'categorias', 'articulos', 'compras'];
let tabActivo = 'proveedores';
let paginadores = {};
let filteredData = { proveedores: [], categorias: [], articulos: [], compras: [] };
let detalleCompra = [];
let selectBuscadorCat, selectBuscadorProv, selectBuscadorArt;


document.addEventListener('DOMContentLoaded', () => {
    const sesion = protegerPagina();
    if (!sesion) return;

    PANELES_COMPRAS.forEach(tab => {
        paginadores[tab] = new Paginador(`tabla-body-${tab}`, `paginacion-${tab}`, 10);
    });

    // Iniciar en el panel indicado por el hash (o primero por defecto)
    const hashInicial = location.hash.replace('#', '');
    tabActivo = PANELES_COMPRAS.includes(hashInicial) ? hashInicial : 'proveedores';
    cargarTab(tabActivo);

    // inicializarPaneles maneja la visibilidad d-none según hash
    inicializarPaneles(PANELES_COMPRAS, 'proveedores');

    // Recargar datos cuando cambia el hash (clic en sub-ítem del sidebar)
    window.addEventListener('hashchange', () => {
        const h = location.hash.replace('#', '');
        if (PANELES_COMPRAS.includes(h)) { tabActivo = h; cargarTab(h); }
    });

    // Inicializar SelectBuscador
    selectBuscadorCat = new SelectBuscador('art-categoria');
    selectBuscadorProv = new SelectBuscador('compra-proveedor');
    selectBuscadorArt = new SelectBuscador('det-articulo');

    configurarBusquedores();
    configurarFormularios();
    configurarBotonesNuevo();
    configurarExportarImprimir();
    configurarCompra();
});


function cargarTab(tab) {
    let datos;
    switch (tab) {
        case 'proveedores': datos = obtenerProveedores(); break;
        case 'categorias': datos = obtenerCategorias(); break;
        case 'articulos': datos = obtenerArticulos(); break;
        case 'compras': datos = obtenerCompras(); break;
    }
    filteredData[tab] = datos;
    actualizarContador(tab, datos.length);
    paginadores[tab].setDatos(datos, (lista, cont) => renderFila(tab, lista, cont));
}

function actualizarContador(tab, n) {
    const el = document.getElementById(`contador-${tab}`);
    if (el) el.textContent = `${n} registro(s)`;
}

function renderFila(tab, lista, cont) {
    if (lista.length === 0) {
        cont.innerHTML = `<tr><td colspan="10" class="text-center text-muted py-4"><i class="bi bi-inbox fs-3 d-block mb-2"></i>Sin registros</td></tr>`;
        return;
    }
    lista.forEach(item => {
        const tr = document.createElement('tr');
        tr.innerHTML = filaHTML(tab, item);
        cont.appendChild(tr);
    });
}

function filaHTML(tab, item) {
    const sesion = obtenerSesion();
    const esAdmin = sesion && (sesion.rol === 'admin' || sesion.rol === 'superusuario');
    const acciones = `
        <button class="btn btn-sm btn-outline-primary me-1" onclick="abrirEditar_${tab}(${item.id})" title="Editar"><i class="bi bi-pencil-square"></i></button>
        ${esAdmin ? `<button class="btn btn-sm btn-outline-danger" onclick="eliminar_${tab}(${item.id})" title="Eliminar"><i class="bi bi-trash3"></i></button>` : ''}
    `;
    switch (tab) {
        case 'proveedores':
            return `<td>${item.nombre}</td><td>${item.ruc}</td><td>${item.telefono}</td><td>${item.email}</td><td>${item.contacto}</td><td>${acciones}</td>`;
        case 'categorias':
            return `<td>${item.nombre}</td><td>${item.descripcion}</td><td>${acciones}</td>`;
        case 'articulos':
            const cat = obtenerCategorias().find(c => c.id === item.categoriaId);
            return `<td>${item.codigo || '-'}</td><td>${item.nombre}</td><td>${cat ? cat.nombre : '-'}</td><td>${formatearMoneda(item.precio)}</td><td>${item.stock} ${item.unidad}</td><td>${acciones}</td>`;
        case 'compras':
            const prov = obtenerProveedores().find(p => p.id === item.proveedorId);
            const estadoBadge = { pendiente: 'bg-warning text-dark', pagado: 'bg-success', anulado: 'bg-danger' };
            return `<td>${item.numero}</td><td>${formatearFecha(item.fecha)}</td><td>${prov ? prov.nombre : '-'}</td><td>${formatearMoneda(item.total)}</td><td><span class="badge ${estadoBadge[item.estado] || 'bg-secondary'}">${item.estado}</span></td><td>
                <button class="btn btn-sm btn-outline-info me-1" onclick="verCompra(${item.id})" title="Ver"><i class="bi bi-eye"></i></button>
                ${esAdmin && item.estado !== 'anulado' ? `<button class="btn btn-sm btn-outline-warning me-1" onclick="cambiarEstadoCompra(${item.id}, 'anulado')" title="Anular Compra"><i class="bi bi-x-octagon"></i></button>` : ''}
                ${esAdmin && item.estado === 'pendiente' ? `<button class="btn btn-sm btn-outline-success me-1" onclick="cambiarEstadoCompra(${item.id}, 'pagado')" title="Marcar Pagado"><i class="bi bi-check2-circle"></i></button>` : ''}
                ${esAdmin ? `<button class="btn btn-sm btn-outline-danger" onclick="eliminar_compras(${item.id})" title="Eliminar"><i class="bi bi-trash3"></i></button>` : ''}
            </td>`;
    }
    return '';
}

// ============================================================
// BÚSQUEDORES
// ============================================================
function configurarBusquedores() {
    ['proveedores', 'categorias', 'articulos', 'compras'].forEach(tab => {
        const input = document.getElementById(`buscador-${tab}`);
        if (!input) return;
        input.addEventListener('input', () => {
            const f = input.value.toLowerCase();
            let lista = obtenerDatos(tab === 'proveedores' ? CLAVE_PROVEEDORES : tab === 'categorias' ? CLAVE_CATEGORIAS : tab === 'articulos' ? CLAVE_ARTICULOS : CLAVE_COMPRAS);
            if (f) lista = lista.filter(x => JSON.stringify(x).toLowerCase().includes(f));
            filteredData[tab] = lista;
            actualizarContador(tab, lista.length);
            paginadores[tab].setDatos(lista, (l, c) => renderFila(tab, l, c));
        });
    });
}

// ============================================================
// FORMULARIOS PROVEEDORES
// ============================================================
function configurarBotonesNuevo() {
    const map = { 'btn-nuevo-proveedores': abrirNuevo_proveedores, 'btn-nuevo-categorias': abrirNuevo_categorias, 'btn-nuevo-articulos': abrirNuevo_articulos, 'btn-nueva-compra': abrirNuevaCompra };
    Object.entries(map).forEach(([id, fn]) => { const btn = document.getElementById(id); if (btn) btn.addEventListener('click', fn); });
}

function configurarFormularios() {
    [['form-proveedor', guardar_proveedores], ['form-categoria', guardar_categorias], ['form-articulo', guardar_articulos]].forEach(([id, fn]) => {
        const form = document.getElementById(id);
        if (form) form.addEventListener('submit', e => { e.preventDefault(); fn(); });
    });
}

// PROVEEDORES CRUD
function abrirNuevo_proveedores() {
    document.getElementById('modal-titulo-prov').textContent = 'Nuevo Proveedor';
    document.getElementById('form-proveedor').reset();
    document.getElementById('prov-id').value = '';
    new bootstrap.Modal(document.getElementById('modal-proveedor')).show();
}
function abrirEditar_proveedores(id) {
    const p = obtenerProveedores().find(x => x.id === id);
    if (!p) return;
    document.getElementById('modal-titulo-prov').textContent = 'Editar Proveedor';
    document.getElementById('prov-id').value = p.id;
    document.getElementById('prov-nombre').value = p.nombre;
    document.getElementById('prov-ruc').value = p.ruc;
    document.getElementById('prov-telefono').value = p.telefono;
    document.getElementById('prov-email').value = p.email;
    document.getElementById('prov-direccion').value = p.direccion;
    document.getElementById('prov-contacto').value = p.contacto;
    new bootstrap.Modal(document.getElementById('modal-proveedor')).show();
}
function guardar_proveedores() {
    const id = document.getElementById('prov-id').value;
    const obj = {
        nombre: document.getElementById('prov-nombre').value.trim(),
        ruc: document.getElementById('prov-ruc').value.trim(),
        telefono: document.getElementById('prov-telefono').value.trim(),
        email: document.getElementById('prov-email').value.trim(),
        direccion: document.getElementById('prov-direccion').value.trim(),
        contacto: document.getElementById('prov-contacto').value.trim()
    };
    const lista = obtenerProveedores();
    if (obj.nombre.length < 3) {
        alertaError('El nombre del proveedor debe tener al menos 3 letras.'); return;
    }
    // Validar formato RUC paraguayo (6-8 dígitos base + guión + 1 dígito verificador)
    const rucRegex = /^\d{6,8}-\d$/;
    if (!rucRegex.test(obj.ruc)) {
        alertaError('El RUC debe tener formato paraguayo: 6 a 8 dígitos, guión y dígito verificador (Ej: 1234567-8).'); return;
    }
    // Validar formato teléfono paraguayo (09xxxxxxxx)
    if (obj.telefono) {
        const telRegex = /^09\d{8}$/;
        if (!telRegex.test(obj.telefono)) {
            alertaError('El teléfono debe tener formato paraguayo: 09XXXXXXXX (10 dígitos, sin guiones).'); return;
        }
    }
    // Validar RUC duplicado
    if (lista.find(x => x.ruc === obj.ruc && x.id !== parseInt(id))) { alertaError('Ya existe un proveedor con ese RUC.'); return; }
    // Validar nombre duplicado
    if (lista.find(x => x.nombre.toLowerCase() === obj.nombre.toLowerCase() && x.id !== parseInt(id))) { alertaError('Ya existe un proveedor con ese nombre.'); return; }
    if (id) {
        const idx = lista.findIndex(x => x.id === parseInt(id));
        lista[idx] = { ...lista[idx], ...obj };
    } else { lista.push({ id: generarId(lista), ...obj }); }
    guardarProveedores(lista);
    bootstrap.Modal.getInstance(document.getElementById('modal-proveedor')).hide();
    cargarTab('proveedores');
    alertaExito('Proveedor guardado.');
}
async function eliminar_proveedores(id) {
    const p = obtenerProveedores().find(x => x.id === id);
    if (!p || !(await confirmarEliminar(p.nombre))) return;
    guardarProveedores(obtenerProveedores().filter(x => x.id !== id));
    cargarTab('proveedores');
    alertaExito('Proveedor eliminado.');
}

// CATEGORIAS CRUD
function abrirNuevo_categorias() {
    document.getElementById('modal-titulo-cat').textContent = 'Nueva Categoría';
    document.getElementById('form-categoria').reset();
    document.getElementById('cat-id').value = '';
    new bootstrap.Modal(document.getElementById('modal-categoria')).show();
}
function abrirEditar_categorias(id) {
    const c = obtenerCategorias().find(x => x.id === id);
    if (!c) return;
    document.getElementById('modal-titulo-cat').textContent = 'Editar Categoría';
    document.getElementById('cat-id').value = c.id;
    document.getElementById('cat-nombre').value = c.nombre;
    document.getElementById('cat-descripcion').value = c.descripcion;
    new bootstrap.Modal(document.getElementById('modal-categoria')).show();
}
function guardar_categorias() {
    const id = document.getElementById('cat-id').value;
    const obj = { nombre: document.getElementById('cat-nombre').value.trim(), descripcion: document.getElementById('cat-descripcion').value.trim() };
    const lista = obtenerCategorias();
    if (obj.nombre.length < 3) {
        alertaError('El nombre de la categoría debe tener al menos 3 letras.'); return;
    }
    // Validar nombre duplicado
    if (lista.find(x => x.nombre.toLowerCase() === obj.nombre.toLowerCase() && x.id !== parseInt(id))) { alertaError('Ya existe una categoría con ese nombre.'); return; }
    if (id) { const idx = lista.findIndex(x => x.id === parseInt(id)); lista[idx] = { ...lista[idx], ...obj }; }
    else { lista.push({ id: generarId(lista), ...obj }); }
    guardarCategorias(lista);
    bootstrap.Modal.getInstance(document.getElementById('modal-categoria')).hide();
    cargarTab('categorias');
    alertaExito('Categoría guardada.');
}
async function eliminar_categorias(id) {
    const c = obtenerCategorias().find(x => x.id === id);
    if (!c || !(await confirmarEliminar(c.nombre))) return;
    guardarCategorias(obtenerCategorias().filter(x => x.id !== id));
    cargarTab('categorias');
    alertaExito('Categoría eliminada.');
}

// ARTICULOS CRUD
function abrirNuevo_articulos() {
    document.getElementById('modal-titulo-art').textContent = 'Nuevo Artículo';
    document.getElementById('form-articulo').reset();
    document.getElementById('art-id').value = '';
    poblarSelectCategorias('art-categoria');
    new bootstrap.Modal(document.getElementById('modal-articulo')).show();
}
function abrirEditar_articulos(id) {
    const a = obtenerArticulos().find(x => x.id === id);
    if (!a) return;
    poblarSelectCategorias('art-categoria');
    document.getElementById('modal-titulo-art').textContent = 'Editar Artículo';
    document.getElementById('art-id').value = a.id;
    document.getElementById('art-codigo').value = a.codigo || '';
    document.getElementById('art-nombre').value = a.nombre;
    document.getElementById('art-categoria').value = a.categoriaId;
    if (selectBuscadorCat) selectBuscadorCat.actualizar();
    document.getElementById('art-precio').value = a.precio;
    document.getElementById('art-stock').value = a.stock;
    document.getElementById('art-unidad').value = a.unidad;
    new bootstrap.Modal(document.getElementById('modal-articulo')).show();
}
function guardar_articulos() {
    const id = document.getElementById('art-id').value;
    const obj = {
        codigo: document.getElementById('art-codigo').value.trim(),
        nombre: document.getElementById('art-nombre').value.trim(),
        categoriaId: parseInt(document.getElementById('art-categoria').value),
        precio: parseFloat(document.getElementById('art-precio').value),
        stock: parseInt(document.getElementById('art-stock').value),
        unidad: document.getElementById('art-unidad').value.trim()
    };
    if (obj.nombre.length < 3) {
        alertaError('El nombre del artículo debe tener al menos 3 letras.'); return;
    }
    // Validar código de barras obligatorio
    if (!obj.codigo) { alertaError('El código de barras es obligatorio.'); return; }
    // Validar precio mínimo 1
    if (!obj.precio || obj.precio < 1) { alertaError('El precio debe ser mayor a 0.'); return; }
    // Validar negativos en stock
    if (obj.stock < 0) { alertaError('El stock no puede ser negativo.'); return; }
    const lista = obtenerArticulos();
    // Validar código de barras duplicado
    if (lista.find(x => x.codigo && x.codigo === obj.codigo && x.id !== parseInt(id))) { alertaError('Ya existe un artículo con ese código de barras.'); return; }
    if (id) { const idx = lista.findIndex(x => x.id === parseInt(id)); lista[idx] = { ...lista[idx], ...obj }; }
    else { lista.push({ id: generarId(lista), ...obj }); }
    guardarArticulos(lista);
    bootstrap.Modal.getInstance(document.getElementById('modal-articulo')).hide();
    cargarTab('articulos');
    alertaExito('Artículo guardado.');
}
async function eliminar_articulos(id) {
    const a = obtenerArticulos().find(x => x.id === id);
    if (!a || !(await confirmarEliminar(a.nombre))) return;
    guardarArticulos(obtenerArticulos().filter(x => x.id !== id));
    cargarTab('articulos');
    alertaExito('Artículo eliminado.');
}

function poblarSelectCategorias(selectId) {
    const sel = document.getElementById(selectId);
    if (!sel) return;
    sel.innerHTML = '<option value="">-- Seleccionar --</option>';
    obtenerCategorias().forEach(c => sel.insertAdjacentHTML('beforeend', `<option value="${c.id}">${c.nombre}</option>`));
    if (selectBuscadorCat) selectBuscadorCat.actualizar();
}

// ============================================================
// NUEVA COMPRA
// ============================================================
function configurarCompra() {
    const formCompra = document.getElementById('form-compra');
    if (!formCompra) return;
    formCompra.addEventListener('submit', e => { e.preventDefault(); registrarCompra(); });
    document.getElementById('btn-add-detalle').addEventListener('click', agregarDetalleCompra);
    poblarSelectProveedores();
    poblarSelectArticulosCompra();
}

function poblarSelectProveedores() {
    const sel = document.getElementById('compra-proveedor');
    if (!sel) return;
    sel.innerHTML = '<option value="">-- Seleccionar proveedor --</option>';
    obtenerProveedores().forEach(p => sel.insertAdjacentHTML('beforeend', `<option value="${p.id}">${p.nombre} (RUC: ${p.ruc})</option>`));
    if (selectBuscadorProv) selectBuscadorProv.actualizar();
}

function poblarSelectArticulosCompra() {
    const sel = document.getElementById('det-articulo');
    if (!sel) return;
    sel.innerHTML = '<option value="">-- Artículo --</option>';
    obtenerArticulos().forEach(a => {
        const txt = a.codigo ? `[${a.codigo}] ${a.nombre}` : a.nombre;
        sel.insertAdjacentHTML('beforeend', `<option value="${a.id}" data-precio="${a.precio}" data-stock="${a.stock}">${txt}</option>`);
    });
    sel.addEventListener('change', () => {
        const opt = sel.options[sel.selectedIndex];
        document.getElementById('det-precio').value = opt ? (opt.dataset.precio || '') : '';
        document.getElementById('det-stock').value = opt && opt.dataset.stock !== undefined ? opt.dataset.stock : '';
    });
    if (selectBuscadorArt) selectBuscadorArt.actualizar();
}

function agregarDetalleCompra() {
    const artId = parseInt(document.getElementById('det-articulo').value);
    const cant = parseInt(document.getElementById('det-cantidad').value);
    const precio = parseFloat(document.getElementById('det-precio').value);
    if (!artId || !cant || isNaN(precio)) { alertaError('Complete todos los campos del detalle.'); return; }
    if (precio < 1) { alertaError('El precio debe ser mayor a 0.'); return; }
    const art = obtenerArticulos().find(a => a.id === artId);
    if (!art) return;
    const existe = detalleCompra.find(d => d.articuloId === artId);
    if (existe) { existe.cantidad += cant; existe.subtotal = existe.cantidad * existe.precio; }
    else { detalleCompra.push({ articuloId: artId, nombre: art.nombre, cantidad: cant, precio, subtotal: cant * precio }); }
    renderDetalleCompra();
    document.getElementById('det-articulo').value = '';
    document.getElementById('det-stock').value = '';
    document.getElementById('det-cantidad').value = '1';
    document.getElementById('det-precio').value = '';
}

function renderDetalleCompra() {
    const tbody = document.getElementById('detalle-body');
    if (!tbody) return;
    let total = 0;
    tbody.innerHTML = '';
    detalleCompra.forEach((d, i) => {
        total += d.subtotal;
        tbody.insertAdjacentHTML('beforeend', `<tr>
            <td>${d.nombre}</td>
            <td>${d.cantidad}</td>
            <td>${formatearMoneda(d.precio)}</td>
            <td>${formatearMoneda(d.subtotal)}</td>
            <td><button class="btn btn-sm btn-outline-danger" onclick="quitarDetalle(${i})"><i class="bi bi-x"></i></button></td>
        </tr>`);
    });
    document.getElementById('compra-total').textContent = formatearMoneda(total);
}

function quitarDetalle(idx) { detalleCompra.splice(idx, 1); renderDetalleCompra(); }

function abrirNuevaCompra() {
    detalleCompra = [];
    document.getElementById('form-compra').reset();
    document.getElementById('detalle-body').innerHTML = '';
    document.getElementById('compra-total').textContent = formatearMoneda(0);
    document.getElementById('compra-fecha').value = fechaHoy();
    poblarSelectProveedores();
    poblarSelectArticulosCompra();
    new bootstrap.Modal(document.getElementById('modal-compra')).show();
}

function registrarCompra() {
    if (detalleCompra.length === 0) { alertaError('Agregue al menos un artículo.'); return; }
    const provId = parseInt(document.getElementById('compra-proveedor').value);
    if (!provId) { alertaError('Seleccione un proveedor.'); return; }
    const compras = obtenerCompras();
    const total = detalleCompra.reduce((s, d) => s + d.subtotal, 0);
    const nuevaCompra = {
        id: generarId(compras),
        numero: `C-${String(generarId(compras)).padStart(4, '0')}`,
        proveedorId: provId,
        fecha: document.getElementById('compra-fecha').value,
        estado: document.getElementById('compra-estado').value || 'pendiente',
        detalle: [...detalleCompra],
        total,
        fechaRegistro: fechaHoraAhora()
    };
    // Actualizar stock
    const articulos = obtenerArticulos();
    detalleCompra.forEach(d => {
        const idx = articulos.findIndex(a => a.id === d.articuloId);
        if (idx >= 0) articulos[idx].stock += d.cantidad;
    });
    guardarArticulos(articulos);
    compras.push(nuevaCompra);
    guardarCompras(compras);
    // Movimiento inventario
    const movimientos = obtenerDatos('movimientos_inventario');
    detalleCompra.forEach(d => {
        movimientos.push({ id: generarId(movimientos), tipo: 'entrada', articuloId: d.articuloId, cantidad: d.cantidad, referencia: nuevaCompra.numero, fecha: nuevaCompra.fecha });
    });
    guardarDatos('movimientos_inventario', movimientos);
    bootstrap.Modal.getInstance(document.getElementById('modal-compra')).hide();
    cargarTab('compras');
    alertaExito(`Compra ${nuevaCompra.numero} registrada. Stock actualizado.`);
}

function verCompra(id) {
    const c = obtenerCompras().find(x => x.id === id);
    if (!c) return;
    const prov = obtenerProveedores().find(p => p.id === c.proveedorId);
    const filas = c.detalle.map(d => `<tr><td>${d.nombre}</td><td>${d.cantidad}</td><td>${formatearMoneda(d.precio)}</td><td>${formatearMoneda(d.subtotal)}</td></tr>`).join('');
    Swal.fire({
        title: `Compra ${c.numero}`,
        html: `<p><strong>Proveedor:</strong> ${prov ? prov.nombre : '-'}</p><p><strong>Fecha:</strong> ${formatearFecha(c.fecha)}</p>
        <table class="table table-sm"><thead><tr><th>Artículo</th><th>Cant.</th><th>Precio</th><th>Subtotal</th></tr></thead><tbody>${filas}</tbody></table>
        <p class="text-end fw-bold">Total: ${formatearMoneda(c.total)}</p>`,
        width: 700, confirmButtonText: 'Cerrar'
    });
}

async function eliminar_compras(id) {
    const c = obtenerCompras().find(x => x.id === id);
    if (!c) return;
    if (!(await confirmarEliminar(`Compra ${c.numero}`))) return;

    if (c.estado !== 'anulado') {
        const articulos = obtenerArticulos();
        const movimientos = obtenerDatos('movimientos_inventario');
        c.detalle.forEach(d => {
            const idx = articulos.findIndex(a => a.id === d.articuloId);
            if (idx >= 0) articulos[idx].stock -= d.cantidad;
            movimientos.push({ id: generarId(movimientos), tipo: 'salida', articuloId: d.articuloId, cantidad: d.cantidad, referencia: `Eliminación ${c.numero}`, fecha: fechaHoy() });
        });
        guardarArticulos(articulos);
        guardarDatos('movimientos_inventario', movimientos);
    }

    guardarCompras(obtenerCompras().filter(x => x.id !== id));
    cargarTab('compras');
    alertaExito('Compra eliminada definitivamente.');
}

window.cambiarEstadoCompra = async function(id, nuevoEstado) {
    const compras = obtenerCompras();
    const idx = compras.findIndex(x => x.id === id);
    if (idx === -1) return;
    const c = compras[idx];
    
    const result = await Swal.fire({
        title: 'Confirmar Acción',
        text: `¿Desea cambiar el estado de la Compra ${c.numero} a ${nuevoEstado.toUpperCase()}?`,
        icon: 'question',
        showCancelButton: true,
        confirmButtonText: 'Sí, cambiar',
        cancelButtonText: 'Cancelar'
    });

    if (!result.isConfirmed) return;
    
    if (nuevoEstado === 'anulado' && c.estado !== 'anulado') {
        const articulos = obtenerArticulos();
        const movimientos = obtenerDatos('movimientos_inventario');
        c.detalle.forEach(d => {
            const idxArt = articulos.findIndex(a => a.id === d.articuloId);
            if (idxArt >= 0) articulos[idxArt].stock -= d.cantidad;
            movimientos.push({ id: generarId(movimientos), tipo: 'salida', articuloId: d.articuloId, cantidad: d.cantidad, referencia: `Anulación ${c.numero}`, fecha: fechaHoy() });
        });
        guardarArticulos(articulos);
        guardarDatos('movimientos_inventario', movimientos);
        alertaExito(`Compra ${c.numero} anulada. Stock revertido.`);
    } else {
        alertaExito(`Estado de compra ${c.numero} actualizado a ${nuevoEstado}.`);
    }
    
    compras[idx].estado = nuevoEstado;
    guardarCompras(compras);
    cargarTab('compras');
};

function configurarExportarImprimir() {
    ['proveedores', 'categorias', 'articulos', 'compras'].forEach(tab => {
        const btnExp = document.getElementById(`btn-exportar-${tab}`);
        const btnImp = document.getElementById(`btn-imprimir-${tab}`);
        const btnPdf = document.getElementById(`btn-pdf-${tab}`);
        const titulo = tab.charAt(0).toUpperCase() + tab.slice(1);
        if (btnExp) btnExp.addEventListener('click', () => {
            const cols = {
                proveedores: [{ key: 'nombre', label: 'Nombre' }, { key: 'ruc', label: 'RUC' }, { key: 'telefono', label: 'Teléfono' }, { key: 'email', label: 'Email' }, { key: 'contacto', label: 'Contacto' }],
                categorias: [{ key: 'nombre', label: 'Nombre' }, { key: 'descripcion', label: 'Descripción' }],
                articulos: [{ key: 'codigo', label: 'Código' }, { key: 'nombre', label: 'Artículo' }, { key: 'categoriaNombre', label: 'Categoría' }, { key: 'precio', label: 'Precio' }, { key: 'stockStr', label: 'Stock' }],
                compras: [{ key: 'numero', label: 'N°' }, { key: 'fecha', label: 'Fecha' }, { key: 'proveedorNombre', label: 'Proveedor' }, { key: 'total', label: 'Total' }, { key: 'estado', label: 'Estado' }]
            };
            
            let dataExport = filteredData[tab];
            if (tab === 'articulos') {
                const cats = obtenerCategorias();
                dataExport = dataExport.map(a => {
                    const c = cats.find(x => x.id === a.categoriaId);
                    return { ...a, categoriaNombre: c ? c.nombre : '-', stockStr: `${a.stock} ${a.unidad || ''}` };
                });
            } else if (tab === 'compras') {
                const provs = obtenerProveedores();
                dataExport = dataExport.map(c => {
                    const p = provs.find(x => x.id === c.proveedorId);
                    return { ...c, proveedorNombre: p ? p.nombre : '-' };
                });
            }
            
            exportarExcel(dataExport, tab, cols[tab]);
        });
        if (btnImp) btnImp.addEventListener('click', () => imprimirTabla(titulo, `tabla-body-${tab}`));
        if (btnPdf) btnPdf.addEventListener('click', () => generarPDF(titulo));
    });
}

