const CLAVE_CLIENTES_PRES = 'clientes_tecnorivas';
const CLAVE_CATEGORIAS_PRES = 'categorias_tecnorivas';
const CLAVE_PRESUPUESTOS = 'presupuestos_tecnorivas';

const PANELES_PRESUPUESTOS = ['clientes', 'categorias', 'lista'];
let tabActivoPresupuestos = 'categorias';
let paginadoresPresupuestos = {};
let filteredPresupuestos = { clientes: [], categorias: [], lista: [] };

let detallePresupuesto = [];
let selectBuscadorPresCliente, selectBuscadorPresCat;

document.addEventListener('DOMContentLoaded', () => {
    const sesion = protegerPagina();
    if (!sesion) return;

    if (!localStorage.getItem(CLAVE_PRESUPUESTOS)) localStorage.setItem(CLAVE_PRESUPUESTOS, '[]');

    PANELES_PRESUPUESTOS.forEach(tab => {
        paginadoresPresupuestos[tab] = new Paginador(`tabla-body-${tab}`, `paginacion-${tab}`, 10);
    });

    inicializarPaneles(PANELES_PRESUPUESTOS, 'categorias');

    // Cargar datos del tab activo (inicial y al cambiar hash)
    const hashInicial = location.hash.replace('#', '');
    tabActivoPresupuestos = PANELES_PRESUPUESTOS.includes(hashInicial) ? hashInicial : 'categorias';
    cargarTabPresupuestos(tabActivoPresupuestos);

    window.addEventListener('hashchange', () => {
        const h = location.hash.replace('#', '');
        if (PANELES_PRESUPUESTOS.includes(h)) { tabActivoPresupuestos = h; cargarTabPresupuestos(h); }
    });

    // Inicializar SelectBuscador
    selectBuscadorPresCliente = new SelectBuscador('pres-cliente');
    selectBuscadorPresCat = new SelectBuscador('pres-categoria');

    configurarBusquedoresPresupuestos();
    configurarBotonesNuevosPresupuestos();
    configurarFormulariosPresupuestos();
    configurarExportarImprimirPresupuestos();
    configurarClientesPres();
    
    // Ocultar botones de creación para cajero
    if (sesion.rol === 'cajero') {
        const btnNuevo = document.getElementById('btn-nuevo-presupuesto');
        if (btnNuevo) btnNuevo.style.display = 'none';
        
        const btnNuevoC = document.getElementById('btn-nuevo-clientes');
        if (btnNuevoC) btnNuevoC.style.display = 'none';

        const btnNuevoCat = document.getElementById('btn-nuevo-categoria');
        if (btnNuevoCat) btnNuevoCat.style.display = 'none';
    }
});

function cargarTabPresupuestos(tab) {
    let datos;
    if (tab === 'clientes') datos = obtenerDatos(CLAVE_CLIENTES_PRES);
    else if (tab === 'categorias') datos = obtenerDatos(CLAVE_CATEGORIAS_PRES);
    else { datos = obtenerDatos(CLAVE_PRESUPUESTOS); datos = [...datos].sort((a,b) => b.id - a.id); }
    filteredPresupuestos[tab] = datos;
    actualizarPaginadorPresupuestos(tab, datos);
}

function actualizarPaginadorPresupuestos(tab, datos) {
    const el = document.getElementById(`contador-${tab}`);
    if (el) el.textContent = `${datos.length} registro(s)`;
    paginadoresPresupuestos[tab].setDatos(datos, (lista, cont) => {
        if (tab === 'clientes') renderFilaClientesPres(lista, cont);
        if (tab === 'categorias') renderFilaCategoriasPres(lista, cont);
        if (tab === 'lista') renderFilaListaPresupuestos(lista, cont);
    });
}

function configurarBusquedoresPresupuestos() {
    ['clientes', 'categorias', 'lista'].forEach(modulo => {
        const input = document.getElementById(`buscador-${modulo}`);
        if (input) {
            input.addEventListener('input', e => {
                const query = e.target.value.toLowerCase();
                let datos;
                if (modulo === 'clientes') datos = obtenerDatos(CLAVE_CLIENTES_PRES);
                else if (modulo === 'categorias') datos = obtenerDatos(CLAVE_CATEGORIAS_PRES);
                else datos = obtenerDatos(CLAVE_PRESUPUESTOS);
                filteredPresupuestos[modulo] = datos.filter(item => JSON.stringify(item).toLowerCase().includes(query));
                actualizarPaginadorPresupuestos(modulo, filteredPresupuestos[modulo]);
            });
        }
    });
}

