/**
 * ventas.js - Módulo de Ventas
 */

const CLAVE_CLIENTES = 'clientes_tecnorivas';
const CLAVE_VENTAS = 'ventas_tecnorivas';
const CLAVE_CAJAS = 'cajas_tecnorivas';

function obtenerClientes() { return obtenerDatos(CLAVE_CLIENTES); }
function guardarClientes(l) { guardarDatos(CLAVE_CLIENTES, l); }
function obtenerVentas() { return obtenerDatos(CLAVE_VENTAS); }
function guardarVentas(l) { guardarDatos(CLAVE_VENTAS, l); }
function obtenerCajas() { return obtenerDatos(CLAVE_CAJAS); }
function guardarCajas(l) { guardarDatos(CLAVE_CAJAS, l); }

const PANELES_VENTAS = ['clientes', 'ventas', 'cajas'];
let tabActivoVentas = 'clientes';
let paginadoresVentas = {};
let filteredVentas = { clientes: [], ventas: [], cajas: [] };
let detalleVenta = [];
let selectBuscadorCliente, selectBuscadorVentaArt;

document.addEventListener('DOMContentLoaded', () => {
    const sesion = protegerPagina();
    if (!sesion) return;

    PANELES_VENTAS.forEach(tab => {
        paginadoresVentas[tab] = new Paginador(`tabla-body-${tab}`, `paginacion-${tab}`, 10);
    });

    const hashInicial = location.hash.replace('#', '');
    tabActivoVentas = PANELES_VENTAS.includes(hashInicial) ? hashInicial : 'clientes';
    cargarTabVentas(tabActivoVentas);

    inicializarPaneles(PANELES_VENTAS, 'clientes');

    window.addEventListener('hashchange', () => {
        const h = location.hash.replace('#', '');
        if (PANELES_VENTAS.includes(h)) { tabActivoVentas = h; cargarTabVentas(h); }
    });

    // Inicializar SelectBuscador para combos de ventas
    selectBuscadorCliente = new SelectBuscador('venta-cliente');
    selectBuscadorVentaArt = new SelectBuscador('venta-articulo');

    configurarBusquedoresVentas();
    configurarFormulariosVentas();
    configurarBotonesNuevoVentas();
    configurarVenta();
    configurarCaja();
});


function cargarTabVentas(tab) {
    let datos;
    switch (tab) {
        case 'clientes': datos = obtenerClientes(); break;
        case 'ventas': datos = obtenerVentas(); break;
        case 'cajas': datos = obtenerCajas(); break;
    }
    filteredVentas[tab] = datos;
    const el = document.getElementById(`contador-${tab}`);
    if (el) el.textContent = `${datos.length} registro(s)`;
    paginadoresVentas[tab].setDatos(datos, (lista, cont) => renderFilaVentas(tab, lista, cont));
}

function renderFilaVentas(tab, lista, cont) {
    if (lista.length === 0) {
        cont.innerHTML = `<tr><td colspan="10" class="text-center text-muted py-4"><i class="bi bi-inbox fs-3 d-block mb-2"></i>Sin registros</td></tr>`;
        return;
    }
    lista.forEach(item => {
        const tr = document.createElement('tr');
        tr.innerHTML = filaHTMLVentas(tab, item);
        cont.appendChild(tr);
    });
}

