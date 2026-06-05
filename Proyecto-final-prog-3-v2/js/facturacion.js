/**
 * facturacion.js - Módulo de Facturación
 */

const CLAVE_FACTURAS = 'facturas_tecnorivas';

let paginadorFacturas;
let filteredFacturas = [];
let selectBuscadorFiltroCliente;

document.addEventListener('DOMContentLoaded', () => {
    const sesion = protegerPagina();
    if (!sesion) return;

    if (!localStorage.getItem(CLAVE_FACTURAS)) localStorage.setItem(CLAVE_FACTURAS, '[]');

    paginadorFacturas = new Paginador('tabla-body-facturas', 'paginacion-facturas', 15);
    
    configurarFiltrosFacturacion();
    cargarFacturas();
    configurarBuscadorFacturas();
    configurarNuevaFacturaSPA();
    verificarPresupuestoRedirigido();
    inicializarControlesItemsNuevaFactura();
});

let nuevaFacturaDetalles = [];
let nuevaFacturaTotal = 0;
let mediosPagoContado = [];

function obtenerFacturas() {
    return obtenerDatos(CLAVE_FACTURAS);
}

function guardarFacturas(facturas) {
    guardarDatos(CLAVE_FACTURAS, facturas);
}

function obtenerFacturasFiltradas(lista) {
    const query = document.getElementById('buscador-facturas')?.value.toLowerCase() || '';
    const desde = document.getElementById('filtro-fecha-desde')?.value || '';
    const hasta = document.getElementById('filtro-fecha-hasta')?.value || '';
    const condicion = document.getElementById('filtro-condicion')?.value || '';
    const clienteId = document.getElementById('filtro-cliente')?.value || '';
    const estadoCobro = document.getElementById('filtro-estado-cobro')?.value || '';
    
    return lista.filter(f => {
        if (query) {
            const matchesQuery = f.numero.toLowerCase().includes(query) || 
                                 (f.presupuesto_numero && f.presupuesto_numero.toLowerCase().includes(query)) ||
                                 f.cliente_nombre.toLowerCase().includes(query);
            if (!matchesQuery) return false;
        }
        
        if (desde) {
            if (f.fecha < desde) return false;
        }
        if (hasta) {
            if (f.fecha > hasta) return false;
        }
        
        if (condicion) {
            if (f.forma_pago !== condicion) return false;
        }
        
        if (clienteId) {
            if (f.cliente_id != clienteId) return false;
        }
        
        if (estadoCobro) {
            const cobrado = f.estadoPago === 'pagada' || f.estado === 'pagada' || (f.total_pagado >= f.total);
            if (estadoCobro === 'saldo' && cobrado) return false;
            if (estadoCobro === 'cobrado' && !cobrado) return false;
        }
        
        return true;
    });
}

function poblarFiltroClientes() {
    const select = document.getElementById('filtro-cliente');
    if (!select) return;
    
    const valPrevio = select.value;
    select.innerHTML = '<option value="">Todos los Clientes</option>';
    
    const clientes = obtenerDatos('clientes_tecnorivas') || [];
    clientes.forEach(c => {
        select.insertAdjacentHTML('beforeend', `<option value="${c.id}">${c.nombre}</option>`);
    });
    
    select.value = valPrevio;
    
    if (selectBuscadorFiltroCliente) {
        selectBuscadorFiltroCliente.actualizar();
    }
}

function configurarFiltrosFacturacion() {
    poblarFiltroClientes();
    
    // Inicializar SelectBuscador para el filtro de clientes
    selectBuscadorFiltroCliente = new SelectBuscador('filtro-cliente');
    if (selectBuscadorFiltroCliente) {
        selectBuscadorFiltroCliente.actualizar();
    }
    
    const filtros = ['filtro-fecha-desde', 'filtro-fecha-hasta', 'filtro-condicion', 'filtro-cliente', 'filtro-estado-cobro'];
    filtros.forEach(fId => {
        document.getElementById(fId)?.addEventListener('change', () => cargarFacturas());
    });
    
    document.getElementById('btn-limpiar-filtros')?.addEventListener('click', () => {
        filtros.forEach(fId => {
            const el = document.getElementById(fId);
            if (el) el.value = '';
        });
        if (selectBuscadorFiltroCliente) {
            selectBuscadorFiltroCliente.actualizar();
        }
        const buscador = document.getElementById('buscador-facturas');
        if (buscador) buscador.value = '';
        cargarFacturas();
    });
    
    let mostrandoTodosDetalles = false;
    document.getElementById('btn-toggle-detalles')?.addEventListener('click', () => {
        mostrandoTodosDetalles = !mostrandoTodosDetalles;
        document.querySelectorAll('.detalle-row').forEach(row => {
            if (mostrandoTodosDetalles) {
                row.classList.remove('d-none');
            } else {
                row.classList.add('d-none');
            }
        });
        document.querySelectorAll('.btn-toggle-row-detalle i').forEach(icon => {
            if (mostrandoTodosDetalles) {
                icon.className = 'bi bi-chevron-up';
            } else {
                icon.className = 'bi bi-chevron-down';
            }
        });
    });
    
    document.getElementById('btn-exportar-excel-fac')?.addEventListener('click', () => {
        let facturas = obtenerFacturas().filter(f => f.estado !== 'borrador');
        let filtradas = obtenerFacturasFiltradas(facturas);
        
        const cols = [
            { key: 'numero', label: 'N° Factura' },
            { key: 'presupuesto_numero', label: 'N° Presupuesto' },
            { key: 'fecha', label: 'Fecha Emisión' },
            { key: 'cliente_nombre', label: 'Cliente' },
            { key: 'total', label: 'Total' },
            { key: 'forma_pago', label: 'Condición' },
            { key: 'estado', label: 'Estado' }
        ];
        exportarExcel(filtradas, 'Facturas_Emitidas', cols);
    });

    document.getElementById('btn-exportar-pdf-fac')?.addEventListener('click', () => {
        let facturas = obtenerFacturas().filter(f => f.estado !== 'borrador');
        let filtradas = obtenerFacturasFiltradas(facturas);
        
        const cols = [
            { key: 'numero', label: 'N° Factura' },
            { key: 'presupuesto_numero', label: 'N° Presupuesto' },
            { key: 'fecha', label: 'Fecha' },
            { key: 'cliente_nombre', label: 'Cliente' },
            { key: 'total', label: 'Total' },
            { key: 'forma_pago', label: 'Condición' },
            { key: 'estado', label: 'Estado' }
        ];
        const exportData = filtradas.map(f => ({
            ...f,
            total: formatearMoneda(f.total),
            forma_pago: f.forma_pago.toUpperCase(),
            estado: f.estado.toUpperCase()
        }));
        
        generarPDF('Listado de Facturación', exportData, cols);
    });
}

