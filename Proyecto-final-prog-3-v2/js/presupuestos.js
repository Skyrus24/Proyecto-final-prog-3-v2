/**
 * Modulo de Presupuestos
 * Gestiona la creacion de proformas/presupuestos para los clientes.
 * Ahora los presupuestos NO afectan el stock ni generan cobros.
 * Si un presupuesto se aprueba, se puede convertir a Factura.
 */
const CLAVE_CLIENTES_PRES = 'clientes_tecnorivas';
const CLAVE_CATEGORIAS_PRES = 'categorias_tecnorivas';
const CLAVE_PRESUPUESTOS = 'presupuestos_tecnorivas';

const PANELES_PRESUPUESTOS = ['categorias', 'lista'];
let tabActivoPresupuestos = 'categorias';
let paginadoresPresupuestos = {};
let filteredPresupuestos = { categorias: [], lista: [] };

let detallePresupuesto = [];
let selectBuscadorPresCliente, selectBuscadorPresCat, selectBuscadorPresSrv;

document.addEventListener('DOMContentLoaded', () => {
    const sesion = protegerPagina();
    if (!sesion) return;

    if (!localStorage.getItem(CLAVE_PRESUPUESTOS)) localStorage.setItem(CLAVE_PRESUPUESTOS, '[]');

    PANELES_PRESUPUESTOS.forEach(tab => {
        paginadoresPresupuestos[tab] = new Paginador(`tabla-body-${tab}`, `paginacion-${tab}`, 10);
    });

    inicializarPaneles(PANELES_PRESUPUESTOS, 'categorias');

    // Cargar datos del tab activo
    const hashInicial = location.hash.replace('#', '');
    tabActivoPresupuestos = PANELES_PRESUPUESTOS.includes(hashInicial) ? hashInicial : 'categorias';
    actualizarVencimientos(); // Actualiza estados vencidos
    cargarTabPresupuestos(tabActivoPresupuestos);

    window.addEventListener('hashchange', () => {
        const h = location.hash.replace('#', '');
        if (PANELES_PRESUPUESTOS.includes(h)) { tabActivoPresupuestos = h; cargarTabPresupuestos(h); }
    });

    // Inicializar SelectBuscador
    selectBuscadorPresCliente = new SelectBuscador('pres-cliente');
    selectBuscadorPresCat = new SelectBuscador('pres-categoria');
    selectBuscadorPresSrv = new SelectBuscador('pres-servicio-select');

    configurarBusquedoresPresupuestos();
    configurarBotonesNuevosPresupuestos();
    configurarFormulariosPresupuestos();
    configurarExportarImprimirPresupuestos();
    
    if (sesion.rol === 'cajero') {
        const btnNuevo = document.getElementById('btn-nuevo-presupuesto');
        if (btnNuevo) btnNuevo.style.display = 'none';
        const btnNuevoCat = document.getElementById('btn-nuevo-categoria');
        if (btnNuevoCat) btnNuevoCat.style.display = 'none';
    }
});

function actualizarVencimientos() {
    let presupuestos = obtenerDatos(CLAVE_PRESUPUESTOS);
    let facturas = obtenerDatos('facturas_tecnorivas') || [];
    let modificado = false;
    const hoy = new Date(fechaHoy());
    
    presupuestos.forEach(p => {
        if ((p.estado === 'pendiente' || p.estado === 'aprobado') && p.fechaVencimiento) {
            const venc = new Date(p.fechaVencimiento);
            if (hoy > venc) {
                p.estado = 'vencido';
                modificado = true;
            }
        }
        
        // Auto-corrección: Si está facturado pero no existe la factura, volver a aprobado.
        if (p.estado === 'facturado') {
            const tieneFactura = facturas.some(f => f.presupuesto_numero === p.numero);
            if (!tieneFactura) {
                p.estado = 'aprobado';
                modificado = true;
            }
        }
    });
    
    if (modificado) guardarDatos(CLAVE_PRESUPUESTOS, presupuestos);
}

function cargarTabPresupuestos(tab) {
    let datos;
    if (tab === 'categorias') datos = obtenerDatos(CLAVE_CATEGORIAS_PRES);
    else { datos = obtenerDatos(CLAVE_PRESUPUESTOS); datos = [...datos].sort((a,b) => b.id - a.id); }
    filteredPresupuestos[tab] = datos;
    actualizarPaginadorPresupuestos(tab, datos);
}