function filaHTMLVentas(tab, item) {
    const acciones = `
        <button class="btn btn-sm btn-outline-primary me-1" onclick="abrirEditar_${tab}(${item.id})"><i class="bi bi-pencil-square"></i></button>
        <button class="btn btn-sm btn-outline-danger" onclick="eliminar_${tab}(${item.id})"><i class="bi bi-trash3"></i></button>
    `;
    switch (tab) {
        case 'clientes':
            return `<td>${item.cedula}</td><td><strong>${item.nombre}</strong></td><td>${item.telefono}</td><td>${item.email}</td><td>${item.direccion}</td><td>${acciones}</td>`;
        case 'ventas':
            const cli = obtenerClientes().find(c => c.id === item.clienteId);
            const est = { completada: 'bg-success', pendiente: 'bg-warning text-dark', anulada: 'bg-danger' };
            return `<td>${item.numero}</td><td>${formatearFecha(item.fecha)}</td><td>${cli ? cli.nombre : '-'}</td><td>${formatearMoneda(item.total)}</td><td><span class="badge ${est[item.estado] || 'bg-secondary'}">${item.estado}</span></td><td>
                <button class="btn btn-sm btn-outline-info me-1" onclick="verVenta(${item.id})"><i class="bi bi-eye"></i></button>
                <button class="btn btn-sm btn-outline-warning me-1" onclick="generarComprobante(${item.id})"><i class="bi bi-receipt"></i></button>
                <button class="btn btn-sm btn-outline-danger" onclick="eliminar_ventas(${item.id})"><i class="bi bi-x-circle"></i></button>
            </td>`;
        case 'cajas':
            const estadoCaja = item.abierta ? '<span class="badge bg-success">Abierta</span>' : '<span class="badge bg-danger">Cerrada</span>';
            return `<td>${formatearFecha(item.fechaApertura)}</td><td>${formatearMoneda(item.montoInicial)}</td><td>${formatearMoneda(item.montoFinal || 0)}</td><td>${estadoCaja}</td><td>${item.responsable}</td><td>
                ${item.abierta ? `<button class="btn btn-sm btn-outline-danger" onclick="cerrarCaja(${item.id})"><i class="bi bi-lock"></i> Cerrar</button>` : '-'}
            </td>`;
    }
    return '';
}

function configurarBusquedoresVentas() {
    ['clientes', 'ventas', 'cajas'].forEach(tab => {
        const input = document.getElementById(`buscador-${tab}`);
        if (!input) return;
        input.addEventListener('input', () => {
            const f = input.value.toLowerCase();
            let lista = tab === 'clientes' ? obtenerClientes() : tab === 'ventas' ? obtenerVentas() : obtenerCajas();
            if (f) lista = lista.filter(x => JSON.stringify(x).toLowerCase().includes(f));
            filteredVentas[tab] = lista;
            const el = document.getElementById(`contador-${tab}`);
            if (el) el.textContent = `${lista.length} registro(s)`;
            paginadoresVentas[tab].setDatos(lista, (l, c) => renderFilaVentas(tab, l, c));
        });
    });
}

function configurarBotonesNuevoVentas() {
    const map = { 'btn-nuevo-clientes': abrirNuevo_clientes, 'btn-nueva-venta': abrirNuevaVenta, 'btn-abrir-caja': abrirCaja };
    Object.entries(map).forEach(([id, fn]) => { const btn = document.getElementById(id); if (btn) btn.addEventListener('click', fn); });
}

function configurarFormulariosVentas() {
    const fc = document.getElementById('form-cliente');
    if (fc) fc.addEventListener('submit', e => { e.preventDefault(); guardar_clientes(); });
}

// CLIENTES CRUD
function abrirNuevo_clientes() {
    document.getElementById('modal-titulo-cli').textContent = 'Nuevo Cliente';
    document.getElementById('form-cliente').reset();
    document.getElementById('cli-id').value = '';
    new bootstrap.Modal(document.getElementById('modal-cliente')).show();
}
function abrirEditar_clientes(id) {
    const c = obtenerClientes().find(x => x.id === id);
    if (!c) return;
    document.getElementById('modal-titulo-cli').textContent = 'Editar Cliente';
    document.getElementById('cli-id').value = c.id;
    document.getElementById('cli-cedula').value = c.cedula;
    document.getElementById('cli-nombre').value = c.nombre;
    document.getElementById('cli-telefono').value = c.telefono;
    document.getElementById('cli-email').value = c.email;
    document.getElementById('cli-direccion').value = c.direccion;
    new bootstrap.Modal(document.getElementById('modal-cliente')).show();
}
function guardar_clientes() {
    const id = document.getElementById('cli-id').value;
    const obj = {
        cedula: document.getElementById('cli-cedula').value.trim(),
        nombre: document.getElementById('cli-nombre').value.trim(),
        telefono: document.getElementById('cli-telefono').value.trim(),
        email: document.getElementById('cli-email').value.trim(),
        direccion: document.getElementById('cli-direccion').value.trim()
    };
    const lista = obtenerClientes();
    if (id) { const idx = lista.findIndex(x => x.id === parseInt(id)); lista[idx] = { ...lista[idx], ...obj }; }
    else { lista.push({ id: generarId(lista), ...obj }); }
    guardarClientes(lista);
    bootstrap.Modal.getInstance(document.getElementById('modal-cliente')).hide();
    cargarTabVentas('clientes');
    alertaExito('Cliente guardado.');
}
async function eliminar_clientes(id) {
    const c = obtenerClientes().find(x => x.id === id);
    if (!c || !(await confirmarEliminar(c.nombre))) return;
    guardarClientes(obtenerClientes().filter(x => x.id !== id));
    cargarTabVentas('clientes');
    alertaExito('Cliente eliminado.');
}