window.toggleDetalleFila = function(id) {
    const row = document.getElementById(`detalle-fac-${id}`);
    const btn = document.querySelector(`.btn-toggle-row-detalle[data-id="${id}"] i`);
    if (row) {
        if (row.classList.contains('d-none')) {
            row.classList.remove('d-none');
            if (btn) btn.className = 'bi bi-chevron-up';
        } else {
            row.classList.add('d-none');
            if (btn) btn.className = 'bi bi-chevron-down';
        }
    }
};

function obtenerFilaDetalleHtml(f) {
    const itemsHtml = f.items.map(item => `
        <tr>
            <td>${item.tipoItem === 'articulo' ? 'Art' : 'Srv'}</td>
            <td>${item.descripcion}</td>
            <td>${item.cantidad}</td>
            <td>${formatearMoneda(item.precio)}</td>
            <td class="fw-bold">${formatearMoneda(item.subtotal)}</td>
        </tr>
    `).join('');
    
    return `
        <tr class="detalle-row d-none" id="detalle-fac-${f.id}">
            <td colspan="9" class="bg-light p-3">
                <div class="border rounded p-2 bg-white shadow-sm">
                    <h6 class="fw-bold mb-2 text-primary" style="font-size: 0.9rem;"><i class="bi bi-list-task me-1"></i>Detalle de Artículos y Servicios:</h6>
                    <table class="table table-sm table-bordered mb-0" style="font-size: 0.85rem;">
                        <thead class="table-light">
                            <tr>
                                <th style="width: 80px;">Tipo</th>
                                <th>Descripción</th>
                                <th style="width: 80px;">Cant.</th>
                                <th style="width: 150px;">Precio Unit.</th>
                                <th style="width: 150px;">Subtotal</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${itemsHtml}
                        </tbody>
                    </table>
                </div>
            </td>
        </tr>
    `;
}

function cargarFacturas() {
    let facturas = obtenerFacturas();
    facturas.sort((a, b) => b.id - a.id);
    
    let emitidas = facturas.filter(f => f.estado === 'emitida' && f.estadoPago !== 'pagada');
    let historial = facturas.filter(f => f.estado === 'anulada' || f.estadoPago === 'pagada' || f.estado === 'pagada');
    let borradores = facturas.filter(f => f.estado === 'borrador');
    
    emitidas = obtenerFacturasFiltradas(emitidas);
    historial = obtenerFacturasFiltradas(historial);
    
    filteredFacturas = emitidas;
    const el = document.getElementById('contador-facturas');
    if (el) el.textContent = `${emitidas.length} factura(s)`;
    
    paginadorFacturas.setDatos(emitidas, renderFilasFacturas);
    renderBorradores(borradores);
    renderHistorial(historial);
}

function renderHistorial(lista) {
    const cont = document.getElementById('tabla-body-historial');
    if (!cont) return;
    if (lista.length === 0) {
        cont.innerHTML = `<tr><td colspan="9" class="text-center text-muted py-3">No hay facturas en el historial</td></tr>`;
        return;
    }
    
    cont.innerHTML = '';
    lista.forEach(f => {
        let spanEstado = '';
        if (f.estado === 'anulada') {
            spanEstado = `<span class="badge bg-danger">ANULADA</span>`;
        } else {
            spanEstado = `<span class="badge bg-success">PAGADA</span>`;
        }
        
        cont.insertAdjacentHTML('beforeend', `
            <tr>
                <td>
                    <button class="btn btn-sm btn-icon btn-toggle-row-detalle" data-id="${f.id}" onclick="toggleDetalleFila(${f.id})" style="border:none; background:none; padding: 0 5px;">
                        <i class="bi bi-chevron-down"></i>
                    </button>
                </td>
                <td class="fw-bold">${f.numero}</td>
                <td>${f.presupuesto_numero || '-'}</td>
                <td>${formatearFecha(f.fecha)}</td>
                <td>${f.cliente_nombre}</td>
                <td class="fw-bold text-primary">${formatearMoneda(f.total)}</td>
                <td><span class="badge bg-secondary">${f.forma_pago.toUpperCase()}</span></td>
                <td>${spanEstado}</td>
                <td>
                    <button class="btn btn-sm btn-outline-primary" onclick="verDetalleFactura(${f.id})" title="Ver Detalles"><i class="bi bi-eye"></i></button>
                    <button class="btn btn-sm btn-outline-danger" onclick="generarPDFFacturaIndividual(${f.id})" title="PDF"><i class="bi bi-file-earmark-pdf"></i></button>
                </td>
            </tr>
        `);
        
        cont.insertAdjacentHTML('beforeend', obtenerFilaDetalleHtml(f));
    });
}

function configurarBuscadorFacturas() {
    const input = document.getElementById('buscador-facturas');
    if (input) {
        input.addEventListener('input', () => {
            cargarFacturas();
        });
    }
}

function renderBorradores(lista) {
    const cont = document.getElementById('tabla-body-borradores');
    if (!cont) return;
    if (lista.length === 0) {
        cont.innerHTML = `<tr><td colspan="5" class="text-center text-muted py-3">No hay borradores</td></tr>`;
        return;
    }
    cont.innerHTML = '';
    lista.forEach(b => {
        cont.insertAdjacentHTML('beforeend', `
            <tr>
                <td class="fw-bold">${b.numero}</td>
                <td>${b.cliente_nombre}</td>
                <td>${formatearFecha(b.fecha)}</td>
                <td class="fw-bold">${formatearMoneda(b.total)}</td>
                <td>
                    <button class="btn btn-sm btn-outline-primary me-1" onclick="continuarBorrador(${b.id})" title="Continuar Edición"><i class="bi bi-pencil"></i></button>
                    <button class="btn btn-sm btn-outline-danger" onclick="eliminarDato('${CLAVE_FACTURAS}', ${b.id}, cargarFacturas)" title="Eliminar"><i class="bi bi-trash"></i></button>
                </td>
            </tr>
        `);
    });
}

