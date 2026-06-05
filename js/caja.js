/**
 * Modulo de Caja - Modelo A (Flujo Realista)
 */
const CLAVE_CAJA = 'caja_tecnorivas'; // Array de asientos

document.addEventListener('DOMContentLoaded', () => {
    const sesion = protegerPagina();
    if (!sesion) return;

    if (!localStorage.getItem(CLAVE_CAJA)) {
        localStorage.setItem(CLAVE_CAJA, JSON.stringify([]));
    }

    cargarCaja();
    
    document.getElementById('btn-nuevo-egreso-manual')?.addEventListener('click', () => {
        bootstrap.Modal.getOrCreateInstance(document.getElementById('modal-egreso-manual')).show();
    });
    document.getElementById('form-egreso-manual')?.addEventListener('submit', registrarEgresoManual);
    
    // Listeners para Apertura / Cierre
    document.getElementById('btn-abrir-caja')?.addEventListener('click', () => {
        bootstrap.Modal.getOrCreateInstance(document.getElementById('modal-abrir-caja')).show();
    });
    
    document.getElementById('btn-cerrar-caja')?.addEventListener('click', () => {
        const saldoEfectivoStr = document.getElementById('saldo-caja-general').textContent.replace(/[^\d.-]/g, '');
        document.getElementById('caja-monto-esperado').textContent = formatearMoneda(parseFloat(saldoEfectivoStr) || 0);
        document.getElementById('caja-diferencia-container').innerHTML = '';
        document.getElementById('caja-monto-cierre').value = '';
        bootstrap.Modal.getOrCreateInstance(document.getElementById('modal-cerrar-caja')).show();
    });
    
    document.getElementById('caja-monto-cierre')?.addEventListener('input', (e) => {
        const saldoEfectivoStr = document.getElementById('saldo-caja-general').textContent.replace(/[^\d.-]/g, '');
        const esperado = parseFloat(saldoEfectivoStr) || 0;
        const real = parseFloat(e.target.value) || 0;
        const diff = real - esperado;
        
        const cont = document.getElementById('caja-diferencia-container');
        if (diff > 0) {
            cont.innerHTML = `<span class="text-success fw-bold">Sobrante: +${formatearMoneda(diff)}</span>`;
        } else if (diff < 0) {
            cont.innerHTML = `<span class="text-danger fw-bold">Faltante: ${formatearMoneda(diff)}</span>`;
        } else {
            cont.innerHTML = `<span class="text-secondary fw-bold">Caja Cuadrada (Diferencia 0)</span>`;
        }
    });

    document.getElementById('form-abrir-caja')?.addEventListener('submit', abrirCajaFisica);
    document.getElementById('form-cerrar-caja')?.addEventListener('submit', cerrarCajaFisica);
    
    document.getElementById('form-pagar-cuota')?.addEventListener('submit', procesarPagoCuota);

    // Revisar URL para ver si venimos de Cuotas con intención de cobrar
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('accion') === 'cobrar_cuota' || urlParams.get('accion') === 'cobrar_todas') {
        const idCuota = parseInt(urlParams.get('id'));
        const facturaNum = urlParams.get('factura');
        
        // Activar pestaña de cuotas
        const tabCuotas = document.getElementById('tab-cuotas');
        if (tabCuotas) {
            const tabInstance = new bootstrap.Tab(tabCuotas);
            tabInstance.show();
        }
        
        // Retrasar apertura modal para asegurar que el DOM esté listo
        setTimeout(() => {
            if (urlParams.get('accion') === 'cobrar_cuota' && idCuota) {
                abrirModalPagarCuota(idCuota, false);
            } else if (urlParams.get('accion') === 'cobrar_todas' && facturaNum) {
                const cuotas = obtenerDatos('cuotas_tecnorivas') || [];
                const pendientes = cuotas.filter(x => x.factura_numero === facturaNum && (x.estado === 'pendiente' || x.estado === 'vencida'));
                if (pendientes.length > 0) {
                    pendientes.sort((a, b) => a.numero_cuota - b.numero_cuota);
                    abrirModalPagarCuota(pendientes[0].id, true);
                }
            }
        }, 300);
    }
});