function actualizarPaginadorPresupuestos(tab, datos) {
    const el = document.getElementById(`contador-${tab}`);
    if (el) el.textContent = `${datos.length} registro(s)`;
    paginadoresPresupuestos[tab].setDatos(datos, (lista, cont) => {
        if (tab === 'categorias') renderFilaCategoriasPres(lista, cont);
        if (tab === 'lista') renderFilaListaPresupuestos(lista, cont);
    });
}

function configurarBusquedoresPresupuestos() {
    ['categorias', 'lista'].forEach(modulo => {
        const input = document.getElementById(`buscador-${modulo}`);
        if (input) {
            input.addEventListener('input', e => {
                const query = e.target.value.toLowerCase();
                let datos;
                if (modulo === 'categorias') datos = obtenerDatos(CLAVE_CATEGORIAS_PRES);
                else datos = obtenerDatos(CLAVE_PRESUPUESTOS);
                filteredPresupuestos[modulo] = datos.filter(item => JSON.stringify(item).toLowerCase().includes(query));
                actualizarPaginadorPresupuestos(modulo, filteredPresupuestos[modulo]);
            });
        }
    });
}

function configurarBotonesNuevosPresupuestos() {
    const btnCat = document.getElementById('btn-nuevo-categoria');
    if (btnCat) btnCat.addEventListener('click', () => {
        document.getElementById('form-categoria').reset();
        document.getElementById('cat-id').value = '';
        bootstrap.Modal.getOrCreateInstance(document.getElementById('modal-categoria')).show();
    });

    const btnPres = document.getElementById('btn-nuevo-presupuesto');
    if (btnPres) btnPres.addEventListener('click', abrirNuevoPresupuesto);
    
    const btnAddArticulo = document.getElementById('btn-add-articulo-pres');
    if (btnAddArticulo) btnAddArticulo.addEventListener('click', agregarArticuloPresupuesto);

    const btnAddServicio = document.getElementById('btn-add-servicio-pres');
    if (btnAddServicio) btnAddServicio.addEventListener('click', agregarServicioPresupuesto);
    
    const inputValidez = document.getElementById('pres-validez');
    if (inputValidez) inputValidez.addEventListener('change', actualizarPreviewCaducidad);
    
    const inputFecha = document.getElementById('pres-fecha');
    if (inputFecha) inputFecha.addEventListener('change', actualizarPreviewCaducidad);
}

function configurarFormulariosPresupuestos() {
    const formCat = document.getElementById('form-categoria');
    if (formCat) formCat.addEventListener('submit', e => {
        e.preventDefault();
        guardarCategoriaPres();
    });

    const formPres = document.getElementById('form-presupuesto');
    if (formPres) formPres.addEventListener('submit', e => {
        e.preventDefault();
        registrarPresupuesto();
    });

    const formFacturar = document.getElementById('form-facturar-presupuesto');
    if (formFacturar) formFacturar.addEventListener('submit', facturarPresupuesto);
    
    const selCondicion = document.getElementById('facturar-pres-condicion');
    if (selCondicion) {
        selCondicion.addEventListener('change', (e) => {
            const divCuotas = document.getElementById('div-facturar-cuotas');
            if (e.target.value === 'credito') {
                divCuotas.classList.remove('d-none');
            } else {
                divCuotas.classList.add('d-none');
            }
        });
    }

    const selectCat = document.getElementById('pres-categoria');
    if (selectCat) {
        selectCat.addEventListener('change', e => {
            cargarArticulosPorCategoria(e.target.value);
            cargarServiciosPorCategoria(e.target.value);
        });
    }

    const selectArticulo = document.getElementById('pres-articulo-select');
    if (selectArticulo) {
        selectArticulo.addEventListener('change', e => {
            const opt = e.target.options[e.target.selectedIndex];
            if (opt && opt.value) {
                document.getElementById('pres-articulo-precio').value = opt.dataset.precio || '';
                document.getElementById('pres-articulo-stock').value = opt.dataset.stock || '-';
                document.getElementById('pres-articulo-iva').value = opt.dataset.iva ? `${opt.dataset.iva}%` : '10%';
            } else {
                document.getElementById('pres-articulo-precio').value = '';
                document.getElementById('pres-articulo-stock').value = '';
                document.getElementById('pres-articulo-iva').value = '';
            }
        });
    }

    const selectServicio = document.getElementById('pres-servicio-select');
    if (selectServicio) {
        selectServicio.addEventListener('change', e => {
            const opt = e.target.options[e.target.selectedIndex];
            if (opt && opt.value) {
                document.getElementById('pres-servicio-precio').value = opt.dataset.precio || '';
            } else {
                document.getElementById('pres-servicio-precio').value = '';
            }
        });
    }
}