// ============================================================
// CAJA
// ============================================================
function configurarCaja() {
    const form = document.getElementById('form-caja');
    if (form) form.addEventListener('submit', e => { e.preventDefault(); abrirNuevaCaja(); });
}

function abrirCaja() {
    const cajaAbierta = obtenerCajas().find(c => c.abierta);
    if (cajaAbierta) { alertaInfo('Ya hay una caja abierta.'); return; }
    new bootstrap.Modal(document.getElementById('modal-caja')).show();
}

function abrirNuevaCaja() {
    const sesion = obtenerSesion();
    const monto = parseFloat(document.getElementById('caja-monto-inicial').value);
    if (!monto || monto < 0) { alertaError('Ingrese un monto inicial válido.'); return; }
    const cajas = obtenerCajas();
    cajas.push({ id: generarId(cajas), fechaApertura: fechaHoraAhora(), montoInicial: monto, montoFinal: null, abierta: true, responsable: sesion ? sesion.nombre : 'Sistema' });
    guardarCajas(cajas);
    bootstrap.Modal.getInstance(document.getElementById('modal-caja')).hide();
    cargarTabVentas('cajas');
    alertaExito('Caja abierta correctamente.');
}

async function cerrarCaja(id) {
    const result = await Swal.fire({ title: 'Cerrar Caja', input: 'number', inputLabel: 'Monto final en caja', inputPlaceholder: '0.00', showCancelButton: true, confirmButtonText: 'Cerrar Caja', cancelButtonText: 'Cancelar' });
    if (!result.isConfirmed) return;
    const cajas = obtenerCajas();
    const idx = cajas.findIndex(c => c.id === id);
    if (idx < 0) return;
    cajas[idx].abierta = false;
    cajas[idx].montoFinal = parseFloat(result.value) || 0;
    cajas[idx].fechaCierre = fechaHoraAhora();
    guardarCajas(cajas);
    cargarTabVentas('cajas');
    alertaExito('Caja cerrada.');
}

function eliminar_cajas(id) { alertaInfo('No se pueden eliminar registros de caja.'); }
function abrirEditar_cajas(id) { alertaInfo('No se pueden editar registros de caja.'); }

// ============================================================
// NUEVA VENTA
// ============================================================
function configurarVenta() {
    const form = document.getElementById('form-venta');
    if (!form) return;
    form.addEventListener('submit', e => { e.preventDefault(); registrarVenta(); });
    const btnAdd = document.getElementById('btn-add-item-venta');
    if (btnAdd) btnAdd.addEventListener('click', agregarItemVenta);
    const btnUnlock = document.getElementById('btn-unlock-precio');
    if (btnUnlock) btnUnlock.addEventListener('click', autorizarCambioPrecio);
    poblarSelectClientesVenta();
    poblarSelectArticulosVenta();
}