function obtenerCaja() {
    return obtenerDatos(CLAVE_CAJA) || [];
}

function guardarCaja(asientos) {
    guardarDatos(CLAVE_CAJA, asientos);
}

function cargarCaja() {
    const asientos = obtenerCaja();
    
    let ingresos = asientos.filter(a => a.tipo === 'ingreso');
    let egresos = asientos.filter(a => a.tipo === 'egreso');
    
    renderResumen(asientos);
    renderIngresos(ingresos);
    renderEgresos(egresos);
    renderFacturasPendientes();
    renderCuotasPendientesCobro();
    
    actualizarEstadoCajaUI();
}

function actualizarEstadoCajaUI() {
    const cajas = obtenerDatos('cajas_tecnorivas') || [];
    const cajaAbierta = cajas.find(c => c.estado === 'abierta');
    const badge = document.getElementById('badge-estado-caja');
    const btnAbrir = document.getElementById('btn-abrir-caja');
    const btnCerrar = document.getElementById('btn-cerrar-caja');
    
    if (cajaAbierta) {
        badge.className = 'badge bg-success fs-6 px-3 py-2';
        badge.innerHTML = '<i class="bi bi-unlock-fill me-1"></i> CAJA ABIERTA';
        btnAbrir.classList.add('d-none');
        btnCerrar.classList.remove('d-none');
    } else {
        badge.className = 'badge bg-danger fs-6 px-3 py-2';
        badge.innerHTML = '<i class="bi bi-lock-fill me-1"></i> CAJA CERRADA';
        btnAbrir.classList.remove('d-none');
        btnCerrar.classList.add('d-none');
    }
}

function abrirCajaFisica(e) {
    e.preventDefault();
    const cajas = obtenerDatos('cajas_tecnorivas') || [];
    if (cajas.find(c => c.estado === 'abierta')) {
        alertaError('Ya existe una caja abierta.');
        return;
    }
    
    const monto = parseFloat(document.getElementById('caja-monto-apertura').value) || 0;
    const sesion = JSON.parse(localStorage.getItem('sesion_tecnorivas'));
    
    cajas.push({
        id: generarId(cajas),
        fechaApertura: fechaHoraAhora(),
        saldoInicial: monto,
        estado: 'abierta',
        usuario: sesion ? sesion.nombre : 'Sistema'
    });
    
    guardarDatos('cajas_tecnorivas', cajas);
    bootstrap.Modal.getInstance(document.getElementById('modal-abrir-caja')).hide();
    alertaExito('La caja ha sido abierta exitosamente.');
    actualizarEstadoCajaUI();
}

function cerrarCajaFisica(e) {
    e.preventDefault();
    const cajas = obtenerDatos('cajas_tecnorivas') || [];
    const cajaAbierta = cajas.find(c => c.estado === 'abierta');
    
    if (!cajaAbierta) {
        alertaError('No hay caja abierta para cerrar.');
        return;
    }
    
    const saldoEfectivoStr = document.getElementById('saldo-caja-general').textContent.replace(/[^\d.-]/g, '');
    const esperado = parseFloat(saldoEfectivoStr) || 0;
    const real = parseFloat(document.getElementById('caja-monto-cierre').value) || 0;
    
    cajaAbierta.estado = 'cerrada';
    cajaAbierta.fechaCierre = fechaHoraAhora();
    cajaAbierta.saldoEsperado = esperado;
    cajaAbierta.saldoReal = real;
    cajaAbierta.diferencia = real - esperado;
    
    guardarDatos('cajas_tecnorivas', cajas);
    bootstrap.Modal.getInstance(document.getElementById('modal-cerrar-caja')).hide();
    
    Swal.fire({
        icon: 'success',
        title: 'Caja Cerrada',
        html: `El turno de caja fue cerrado correctamente.<br>Diferencia registrada: <b>${formatearMoneda(cajaAbierta.diferencia)}</b>`
    });
    
    actualizarEstadoCajaUI();
}