function cargarArticulosPorCategoria(catId) {
    const select = document.getElementById('pres-articulo-select');
    if (!select) return;
    
    select.innerHTML = '<option value="">-- Seleccione un artículo --</option>';
    if (!catId) {
        select.disabled = true;
        document.getElementById('pres-articulo-precio').value = '';
        return;
    }
    select.disabled = false;
    
    const articulos = obtenerDatos('articulos_tecnorivas').filter(a => a.categoriaId == catId && a.stock > 0);
    
    if (articulos.length > 0) {
        articulos.forEach(a => {
            select.insertAdjacentHTML('beforeend', `<option value="${a.id}" data-precio="${a.precio}" data-iva="${a.iva || 10}" data-stock="${a.stock}">${a.nombre}</option>`);
        });
    } else {
        select.innerHTML = '<option value="">-- Sin artículos en esta categoría --</option>';
    }
}

function poblarSelectClientesPres() {
    const sel = document.getElementById('pres-cliente');
    if (!sel) return;
    sel.innerHTML = '<option value="">-- Seleccionar --</option>';
    obtenerDatos('clientes_tecnorivas').forEach(c => sel.insertAdjacentHTML('beforeend', `<option value="${c.id}">${c.nombre} (Cédula/RUC: ${c.cedula})</option>`));
    if (selectBuscadorPresCliente) selectBuscadorPresCliente.actualizar();
}

function poblarSelectCategoriasPres() {
    const sel = document.getElementById('pres-categoria');
    if (!sel) return;
    sel.innerHTML = '<option value="">-- Seleccionar --</option>';
    obtenerDatos(CLAVE_CATEGORIAS_PRES).forEach(c => sel.insertAdjacentHTML('beforeend', `<option value="${c.id}">${c.nombre}</option>`));
    if (selectBuscadorPresCat) selectBuscadorPresCat.actualizar();
}

function cargarServiciosPorCategoria(catId) {
    const sel = document.getElementById('pres-servicio-select');
    if (!sel) return;
    sel.innerHTML = '<option value="">-- Buscar Servicio --</option>';
    
    if (!catId) {
        sel.disabled = true;
        document.getElementById('pres-servicio-precio').value = '';
        if (selectBuscadorPresSrv) selectBuscadorPresSrv.actualizar();
        return;
    }
    
    sel.disabled = false;
    const servicios = obtenerDatos('servicios_tecnorivas').filter(s => s.activo && s.categoriaId == catId);
    
    if (servicios.length > 0) {
        servicios.forEach(s => {
            sel.insertAdjacentHTML('beforeend', `<option value="${s.id}" data-precio="${s.precio_base}">${s.nombre} (${formatearMoneda(s.precio_base)})</option>`);
        });
    } else {
        sel.innerHTML = '<option value="">-- Sin servicios en esta categoría --</option>';
    }
    if (selectBuscadorPresSrv) selectBuscadorPresSrv.actualizar();
}

/* =========================================
   CATEGORÍAS DE PRESUPUESTOS
========================================= */
function renderFilaCategoriasPres(lista, tbody) {
    const sesion = obtenerSesion();
    const esAdmin = sesion && (sesion.rol === 'admin' || sesion.rol === 'superusuario');
    if (lista.length === 0) {
        tbody.innerHTML = '<tr><td colspan="3" class="text-center text-muted">No hay categorías registradas</td></tr>';
    } else {
        lista.forEach(cat => {
            tbody.insertAdjacentHTML('beforeend', `
                <tr>
                    <td class="fw-bold">${cat.nombre}</td>
                    <td>${cat.descripcion || '-'}</td>
                    <td>
                        <button class="btn-icon btn-edit" onclick="editarCategoriaPres(${cat.id})" title="Editar"><i class="bi bi-pencil"></i></button>
                        ${esAdmin ? `<button class="btn-icon btn-delete" onclick="eliminarDato('${CLAVE_CATEGORIAS_PRES}', ${cat.id}, () => cargarTabPresupuestos('categorias'))" title="Eliminar"><i class="bi bi-trash"></i></button>` : ''}
                    </td>
                </tr>
            `);
        });
    }
}