function configurarBotonesNuevosPresupuestos() {
    const btnCli = document.getElementById('btn-nuevo-clientes');
    if (btnCli) btnCli.addEventListener('click', abrirNuevoClientePres);

    const btnCat = document.getElementById('btn-nuevo-categoria');
    if (btnCat) btnCat.addEventListener('click', () => {
        document.getElementById('form-categoria').reset();
        document.getElementById('cat-id').value = '';
        new bootstrap.Modal(document.getElementById('modal-categoria')).show();
    });

    const btnPres = document.getElementById('btn-nuevo-presupuesto');
    if (btnPres) btnPres.addEventListener('click', abrirNuevoPresupuesto);
    
    const btnAddItem = document.getElementById('btn-add-item-pres');
    if (btnAddItem) btnAddItem.addEventListener('click', agregarItemPresupuesto);
}

function configurarFormulariosPresupuestos() {
    const formCli = document.getElementById('form-cliente');
    if (formCli) formCli.addEventListener('submit', e => { e.preventDefault(); guardarClientePres(); });

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

    const selectCat = document.getElementById('pres-categoria');
    if (selectCat) {
        selectCat.addEventListener('change', e => {
            cargarItemsPorCategoria(e.target.value);
        });
    }

    const selectItem = document.getElementById('pres-item-select');
    if (selectItem) {
        selectItem.addEventListener('change', e => {
            const selectedOption = e.target.options[e.target.selectedIndex];
            if (selectedOption && selectedOption.value) {
                document.getElementById('pres-item-precio').value = selectedOption.dataset.precio || '';
                const stockInput = document.getElementById('pres-item-stock');
                if (stockInput) stockInput.value = selectedOption.dataset.stock !== undefined ? selectedOption.dataset.stock : '-';
            } else {
                document.getElementById('pres-item-precio').value = '';
                const stockInput = document.getElementById('pres-item-stock');
                if (stockInput) stockInput.value = '';
            }
        });
    }
}

function cargarItemsPorCategoria(catId) {
    const select = document.getElementById('pres-item-select');
    if (!select) return;
    
    select.innerHTML = '<option value="">-- Seleccione un ítem --</option>';
    if (!catId) {
        select.disabled = true;
        document.getElementById('pres-item-precio').value = '';
        return;
    }
    select.disabled = false;
    
    const articulos = obtenerDatos('articulos_tecnorivas').filter(a => a.categoriaId == catId && a.stock > 0);
    const servicios = obtenerDatos('servicios_tecnorivas').filter(s => s.categoriaId == catId);
    
    if (articulos.length > 0) {
        const optgroup = document.createElement('optgroup');
        optgroup.label = 'Artículos en Stock';
        articulos.forEach(a => {
            optgroup.insertAdjacentHTML('beforeend', `<option value="A-${a.id}" data-precio="${a.precio}" data-iva="${a.iva || 10}" data-stock="${a.stock}">${a.nombre}</option>`);
        });
        select.appendChild(optgroup);
    }
    
    if (servicios.length > 0) {
        const optgroup = document.createElement('optgroup');
        optgroup.label = 'Servicios';
        servicios.forEach(s => {
            optgroup.insertAdjacentHTML('beforeend', `<option value="S-${s.id}" data-precio="${s.precio}" data-iva="${s.iva || 10}">${s.nombre}</option>`);
        });
        select.appendChild(optgroup);
    }
}

/* =========================================
   CLIENTES
========================================= */
function configurarClientesPres() {
    // noop - ya configurado en configurarBotonesNuevosPresupuestos y configurarFormulariosPresupuestos
}