function abrirNuevaVenta() {
    const cajaAbierta = obtenerCajas().find(c => c.abierta);
    if (!cajaAbierta) {
        Swal.fire({ icon: 'warning', title: 'Caja cerrada', text: 'Debe abrir la caja antes de realizar una venta.', confirmButtonText: 'Entendido' });
        return;
    }
    detalleVenta = [];
    document.getElementById('form-venta').reset();
    document.getElementById('venta-detalle-body').innerHTML = '';
    document.getElementById('venta-total').textContent = formatearMoneda(0);
    document.getElementById('venta-fecha').value = fechaHoy();
    configurarPrecioVenta();
    poblarSelectClientesVenta();
    poblarSelectArticulosVenta();
    new bootstrap.Modal(document.getElementById('modal-venta')).show();
}

function poblarSelectClientesVenta() {
    const sel = document.getElementById('venta-cliente');
    if (!sel) return;
    sel.innerHTML = '<option value="">-- Cliente --</option>';
    obtenerClientes().forEach(c => sel.insertAdjacentHTML('beforeend', `<option value="${c.id}">${c.nombre} (Cédula/RUC: ${c.cedula})</option>`));
    if (selectBuscadorCliente) selectBuscadorCliente.actualizar();
}

function poblarSelectArticulosVenta() {
    const sel = document.getElementById('venta-articulo');
    if (!sel) return;
    sel.innerHTML = '<option value="">-- Artículo --</option>';
    obtenerDatos('articulos_tecnorivas').filter(a => a.stock > 0).forEach(a => {
        const txt = a.codigo ? `[${a.codigo}] ${a.nombre}` : a.nombre;
        sel.insertAdjacentHTML('beforeend', `<option value="${a.id}" data-precio="${a.precio}" data-stock="${a.stock}">${txt}</option>`);
    });
    sel.addEventListener('change', () => {
        const opt = sel.options[sel.selectedIndex];
        document.getElementById('venta-precio').value = opt ? (opt.dataset.precio || '') : '';
        document.getElementById('venta-stock-actual').value = opt ? (opt.dataset.stock || '') : '';
        configurarPrecioVenta(); // Bloquear de nuevo al cambiar de artículo
    });
    if (selectBuscadorVentaArt) selectBuscadorVentaArt.actualizar();
}

function configurarPrecioVenta() {
    const sesion = obtenerSesion();
    const inputPrecio = document.getElementById('venta-precio');
    const btnUnlock = document.getElementById('btn-unlock-precio');
    const iconLock = document.getElementById('icon-lock-precio');

    if (!inputPrecio || !btnUnlock) return;

    if (sesion && sesion.rol !== 'admin') {
        inputPrecio.setAttribute('readonly', 'true');
        btnUnlock.classList.remove('d-none', 'btn-outline-success');
        btnUnlock.classList.add('btn-outline-secondary');
        if(iconLock) iconLock.className = 'bi bi-lock-fill';
    } else {
        inputPrecio.removeAttribute('readonly');
        btnUnlock.classList.add('d-none');
    }
}

async function autorizarCambioPrecio() {
    const inputPrecio = document.getElementById('venta-precio');
    if (!inputPrecio.hasAttribute('readonly')) return;

    const { value: pass } = await Swal.fire({
        title: 'Autorización requerida',
        text: 'Ingrese su código o contraseña de administrador',
        input: 'password',
        inputPlaceholder: 'Contraseña o Código de barras',
        showCancelButton: true,
        confirmButtonText: 'Autorizar',
        cancelButtonText: 'Cancelar',
        target: document.getElementById('modal-venta')
    });

    if (pass) {
        const usuarios = obtenerDatos('usuarios_tecnorivas');
        const adminValido = usuarios.find(u => u.rol === 'admin' && u.contrasena === pass);

        if (adminValido) {
            inputPrecio.removeAttribute('readonly');
            inputPrecio.focus();
            const btn = document.getElementById('btn-unlock-precio');
            const icon = document.getElementById('icon-lock-precio');
            btn.classList.remove('btn-outline-secondary');
            btn.classList.add('btn-outline-success');
            if(icon) icon.className = 'bi bi-unlock-fill';
            
            const Toast = Swal.mixin({ toast: true, position: 'top-end', showConfirmButton: false, timer: 1500 });
            Toast.fire({ icon: 'success', title: `Autorizado por ${adminValido.nombre}` });
        } else {
            Swal.fire({ icon: 'error', title: 'Acceso Denegado', text: 'Código incorrecto o el usuario no es administrador.' });
        }
    }
}