function guardarCategoriaPres() {
    const id = document.getElementById('cat-id').value;
    const cat = {
        nombre: document.getElementById('cat-nombre').value.trim(),
        descripcion: document.getElementById('cat-descripcion').value.trim()
    };
    const lista = obtenerDatos(CLAVE_CATEGORIAS_PRES);
    if (cat.nombre.length < 3) { alertaError('El nombre de la categoría debe tener al menos 3 letras.'); return; }
    if (lista.find(x => x.nombre.toLowerCase() === cat.nombre.toLowerCase() && x.id !== parseInt(id))) {
        alertaError('Ya existe una categoría con ese nombre.'); return;
    }
    if (id) {
        actualizarDato(CLAVE_CATEGORIAS_PRES, parseInt(id), cat);
        alertaExito('Categoría actualizada.');
    } else {
        crearDato(CLAVE_CATEGORIAS_PRES, cat);
        alertaExito('Categoría guardada.');
    }
    bootstrap.Modal.getInstance(document.getElementById('modal-categoria')).hide();
    cargarTabPresupuestos('categorias');
}

window.editarCategoriaPres = function(id) {
    const cat = obtenerDatos(CLAVE_CATEGORIAS_PRES).find(c => c.id === id);
    if (cat) {
        document.getElementById('cat-id').value = cat.id;
        document.getElementById('cat-nombre').value = cat.nombre;
        document.getElementById('cat-descripcion').value = cat.descripcion || '';
        bootstrap.Modal.getOrCreateInstance(document.getElementById('modal-categoria')).show();
    }
};

/* =========================================
   PRESUPUESTOS
========================================= */

function abrirNuevoPresupuesto() {
    detallePresupuesto = [];
    document.getElementById('form-presupuesto').reset();
    document.getElementById('pres-fecha').value = fechaHoy();
    document.getElementById('presupuesto-total').textContent = formatearMoneda(0);
    renderDetallePresupuesto();
    poblarSelectClientesPres();
    poblarSelectCategoriasPres();
    
    const selectItem = document.getElementById('pres-articulo-select');
    if(selectItem) {
        selectItem.innerHTML = '<option value="">-- Seleccione Categoría Primero --</option>';
        selectItem.disabled = true;
    }
    
    const selectSrv = document.getElementById('pres-servicio-select');
    if(selectSrv) {
        selectSrv.innerHTML = '<option value="">-- Seleccione Categoría Primero --</option>';
        selectSrv.disabled = true;
        if (selectBuscadorPresSrv) selectBuscadorPresSrv.actualizar();
    }
    
    actualizarPreviewCaducidad();
    bootstrap.Modal.getOrCreateInstance(document.getElementById('modal-presupuesto')).show();
}

function calcularFechaVencimiento(fechaBaseStr, validezDias) {
    const d = new Date(fechaBaseStr + 'T00:00:00');
    if (validezDias === 30) {
        const tempDay = d.getDate();
        d.setMonth(d.getMonth() + 1);
        if (d.getDate() !== tempDay) {
            d.setDate(0);
        }
    } else if (validezDias === 60) {
        const tempDay = d.getDate();
        d.setMonth(d.getMonth() + 2);
        if (d.getDate() !== tempDay) {
            d.setDate(0);
        }
    } else {
        d.setDate(d.getDate() + validezDias);
    }
    return d.toISOString().split('T')[0];
}

function actualizarPreviewCaducidad() {
    const fechaInput = document.getElementById('pres-fecha').value;
    const validezDias = parseInt(document.getElementById('pres-validez').value) || 0;
    const previewSpan = document.getElementById('pres-caducidad-preview');
    if (!previewSpan) return;
    
    if (fechaInput) {
        const vencFechaStr = calcularFechaVencimiento(fechaInput, validezDias);
        previewSpan.textContent = formatearFecha(vencFechaStr);
    } else {
        previewSpan.textContent = '-';
    }
}

function agregarArticuloPresupuesto() {
    const sel = document.getElementById('pres-articulo-select');
    if (!sel || !sel.value) {
        alertaAdvertencia('Seleccione un artículo.'); return;
    }
    const opt = sel.options[sel.selectedIndex];
    const precio = parseFloat(document.getElementById('pres-articulo-precio').value);
    const cant = parseFloat(document.getElementById('pres-articulo-cant').value);
    
    if (isNaN(cant) || cant <= 0 || isNaN(precio) || precio < 0) {
        alertaAdvertencia('Ingrese cantidad y precio válidos.'); return;
    }
    
    const itemId = parseInt(sel.value);
    const stock = parseFloat(opt.dataset.stock);
    const yaAgregada = detallePresupuesto.filter(i => i.tipoItem === 'articulo' && i.itemId === itemId).reduce((s, i) => s + i.cantidad, 0);
    
    if (cant + yaAgregada > stock) {
        alertaError(`Stock insuficiente. Disponible: ${stock}, Ya agregado: ${yaAgregada}`); return;
    }
    
    agregarAlDetalle('articulo', itemId, opt.text, cant, precio, parseFloat(opt.dataset.iva || 10));
    
    sel.value = '';
    document.getElementById('pres-articulo-stock').value = '';
    document.getElementById('pres-articulo-precio').value = '';
    document.getElementById('pres-articulo-cant').value = '1';
    document.getElementById('pres-articulo-iva').value = '';
}