function renderFilaClientesPres(lista, tbody) {
    const sesion = obtenerSesion();
    const esAdmin = sesion && (sesion.rol === 'admin' || sesion.rol === 'superusuario');
    if (lista.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="text-center text-muted py-4"><i class="bi bi-inbox fs-3 d-block mb-2"></i>No hay clientes registrados</td></tr>';
        return;
    }
    lista.forEach(c => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${c.cedula}</td>
            <td><strong>${c.nombre}</strong></td>
            <td>${c.telefono || '-'}</td>
            <td>${c.email || '-'}</td>
            <td>${c.direccion || '-'}</td>
            <td>
                <button class="btn btn-sm btn-outline-primary me-1" onclick="abrirEditarClientePres(${c.id})" title="Editar"><i class="bi bi-pencil-square"></i></button>
                ${esAdmin ? `<button class="btn btn-sm btn-outline-danger" onclick="eliminarClientePres(${c.id})" title="Eliminar"><i class="bi bi-trash3"></i></button>` : ''}
            </td>
        `;
        tbody.appendChild(tr);
    });
}

function abrirNuevoClientePres() {
    document.getElementById('modal-titulo-cli').textContent = 'Nuevo Cliente';
    document.getElementById('form-cliente').reset();
    document.getElementById('cli-id').value = '';
    new bootstrap.Modal(document.getElementById('modal-cliente')).show();
}

window.abrirEditarClientePres = function(id) {
    const c = obtenerDatos(CLAVE_CLIENTES_PRES).find(x => x.id === id);
    if (!c) return;
    document.getElementById('modal-titulo-cli').textContent = 'Editar Cliente';
    document.getElementById('cli-id').value = c.id;
    document.getElementById('cli-cedula').value = c.cedula;
    document.getElementById('cli-nombre').value = c.nombre;
    document.getElementById('cli-telefono').value = c.telefono || '';
    document.getElementById('cli-email').value = c.email || '';
    document.getElementById('cli-direccion').value = c.direccion || '';
    new bootstrap.Modal(document.getElementById('modal-cliente')).show();
};

function guardarClientePres() {
    const id = document.getElementById('cli-id').value;
    const obj = {
        cedula: document.getElementById('cli-cedula').value.trim(),
        nombre: document.getElementById('cli-nombre').value.trim(),
        telefono: document.getElementById('cli-telefono').value.trim(),
        email: document.getElementById('cli-email').value.trim(),
        direccion: document.getElementById('cli-direccion').value.trim()
    };
    if (obj.nombre.length < 3) {
        alertaError('El nombre del cliente debe tener al menos 3 letras.'); return;
    }
    // Validar rango de cédula paraguaya
    const numCedula = parseInt(obj.cedula);
    if (isNaN(numCedula) || numCedula < 100000 || numCedula > 20000000) {
        alertaError('La cédula debe ser un número entre 100.000 y 20.000.000.'); return;
    }
    // Validar formato teléfono paraguayo
    if (obj.telefono) {
        const telRegex = /^09\d{8}$/;
        if (!telRegex.test(obj.telefono)) {
            alertaError('El teléfono debe tener formato paraguayo: 09XXXXXXXX (10 dígitos, sin guiones).'); return;
        }
    }
    const lista = obtenerDatos(CLAVE_CLIENTES_PRES);
    if (lista.find(x => x.cedula === obj.cedula && x.id !== parseInt(id))) { alertaError('Ya existe un cliente con esa cédula.'); return; }
    if (lista.find(x => x.nombre.toLowerCase() === obj.nombre.toLowerCase() && x.id !== parseInt(id))) { alertaError('Ya existe un cliente con ese nombre.'); return; }
    if (id) {
        const idx = lista.findIndex(x => x.id === parseInt(id));
        lista[idx] = { ...lista[idx], ...obj };
    } else {
        lista.push({ id: generarId(lista), ...obj });
    }
    guardarDatos(CLAVE_CLIENTES_PRES, lista);
    bootstrap.Modal.getInstance(document.getElementById('modal-cliente')).hide();
    cargarTabPresupuestos('clientes');
    alertaExito('Cliente guardado.');
}

window.eliminarClientePres = async function(id) {
    const c = obtenerDatos(CLAVE_CLIENTES_PRES).find(x => x.id === id);
    if (!c || !(await confirmarEliminar(c.nombre))) return;
    guardarDatos(CLAVE_CLIENTES_PRES, obtenerDatos(CLAVE_CLIENTES_PRES).filter(x => x.id !== id));
    cargarTabPresupuestos('clientes');
    alertaExito('Cliente eliminado.');
};

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
    if (cat.nombre.length < 3) {
        alertaError('El nombre de la categoría debe tener al menos 3 letras.');
        return;
    }
    // Validar nombre duplicado
    if (lista.find(x => x.nombre.toLowerCase() === cat.nombre.toLowerCase() && x.id !== parseInt(id))) {
        alertaError('Ya existe una categoría de presupuesto con ese nombre.');
        return;
    }
    if (id) {
        actualizarDato(CLAVE_CATEGORIAS_PRES, parseInt(id), cat);
        Swal.fire('Actualizado', 'Categoría actualizada exitosamente', 'success');
    } else {
        crearDato(CLAVE_CATEGORIAS_PRES, cat);
        Swal.fire('Guardado', 'Categoría registrada exitosamente', 'success');
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
        new bootstrap.Modal(document.getElementById('modal-categoria')).show();
    }
};

/* =========================================
   PRESUPUESTOS
========================================= */
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

function abrirNuevoPresupuesto() {
    detallePresupuesto = [];
    document.getElementById('form-presupuesto').reset();
    document.getElementById('pres-fecha').value = fechaHoy();
    document.getElementById('presupuesto-total').textContent = formatearMoneda(0);
    renderDetallePresupuesto();
    poblarSelectClientesPres();
    poblarSelectCategoriasPres();
    
    const selectItem = document.getElementById('pres-item-select');
    if(selectItem) {
        selectItem.innerHTML = '<option value="">-- Seleccione Categoría Primero --</option>';
        selectItem.disabled = true;
    }
    
    new bootstrap.Modal(document.getElementById('modal-presupuesto')).show();
}

function agregarItemPresupuesto() {
    const selectItem = document.getElementById('pres-item-select');
    if (!selectItem || !selectItem.value) {
        Swal.fire({ icon: 'warning', title: 'Atención', text: 'Debe seleccionar un artículo o servicio.' });
        return;
    }
    const option = selectItem.options[selectItem.selectedIndex];
    const desc = option.text;
    const precio = parseFloat(option.dataset.precio);
    const iva = parseFloat(option.dataset.iva || 10);
    const cant = parseFloat(document.getElementById('pres-item-cant').value);

    if (isNaN(cant) || cant <= 0 || isNaN(precio) || precio < 1) {
        Swal.fire({ icon: 'warning', title: 'Atención', text: 'Ingrese una cantidad y precio válidos.' });
        return;
    }

    if (selectItem.value.startsWith('A-')) {
        const stock = parseFloat(option.dataset.stock);
        if (cant > stock) {
            Swal.fire({ icon: 'warning', title: 'Stock Insuficiente', text: `La cantidad solicitada (${cant}) supera el stock disponible (${stock}).` });
            return;
        }
    }

    detallePresupuesto.push({
        descripcion: desc,
        cantidad: cant,
        precio: precio,
        iva: iva,
        subtotal: cant * precio
    });

    renderDetallePresupuesto();
    selectItem.value = '';
    const stockInput = document.getElementById('pres-item-stock');
    if(stockInput) stockInput.value = '';
    document.getElementById('pres-item-cant').value = '1';
    document.getElementById('pres-item-precio').value = '';
    selectItem.focus();
}

function renderDetallePresupuesto() {
    const tbody = document.getElementById('presupuesto-detalle-body');
    tbody.innerHTML = '';
    let total = 0;
    
    detallePresupuesto.forEach((item, index) => {
        total += item.subtotal;
        tbody.insertAdjacentHTML('beforeend', `
            <tr>
                <td>${index + 1}</td>
                <td>${item.descripcion}</td>
                <td>${item.cantidad}</td>
                <td>${formatearMoneda(item.precio)}</td>
                <td>${item.iva}%</td>
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
        Swal.fire({ icon: 'warning', title: 'Atención', text: 'Debe agregar al menos un ítem al presupuesto.' });
        return;
    }

    const clienteId = document.getElementById('pres-cliente').value;
    const catId = document.getElementById('pres-categoria').value;
    const clienteObj = obtenerDatos('clientes_tecnorivas').find(c => c.id == clienteId);
    const catObj = obtenerDatos(CLAVE_CATEGORIAS_PRES).find(c => c.id == catId);
    
    const presupuestos = obtenerDatos(CLAVE_PRESUPUESTOS);
    const numero = `P-${String(presupuestos.length + 1).padStart(4, '0')}`;
    const total = detallePresupuesto.reduce((s, i) => s + i.subtotal, 0);

    const nuevoPres = {
        numero,
        fecha: document.getElementById('pres-fecha').value,
        clienteId: parseInt(clienteId),
        clienteNombre: clienteObj ? clienteObj.nombre : 'Desconocido',
        categoriaId: parseInt(catId),
        categoriaNombre: catObj ? catObj.nombre : 'General',
        detalle: [...detallePresupuesto],
        total,
        estado: 'pendiente', // pendiente, aprobado, rechazado, cobrado
        creadoPor: obtenerSesion() ? obtenerSesion().nombre : 'Sistema'
    };

    crearDato(CLAVE_PRESUPUESTOS, nuevoPres);
    Swal.fire({ icon: 'success', title: 'Éxito', text: `Presupuesto ${numero} registrado correctamente.` });
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
            let badgeColor = (p.estado === 'pendiente' || p.estado === 'emitido') ? 'bg-warning text-dark' : (p.estado === 'aprobado' ? 'bg-info' : (p.estado === 'cobrado' ? 'bg-success' : 'bg-danger'));
            const esCajero = sesion && sesion.rol === 'cajero';
            
            tbody.insertAdjacentHTML('beforeend', `
                <tr>
                    <td class="fw-bold">${p.numero}</td>
                    <td>${formatearFecha(p.fecha)}</td>
                    <td>${p.clienteNombre}</td>
                    <td>${p.categoriaNombre}</td>
                    <td class="fw-bold">${formatearMoneda(p.total)}</td>
                    <td><span class="badge ${badgeColor}">${p.estado.toUpperCase()}</span></td>
                    <td>
                        <button class="btn btn-sm btn-outline-info me-1" onclick="verPresupuesto(${p.id})" title="Ver Detalle"><i class="bi bi-eye"></i></button>
                        ${(esAdmin || !esCajero) && (p.estado === 'pendiente' || p.estado === 'emitido') ? `<button class="btn btn-sm btn-outline-primary me-1" onclick="cambiarEstadoPresupuesto(${p.id}, 'aprobado')" title="Aprobar"><i class="bi bi-check-lg"></i></button>` : ''}
                        ${(esAdmin || esCajero) && p.estado === 'aprobado' ? `<button class="btn btn-sm btn-success me-1" onclick="cobrarPresupuesto(${p.id})" title="Cobrar"><i class="bi bi-cash-coin"></i></button>` : ''}
                        ${(esAdmin || !esCajero) && (p.estado === 'pendiente' || p.estado === 'emitido') ? `<button class="btn btn-sm btn-outline-danger me-1" onclick="cambiarEstadoPresupuesto(${p.id}, 'rechazado')" title="Rechazar"><i class="bi bi-x-lg"></i></button>` : ''}
                        ${esAdmin ? `<button class="btn btn-sm btn-outline-danger" onclick="eliminarDato('${CLAVE_PRESUPUESTOS}', ${p.id}, () => cargarTabPresupuestos('lista'))" title="Eliminar"><i class="bi bi-trash3"></i></button>` : ''}
                    </td>
                </tr>
            `);
        });
    }
}