function renderResumen(asientos) {
    let saldoEfectivo = 0;
    let saldoTransferencias = 0;
    let saldoTarjetas = 0;

    asientos.forEach(a => {
        const factor = a.tipo === 'ingreso' ? 1 : -1;
        if (a.caja === 'Caja General' || a.caja === 'Efectivo') {
            saldoEfectivo += a.monto * factor;
        } else if (a.caja === 'Banco' || a.caja === 'Transferencia') {
            saldoTransferencias += a.monto * factor;
        } else if (a.caja === 'Tarjetas por Acreditar' || a.caja === 'Tarjeta') {
            saldoTarjetas += a.monto * factor;
        }
    });

    document.getElementById('saldo-caja-general').textContent = formatearMoneda(saldoEfectivo);
    document.getElementById('saldo-caja-transferencias').textContent = formatearMoneda(saldoTransferencias);
    document.getElementById('saldo-caja-tarjetas').textContent = formatearMoneda(saldoTarjetas);
}

function renderIngresos(lista) {
    const cont = document.getElementById('tabla-ingresos');
    if (!cont) return;
    cont.innerHTML = '';
    
    lista.sort((a,b) => new Date(b.fecha) - new Date(a.fecha)).forEach(i => {
        cont.insertAdjacentHTML('beforeend', `
            <tr>
                <td>${formatearFechaHora(i.fecha)}</td>
                <td>${i.concepto}</td>
                <td>${i.relacionadoCon ? `${i.relacionadoCon.tipo.toUpperCase()} ${i.relacionadoCon.numero}` : '-'}</td>
                <td class="text-success fw-bold">+${formatearMoneda(i.monto)}</td>
                <td><span class="badge bg-secondary">${i.caja}</span></td>
            </tr>
        `);
    });
}

function renderEgresos(lista) {
    const cont = document.getElementById('tabla-egresos');
    if (!cont) return;
    cont.innerHTML = '';
    
    lista.sort((a,b) => new Date(b.fecha) - new Date(a.fecha)).forEach(e => {
        cont.insertAdjacentHTML('beforeend', `
            <tr>
                <td>${formatearFechaHora(e.fecha)}</td>
                <td>${e.concepto}</td>
                <td>${e.relacionadoCon ? `${e.relacionadoCon.tipo.toUpperCase()} ${e.relacionadoCon.numero}` : '-'}</td>
                <td class="text-danger fw-bold">-${formatearMoneda(e.monto)}</td>
                <td><span class="badge bg-secondary">${e.caja}</span></td>
            </tr>
        `);
    });
}

function renderFacturasPendientes() {
    const cont = document.getElementById('tabla-pendientes-cobro');
    if (!cont) return;
    cont.innerHTML = '';
    
    const facturas = obtenerDatos('facturas_tecnorivas') || [];
    const pendientesContado = facturas.filter(f => f.forma_pago === 'contado' && f.estadoPago === 'pendiente_cobro' && f.estado === 'emitida');
    
    if (pendientesContado.length === 0) {
        cont.innerHTML = `<tr><td colspan="5" class="text-center text-muted">No hay facturas pendientes de cobro</td></tr>`;
        return;
    }
    
    pendientesContado.forEach(f => {
        const medios = f.medios_pago ? f.medios_pago.map(m => `${m.tipo}: ${formatearMoneda(m.monto)}`).join('<br>') : '-';
        cont.insertAdjacentHTML('beforeend', `
            <tr>
                <td>${f.cliente_nombre}</td>
                <td class="fw-bold">${f.numero}</td>
                <td class="fw-bold text-primary">${formatearMoneda(f.total)}</td>
                <td style="font-size:0.85em;">${medios}</td>
                <td>
                    <button class="btn btn-sm btn-success fw-bold" onclick="cobrarFacturaContado(${f.id})"><i class="bi bi-cash me-1"></i>Cobrar Ahora</button>
                </td>
            </tr>
        `);
    });
}