function agregarServicioPresupuesto() {
    const sel = document.getElementById('pres-servicio-select');
    if (!sel || !sel.value) {
        alertaAdvertencia('Seleccione un servicio.'); return;
    }
    const opt = sel.options[sel.selectedIndex];
    const precio = parseFloat(document.getElementById('pres-servicio-precio').value);
    const cant = parseFloat(document.getElementById('pres-servicio-cant').value) || 1;
    
    if (isNaN(cant) || cant <= 0 || isNaN(precio) || precio < 0) {
        alertaAdvertencia('Ingrese cantidad y precio válidos.'); return;
    }
    
    agregarAlDetalle('servicio', parseInt(sel.value), opt.text, cant, precio, 10);
    
    if (selectBuscadorPresSrv) selectBuscadorPresSrv.input.value = '';
    sel.value = '';
    document.getElementById('pres-servicio-precio').value = '';
    document.getElementById('pres-servicio-cant').value = '1';
}

function agregarAlDetalle(tipoItem, itemId, descripcion, cant, precio, iva) {
    const idx = detallePresupuesto.findIndex(i => i.tipoItem === tipoItem && i.itemId === itemId && i.precio === precio);
    if (idx !== -1) {
        detallePresupuesto[idx].cantidad += cant;
        detallePresupuesto[idx].subtotal = detallePresupuesto[idx].cantidad * precio;
    } else {
        detallePresupuesto.push({
            tipoItem, itemId, descripcion, cantidad: cant, precio, iva, subtotal: cant * precio
        });
    }
    renderDetallePresupuesto();
}

function renderDetallePresupuesto() {
    const tbody = document.getElementById('presupuesto-detalle-body');
    tbody.innerHTML = '';
    let total = 0;
    
    detallePresupuesto.forEach((item, index) => {
        total += item.subtotal;
        const tipoBadge = item.tipoItem === 'articulo' ? '<span class="badge bg-secondary">Art</span>' : '<span class="badge bg-primary">Srv</span>';
        tbody.insertAdjacentHTML('beforeend', `
            <tr>
                <td>${index + 1}</td>
                <td>${tipoBadge}</td>
                <td>${item.descripcion}</td>
                <td>${item.cantidad}</td>
                <td>${formatearMoneda(item.precio)}</td>
                <td>${item.iva !== undefined ? item.iva : 10}%</td>
                <td>${formatearMoneda(item.subtotal)}</td>
                <td><button type="button" class="btn-icon btn-delete" onclick="eliminarItemPresupuesto(${index})"><i class="bi bi-trash"></i></button></td>
            </tr>
        `);
    });
    document.getElementById('presupuesto-total').textContent = formatearMoneda(total);
}

window.eliminarItemPresupuesto = function(index) {
    detallePresupuesto.splice(index, 1);
    renderDetallePresupuesto();
};

function registrarPresupuesto() {
    if (detallePresupuesto.length === 0) {
        alertaAdvertencia('Debe agregar al menos un artículo o servicio.'); return;
    }

    const clienteId = document.getElementById('pres-cliente').value;
    const catId = document.getElementById('pres-categoria').value;
    const validezDias = parseInt(document.getElementById('pres-validez').value);
    
    const clienteObj = obtenerDatos('clientes_tecnorivas').find(c => c.id == clienteId);
    const catObj = obtenerDatos(CLAVE_CATEGORIAS_PRES).find(c => c.id == catId);
    
    const presupuestos = obtenerDatos(CLAVE_PRESUPUESTOS);
    const maxNum = presupuestos.reduce((max, p) => {
        const match = p.numero.match(/PRE-\d{4}-(\d+)/);
        if (match) return Math.max(max, parseInt(match[1]));
        return max;
    }, 0);
    const numero = `PRE-${new Date().getFullYear()}-${String(maxNum + 1).padStart(4, '0')}`;
    const total = detallePresupuesto.reduce((s, i) => s + i.subtotal, 0);

    const fechaInput = document.getElementById('pres-fecha').value || fechaHoy();
    const fechaVencimientoStr = calcularFechaVencimiento(fechaInput, validezDias);

    const nuevoPres = {
        numero,
        fecha: fechaInput,
        fechaVencimiento: fechaVencimientoStr,
        validezDias,
        clienteId: parseInt(clienteId),
        clienteNombre: clienteObj ? clienteObj.nombre : 'Desconocido',
        categoriaId: parseInt(catId),
        categoriaNombre: catObj ? catObj.nombre : 'General',
        detalle: [...detallePresupuesto],
        total,
        estado: 'pendiente', // pendiente, aprobado, vencido, facturado, cancelado
        creadoPor: obtenerSesion() ? obtenerSesion().nombre : 'Sistema'
    };

    crearDato(CLAVE_PRESUPUESTOS, nuevoPres);
    Swal.fire({ 
        icon: 'success', 
        title: 'Presupuesto Registrado', 
        html: `Se generó el presupuesto <b>${numero}</b>.<br>Válido hasta: <b>${formatearFecha(nuevoPres.fechaVencimiento)}</b>` 
    });
    
    bootstrap.Modal.getInstance(document.getElementById('modal-presupuesto')).hide();
    cargarTabPresupuestos('lista');
}