window.verPresupuesto = function(id) {
    const pres = obtenerDatos(CLAVE_PRESUPUESTOS).find(p => p.id === id);
    if (!pres) return;
    let tableItems = pres.detalle.map(i => `<tr><td>${i.descripcion}</td><td>${i.cantidad}</td><td>${formatearMoneda(i.precio)}</td><td>${i.iva ? i.iva + '%' : '10%'}</td><td>${formatearMoneda(i.subtotal)}</td></tr>`).join('');
    
    Swal.fire({
        title: `Presupuesto ${pres.numero}`,
        html: `
            <div style="text-align:left; font-size:14px;">
                <p><strong>Cliente:</strong> ${pres.clienteNombre}</p>
                <p><strong>Fecha:</strong> ${formatearFecha(pres.fecha)}</p>
                <p><strong>Categoría:</strong> ${pres.categoriaNombre}</p>
                <hr>
                <table class="table table-sm">
                    <thead><tr><th>Desc.</th><th>Cant.</th><th>Precio</th><th>IVA</th><th>Total</th></tr></thead>
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
    alertaExito(`Presupuesto actualizado a ${nuevoEstado}.`);
};

window.cobrarPresupuesto = async function(id) {
    const presupuestos = obtenerDatos(CLAVE_PRESUPUESTOS);
    const idx = presupuestos.findIndex(p => p.id === id);
    if (idx === -1) return;
    
    const p = presupuestos[idx];
    
    const cajas = obtenerDatos('cajas_tecnorivas');
    const idxCaja = cajas.findIndex(c => c.estado === 'abierta');
    if (idxCaja === -1) {
        alertaError('No hay ninguna caja abierta. Abra la caja primero antes de cobrar.');
        return;
    }
    
    if (!(await confirmarAccion(`¿Registrar cobro de ${formatearMoneda(p.total)} en la caja actual?`, `Cobrar ${p.numero}`))) return;
    
    // Registrar el ingreso en la caja activa
    const mov = {
        hora: fechaHoraAhora(),
        tipo: 'ingreso',
        concepto: `Cobro Presupuesto ${p.numero}`,
        monto: p.total
    };
    cajas[idxCaja].movimientos.push(mov);
    cajas[idxCaja].ingresos += p.total;
    guardarDatos('cajas_tecnorivas', cajas);
    
    // Cambiar el estado del presupuesto
    presupuestos[idx].estado = 'cobrado';
    guardarDatos(CLAVE_PRESUPUESTOS, presupuestos);
    cargarTabPresupuestos('lista');
    Swal.fire('Cobro Exitoso', 'El monto ha sido ingresado a la caja.', 'success');
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
    if (index !== -1) {
        lista[index] = { ...lista[index], ...nuevosDatos };
        guardarDatos(clave, lista);
    }
}

window.eliminarDato = function(clave, id, callbackRender) {
    confirmarEliminar('este registro').then(conf => {
        if (conf) {
            let lista = obtenerDatos(clave);
            lista = lista.filter(i => i.id !== id);
            guardarDatos(clave, lista);
            if (callbackRender) callbackRender();
            Swal.fire('Eliminado', 'El registro ha sido eliminado', 'success');
        }
    });
};

function configurarExportarImprimirPresupuestos() {
    ['clientes', 'categorias', 'lista'].forEach(tab => {
        const btnExp = document.getElementById(`btn-exportar-${tab}`);
        const btnImp = document.getElementById(`btn-imprimir-${tab}`);
        const btnPdf = document.getElementById(`btn-pdf-${tab}`);
        const titulos = { clientes: 'Clientes', categorias: 'Categorías de Trabajos', lista: 'Presupuestos' };
        if (btnExp) btnExp.addEventListener('click', () => {
            const cols = {
                clientes: [{ key: 'cedula', label: 'Cédula' }, { key: 'nombre', label: 'Nombre' }, { key: 'telefono', label: 'Teléfono' }, { key: 'email', label: 'Email' }],
                categorias: [{ key: 'nombre', label: 'Nombre' }, { key: 'descripcion', label: 'Descripción' }],
                lista: [{ key: 'numero', label: 'N°' }, { key: 'fecha', label: 'Fecha' }, { key: 'clienteNombre', label: 'Cliente' }, { key: 'categoriaNombre', label: 'Categoría' }, { key: 'total', label: 'Total' }, { key: 'estado', label: 'Estado' }]
            };
            exportarExcel(filteredPresupuestos[tab], tab, cols[tab]);
        });
        if (btnImp) btnImp.addEventListener('click', () => imprimirTabla(titulos[tab], `tabla-body-${tab}`));
        if (btnPdf) btnPdf.addEventListener('click', () => generarPDF(titulos[tab]));
    });
}