async function cobrarFacturaContado(id) {
    // Validación de caja
    const cajas = obtenerDatos('cajas_tecnorivas') || [];
    const cajaAbierta = cajas.find(c => c.estado === 'abierta');
    if (!cajaAbierta) {
        alertaError('Debe abrir la caja antes de registrar un cobro.');
        return;
    }

    const facturas = obtenerDatos('facturas_tecnorivas') || [];
    const idx = facturas.findIndex(f => f.id === id);
    if (idx === -1) return;
    const f = facturas[idx];

    if (!(await confirmarAccion(`¿Confirmar cobro de la factura ${f.numero} por ${formatearMoneda(f.total)}?`, 'Cobrar Factura'))) return;

    // Registrar en Caja
    const asientos = obtenerCaja();
    
    if (f.medios_pago && f.medios_pago.length > 0) {
        f.medios_pago.forEach(m => {
            asientos.push({
                id: generarId(asientos) + Math.floor(Math.random() * 1000),
                tipo: 'ingreso',
                fecha: fechaHoraAhora(),
                concepto: `Cobro Factura Contado - ${f.numero} (${f.cliente_nombre})`,
                monto: m.monto,
                caja: m.tipo, // Efectivo, Tarjeta, Transferencia
                relacionadoCon: { tipo: 'factura', id: f.id, numero: f.numero },
                usuario: obtenerSesion().username
            });
        });
    } else {
        // Fallback
        asientos.push({
            id: generarId(asientos),
            tipo: 'ingreso',
            fecha: fechaHoraAhora(),
            concepto: `Cobro Factura Contado - ${f.numero}`,
            monto: f.total,
            caja: 'Efectivo',
            relacionadoCon: { tipo: 'factura', id: f.id, numero: f.numero },
            usuario: obtenerSesion().username
        });
    }
    
    guardarCaja(asientos);

    // Actualizar Factura
    facturas[idx].estadoPago = 'pagada';
    facturas[idx].total_pagado = f.total;
    guardarDatos('facturas_tecnorivas', facturas);

    alertaExito('Cobro registrado y asientos generados.');
    cargarCaja();
}

function registrarEgresoManual(e) {
    e.preventDefault();
    
    const concepto = document.getElementById('egreso-concepto').value;
    const monto = parseFloat(document.getElementById('egreso-monto').value);
    const cajaOrigen = document.getElementById('egreso-caja').value;
    
    const asientos = obtenerCaja();
    asientos.push({
        id: generarId(asientos),
        tipo: 'egreso',
        fecha: fechaHoraAhora(),
        concepto: `Egreso Manual: ${concepto}`,
        monto: monto,
        caja: cajaOrigen,
        relacionadoCon: null,
        usuario: obtenerSesion().username
    });
    
    guardarCaja(asientos);
    
    bootstrap.Modal.getInstance(document.getElementById('modal-egreso-manual')).hide();
    document.getElementById('form-egreso-manual').reset();
    
    alertaExito('Egreso registrado correctamente.');
    cargarCaja();
}

// ----------------------------------------------------
// MÓDULO CUOTAS EN CAJA
// ----------------------------------------------------