function agregarItemVenta() {
    const artId = parseInt(document.getElementById('venta-articulo').value);
    const cant = parseInt(document.getElementById('venta-cantidad').value);
    const precio = parseFloat(document.getElementById('venta-precio').value);
    if (!artId || !cant || !precio) { alertaError('Complete todos los campos del ítem.'); return; }
    const art = obtenerDatos('articulos_tecnorivas').find(a => a.id === artId);
    if (!art) return;
    const enDetalle = detalleVenta.filter(d => d.articuloId === artId).reduce((s, d) => s + d.cantidad, 0);
    if (enDetalle + cant > art.stock) { alertaError(`Stock insuficiente. Disponible: ${art.stock - enDetalle}`); return; }
    const existe = detalleVenta.find(d => d.articuloId === artId);
    if (existe) { existe.cantidad += cant; existe.subtotal = existe.cantidad * existe.precio; }
    else { detalleVenta.push({ articuloId: artId, nombre: art.nombre, cantidad: cant, precio, subtotal: cant * precio }); }
    renderDetalleVenta();
    document.getElementById('venta-articulo').value = '';
    document.getElementById('venta-cantidad').value = '1';
    document.getElementById('venta-precio').value = '';
    document.getElementById('venta-stock-actual').value = '';
}

function renderDetalleVenta() {
    const tbody = document.getElementById('venta-detalle-body');
    if (!tbody) return;
    let total = 0;
    tbody.innerHTML = '';
    detalleVenta.forEach((d, i) => {
        total += d.subtotal;
        tbody.insertAdjacentHTML('beforeend', `<tr>
            <td>${d.nombre}</td><td>${d.cantidad}</td>
            <td>${formatearMoneda(d.precio)}</td><td>${formatearMoneda(d.subtotal)}</td>
            <td><button class="btn btn-sm btn-outline-danger" onclick="quitarItemVenta(${i})"><i class="bi bi-x"></i></button></td>
        </tr>`);
    });
    document.getElementById('venta-total').textContent = formatearMoneda(total);
}

function quitarItemVenta(idx) { detalleVenta.splice(idx, 1); renderDetalleVenta(); }

function registrarVenta() {
    if (detalleVenta.length === 0) { alertaError('Agregue al menos un artículo.'); return; }
    const clienteId = parseInt(document.getElementById('venta-cliente').value) || null;
    const sesion = obtenerSesion();
    const ventas = obtenerVentas();
    const total = detalleVenta.reduce((s, d) => s + d.subtotal, 0);
    const nueva = {
        id: generarId(ventas),
        numero: `V-${String(generarId(ventas)).padStart(4, '0')}`,
        clienteId,
        fecha: document.getElementById('venta-fecha').value,
        estado: 'completada',
        detalle: [...detalleVenta],
        total,
        vendedor: sesion ? sesion.nombre : 'Sistema',
        fechaRegistro: fechaHoraAhora()
    };
    // Restar stock
    const articulos = obtenerDatos('articulos_tecnorivas');
    detalleVenta.forEach(d => {
        const idx = articulos.findIndex(a => a.id === d.articuloId);
        if (idx >= 0) articulos[idx].stock -= d.cantidad;
    });
    guardarDatos('articulos_tecnorivas', articulos);
    // Movimientos
    const movs = obtenerDatos('movimientos_inventario');
    detalleVenta.forEach(d => {
        movs.push({ id: generarId(movs), tipo: 'salida', articuloId: d.articuloId, cantidad: d.cantidad, referencia: nueva.numero, fecha: nueva.fecha });
    });
    guardarDatos('movimientos_inventario', movs);
    ventas.push(nueva);
    guardarVentas(ventas);
    bootstrap.Modal.getInstance(document.getElementById('modal-venta')).hide();
    cargarTabVentas('ventas');
    Swal.fire({ icon: 'success', title: `Venta ${nueva.numero} registrada`, html: `<strong>Total: ${formatearMoneda(total)}</strong>`, confirmButtonText: 'Ver comprobante' }).then(() => generarComprobante(nueva.id));
}