function renderFilaListaPresupuestos(lista, tbody) {
    const sesion = obtenerSesion();
    const esAdmin = sesion && (sesion.rol === 'admin' || sesion.rol === 'superusuario');
    if (lista.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" class="text-center text-muted">No hay presupuestos registrados</td></tr>';
    } else {
        lista.forEach(p => {
            const badges = {
                'pendiente': 'bg-warning text-dark',
                'aprobado': 'bg-info text-dark',
                'vencido': 'bg-secondary',
                'facturado': 'bg-success',
                'rechazado': 'bg-danger'
            };
            const bc = badges[p.estado] || 'bg-light text-dark';
            
            const lockIcon = (p.estado === 'aprobado' || p.estado === 'facturado') ? '<i class="bi bi-lock-fill text-danger ms-1" title="Presupuesto Congelado"></i>' : '';
            
            tbody.insertAdjacentHTML('beforeend', `
                <tr>
                    <td class="fw-bold">${p.numero} ${lockIcon}</td>
                    <td>${formatearFecha(p.fecha)}</td>
                    <td><span class="${new Date(p.fechaVencimiento) < new Date() && p.estado === 'pendiente' ? 'text-danger fw-bold' : ''}">${formatearFecha(p.fechaVencimiento)}</span></td>
                    <td>${p.clienteNombre}</td>
                    <td>${p.categoriaNombre}</td>
                    <td class="fw-bold">${formatearMoneda(p.total)}</td>
                    <td><span class="badge ${bc}">${p.estado.toUpperCase()}</span></td>
                    <td>
                        <button class="btn btn-sm btn-outline-info me-1" onclick="verPresupuesto(${p.id})" title="Ver Detalle"><i class="bi bi-eye"></i></button>
                        <button class="btn btn-sm btn-outline-danger me-1" onclick="generarPDFId(${p.id})" title="Descargar PDF"><i class="bi bi-file-earmark-pdf"></i></button>
                        
                        ${(p.estado === 'pendiente') ? `
                            <button class="btn btn-sm btn-outline-primary me-1" onclick="cambiarEstadoPresupuesto(${p.id}, 'aprobado')" title="Aprobar"><i class="bi bi-check-lg"></i></button>
                            <button class="btn btn-sm btn-outline-danger me-1" onclick="cambiarEstadoPresupuesto(${p.id}, 'rechazado')" title="Rechazar"><i class="bi bi-x-lg"></i></button>
                        ` : ''}
                        
                        ${(p.estado === 'aprobado') ? `
                            <button class="btn btn-sm btn-success me-1 fw-bold" onclick="abrirFacturacion(${p.id})" title="Facturar Presupuesto"><i class="bi bi-receipt-cutoff"></i> Facturar</button>
                            <button class="btn btn-sm btn-outline-danger me-1" onclick="cambiarEstadoPresupuesto(${p.id}, 'rechazado')" title="Cambiar a Rechazado"><i class="bi bi-x-circle"></i></button>
                        ` : ''}
                        
                        ${(p.estado === 'facturado') ? `
                            <a href="facturacion.html" class="btn btn-sm btn-outline-success me-1" title="Ver Factura Asociada"><i class="bi bi-box-arrow-up-right"></i> Facturas</a>
                        ` : ''}

                        ${esAdmin && (p.estado === 'rechazado' || p.estado === 'vencido') ? `<button class="btn btn-sm btn-outline-danger" onclick="eliminarDato('${CLAVE_PRESUPUESTOS}', ${p.id}, () => cargarTabPresupuestos('lista'))" title="Eliminar"><i class="bi bi-trash3"></i></button>` : ''}
                    </td>
                </tr>
            `);
        });
    }
}

