const CLAVE_CATEGORIAS_PRES = 'categorias_presupuestos';
const CLAVE_PRESUPUESTOS = 'presupuestos_tecnorivas';

const PANELES_PRESUPUESTOS = ['categorias', 'lista'];
let tabActivoPresupuestos = 'categorias';
let paginadoresPresupuestos = {};
let filteredPresupuestos = { categorias: [], lista: [] };

let detallePresupuesto = [];
let selectBuscadorPresCliente, selectBuscadorPresCat;

document.addEventListener('DOMContentLoaded', () => {
    const sesion = protegerPagina();
    if (!sesion) return;

    if (!localStorage.getItem(CLAVE_CATEGORIAS_PRES)) {
        localStorage.setItem(CLAVE_CATEGORIAS_PRES, JSON.stringify([
            { id: 1, nombre: 'Refrigeración', descripcion: 'Servicios de aire acondicionado y refrigeración' },
            { id: 2, nombre: 'Electricidad', descripcion: 'Instalaciones y reparaciones eléctricas' },
            { id: 3, nombre: 'Construcción', descripcion: 'Obras y remodelaciones' }
        ]));
    }
    if (!localStorage.getItem(CLAVE_PRESUPUESTOS)) localStorage.setItem(CLAVE_PRESUPUESTOS, '[]');

    PANELES_PRESUPUESTOS.forEach(tab => {
        paginadoresPresupuestos[tab] = new Paginador(`tabla-body-${tab}`, `paginacion-${tab}`, 10);
    });

    inicializarPaneles(PANELES_PRESUPUESTOS, 'categorias', cargarTabPresupuestos);

    // Inicializar SelectBuscador
    selectBuscadorPresCliente = new SelectBuscador('pres-cliente');
    selectBuscadorPresCat = new SelectBuscador('pres-categoria');

    configurarBusquedoresPresupuestos();
    configurarBotonesNuevosPresupuestos();
    configurarFormulariosPresupuestos();
});

function cargarTabPresupuestos(tab) {
    let datos = obtenerDatos(tab === 'categorias' ? CLAVE_CATEGORIAS_PRES : CLAVE_PRESUPUESTOS);
    if (tab === 'lista') datos = [...datos].sort((a,b) => b.id - a.id);
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
                const datos = obtenerDatos(modulo === 'categorias' ? CLAVE_CATEGORIAS_PRES : CLAVE_PRESUPUESTOS);
                filteredPresupuestos[modulo] = datos.filter(item => {
                    if (modulo === 'categorias') return item.nombre.toLowerCase().includes(query);
                    if (modulo === 'lista') return item.numero.toLowerCase().includes(query) || (item.clienteNombre && item.clienteNombre.toLowerCase().includes(query));
                    return false;
                });
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
        new bootstrap.Modal(document.getElementById('modal-categoria')).show();
    });

    const btnPres = document.getElementById('btn-nuevo-presupuesto');
    if (btnPres) btnPres.addEventListener('click', abrirNuevoPresupuesto);
    
    const btnAddItem = document.getElementById('btn-add-item-pres');
    if (btnAddItem) btnAddItem.addEventListener('click', agregarItemPresupuesto);
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
   CATEGORÍAS DE PRESUPUESTOS
========================================= */
function renderFilaCategoriasPres(lista, tbody) {
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
                        <button class="btn-icon btn-delete" onclick="eliminarDato('${CLAVE_CATEGORIAS_PRES}', ${cat.id}, () => cargarTabPresupuestos('categorias'))" title="Eliminar"><i class="bi bi-trash"></i></button>
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

    if (isNaN(cant) || cant <= 0 || isNaN(precio) || precio < 0) {
        Swal.fire({ icon: 'warning', title: 'Atención', text: 'Ingrese una cantidad válida.' });
        return;
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
        estado: 'emitido', // emitido, aprobado, rechazado
        creadoPor: obtenerSesion() ? obtenerSesion().nombre : 'Sistema'
    };

    crearDato(CLAVE_PRESUPUESTOS, nuevoPres);
    Swal.fire({ icon: 'success', title: 'Éxito', text: `Presupuesto ${numero} registrado correctamente.` });
    bootstrap.Modal.getInstance(document.getElementById('modal-presupuesto')).hide();
    cargarTabPresupuestos('lista');
}

function renderFilaListaPresupuestos(lista, tbody) {
    if (lista.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" class="text-center text-muted">No hay presupuestos registrados</td></tr>';
    } else {
        lista.forEach(p => {
            let badgeColor = p.estado === 'emitido' ? 'bg-info' : (p.estado === 'aprobado' ? 'bg-success' : 'bg-danger');
            tbody.insertAdjacentHTML('beforeend', `
                <tr>
                    <td class="fw-bold">${p.numero}</td>
                    <td>${formatearFecha(p.fecha)}</td>
                    <td>${p.clienteNombre}</td>
                    <td>${p.categoriaNombre}</td>
                    <td class="fw-bold">${formatearMoneda(p.total)}</td>
                    <td><span class="badge ${badgeColor}">${p.estado.toUpperCase()}</span></td>
                    <td>
                        <button class="btn-icon btn-edit" onclick="verPresupuesto(${p.id})" title="Ver Detalle"><i class="bi bi-eye"></i></button>
                        <button class="btn-icon btn-delete" onclick="eliminarDato('${CLAVE_PRESUPUESTOS}', ${p.id}, () => cargarTabPresupuestos('lista'))" title="Eliminar"><i class="bi bi-trash"></i></button>
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