function verVenta(id) {
    const v = obtenerVentas().find(x => x.id === id);
    if (!v) return;
    const cli = obtenerClientes().find(c => c.id === v.clienteId);
    const filas = v.detalle.map(d => `<tr><td>${d.nombre}</td><td>${d.cantidad}</td><td>${formatearMoneda(d.precio)}</td><td>${formatearMoneda(d.subtotal)}</td></tr>`).join('');
    Swal.fire({ title: `Venta ${v.numero}`, html: `<p><strong>Cliente:</strong> ${cli ? cli.nombre : 'General'}</p><p><strong>Fecha:</strong> ${formatearFecha(v.fecha)}</p><table class="table table-sm"><thead><tr><th>Artículo</th><th>Cant.</th><th>Precio</th><th>Subtotal</th></tr></thead><tbody>${filas}</tbody></table><p class="text-end fw-bold">Total: ${formatearMoneda(v.total)}</p>`, width: 700, confirmButtonText: 'Cerrar' });
}

function generarComprobante(id) {
    const v = obtenerVentas().find(x => x.id === id);
    if (!v) return;
    const cli = obtenerClientes().find(c => c.id === v.clienteId);
    const filas = v.detalle.map(d => `<tr><td>${d.nombre}</td><td style="text-align:center">${d.cantidad}</td><td style="text-align:right">${formatearMoneda(d.precio)}</td><td style="text-align:right">${formatearMoneda(d.subtotal)}</td></tr>`).join('');
    const win = window.open('', '_blank');
    win.document.write(`<html><head><title>Comprobante ${v.numero}</title><style>
        body{font-family:Arial,sans-serif;font-size:13px;max-width:400px;margin:0 auto;padding:20px}
        h2{text-align:center;color:#1e3a5f;margin-bottom:0} .empresa{text-align:center;font-size:11px;color:#666;margin-bottom:15px}
        table{width:100%;border-collapse:collapse;margin:10px 0} th{background:#1e3a5f;color:white;padding:5px;font-size:11px}
        td{padding:4px;border-bottom:1px solid #eee;font-size:12px} .total{text-align:right;font-weight:bold;font-size:14px;margin-top:10px}
        .info{font-size:12px;margin:5px 0} hr{border:1px dashed #999}
    </style></head><body>
        <h2>TECNORIVAS</h2>
        <div class="empresa">Servicios de Refrigeración, Electricidad y Construcción<br>RNC: 130-00000-0 | Tel: 809-000-0000</div>
        <hr>
        <div class="info"><strong>Comprobante:</strong> ${v.numero}</div>
        <div class="info"><strong>Fecha:</strong> ${formatearFecha(v.fecha)}</div>
        <div class="info"><strong>Cliente:</strong> ${cli ? cli.nombre : 'Cliente General'}</div>
        <div class="info"><strong>Vendedor:</strong> ${v.vendedor}</div>
        <hr>
        <table><thead><tr><th>Artículo</th><th>Cant.</th><th>Precio</th><th>Total</th></tr></thead><tbody>${filas}</tbody></table>
        <hr>
        <div class="total">TOTAL: ${formatearMoneda(v.total)}</div>
        <hr>
        <p style="text-align:center;font-size:11px;color:#999">¡Gracias por su compra!<br>TECNORIVAS - ${new Date().toLocaleString('es-DO')}</p>
    </body></html>`);
    win.document.close();
    win.print();
}

async function eliminar_ventas(id) {
    const v = obtenerVentas().find(x => x.id === id);
    if (!v || !(await confirmarEliminar(`Venta ${v.numero}`))) return;
    guardarVentas(obtenerVentas().filter(x => x.id !== id));
    cargarTabVentas('ventas');
    alertaExito('Venta anulada.');
}