function renderFilasFacturas(lista, cont) {
    const sesion = obtenerSesion();
    const esAdmin = sesion && (sesion.rol === 'admin' || sesion.rol === 'superusuario');
    
    if (lista.length === 0) {
        cont.innerHTML = `<tr><td colspan="9" class="text-center text-muted py-4"><i class="bi bi-receipt fs-3 d-block mb-2"></i>Sin facturas emitidas</td></tr>`;
        return;
    }
    
    lista.forEach(f => {
        let badgeColor = 'bg-secondary';
        let estadoStr = f.estado.toUpperCase().replace('_', ' ');
        if (f.estado === 'pagada') badgeColor = 'bg-success';
        else if (f.estado === 'anulada') badgeColor = 'bg-danger';
        else if (f.estado === 'pendiente_pago') badgeColor = 'bg-warning text-dark';
        else if (f.estado === 'parcialmente_pagada') badgeColor = 'bg-info text-dark';
        
        const condBadge = f.forma_pago === 'credito' ? '<span class="badge bg-warning text-dark">Crédito</span>' : '<span class="badge bg-primary">Contado</span>';
        
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>
                <button class="btn btn-sm btn-icon btn-toggle-row-detalle" data-id="${f.id}" onclick="toggleDetalleFila(${f.id})" style="border:none; background:none; padding: 0 5px;">
                    <i class="bi bi-chevron-down"></i>
                </button>
            </td>
            <td><strong>${f.numero}</strong></td>
            <td>${f.presupuesto_numero || '-'}</td>
            <td>${formatearFecha(f.fecha)}</td>
            <td>${f.cliente_nombre}</td>
            <td class="fw-bold">${formatearMoneda(f.total)}</td>
            <td>${condBadge}</td>
            <td><span class="badge ${badgeColor}">${estadoStr}</span></td>
            <td>
                ${(f.forma_pago === 'contado' && (f.estado === 'pendiente_pago' || f.estado === 'parcialmente_pagada')) ? `<button class="btn btn-sm btn-success me-1 btn-cobrar" data-id="${f.id}" title="Cobrar Factura"><i class="bi bi-cash-coin"></i></button>` : ''}
                <button class="btn btn-sm btn-outline-info me-1 btn-ver" data-id="${f.id}" title="Ver Detalle"><i class="bi bi-eye"></i></button>
                <button class="btn btn-sm btn-outline-danger me-1 btn-pdf" data-id="${f.id}" title="Imprimir Factura"><i class="bi bi-printer"></i></button>
                ${(esAdmin && f.estado !== 'anulada') ? `<button class="btn btn-sm btn-danger btn-anular" data-id="${f.id}" title="Anular Factura"><i class="bi bi-x-circle"></i></button>` : ''}
            </td>
        `;
        cont.appendChild(tr);
        
        cont.insertAdjacentHTML('beforeend', obtenerFilaDetalleHtml(f));
    });

    document.querySelectorAll('.btn-ver').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const id = parseInt(e.currentTarget.dataset.id);
            verFactura(id);
        });
    });

    document.querySelectorAll('.btn-pdf').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const id = parseInt(e.currentTarget.dataset.id);
            generarPDFFacturaIndividual(id);
        });
    });

    document.querySelectorAll('.btn-anular').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const id = parseInt(e.currentTarget.dataset.id);
            anularFactura(id);
        });
    });

    document.querySelectorAll('.btn-cobrar').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const id = parseInt(e.currentTarget.dataset.id);
            abrirModalCobrarFactura(id);
        });
    });
}

// Removida duplicación de configurarBuscadorFacturas



window.verFactura = function(id) {
    const facturas = obtenerFacturas();
    const f = facturas.find(x => x.id === id);
    if (!f) return;
    
    let tableItems = f.items.map(i => `<tr><td>${i.descripcion}</td><td>${i.cantidad}</td><td>${formatearMoneda(i.precio)}</td><td>${i.iva ? i.iva + '%' : '10%'}</td><td>${formatearMoneda(i.subtotal)}</td></tr>`).join('');
    
    Swal.fire({
        title: `Factura ${f.numero}`,
        html: `
            <div style="text-align:left; font-size:14px;">
                <p><strong>Cliente:</strong> ${f.cliente_nombre}</p>
                <p><strong>Fecha Emisión:</strong> ${formatearFecha(f.fecha)}</p>
                <p><strong>Condición:</strong> ${f.forma_pago.toUpperCase()}</p>
                <p><strong>Estado:</strong> ${f.estado.toUpperCase()}</p>
                <p><strong>Presupuesto Origen:</strong> ${f.presupuesto_numero || 'N/A'}</p>
                <hr>
                <table class="table table-sm">
                    <thead><tr><th>Desc.</th><th>Cant.</th><th>Precio</th><th>IVA</th><th>Total</th></tr></thead>
                    <tbody>${tableItems}</tbody>
                </table>
                <h5 class="text-end fw-bold mt-2">Total: ${formatearMoneda(f.total)}</h5>
            </div>
        `,
        width: '600px',
        confirmButtonText: 'Cerrar'
    });
};

window.abrirModalCobrarFactura = function(id) {
    const facturas = obtenerFacturas();
    const f = facturas.find(x => x.id === id);
    if (!f) return;

    // Obtener caja abierta
    const cajas = obtenerDatos('cajas_tecnorivas') || [];
    const cajaAbierta = cajas.find(c => c.estado === 'abierta');
    if (!cajaAbierta) {
        alertaError('Debe abrir la caja antes de registrar un cobro.');
        return;
    }

    const totalPagado = f.total_pagado || 0;
    const pendiente = f.total - totalPagado;

    document.getElementById('cobro-factura-id').value = f.id;
    document.getElementById('cobro-factura-info').textContent = `${f.numero} - ${f.cliente_nombre}`;
    document.getElementById('cobro-factura-pendiente').textContent = formatearMoneda(pendiente);
    
    const inputMonto = document.getElementById('cobro-factura-monto');
    inputMonto.value = pendiente;
    inputMonto.max = pendiente;

    document.getElementById('form-cobrar-factura').reset();
    inputMonto.value = pendiente; // re-set after reset

    bootstrap.Modal.getOrCreateInstance(document.getElementById('modal-cobrar-factura')).show();
};

function configurarCobroFacturas() {
    const formCobrar = document.getElementById('form-cobrar-factura');
    if (formCobrar) {
        formCobrar.addEventListener('submit', async (e) => {
            e.preventDefault();
            const id = parseInt(document.getElementById('cobro-factura-id').value);
            const monto = parseFloat(document.getElementById('cobro-factura-monto').value);
            const metodo = document.getElementById('cobro-factura-metodo').value;

            const facturas = obtenerFacturas();
            const idx = facturas.findIndex(x => x.id === id);
            if (idx === -1) return;
            const f = facturas[idx];

            const totalPagado = f.total_pagado || 0;
            const pendiente = f.total - totalPagado;

            if (monto > pendiente) {
                alertaError('El monto a pagar no puede superar el saldo pendiente.');
                return;
            }

            if (!(await confirmarAccion(`¿Registrar pago por ${formatearMoneda(monto)}?`, 'Cobrar Factura'))) return;

            const cajas = obtenerDatos('cajas_tecnorivas');
            const idxCaja = cajas.findIndex(caja => caja.estado === 'abierta');
            if (idxCaja === -1) {
                alertaError('No hay caja abierta.');
                return;
            }

            // Registrar ingreso
            cajas[idxCaja].movimientos.push({
                hora: fechaHoraAhora(),
                tipo: 'ingreso',
                concepto: `Cobro Factura Contado ${f.numero} (${metodo})`,
                monto: monto
            });
            cajas[idxCaja].ingresos += monto;
            guardarDatos('cajas_tecnorivas', cajas);

            // Actualizar factura
            const nuevoPagado = totalPagado + monto;
            f.total_pagado = nuevoPagado;
            if (nuevoPagado >= f.total) {
                f.estado = 'pagada';
            } else {
                f.estado = 'parcialmente_pagada';
            }
            facturas[idx] = f;
            guardarFacturas(facturas);

            bootstrap.Modal.getInstance(document.getElementById('modal-cobrar-factura')).hide();
            alertaExito('Cobro registrado exitosamente en caja.');
            cargarFacturas();
        });
    }
}

async function anularFactura(id) {
    const facturas = obtenerFacturas();
    const fIdx = facturas.findIndex(x => x.id === id);
    if (fIdx === -1) return;
    const f = facturas[fIdx];

    const cajas = obtenerDatos('cajas_tecnorivas') || [];
    const idxCaja = cajas.findIndex(caja => caja.estado === 'abierta');

    if (idxCaja === -1) {
        alertaError('Debe abrir la caja actual antes de poder anular una factura, ya que se requiere registrar el egreso/devolución contable.');
        return;
    }

    if (!(await confirmarAccion(`¿Está seguro de anular la factura ${f.numero}? Esta acción devolverá los artículos al stock, anulará las cuotas y registrará la devolución del dinero en la caja actual.`, 'Anular Factura'))) return;

    // 1. Devolver Stock
    const articulos = obtenerDatos('articulos_tecnorivas');
    const movsInv = obtenerDatos('movimientos_inventario') || [];
    
    f.items.forEach(item => {
        if (item.tipoItem === 'articulo') {
            const aIdx = articulos.findIndex(a => a.id === item.itemId);
            if (aIdx !== -1) {
                const sA = articulos[aIdx].stock;
                articulos[aIdx].stock += item.cantidad;
                movsInv.push({
                    fecha: fechaHoraAhora(), articuloId: item.itemId, tipo: 'entrada', 
                    cantidad: item.cantidad, saldoA: sA, saldoB: articulos[aIdx].stock,
                    referencia: `Anulación Factura ${f.numero}`
                });
            }
        }
    });

    guardarDatos('articulos_tecnorivas', articulos);
    guardarDatos('movimientos_inventario', movsInv);

    // 2. Anular Cuotas si es crédito y calcular total a devolver
    let totalDevolver = 0;
    if (f.forma_pago === 'credito') {
        const cuotasStore = obtenerDatos('cuotas_tecnorivas') || [];
        let cuotasModificadas = false;
        cuotasStore.forEach(c => {
            if (c.factura_id === f.id) {
                if (c.estado === 'pagada') {
                    totalDevolver += c.monto;
                }
                c.estado = 'anulada';
                cuotasModificadas = true;
            }
        });
        if (cuotasModificadas) guardarDatos('cuotas_tecnorivas', cuotasStore);
    } else if (f.forma_pago === 'contado') {
        totalDevolver = f.total_pagado || 0;
    }

    // 3. Registrar Devolución de Dinero en la Caja Abierta
    if (totalDevolver > 0) {
        const concepto = f.forma_pago === 'contado' ? `Anulación Factura Contado ${f.numero}` : `Devolución por Cuotas Pagadas (Anulación Factura ${f.numero})`;
        cajas[idxCaja].movimientos.push({
            hora: fechaHoraAhora(),
            tipo: 'egreso',
            concepto: concepto,
            monto: totalDevolver
        });
        cajas[idxCaja].egresos += totalDevolver;
        guardarDatos('cajas_tecnorivas', cajas);
    }

    // 4. (Opcional) Cambiar estado del presupuesto asociado de nuevo a "aprobado"
    if (f.presupuesto_id) {
        const presupuestos = obtenerDatos('presupuestos_tecnorivas');
        const pIdx = presupuestos.findIndex(p => p.id === f.presupuesto_id);
        if (pIdx !== -1) {
            presupuestos[pIdx].estado = 'aprobado';
            presupuestos[pIdx].facturaRelacionada = null;
            guardarDatos('presupuestos_tecnorivas', presupuestos);
        }
    }

    // 5. Marcar factura como anulada
    facturas[fIdx].estado = 'anulada';
    guardarFacturas(facturas);

    alertaExito('Factura anulada y contabilidad actualizada correctamente.');
    cargarFacturas();
}

function generarPDFFacturaIndividual(id) {
    const facturas = obtenerFacturas();
    const f = facturas.find(x => x.id === id);
    if (!f) return;

    if (!window.jspdf) {
        Swal.fire({ title: 'Generando PDF...', text: 'Cargando librerías necesarias...', didOpen: () => { Swal.showLoading(); }});
        const script1 = document.createElement('script');
        script1.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';
        script1.onload = () => {
            const script2 = document.createElement('script');
            script2.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.5.31/jspdf.plugin.autotable.min.js';
            script2.onload = () => { Swal.close(); _ejecutarPDFFactura(f); };
            document.head.appendChild(script2);
        };
        document.head.appendChild(script1);
    } else {
        _ejecutarPDFFactura(f);
    }
}

function _ejecutarPDFFactura(f) {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF('p', 'pt', 'a4');
    
    // Header
    doc.setFontSize(22);
    doc.setTextColor(30, 58, 95);
    doc.text("TECNORIVAS", 40, 50);
    
    doc.setFontSize(12);
    doc.setTextColor(100, 100, 100);
    doc.text("Factura Legal", 40, 70);
    
    doc.setFontSize(14);
    doc.setTextColor(0, 0, 0);
    doc.text(`N°: ${f.numero}`, doc.internal.pageSize.width - 40, 50, { align: 'right' });
    
    if (f.estado === 'anulada') {
        doc.setFontSize(20);
        doc.setTextColor(255, 0, 0);
        doc.text("ANULADA", doc.internal.pageSize.width / 2, 90, { align: 'center' });
    }

    doc.setFontSize(10);
    doc.setTextColor(0, 0, 0);
    doc.text(`Fecha Emisión: ${formatearFecha(f.fecha)}`, doc.internal.pageSize.width - 40, 70, { align: 'right' });
    doc.text(`Condición: ${f.forma_pago.toUpperCase()}`, doc.internal.pageSize.width - 40, 85, { align: 'right' });
    
    doc.text(`Cliente: ${f.cliente_nombre}`, 40, 110);
    doc.text(`Presupuesto Ref: ${f.presupuesto_numero || 'N/A'}`, 40, 125);
    
    // Table
    const tableBody = f.items.map((i, idx) => [
        idx + 1,
        i.descripcion,
        i.cantidad,
        formatearMoneda(i.precio),
        formatearMoneda(i.subtotal)
    ]);
    
    doc.autoTable({
        startY: 140,
        head: [['N°', 'Descripción', 'Cant', 'Precio Unit', 'Subtotal']],
        body: tableBody,
        theme: 'grid',
        headStyles: { fillColor: [30, 58, 95] },
        styles: { fontSize: 10 }
    });
    
    // Total
    const finalY = doc.lastAutoTable.finalY + 30;
    doc.setFontSize(14);
    doc.text(`Total a Pagar: ${formatearMoneda(f.total)}`, doc.internal.pageSize.width - 40, finalY, { align: 'right' });
    
    // Detalles de Medios de Pago / Cuotas
    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    if (f.forma_pago === 'contado' && f.medios_pago && f.medios_pago.length > 0) {
        doc.text("Medios de Pago:", 40, finalY - 10);
        let currY = finalY + 5;
        f.medios_pago.forEach(m => {
            doc.text(`${m.tipo}: ${formatearMoneda(m.monto)}`, 40, currY);
            currY += 15;
        });
    } else if (f.forma_pago === 'credito') {
        doc.text("Condición: Crédito (Financiado en cuotas)", 40, finalY - 10);
    }
    
    // Footer
    doc.setFontSize(9);
    doc.setTextColor(150, 150, 150);
    doc.text("Gracias por su preferencia.", doc.internal.pageSize.width / 2, doc.internal.pageSize.height - 30, { align: 'center' });
    
    doc.save(`${f.numero}_${f.cliente_nombre.replace(/ /g, '_')}.pdf`);
}

/* =========================================
   NUEVA FACTURA (SPA LOGIC)
========================================= */

function calcularFechaCuota(fechaBaseStr, cuotaNum, frecuencia) {
    const d = new Date(fechaBaseStr + 'T00:00:00');
    if (frecuencia === 'semanal') {
        d.setDate(d.getDate() + (cuotaNum * 7));
    } else if (frecuencia === 'quincenal') {
        const dayA = d.getDate();
        let day1, day2;
        if (dayA <= 15) {
            day1 = dayA;
            day2 = dayA + 15;
        } else {
            day1 = dayA - 15;
            day2 = dayA;
        }
        
        if (dayA <= 15) {
            const mesesAAgregar = Math.floor(cuotaNum / 2);
            const esSegundaQuincena = (cuotaNum % 2 !== 0);
            d.setMonth(d.getMonth() + mesesAAgregar);
            d.setDate(esSegundaQuincena ? day2 : day1);
            if (d.getDate() !== (esSegundaQuincena ? day2 : day1)) {
                d.setDate(0);
            }
        } else {
            if (cuotaNum % 2 === 0) {
                d.setMonth(d.getMonth() + (cuotaNum / 2));
                d.setDate(day2);
            } else {
                d.setMonth(d.getMonth() + Math.floor((cuotaNum + 1) / 2));
                d.setDate(day1);
            }
        }
    } else if (frecuencia === 'mensual') {
        const tempDay = d.getDate();
        d.setMonth(d.getMonth() + cuotaNum);
        if (d.getDate() !== tempDay) d.setDate(0);
    } else if (frecuencia === 'bimestral') {
        const tempDay = d.getDate();
        d.setMonth(d.getMonth() + (cuotaNum * 2));
        if (d.getDate() !== tempDay) d.setDate(0);
    } else if (frecuencia === 'semestral') {
        const tempDay = d.getDate();
        d.setMonth(d.getMonth() + (cuotaNum * 6));
        if (d.getDate() !== tempDay) d.setDate(0);
    }
    return d.toISOString().split('T')[0];
}

function inicializarControlesItemsNuevaFactura() {
    const selectCat = document.getElementById('fac-item-categoria');
    const selectArt = document.getElementById('fac-articulo-select');
    const selectSrv = document.getElementById('fac-servicio-select');
    
    const radioArt = document.getElementById('fac-item-tipo-art');
    const radioSrv = document.getElementById('fac-item-tipo-srv');
    
    const divArt = document.getElementById('div-fac-articulo-controles');
    const divSrv = document.getElementById('div-fac-servicio-controles');
    
    if (!selectCat) return;
    
    // Poblar Categorías
    selectCat.innerHTML = '<option value="">-- Seleccionar Categoría --</option>';
    const categorias = obtenerDatos('categorias_tecnorivas');
    categorias.forEach(c => {
        selectCat.insertAdjacentHTML('beforeend', `<option value="${c.id}">${c.nombre}</option>`);
    });
    
    // Cambiar tipo (Artículo vs Servicio)
    const toggleTipo = () => {
        if (radioArt.checked) {
            divArt.classList.remove('d-none');
            divSrv.classList.add('d-none');
        } else {
            divArt.classList.add('d-none');
            divSrv.classList.remove('d-none');
        }
    };
    
    radioArt.addEventListener('change', toggleTipo);
    radioSrv.addEventListener('change', toggleTipo);
    
    // Cambiar Categoría
    selectCat.addEventListener('change', e => {
        const catId = e.target.value;
        cargarArticulosPorCategoriaFactura(catId);
        cargarServiciosPorCategoriaFactura(catId);
    });
    
    // Cambiar Artículo
    selectArt.addEventListener('change', e => {
        const opt = e.target.options[e.target.selectedIndex];
        if (opt && opt.value) {
            document.getElementById('fac-articulo-precio').value = opt.dataset.precio || '';
            document.getElementById('fac-articulo-stock').value = opt.dataset.stock || '-';
        } else {
            document.getElementById('fac-articulo-precio').value = '';
            document.getElementById('fac-articulo-stock').value = '';
        }
    });

    // Cambiar Servicio
    selectSrv.addEventListener('change', e => {
        const opt = e.target.options[e.target.selectedIndex];
        if (opt && opt.value) {
            document.getElementById('fac-servicio-precio').value = opt.dataset.precio || '';
        } else {
            document.getElementById('fac-servicio-precio').value = '';
        }
    });
    
    // Botón Agregar Artículo
    document.getElementById('btn-add-articulo-fac').addEventListener('click', () => {
        if (!selectArt.value) {
            alertaAdvertencia('Seleccione un artículo.'); return;
        }
        const opt = selectArt.options[selectArt.selectedIndex];
        const precio = parseFloat(document.getElementById('fac-articulo-precio').value);
        const cant = parseFloat(document.getElementById('fac-articulo-cant').value);
        
        if (isNaN(cant) || cant <= 0 || isNaN(precio) || precio < 0) {
            alertaAdvertencia('Ingrese cantidad y precio válidos.'); return;
        }
        
        const itemId = parseInt(selectArt.value);
        const stock = parseFloat(opt.dataset.stock);
        const yaAgregada = nuevaFacturaDetalles.filter(i => i.tipoItem === 'articulo' && i.itemId === itemId).reduce((s, i) => s + i.cantidad, 0);
        
        if (cant + yaAgregada > stock) {
            alertaError(`Stock insuficiente. Disponible: ${stock}, Ya agregado: ${yaAgregada}`); return;
        }
        
        agregarAlDetalleFactura('articulo', itemId, opt.text, cant, precio, parseFloat(opt.dataset.iva || 10));
        
        // Reset inputs
        selectArt.value = '';
        document.getElementById('fac-articulo-stock').value = '';
        document.getElementById('fac-articulo-precio').value = '';
        document.getElementById('fac-articulo-cant').value = '1';
    });
    
    // Botón Agregar Servicio
    document.getElementById('btn-add-servicio-fac').addEventListener('click', () => {
        if (!selectSrv.value) {
            alertaAdvertencia('Seleccione un servicio.'); return;
        }
        const opt = selectSrv.options[selectSrv.selectedIndex];
        const precio = parseFloat(document.getElementById('fac-servicio-precio').value);
        
        if (isNaN(precio) || precio < 0) {
            alertaAdvertencia('Ingrese un precio válido.'); return;
        }
        
        agregarAlDetalleFactura('servicio', parseInt(selectSrv.value), opt.text, 1, precio, 10);
        
        selectSrv.value = '';
        document.getElementById('fac-servicio-precio').value = '';
    });
}

function cargarArticulosPorCategoriaFactura(catId) {
    const select = document.getElementById('fac-articulo-select');
    if (!select) return;
    
    select.innerHTML = '<option value="">-- Seleccione un artículo --</option>';
    if (!catId) {
        select.disabled = true;
        document.getElementById('fac-articulo-precio').value = '';
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

function cargarServiciosPorCategoriaFactura(catId) {
    const select = document.getElementById('fac-servicio-select');
    if (!select) return;
    
    select.innerHTML = '<option value="">-- Seleccione un servicio --</option>';
    if (!catId) {
        select.disabled = true;
        document.getElementById('fac-servicio-precio').value = '';
        return;
    }
    select.disabled = false;
    
    const servicios = obtenerDatos('servicios_tecnorivas').filter(s => s.activo && s.categoriaId == catId);
    
    if (servicios.length > 0) {
        servicios.forEach(s => {
            select.insertAdjacentHTML('beforeend', `<option value="${s.id}" data-precio="${s.precio_base}">${s.nombre}</option>`);
        });
    } else {
        select.innerHTML = '<option value="">-- Sin servicios en esta categoría --</option>';
    }
}

function agregarAlDetalleFactura(tipoItem, itemId, descripcion, cant, precio, iva) {
    const idx = nuevaFacturaDetalles.findIndex(i => i.tipoItem === tipoItem && i.itemId === itemId && i.precio === precio);
    if (idx !== -1) {
        nuevaFacturaDetalles[idx].cantidad += cant;
        nuevaFacturaDetalles[idx].subtotal = nuevaFacturaDetalles[idx].cantidad * precio;
    } else {
        nuevaFacturaDetalles.push({
            tipoItem, itemId, descripcion, cantidad: cant, precio, iva, subtotal: cant * precio
        });
    }
    nuevaFacturaTotal = nuevaFacturaDetalles.reduce((s, i) => s + i.subtotal, 0);
    renderTablaItemsNuevaFactura();
    
    // Auto-fill Efectivo with new total if condition is contado
    const condicion = document.getElementById('nueva-fac-condicion').value;
    if (condicion === 'contado') {
        recalcularTotalMediosPago();
    }
}

window.mostrarPanelNuevaFactura = function() {
    const panelListado = document.getElementById('facturacionTabsContent');
    const tabs = document.getElementById('facturacionTabs');
    const title = document.querySelector('h1.modulo-titulo') || document.querySelector('h1');
    const panelNueva = document.getElementById('panel-nueva-factura');
    if(tabs) tabs.classList.add('d-none');
    if(panelListado) panelListado.classList.add('d-none');
    if(title) title.classList.add('d-none');
    if(panelNueva) panelNueva.classList.remove('d-none');
};

function configurarNuevaFacturaSPA() {
    const btnVolver = document.getElementById('btn-volver-listado');
    const panelListado = document.getElementById('facturacionTabsContent');
    const tabs = document.getElementById('facturacionTabs');
    const title = document.querySelector('h1.modulo-titulo') || document.querySelector('h1');
    const panelNueva = document.getElementById('panel-nueva-factura');

    if (btnVolver) {
        btnVolver.addEventListener('click', (e) => {
            e.preventDefault();
            if(tabs) tabs.classList.remove('d-none');
            if(panelListado) panelListado.classList.remove('d-none');
            if(title) title.classList.remove('d-none');
            if(panelNueva) panelNueva.classList.add('d-none');
            cargarFacturas();
            
            // Clean URL if we came from presupuesto
            const url = new URL(window.location.href);
            if (url.searchParams.has('accion')) {
                url.searchParams.delete('accion');
                window.history.replaceState({}, document.title, url);
            }
        });
    }

    // Lógica Condición Venta
    const selectCond = document.getElementById('nueva-fac-condicion');
    const panelContado = document.getElementById('panel-condicion-contado');
    const panelCredito = document.getElementById('panel-condicion-credito');

    if (selectCond) {
        selectCond.addEventListener('change', (e) => {
            const val = e.target.value;
            
            if (val === 'contado') {
                panelContado.classList.remove('d-none');
                panelCredito.classList.add('d-none');
                const selectPlazo = document.getElementById('nueva-fac-plazo');
                if(selectPlazo) selectPlazo.disabled = true;
                actualizarMontoContado();
            } else if (val === 'credito') {
                panelContado.classList.add('d-none');
                panelCredito.classList.remove('d-none');
                const selectPlazo = document.getElementById('nueva-fac-plazo');
                if(selectPlazo) selectPlazo.disabled = false;
            } else {
                panelContado.classList.add('d-none');
                panelCredito.classList.add('d-none');
                const selectPlazo = document.getElementById('nueva-fac-plazo');
                if(selectPlazo) selectPlazo.disabled = true;
            }
        });
    }

    // Se eliminan los event listeners de input-medio-pago

    // Envío del Formulario
    const formNueva = document.getElementById('form-nueva-factura');
    if (formNueva) {
        formNueva.addEventListener('submit', emitirNuevaFactura);
    }

    // Botón Guardar Borrador
    const btnGuardarBorrador = document.getElementById('btn-guardar-borrador');
    if (btnGuardarBorrador) {
        btnGuardarBorrador.addEventListener('click', guardarBorrador);
    }

    // Botón Agregar Medio de Pago
    const btnAddMedio = document.getElementById('btn-add-metodo-pago');
    if (btnAddMedio) {
        btnAddMedio.addEventListener('click', () => {
            const selectMedio = document.getElementById('fac-add-medio-pago');
            const inputMonto = document.getElementById('fac-add-monto-pago');
            const monto = parseFloat(inputMonto.value);
            
            if (isNaN(monto) || monto <= 0) {
                alertaAdvertencia('Ingrese un monto válido.');
                return;
            }
            
            const totalAbonado = mediosPagoContado.reduce((sum, item) => sum + item.monto, 0);
            if (totalAbonado + monto > nuevaFacturaTotal) {
                alertaError('El monto ingresado supera el total faltante de la factura.');
                return;
            }
            
            mediosPagoContado.push({
                tipo: selectMedio.value,
                monto: monto
            });
            
            recalcularTotalMediosPago();
        });
    }
}

async function guardarBorrador() {
    if (nuevaFacturaDetalles.length === 0) {
        alertaError('Debe haber al menos un ítem para guardar el borrador.');
        return;
    }
    
    const facturas = obtenerFacturas();
    const numFac = `B-${new Date().getTime()}`; // ID temporal

    const nuevaFactura = {
        id: generarId(facturas),
        numero: numFac,
        presupuesto_numero: document.getElementById('nueva-fac-presupuesto').value || null,
        cliente_id: parseInt(document.getElementById('nueva-fac-cliente-id').value) || 0,
        cliente_nombre: document.getElementById('nueva-fac-cliente').value || 'Sin Nombre',
        fecha: document.getElementById('nueva-fac-fecha').value,
        estado: 'borrador',
        estadoPago: 'pendiente', 
        items: [...nuevaFacturaDetalles],
        total: nuevaFacturaTotal,
        total_pagado: 0,
        forma_pago: document.getElementById('nueva-fac-condicion').value || '',
        medios_pago: [],
        observaciones: document.getElementById('nueva-fac-observaciones').value
    };

    facturas.push(nuevaFactura);
    guardarFacturas(facturas);

    alertaExito('Borrador guardado.');
    document.getElementById('btn-volver-listado').click();
    cargarFacturas();
}

window.continuarBorrador = function(id) {
    const facturas = obtenerFacturas();
    const b = facturas.find(x => x.id === id);
    if (!b) return;

    mediosPagoContado = [];
    document.getElementById('nueva-fac-cliente').value = b.cliente_nombre;
    document.getElementById('nueva-fac-cliente-id').value = b.cliente_id;
    document.getElementById('nueva-fac-presupuesto').value = b.presupuesto_numero || '';
    document.getElementById('nueva-fac-fecha').value = b.fecha;
    document.getElementById('nueva-fac-observaciones').value = b.observaciones || '';
    
    nuevaFacturaDetalles = [...b.items];
    nuevaFacturaTotal = b.total;
    renderTablaItemsNuevaFactura();

    // Eliminar el borrador de la base (se guardará como oficial o nuevo borrador después)
    guardarFacturas(facturas.filter(x => x.id !== id));
    cargarFacturas();

    mostrarPanelNuevaFactura();
};

function actualizarMontoContado() {
    const inputMonto = document.getElementById('fac-add-monto-pago');
    if(inputMonto && mediosPagoContado.length === 0) {
        inputMonto.value = nuevaFacturaTotal;
    }
    recalcularTotalMediosPago();
}

function recalcularTotalMediosPago() {
    const totalAbonado = mediosPagoContado.reduce((sum, item) => sum + item.monto, 0);
    const faltante = nuevaFacturaTotal - totalAbonado;
    
    const elTotal = document.getElementById('total-abonado-contado');
    const elFaltante = document.getElementById('faltante-abonado-contado');
    const inputMonto = document.getElementById('fac-add-monto-pago');
    
    if (elTotal) elTotal.textContent = formatearMoneda(totalAbonado);
    if (elFaltante) {
        elFaltante.textContent = formatearMoneda(faltante > 0 ? faltante : 0);
        elFaltante.className = faltante > 0 ? 'text-danger fw-bold' : 'text-success fw-bold';
    }
    
    if (inputMonto) {
        inputMonto.value = faltante > 0 ? faltante : 0;
        inputMonto.disabled = faltante <= 0;
    }
    
    const btnAddMedio = document.getElementById('btn-add-metodo-pago');
    if (btnAddMedio) {
        btnAddMedio.disabled = faltante <= 0;
    }
    
    renderListaMediosPago();
}

function renderListaMediosPago() {
    const tbody = document.getElementById('lista-metodos-pago');
    if (!tbody) return;
    tbody.innerHTML = '';
    
    mediosPagoContado.forEach((item, index) => {
        tbody.insertAdjacentHTML('beforeend', `
            <tr>
                <td>${item.tipo}</td>
                <td class="fw-bold">${formatearMoneda(item.monto)}</td>
                <td class="text-center">
                    <button type="button" class="btn btn-sm btn-outline-danger" onclick="eliminarMedioPago(${index})" title="Eliminar"><i class="bi bi-trash"></i></button>
                </td>
            </tr>
        `);
    });
}

window.eliminarMedioPago = function(index) {
    mediosPagoContado.splice(index, 1);
    recalcularTotalMediosPago();
};

function verificarPresupuestoRedirigido() {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('accion') === 'nueva_desde_presupuesto') {
        const presId = sessionStorage.getItem('presupuesto_a_facturar_id');
        if (presId) {
            preLlenarDesdePresupuesto(parseInt(presId));
            mostrarPanelNuevaFactura();
            sessionStorage.removeItem('presupuesto_a_facturar_id');
        }
    }
}

function preLlenarDesdePresupuesto(presId) {
    const presupuestos = obtenerDatos('presupuestos_tecnorivas') || [];
    const pres = presupuestos.find(p => p.id === presId);
    if (!pres) return;

    mediosPagoContado = [];
    document.getElementById('nueva-fac-cliente').value = pres.clienteNombre;
    document.getElementById('nueva-fac-cliente-id').value = pres.clienteId;
    document.getElementById('nueva-fac-presupuesto').value = pres.numero;
    
    const hoy = new Date().toISOString().split('T')[0];
    document.getElementById('nueva-fac-fecha').value = hoy;

    nuevaFacturaDetalles = [...pres.detalle];
    nuevaFacturaTotal = pres.total;

    renderTablaItemsNuevaFactura();
    
    // Auto-fill Monto a Abonar
    actualizarMontoContado();
    
    // Reset item category selection to update options
    const selectCat = document.getElementById('fac-item-categoria');
    if (selectCat) {
        selectCat.value = '';
        selectCat.dispatchEvent(new Event('change'));
    }
}

function renderTablaItemsNuevaFactura() {
    const tbody = document.getElementById('nueva-fac-items');
    tbody.innerHTML = '';
    
    nuevaFacturaDetalles.forEach((item, index) => {
        tbody.insertAdjacentHTML('beforeend', `
            <tr>
                <td>${item.tipoItem === 'articulo' ? 'Art' : 'Srv'}</td>
                <td>${item.descripcion}</td>
                <td>${item.cantidad}</td>
                <td>${formatearMoneda(item.precio)}</td>
                <td class="fw-bold">${formatearMoneda(item.subtotal)}</td>
                <td>
                    <button type="button" class="btn btn-sm btn-outline-danger" onclick="eliminarItemNuevaFactura(${index})" title="Eliminar"><i class="bi bi-trash"></i></button>
                </td>
            </tr>
        `);
    });
    
    document.getElementById('nueva-fac-total').textContent = formatearMoneda(nuevaFacturaTotal);
    actualizarMontoContado();
}

window.eliminarItemNuevaFactura = function(index) {
    nuevaFacturaDetalles.splice(index, 1);
    nuevaFacturaTotal = nuevaFacturaDetalles.reduce((s, i) => s + i.subtotal, 0);
    renderTablaItemsNuevaFactura();
    
    // Si la condición es contado, recalcular medios de pago
    const condicion = document.getElementById('nueva-fac-condicion').value;
    if (condicion === 'contado') {
        const totalAbonado = mediosPagoContado.reduce((sum, item) => sum + item.monto, 0);
        if (totalAbonado > nuevaFacturaTotal) {
            mediosPagoContado = [];
        }
        recalcularTotalMediosPago();
    }
};

async function emitirNuevaFactura(e) {
    e.preventDefault();
    
    if (nuevaFacturaDetalles.length === 0) {
        alertaError('La factura debe tener al menos un ítem.');
        return;
    }

    const condicion = document.getElementById('nueva-fac-condicion').value;
    
    // Validar Medios de Pago si es Contado
    let mediosPagoArr = [];
    if (condicion === 'contado') {
        const totalAbonado = mediosPagoContado.reduce((sum, item) => sum + item.monto, 0);
        if (totalAbonado !== nuevaFacturaTotal) {
            alertaError('El total abonado debe ser exactamente igual al total de la factura.');
            return;
        }
        mediosPagoArr = [...mediosPagoContado];
    }

    if (!(await confirmarAccion(`¿Emitir factura oficial por ${formatearMoneda(nuevaFacturaTotal)}?`, 'Emitir Factura'))) return;

    const facturas = obtenerFacturas();
    const maxFac = facturas.reduce((max, f) => {
        const match = f.numero.match(/FAC-\d{4}-(\d+)/);
        return match ? Math.max(max, parseInt(match[1])) : max;
    }, 0);
    const numFac = `FAC-${new Date().getFullYear()}-${String(maxFac + 1).padStart(4, '0')}`;

    const nuevaFactura = {
        id: generarId(facturas),
        numero: numFac,
        presupuesto_numero: document.getElementById('nueva-fac-presupuesto').value || null,
        cliente_id: parseInt(document.getElementById('nueva-fac-cliente-id').value) || 0,
        cliente_nombre: document.getElementById('nueva-fac-cliente').value,
        fecha: document.getElementById('nueva-fac-fecha').value,
        estado: 'emitida', // Siempre se crea como emitida, el pago se efectúa en Caja
        estadoPago: condicion === 'contado' ? 'pendiente_cobro' : 'pendiente', 
        items: [...nuevaFacturaDetalles],
        total: nuevaFacturaTotal,
        total_pagado: 0,
        forma_pago: condicion,
        medios_pago: mediosPagoArr,
        observaciones: document.getElementById('nueva-fac-observaciones').value
    };

    // Descontar Stock de los artículos
    const articulos = obtenerDatos('articulos_tecnorivas') || [];
    const movsInv = obtenerDatos('movimientos_inventario') || [];
    
    nuevaFactura.items.forEach(item => {
        if (item.tipoItem === 'articulo') {
            const aIdx = articulos.findIndex(a => a.id === item.itemId);
            if (aIdx !== -1) {
                const sA = articulos[aIdx].stock;
                articulos[aIdx].stock -= item.cantidad;
                movsInv.push({
                    fecha: fechaHoraAhora(), articuloId: item.itemId, tipo: 'salida', 
                    cantidad: item.cantidad, saldoA: sA, saldoB: articulos[aIdx].stock,
                    referencia: `Emisión Factura ${numFac}`
                });
            }
        }
    });
    guardarDatos('articulos_tecnorivas', articulos);
    guardarDatos('movimientos_inventario', movsInv);

    // Si es crédito, generar cuotas
    if (condicion === 'credito') {
        const cuotasStore = obtenerDatos('cuotas_tecnorivas') || [];
        const cantCuotas = parseInt(document.getElementById('nueva-fac-plazo').value) || 1;
        const frecuencia = document.getElementById('nueva-fac-frecuencia').value || 'mensual';
        
        const montoCuota = Math.round(nuevaFacturaTotal / cantCuotas);
        
        for (let i = 1; i <= cantCuotas; i++) {
            const fechaVencimientoStr = calcularFechaCuota(nuevaFactura.fecha, i, frecuencia);
            cuotasStore.push({
                id: generarId(cuotasStore) + i,
                factura_id: nuevaFactura.id,
                factura_numero: nuevaFactura.numero,
                cliente_nombre: nuevaFactura.cliente_nombre,
                numero_cuota: i,
                total_cuotas: cantCuotas,
                monto: montoCuota,
                fecha_vencimiento: fechaVencimientoStr,
                estado: 'pendiente'
            });
        }
        guardarDatos('cuotas_tecnorivas', cuotasStore);
    }

    facturas.push(nuevaFactura);
    guardarFacturas(facturas);

    // Cambiar estado del presupuesto a facturado
    if (nuevaFactura.presupuesto_numero) {
        const presupuestos = obtenerDatos('presupuestos_tecnorivas') || [];
        const pIdx = presupuestos.findIndex(p => p.numero === nuevaFactura.presupuesto_numero);
        if (pIdx !== -1) {
            presupuestos[pIdx].estado = 'facturado';
            guardarDatos('presupuestos_tecnorivas', presupuestos);
        }
    }

    Swal.fire('Factura Emitida', `La factura ${numFac} ha sido creada correctamente.`, 'success').then(() => {
        document.getElementById('btn-volver-listado').click();
        cargarFacturas();
    });
}