window.verPresupuesto = function(id) {
    const pres = obtenerDatos(CLAVE_PRESUPUESTOS).find(p => p.id === id);
    if (!pres) return;
    let tableItems = pres.detalle.map(i => `<tr><td>${i.tipoItem === 'articulo' ? 'Art' : 'Srv'}</td><td>${i.descripcion}</td><td>${i.cantidad}</td><td>${formatearMoneda(i.precio)}</td><td>${i.iva !== undefined ? i.iva : 10}%</td><td>${formatearMoneda(i.subtotal)}</td></tr>`).join('');
    
    Swal.fire({
        title: `Presupuesto ${pres.numero}`,
        html: `
            <div style="text-align:left; font-size:14px;">
                <p><strong>Cliente:</strong> ${pres.clienteNombre}</p>
                <p><strong>Fecha:</strong> ${formatearFecha(pres.fecha)}</p>
                <p><strong>Válido hasta:</strong> <span class="text-danger fw-bold">${formatearFecha(pres.fechaVencimiento)}</span></p>
                <p><strong>Estado:</strong> ${pres.estado.toUpperCase()}</p>
                <hr>
                <table class="table table-sm">
                    <thead><tr><th>Tipo</th><th>Desc.</th><th>Cant.</th><th>Precio</th><th>IVA</th><th>Total</th></tr></thead>
                    <tbody>${tableItems}</tbody>
                </table>
                <h5 class="text-end fw-bold mt-2">Total: ${formatearMoneda(pres.total)}</h5>
            </div>
        `,
        width: '600px',
        confirmButtonText: 'Cerrar'
    });
};

window.cambiarEstadoPresupuesto = async function(id, nuevoEstado) {
    const presupuestos = obtenerDatos(CLAVE_PRESUPUESTOS);
    const idx = presupuestos.findIndex(p => p.id === id);
    if (idx === -1) return;
    
    if (!(await confirmarAccion(`¿Cambiar estado a ${nuevoEstado.toUpperCase()}?`, `Presupuesto ${presupuestos[idx].numero}`))) return;

    presupuestos[idx].estado = nuevoEstado;
    guardarDatos(CLAVE_PRESUPUESTOS, presupuestos);
    cargarTabPresupuestos('lista');
    alertaExito(`Presupuesto ${nuevoEstado}.`);
};

/* =========================================
   FACTURACIÓN DE PRESUPUESTO
========================================= */
window.abrirFacturacion = async function(id) {
    const presupuestos = obtenerDatos(CLAVE_PRESUPUESTOS);
    const pIdx = presupuestos.findIndex(x => x.id === id);
    if (pIdx === -1) return;
    const p = presupuestos[pIdx];
    
    if (p.estado !== 'aprobado') {
        alertaError('Solo se pueden facturar presupuestos aprobados.'); return;
    }
    
    if (!(await confirmarAccion(`¿Crear factura para el presupuesto ${p.numero}?`, 'Ir a Facturación'))) return;

    // Guardar en sessionStorage para que facturación lo reciba
    sessionStorage.setItem('presupuesto_a_facturar_id', p.id);
    
    // Redirigir
    window.location.href = 'facturacion.html?accion=nueva_desde_presupuesto';
};


/* =========================================
   HELPERS LOCALES (CRUD genérico)
========================================= */
function crearDato(clave, dato) {
    const lista = obtenerDatos(clave);
    dato.id = generarId(lista);
    lista.push(dato);
    guardarDatos(clave, lista);
    return dato;
}
function actualizarDato(clave, id, nuevosDatos) {
    const lista = obtenerDatos(clave);
    const index = lista.findIndex(i => i.id === id);
    if (index !== -1) { lista[index] = { ...lista[index], ...nuevosDatos }; guardarDatos(clave, lista); }
}

window.eliminarDato = function(clave, id, callbackRender) {
    confirmarEliminar('este registro').then(conf => {
        if (conf) {
            let lista = obtenerDatos(clave);
            lista = lista.filter(i => i.id !== id);
            guardarDatos(clave, lista);
            if (callbackRender) callbackRender();
            alertaExito('Registro eliminado');
        }
    });
};

/* =========================================
   PDF PRESUPUESTOS
========================================= */
window.generarPDFId = function(id) {
    const pres = obtenerDatos(CLAVE_PRESUPUESTOS).find(p => p.id === id);
    if (pres) generarPDFPresupuestoEspecial(pres);
};