function renderCuotasPendientesCobro() {
    const cont = document.getElementById('tabla-cuotas-pendientes-cobro');
    if (!cont) return;
    cont.innerHTML = '';
    
    const cuotas = obtenerDatos('cuotas_tecnorivas') || [];
    const pendientes = cuotas.filter(c => c.estado === 'pendiente' || c.estado === 'vencida');
    
    if (pendientes.length === 0) {
        cont.innerHTML = '<tr><td colspan="6" class="text-center text-muted">No hay cuotas pendientes</td></tr>';
        return;
    }
    
    pendientes.sort((a, b) => new Date(a.fecha_vencimiento) - new Date(b.fecha_vencimiento)).forEach(c => {
        
        let resumenHtml = '';
        for(let i=1; i<=c.total_cuotas; i++) {
            if (i < c.numero_cuota) resumenHtml += '<div style="display:inline-block; width:10px; height:10px; background-color:#1e3a5f; margin-right:2px;"></div>';
            else if (i === c.numero_cuota) resumenHtml += '<div style="display:inline-block; width:10px; height:10px; background-color:#6c757d; margin-right:2px;"></div>';
            else resumenHtml += '<div style="display:inline-block; width:10px; height:10px; border:1px solid #dee2e6; margin-right:2px;"></div>';
        }

        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><strong>${c.cliente_nombre}</strong></td>
            <td>${c.factura_numero}</td>
            <td>
                <div class="d-flex align-items-center gap-1">
                    <div>${resumenHtml}</div>
                    <span class="small text-muted">${c.numero_cuota}/${c.total_cuotas}</span>
                </div>
            </td>
            <td class="${c.estado === 'vencida' ? 'text-danger fw-bold' : ''}">${formatearFecha(c.fecha_vencimiento)}</td>
            <td class="fw-bold">${formatearMoneda(c.monto)}</td>
            <td>
                <button class="btn btn-sm btn-success" onclick="abrirModalPagarCuota(${c.id})"><i class="bi bi-cash"></i> Cobrar</button>
            </td>
        `;
        cont.appendChild(tr);
    });
}

function abrirModalPagarCuota(id, pagarTodoSeleccionado = false) {
    const cuotas = obtenerDatos('cuotas_tecnorivas') || [];
    const c = cuotas.find(x => x.id === id);
    if (!c) return;

    // Validación de caja
    const cajas = obtenerDatos('cajas_tecnorivas') || [];
    const cajaAbierta = cajas.find(caja => caja.estado === 'abierta');
    if (!cajaAbierta) {
        alertaError('Debe abrir la caja antes de registrar un pago.');
        return;
    }

    // Validación correlativa
    if (c.numero_cuota > 1) {
        const cuotaAnterior = cuotas.find(x => x.factura_id === c.factura_id && x.numero_cuota === (c.numero_cuota - 1));
        if (cuotaAnterior && cuotaAnterior.estado !== 'pagada') {
            alertaError(`No puede pagar la cuota ${c.numero_cuota} porque la cuota ${cuotaAnterior.numero_cuota} aún está pendiente o vencida.`);
            return;
        }
    }

    // Calcular monto total restante
    const pendientesMismaFactura = cuotas.filter(x => x.factura_id === c.factura_id && (x.estado === 'pendiente' || x.estado === 'vencida'));
    const montoTotalRestante = pendientesMismaFactura.reduce((sum, item) => sum + item.monto, 0);

    document.getElementById('pago-cuota-id').value = c.id;
    document.getElementById('pago-cuota-info').textContent = `Factura ${c.factura_numero} - Cliente: ${c.cliente_nombre} - Cuota ${c.numero_cuota}/${c.total_cuotas}`;
    
    // Configurar radios
    const containerTodo = document.getElementById('container-pago-tipo-todo');
    const radioActual = document.getElementById('pago-tipo-actual');
    const radioTodo = document.getElementById('pago-tipo-todo');
    const montoFinalHtml = document.getElementById('pago-cuota-monto');

    if (pendientesMismaFactura.length > 1) {
        containerTodo.classList.remove('d-none');
        document.getElementById('pago-todo-monto').textContent = formatearMoneda(montoTotalRestante);
    } else {
        containerTodo.classList.add('d-none');
    }

    if (pagarTodoSeleccionado && pendientesMismaFactura.length > 1) {
        radioTodo.checked = true;
        montoFinalHtml.textContent = formatearMoneda(montoTotalRestante);
        document.getElementById('pago-cuota-info').textContent = `Factura ${c.factura_numero} - Cliente: ${c.cliente_nombre} - ${pendientesMismaFactura.length} Cuotas restantes`;
    } else {
        radioActual.checked = true;
        montoFinalHtml.textContent = formatearMoneda(c.monto);
    }

    // Eventos para cambiar el monto visualmente
    radioActual.onchange = () => { 
        montoFinalHtml.textContent = formatearMoneda(c.monto); 
        document.getElementById('pago-cuota-info').textContent = `Factura ${c.factura_numero} - Cliente: ${c.cliente_nombre} - Cuota ${c.numero_cuota}/${c.total_cuotas}`;
    };
    radioTodo.onchange = () => { 
        montoFinalHtml.textContent = formatearMoneda(montoTotalRestante); 
        document.getElementById('pago-cuota-info').textContent = `Factura ${c.factura_numero} - Cliente: ${c.cliente_nombre} - ${pendientesMismaFactura.length} Cuotas restantes`;
    };

    if (c.estado === 'vencida') {
        document.getElementById('alerta-vencimiento').classList.remove('d-none');
    } else {
        document.getElementById('alerta-vencimiento').classList.add('d-none');
    }

    document.getElementById('pago-cuota-metodo').value = 'Efectivo';
    bootstrap.Modal.getOrCreateInstance(document.getElementById('modal-pagar-cuota')).show();
}

function procesarPagoCuota(e) {
    e.preventDefault();
    const id = parseInt(document.getElementById('pago-cuota-id').value);
    const metodo = document.getElementById('pago-cuota-metodo').value;
    const tipoPago = document.querySelector('input[name="pago-tipo"]:checked').value;

    const cuotas = obtenerDatos('cuotas_tecnorivas') || [];
    const idx = cuotas.findIndex(x => x.id === id);
    if (idx === -1) return;
    const cuotaActual = cuotas[idx];

    const cajaTecnorivas = obtenerDatos('caja_tecnorivas') || [];
    const pendientesMismaFactura = cuotas.filter(x => x.factura_id === cuotaActual.factura_id && (x.estado === 'pendiente' || x.estado === 'vencida'));
    
    let cuotasAPagar = [];
    if (tipoPago === 'todo') {
        cuotasAPagar = pendientesMismaFactura;
    } else {
        cuotasAPagar = [cuotaActual];
    }

    const totalCobrado = cuotasAPagar.reduce((sum, item) => sum + item.monto, 0);
    const descripcion = tipoPago === 'todo' ? `Cobro ${cuotasAPagar.length} Cuotas Restantes - Factura ${cuotaActual.factura_numero}` : `Cobro Cuota ${cuotaActual.numero_cuota}/${cuotaActual.total_cuotas} - Factura ${cuotaActual.factura_numero}`;
    
    // Ingresar a Caja
    cajaTecnorivas.push({
        id: generarId(cajaTecnorivas),
        tipo: 'ingreso',
        fecha: fechaHoraAhora(),
        concepto: descripcion,
        monto: totalCobrado,
        caja: metodo === 'Efectivo' ? 'Caja General' : (metodo === 'Tarjeta' ? 'Tarjetas por Acreditar' : 'Banco'),
        relacionadoCon: { tipo: 'cuota', id: cuotaActual.id, numero: cuotaActual.factura_numero },
        usuario: obtenerSesion().nombre
    });
    guardarDatos('caja_tecnorivas', cajaTecnorivas);

    // Actualizar Cuotas
    cuotasAPagar.forEach(c => {
        const i = cuotas.findIndex(x => x.id === c.id);
        cuotas[i].estado = 'pagada';
        cuotas[i].fecha_pago = fechaHoraAhora();
        cuotas[i].metodo_pago = metodo;
    });
    guardarDatos('cuotas_tecnorivas', cuotas);

    // Actualizar Factura
    const todasPagadas = cuotas.filter(x => x.factura_id === cuotaActual.factura_id).every(x => x.estado === 'pagada');
    if (todasPagadas) {
        const facturas = obtenerDatos('facturas_tecnorivas') || [];
        const fIdx = facturas.findIndex(f => f.id === cuotaActual.factura_id);
        if (fIdx !== -1) {
            facturas[fIdx].estadoPago = 'pagada';
            guardarDatos('facturas_tecnorivas', facturas);
        }
    }

    bootstrap.Modal.getInstance(document.getElementById('modal-pagar-cuota')).hide();
    
    Swal.fire({
        icon: 'success',
        title: 'Pago Registrado',
        text: 'El cobro fue ingresado a la caja correctamente.',
        confirmButtonText: 'Aceptar'
    }).then(() => {
        cargarCaja();
    });
}
