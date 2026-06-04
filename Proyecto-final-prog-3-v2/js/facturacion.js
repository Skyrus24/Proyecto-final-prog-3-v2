/**
 * facturacion.js - Módulo de Facturación
 */

const CLAVE_FACTURAS = 'facturas_tecnorivas';

let paginadorFacturas;
let filteredFacturas = [];

document.addEventListener('DOMContentLoaded', () => {
    const sesion = protegerPagina();
    if (!sesion) return;

    if (!localStorage.getItem(CLAVE_FACTURAS)) localStorage.setItem(CLAVE_FACTURAS, '[]');

    paginadorFacturas = new Paginador('tabla-body-facturas', 'paginacion-facturas', 15);
    
    cargarFacturas();
    configurarBuscadorFacturas();
    configurarNuevaFacturaSPA();
    verificarPresupuestoRedirigido();
});

let nuevaFacturaDetalles = [];
let nuevaFacturaTotal = 0;

function obtenerFacturas() {
    return obtenerDatos(CLAVE_FACTURAS);
}

function guardarFacturas(facturas) {
    guardarDatos(CLAVE_FACTURAS, facturas);
}

function cargarFacturas() {
    let facturas = obtenerFacturas();
    facturas.sort((a, b) => b.id - a.id);
    
    // Separar Emitidas pendientes vs Historial (Cobradas/Anuladas) vs Borradores
    let emitidas = facturas.filter(f => f.estado === 'emitida' && f.estadoPago !== 'pagada');
    let historial = facturas.filter(f => f.estado === 'anulada' || f.estadoPago === 'pagada' || f.estado === 'pagada');
    let borradores = facturas.filter(f => f.estado === 'borrador');
    
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
        cont.innerHTML = `<tr><td colspan="8" class="text-center text-muted py-3">No hay facturas en el historial</td></tr>`;
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
    });
}

function configurarBuscadorFacturas() {
    const input = document.getElementById('buscador-facturas');
    if (input) {
        input.addEventListener('input', (e) => {
            const q = e.target.value.toLowerCase();
            let emitidas = obtenerFacturas().filter(f => f.estado !== 'borrador');
            let filtradas = emitidas.filter(f => 
                f.cliente_nombre.toLowerCase().includes(q) || 
                f.numero.toLowerCase().includes(q)
            );
            filteredFacturas = filtradas;
            const el = document.getElementById('contador-facturas');
            if (el) el.textContent = `${filtradas.length} factura(s)`;
            paginadorFacturas.setDatos(filtradas, renderFilasFacturas);
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
        cont.innerHTML = `<tr><td colspan="8" class="text-center text-muted py-4"><i class="bi bi-receipt fs-3 d-block mb-2"></i>Sin facturas emitidas</td></tr>`;
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

function configurarBuscadorFacturas() {
    const input = document.getElementById('buscador-facturas');
    if (input) input.addEventListener('input', () => {
        const f = input.value.toLowerCase();
        let lista = obtenerFacturas();
        if (f) {
            lista = lista.filter(s => 
                s.numero.toLowerCase().includes(f) || 
                (s.presupuesto_numero && s.presupuesto_numero.toLowerCase().includes(f)) ||
                s.cliente_nombre.toLowerCase().includes(f)
            );
        }
        filteredFacturas = lista;
        const el = document.getElementById('contador-facturas');
        if (el) el.textContent = `${lista.length} factura(s)`;
        paginadorFacturas.setDatos(lista, renderFilasFacturas);
    });
}



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
    
    // Footer
    doc.setFontSize(9);
    doc.setTextColor(150, 150, 150);
    doc.text("Gracias por su preferencia.", doc.internal.pageSize.width / 2, doc.internal.pageSize.height - 30, { align: 'center' });
    
    doc.save(`${f.numero}_${f.cliente_nombre.replace(/ /g, '_')}.pdf`);
}

/* =========================================
   NUEVA FACTURA (SPA LOGIC)
========================================= */

function configurarNuevaFacturaSPA() {
    const btnNueva = document.getElementById('btn-nueva-factura');
    const btnVolver = document.getElementById('btn-volver-listado');
    const panelListado = document.getElementById('facturacionTabsContent');
    const tabs = document.getElementById('facturacionTabs');
    const title = document.querySelector('h1.modulo-titulo') || document.querySelector('h1');
    const panelNueva = document.getElementById('panel-nueva-factura');

    if (btnNueva) {
        btnNueva.addEventListener('click', () => {
            if(tabs) tabs.classList.add('d-none');
            if(panelListado) panelListado.classList.add('d-none');
            if(title) title.classList.add('d-none');
            if(panelNueva) panelNueva.classList.remove('d-none');
        });
    }

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
                document.querySelectorAll('.input-medio-pago').forEach(inp => inp.disabled = false);
                const selectPlazo = document.getElementById('nueva-fac-plazo');
                if(selectPlazo) selectPlazo.disabled = true;
                recalcularTotalMediosPago();
            } else if (val === 'credito') {
                panelContado.classList.add('d-none');
                panelCredito.classList.remove('d-none');
                document.querySelectorAll('.input-medio-pago').forEach(inp => inp.disabled = true);
                const selectPlazo = document.getElementById('nueva-fac-plazo');
                if(selectPlazo) selectPlazo.disabled = false;
            } else {
                panelContado.classList.add('d-none');
                panelCredito.classList.add('d-none');
                document.querySelectorAll('.input-medio-pago').forEach(inp => inp.disabled = true);
                const selectPlazo = document.getElementById('nueva-fac-plazo');
                if(selectPlazo) selectPlazo.disabled = true;
            }
        });
    }

    // Medios de pago (Contado)
    document.querySelectorAll('.input-medio-pago').forEach(inp => {
        inp.addEventListener('input', recalcularTotalMediosPago);
    });

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

    document.getElementById('btn-nueva-factura').click();
};