function generarPDFPresupuestoEspecial(pres) {
    if (!window.jspdf) {
        Swal.fire({ title: 'Generando PDF...', text: 'Cargando librerías necesarias...', didOpen: () => { Swal.showLoading(); }});
        const script1 = document.createElement('script');
        script1.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';
        script1.onload = () => {
            const script2 = document.createElement('script');
            script2.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.5.31/jspdf.plugin.autotable.min.js';
            script2.onload = () => { Swal.close(); _ejecutarPDFPresupuesto(pres); };
            document.head.appendChild(script2);
        };
        document.head.appendChild(script1);
    } else {
        _ejecutarPDFPresupuesto(pres);
    }
}

function _ejecutarPDFPresupuesto(pres) {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF('p', 'pt', 'a4');
    
    // Header
    doc.setFontSize(22);
    doc.setTextColor(30, 58, 95);
    doc.text("TECNORIVAS", 40, 50);
    
    doc.setFontSize(12);
    doc.setTextColor(100, 100, 100);
    doc.text("Presupuesto Oficial", 40, 70);
    
    doc.setFontSize(14);
    doc.setTextColor(0, 0, 0);
    doc.text(`N°: ${pres.numero}`, doc.internal.pageSize.width - 40, 50, { align: 'right' });
    
    // Info
    doc.setFontSize(10);
    doc.text(`Fecha Emisión: ${formatearFecha(pres.fecha)}`, doc.internal.pageSize.width - 40, 70, { align: 'right' });
    doc.setTextColor(200, 50, 50);
    doc.text(`Válido hasta: ${formatearFecha(pres.fechaVencimiento)}`, doc.internal.pageSize.width - 40, 85, { align: 'right' });
    
    doc.setTextColor(0, 0, 0);
    doc.text(`Cliente: ${pres.clienteNombre}`, 40, 110);
    doc.text(`Categoría: ${pres.categoriaNombre}`, 40, 125);
    
    // Table
    const tableBody = pres.detalle.map((i, idx) => [
        idx + 1,
        i.tipoItem === 'articulo' ? 'Art' : 'Srv',
        i.descripcion,
        i.cantidad,
        formatearMoneda(i.precio),
        `${i.iva !== undefined ? i.iva : 10}%`,
        formatearMoneda(i.subtotal)
    ]);
    
    doc.autoTable({
        startY: 150,
        head: [['N°', 'Tipo', 'Descripción', 'Cant', 'Precio Unit', 'IVA', 'Subtotal']],
        body: tableBody,
        theme: 'grid',
        headStyles: { fillColor: [30, 58, 95] },
        styles: { fontSize: 10 }
    });
    
    // Total
    const finalY = doc.lastAutoTable.finalY + 30;
    doc.setFontSize(14);
    doc.text(`Total: ${formatearMoneda(pres.total)}`, doc.internal.pageSize.width - 40, finalY, { align: 'right' });
    
    // Footer
    doc.setFontSize(9);
    doc.setTextColor(150, 150, 150);
    doc.text("Este presupuesto no compromete la venta hasta su confirmación y facturación.", doc.internal.pageSize.width / 2, doc.internal.pageSize.height - 30, { align: 'center' });
    
    doc.save(`${pres.numero}_${pres.clienteNombre.replace(/ /g, '_')}.pdf`);
}

function configurarExportarImprimirPresupuestos() {
    ['categorias', 'lista'].forEach(tab => {
        const btnExp = document.getElementById(`btn-exportar-${tab}`);
        const btnImp = document.getElementById(`btn-imprimir-${tab}`);
        const btnPdf = document.getElementById(`btn-pdf-${tab}`);
        const titulos = { categorias: 'Categorías de Trabajos', lista: 'Presupuestos' };
        if (btnExp) btnExp.addEventListener('click', () => {
            const cols = {
                categorias: [{ key: 'nombre', label: 'Nombre' }, { key: 'descripcion', label: 'Descripción' }],
                lista: [{ key: 'numero', label: 'N°' }, { key: 'fecha', label: 'Fecha' }, { key: 'clienteNombre', label: 'Cliente' }, { key: 'total', label: 'Total' }, { key: 'estado', label: 'Estado' }]
            };
            exportarExcel(filteredPresupuestos[tab], tab, cols[tab]);
        });
        if (btnImp) btnImp.addEventListener('click', () => imprimirTabla(titulos[tab], `tabla-body-${tab}`));
        if (btnPdf) btnPdf.addEventListener('click', () => generarPDF(titulos[tab]));
    });
}