function recalcularTotalMediosPago() {
    let suma = 0;
    document.querySelectorAll('.input-medio-pago').forEach(inp => {
        suma += parseFloat(inp.value) || 0;
    });
    
    document.getElementById('suma-medios-pago').textContent = formatearMoneda(suma);
    
    const errSpan = document.getElementById('error-medios-pago');
    if (Math.abs(suma - nuevaFacturaTotal) > 0.1) {
        errSpan.classList.remove('d-none');
    } else {
        errSpan.classList.add('d-none');
    }
}

function verificarPresupuestoRedirigido() {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('accion') === 'nueva_desde_presupuesto') {
        const presId = sessionStorage.getItem('presupuesto_a_facturar_id');
        if (presId) {
            preLlenarDesdePresupuesto(parseInt(presId));
            document.getElementById('btn-nueva-factura').click();
            sessionStorage.removeItem('presupuesto_a_facturar_id');
        }
    }
}

function preLlenarDesdePresupuesto(presId) {
    const presupuestos = obtenerDatos('presupuestos_tecnorivas') || [];
    const pres = presupuestos.find(p => p.id === presId);
    if (!pres) return;

    document.getElementById('nueva-fac-cliente').value = pres.clienteNombre;
    document.getElementById('nueva-fac-cliente-id').value = pres.clienteId;
    document.getElementById('nueva-fac-presupuesto').value = pres.numero;
    
    const hoy = new Date().toISOString().split('T')[0];
    document.getElementById('nueva-fac-fecha').value = hoy;

    nuevaFacturaDetalles = [...pres.detalle];
    nuevaFacturaTotal = pres.total;

    renderTablaItemsNuevaFactura();
    
    // Auto-fill Efectivo with total
    document.querySelector('.input-medio-pago[data-tipo="Efectivo"]').value = nuevaFacturaTotal;
    recalcularTotalMediosPago();
}

function renderTablaItemsNuevaFactura() {
    const tbody = document.getElementById('nueva-fac-items');
    tbody.innerHTML = '';
    
    nuevaFacturaDetalles.forEach(item => {
        tbody.insertAdjacentHTML('beforeend', `
            <tr>
                <td>${item.tipoItem === 'articulo' ? 'Art' : 'Srv'}</td>
                <td>${item.descripcion}</td>
                <td>${item.cantidad}</td>
                <td>${formatearMoneda(item.precio)}</td>
                <td class="fw-bold">${formatearMoneda(item.subtotal)}</td>
            </tr>
        `);
    });
    
    document.getElementById('nueva-fac-total').textContent = formatearMoneda(nuevaFacturaTotal);
}

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
        let suma = 0;
        document.querySelectorAll('.input-medio-pago').forEach(inp => {
            const val = parseFloat(inp.value) || 0;
            if (val > 0) {
                mediosPagoArr.push({ tipo: inp.dataset.tipo, monto: val });
                suma += val;
            }
        });
        
        if (Math.abs(suma - nuevaFacturaTotal) > 0.1) {
            alertaError('La suma de los medios de pago no coincide con el total de la factura.');
            return;
        }
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
        estado: 'emitida', // borrador, emitida, anulada
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
        const meses = parseInt(document.getElementById('nueva-fac-plazo').value);
        
        const montoCuota = Math.round(nuevaFacturaTotal / meses);
        
        let fechaVenc = new Date(nuevaFactura.fecha);
        for (let i = 1; i <= meses; i++) {
            fechaVenc.setDate(fechaVenc.getDate() + 30);
            cuotasStore.push({
                id: generarId(cuotasStore) + i,
                factura_id: nuevaFactura.id,
                factura_numero: nuevaFactura.numero,
                cliente_nombre: nuevaFactura.cliente_nombre,
                numero_cuota: i,
                total_cuotas: meses,
                monto: montoCuota,
                fecha_vencimiento: fechaVenc.toISOString().split('T')[0],
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
