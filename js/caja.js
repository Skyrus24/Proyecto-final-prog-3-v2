/**
 * Modulo de Caja
 * Gestiona la apertura, cierre y movimientos del flujo de caja.
 * Permite registrar ingresos y egresos de forma manual o automatica (cobros).
 */
const CLAVE_CAJA = 'cajas_tecnorivas';

document.addEventListener('DOMContentLoaded', () => {
    const sesion = protegerPagina();
    if (!sesion) return;

    if (!localStorage.getItem(CLAVE_CAJA)) {
        localStorage.setItem(CLAVE_CAJA, JSON.stringify([]));
    }

    configurarBotonesCaja();
    actualizarVistaCaja();

    document.getElementById('form-movimiento')?.addEventListener('submit', registrarMovimientoManual);
});

// ==========================================
// FUNCIONES DE ACCESO A DATOS (LOCALSTORAGE)
// ==========================================

// Retorna el historial completo de cajas registradas
function obtenerCajas() {
    return obtenerDatos(CLAVE_CAJA);
}

// Guarda el arreglo actualizado de cajas en localStorage
function guardarCajas(cajas) {
    guardarDatos(CLAVE_CAJA, cajas);
}

// Busca en el arreglo de cajas aquella que tenga el estado "abierta"
function obtenerCajaActiva() {
    const cajas = obtenerCajas();
    return cajas.find(c => c.estado === 'abierta');
}

// ==========================================
// RENDERIZADO Y CONTROL DE VISTAS (UI)
// ==========================================

// Actualiza el DOM (botones, textos, colores) dependiendo de si hay una caja abierta o no
function actualizarVistaCaja() {
    const cajaActiva = obtenerCajaActiva();
    const btnAbrir = document.getElementById('btn-abrir-caja');
    const btnCerrar = document.getElementById('btn-cerrar-caja');
    const btnMovimiento = document.getElementById('btn-movimiento-manual');
    const badgeEstado = document.getElementById('caja-estado-badge');
    const saldoContainer = document.getElementById('caja-saldo-container');
    const saldoActualText = document.getElementById('caja-saldo-actual');
    const contMov = document.getElementById('contenedor-movimientos');
    const infoApertura = document.getElementById('caja-info-apertura');

    if (cajaActiva) {
        btnAbrir?.classList.add('d-none');
        btnCerrar?.classList.remove('d-none');
        btnMovimiento?.classList.remove('d-none');
        document.getElementById('btn-cobrar-presupuesto-caja')?.classList.remove('d-none');
        saldoContainer?.classList.remove('d-none');
        contMov?.classList.remove('d-none');

        if (badgeEstado) badgeEstado.innerHTML = '<span class="badge bg-success">ABIERTA</span>';
        if (infoApertura) infoApertura.textContent = `Abierta por ${cajaActiva.cajero} el ${formatearFechaHora(cajaActiva.fechaApertura)}`;
        
        const saldoFinal = cajaActiva.montoInicial + cajaActiva.ingresos - cajaActiva.egresos;
        if (saldoActualText) saldoActualText.textContent = formatearMoneda(saldoFinal);

        renderMovimientosActivos(cajaActiva.movimientos);
    } else {
        btnAbrir?.classList.remove('d-none');
        btnCerrar?.classList.add('d-none');
        btnMovimiento?.classList.add('d-none');
        document.getElementById('btn-cobrar-presupuesto-caja')?.classList.add('d-none');
        saldoContainer?.classList.add('d-none');
        contMov?.classList.add('d-none');

        if (badgeEstado) badgeEstado.innerHTML = '<span class="badge bg-secondary">CERRADA</span>';
        if (infoApertura) infoApertura.textContent = 'Abre la caja para comenzar a operar.';
    }

    renderHistorialCajas();
    renderCuentasCobrar();
    renderCuentasPagar();
}

// Configura los event listeners para los botones principales (Abrir, Cerrar, Nuevo Movimiento)
function configurarBotonesCaja() {
    document.getElementById('btn-abrir-caja')?.addEventListener('click', () => {
        let saldoAnterior = 0;
        const cajas = obtenerCajas().filter(c => c.estado === 'cerrada');
        if (cajas.length > 0) {
            const ultimaCaja = cajas[cajas.length - 1];
            saldoAnterior = ultimaCaja.montoInicial + ultimaCaja.ingresos - ultimaCaja.egresos;
        }

        Swal.fire({
            title: 'Abrir Caja',
            input: 'number',
            inputLabel: 'Monto Inicial (Gs.)',
            inputValue: saldoAnterior,
            inputAttributes: { min: 0, step: 1 },
            showCancelButton: true,
            confirmButtonText: 'Abrir Caja',
            cancelButtonText: 'Cancelar',
            preConfirm: (val) => {
                if (val === '' || isNaN(val) || val < 0) Swal.showValidationMessage('Ingrese un monto válido');
                return parseFloat(val);
            }
        }).then(res => {
            if (res.isConfirmed) {
                abrirCaja(res.value);
            }
        });
    });

    document.getElementById('btn-cerrar-caja')?.addEventListener('click', async () => {
        if (!(await confirmarAccion('¿Está seguro de cerrar la caja actual?', 'Cerrar Caja'))) return;
        cerrarCaja();
    });

    document.getElementById('btn-movimiento-manual')?.addEventListener('click', () => {
        document.getElementById('form-movimiento').reset();
        bootstrap.Modal.getOrCreateInstance(document.getElementById('modal-movimiento')).show();
    });

    document.getElementById('btn-cobrar-presupuesto-caja')?.addEventListener('click', () => {
        const selectId = document.getElementById('caja-presupuesto-id');
        selectId.innerHTML = '<option value="">-- Seleccionar --</option>';
        const presupuestos = obtenerDatos('presupuestos_tecnorivas').filter(p => p.estado === 'aprobado');
        presupuestos.forEach(p => {
            selectId.insertAdjacentHTML('beforeend', `<option value="${p.id}" data-total="${p.total}">${p.numero} - ${formatearMoneda(p.total)}</option>`);
        });
        document.getElementById('form-cobrar-presupuesto-caja').reset();
        document.getElementById('div-caja-presupuesto-cuotas').classList.add('d-none');
        bootstrap.Modal.getOrCreateInstance(document.getElementById('modal-cobrar-presupuesto-caja')).show();
    });
}

// ==========================================
// OPERACIONES PRINCIPALES DE CAJA
// ==========================================

// Inicializa una nueva sesion de caja con el monto proveido por el cajero
function abrirCaja(montoInicial) {
    if (obtenerCajaActiva()) {
        alertaError('Ya hay una caja abierta.'); return;
    }
    const sesion = obtenerSesion();
    const cajas = obtenerCajas();
    const nuevaCaja = {
        id: generarId(cajas),
        cajero: sesion.nombre,
        fechaApertura: fechaHoraAhora(),
        fechaCierre: null,
        montoInicial: montoInicial,
        ingresos: 0,
        egresos: 0,
        estado: 'abierta',
        movimientos: [{
            hora: fechaHoraAhora(),
            tipo: 'ingreso',
            concepto: 'Apertura de Caja',
            monto: montoInicial
        }]
    };
    cajas.push(nuevaCaja);
    guardarCajas(cajas);
    alertaExito('Caja abierta exitosamente.');
    actualizarVistaCaja();
}

// Finaliza la sesion actual de caja, marcandola como "cerrada" y calculando el estado final
function cerrarCaja() {
    const cajas = obtenerCajas();
    const idx = cajas.findIndex(c => c.estado === 'abierta');
    if (idx === -1) return;
    cajas[idx].estado = 'cerrada';
    cajas[idx].fechaCierre = fechaHoraAhora();
    guardarCajas(cajas);
    alertaExito('Caja cerrada correctamente.');
    actualizarVistaCaja();
}

// Registra un movimiento ingresado manualmente desde el modal (ej. Gastos diarios)
function registrarMovimientoManual(e) {
    e.preventDefault();
    const tipo = document.getElementById('mov-tipo').value;
    const concepto = document.getElementById('mov-concepto').value.trim();
    const monto = parseFloat(document.getElementById('mov-monto').value);

    if (!concepto || isNaN(monto) || monto <= 0) {
        alertaError('Ingrese datos válidos.'); return;
    }

    agregarMovimientoCaja(tipo, concepto, monto);
    bootstrap.Modal.getInstance(document.getElementById('modal-movimiento')).hide();
    setTimeout(() => {
        alertaExito('Movimiento registrado.');
    }, 300);
}

// Funcion core para agregar cualquier tipo de movimiento al arreglo
function agregarMovimientoCaja(tipo, concepto, monto) {
    const cajas = obtenerCajas();
    const idx = cajas.findIndex(c => c.estado === 'abierta');
    if (idx === -1) {
        alertaError('No hay caja abierta para registrar el movimiento.'); return false;
    }

    if (tipo === 'egreso') {
        const saldoActual = cajas[idx].montoInicial + cajas[idx].ingresos - cajas[idx].egresos;
        if (saldoActual - monto < 0) {
            alertaError('La caja no puede quedar con saldo negativo.'); return false;
        }
    }

    const mov = {
        hora: fechaHoraAhora(),
        tipo: tipo,
        concepto: concepto,
        monto: monto
    };

    cajas[idx].movimientos.push(mov);
    if (tipo === 'ingreso') cajas[idx].ingresos += monto;
    else cajas[idx].egresos += monto;

    guardarCajas(cajas);
    actualizarVistaCaja();
    return true;
}

window.cobrarPresupuestoEnCaja = function(numero, monto) {
    return agregarMovimientoCaja('ingreso', `Cobro Presupuesto ${numero}`, monto);
};

function renderMovimientosActivos(movs) {
    const tbody = document.getElementById('tabla-movimientos-actual');
    if (!tbody) return;
    
    if (movs.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" class="text-center text-muted py-3">Sin movimientos</td></tr>';
        return;
    }

    tbody.innerHTML = movs.map(m => `
        <tr>
            <td>${new Date(m.hora).toLocaleTimeString('es-DO')}</td>
            <td><span class="badge ${m.tipo === 'ingreso' ? 'bg-success' : 'bg-danger'}">${m.tipo.toUpperCase()}</span></td>
            <td>${m.concepto}</td>
            <td class="${m.tipo === 'ingreso' ? 'text-success' : 'text-danger'} fw-bold">${m.tipo === 'ingreso' ? '+' : '-'}${formatearMoneda(m.monto)}</td>
        </tr>
    `).reverse().join('');
}

function renderHistorialCajas() {
    const tbody = document.getElementById('tabla-historial-cajas');
    if (!tbody) return;
    const cajas = obtenerCajas().filter(c => c.estado === 'cerrada').reverse();

    if (cajas.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" class="text-center text-muted py-4">No hay historial de cajas</td></tr>';
        document.getElementById('contador-historial').textContent = '0 sesiones';
        return;
    }

    document.getElementById('contador-historial').textContent = `${cajas.length} sesiones`;
    
    tbody.innerHTML = cajas.map(c => `
        <tr>
            <td>${formatearFechaHora(c.fechaApertura)}</td>
            <td>${c.cajero}</td>
            <td>${formatearMoneda(c.montoInicial)}</td>
            <td class="text-success">+${formatearMoneda(c.ingresos)}</td>
            <td class="text-danger">-${formatearMoneda(c.egresos)}</td>
            <td class="fw-bold text-primary">${formatearMoneda(c.montoInicial + c.ingresos - c.egresos)}</td>
            <td><span class="badge bg-secondary">CERRADA</span></td>
        </tr>
    `).join('');
}

function formatearFechaHora(iso) {
    if (!iso) return '-';
    return new Date(iso).toLocaleString('es-DO', { 
        year: 'numeric', month: '2-digit', day: '2-digit',
        hour: '2-digit', minute:'2-digit'
    });
}

document.addEventListener('DOMContentLoaded', () => {
    const sesion = protegerPagina();
    if (!sesion) return;
    configurarBotonesCaja();
    actualizarVistaCaja();
    
    document.getElementById('form-movimiento')?.addEventListener('submit', (e) => {
        e.preventDefault();
        const tipo = document.getElementById('mov-tipo').value;
        const concepto = document.getElementById('mov-concepto').value.trim();
        const monto = parseFloat(document.getElementById('mov-monto').value);
        registrarMovimientoManual(tipo, concepto, monto);
    });

    document.getElementById('caja-presupuesto-condicion')?.addEventListener('change', (e) => {
        const divCuotas = document.getElementById('div-caja-presupuesto-cuotas');
        if (e.target.value === 'credito') {
            divCuotas.classList.remove('d-none');
            document.getElementById('caja-presupuesto-cuotas').required = true;
        } else {
            divCuotas.classList.add('d-none');
            document.getElementById('caja-presupuesto-cuotas').required = false;
        }
    });

    document.getElementById('form-cobrar-presupuesto-caja')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const idStr = document.getElementById('caja-presupuesto-id').value;
        if (!idStr) { alertaError('Seleccione un presupuesto.'); return; }
        const id = parseInt(idStr);
        const condicion = document.getElementById('caja-presupuesto-condicion').value;
        const metodo = document.getElementById('caja-presupuesto-metodo').value;
        const cuotas = condicion === 'credito' ? parseInt(document.getElementById('caja-presupuesto-cuotas').value) : 1;

        const presupuestos = obtenerDatos('presupuestos_tecnorivas');
        const p = presupuestos.find(x => x.id === id);
        if (!p) return;

        if (!(await confirmarAccion(`¿Confirmar cobro por ${condicion}?`, `Presupuesto ${p.numero}`))) return;
        
        p.condicion = condicion;
        p.metodoPago = metodo;
        p.cantidadCuotas = cuotas;
        p.planPagos = [];
        
        if (condicion === 'contado') {
            p.estado = 'cobrado';
            p.planPagos.push({
                nroCuota: 1,
                monto: p.total,
                vencimiento: fechaHoraAhora().split('T')[0],
                estado: 'pagado',
                fechaPago: fechaHoraAhora()
            });
            agregarMovimientoCaja('ingreso', `Cobro Presupuesto ${p.numero} (${metodo})`, p.total);
        } else {
            p.estado = 'credito';
            const montoCuota = Math.round(p.total / cuotas);
            let fechaActual = new Date();
            for (let i = 1; i <= cuotas; i++) {
                fechaActual.setDate(fechaActual.getDate() + 30);
                p.planPagos.push({
                    nroCuota: i,
                    monto: montoCuota,
                    vencimiento: fechaActual.toISOString().split('T')[0],
                    estado: 'pendiente',
                    fechaPago: null
                });
            }
        }
        
        // Modificar stock
        const articulos = obtenerDatos('articulos_tecnorivas');
        const movimientosInv = obtenerDatos('movimientos_inventario');
        p.detalle.forEach(det => {
            const artIdx = articulos.findIndex(a => a.id === det.itemId);
            if (artIdx !== -1) {
                const saldoA = articulos[artIdx].stock;
                articulos[artIdx].stock -= det.cantidad;
                const saldoB = articulos[artIdx].stock;
                movimientosInv.push({
                    fecha: fechaHoraAhora(),
                    articuloId: det.itemId,
                    tipo: 'salida',
                    cantidad: det.cantidad,
                    saldoA: saldoA,
                    saldoB: saldoB,
                    referencia: `Venta Presupuesto ${p.numero}`
                });
            }
        });
        guardarDatos('articulos_tecnorivas', articulos);
        guardarDatos('movimientos_inventario', movimientosInv);
        
        guardarDatos('presupuestos_tecnorivas', presupuestos);
        bootstrap.Modal.getInstance(document.getElementById('modal-cobrar-presupuesto-caja')).hide();
        setTimeout(() => {
            alertaExito(`Presupuesto cobrado a ${condicion}`);
        }, 300);
        
        renderCuentasCobrar();
        renderCuentasPagar();
    });
});

// ==========================================
// CUENTAS POR COBRAR (CLIENTES)
// ==========================================

function renderCuentasCobrar() {
    const tbody = document.getElementById('tabla-cuentas-cobrar');
    if (!tbody) return;
    
    const presupuestos = obtenerDatos('presupuestos_tecnorivas');
    const clientes = obtenerDatos('clientes_tecnorivas');
    let html = '';
    
    presupuestos.forEach(p => {
        if (p.planPagos && p.planPagos.length > 0) {
            const cliente = clientes.find(c => c.id === p.clienteId);
            const nombreCliente = cliente ? cliente.nombre : 'Desconocido';
            
            p.planPagos.forEach(cuota => {
                if (cuota.estado === 'pendiente') {
                    html += `
                        <tr>
                            <td>${p.numero}</td>
                            <td>${nombreCliente}</td>
                            <td>${cuota.nroCuota} / ${p.cantidadCuotas}</td>
                            <td>${cuota.vencimiento}</td>
                            <td>${formatearMoneda(cuota.monto)}</td>
                            <td><span class="badge bg-warning text-dark">Pendiente</span></td>
                            <td>
                                <button class="btn btn-sm btn-success" onclick="cobrarCuota(${p.id}, ${cuota.nroCuota}, ${cuota.monto})" title="Cobrar Cuota">
                                    <i class="bi bi-cash-coin"></i> Cobrar
                                </button>
                            </td>
                        </tr>
                    `;
                }
            });
        }
    });
    
    if (html === '') {
        html = '<tr><td colspan="7" class="text-center text-muted py-4">No hay cuotas pendientes por cobrar</td></tr>';
    }
    tbody.innerHTML = html;
}

window.cobrarCuota = async function(idPresupuesto, nroCuota, monto) {
    const cajaActiva = obtenerCajaActiva();
    if (!cajaActiva) { alertaError('Abre la caja primero.'); return; }
    
    if (!(await confirmarAccion(`¿Registrar cobro de la Cuota ${nroCuota} por ${formatearMoneda(monto)}?`, 'Cobrar Cuota'))) return;
    
    const presupuestos = obtenerDatos('presupuestos_tecnorivas');
    const idx = presupuestos.findIndex(p => p.id === idPresupuesto);
    if (idx === -1) return;
    
    const p = presupuestos[idx];
    const cuota = p.planPagos.find(c => c.nroCuota === nroCuota);
    if (cuota) {
        cuota.estado = 'pagado';
        cuota.fechaPago = fechaHoraAhora();
        
        // Verificar si se completaron todas las cuotas
        if (p.planPagos.every(c => c.estado === 'pagado')) {
            p.estado = 'cobrado';
        }
    }
    guardarDatos('presupuestos_tecnorivas', presupuestos);
    
    agregarMovimientoCaja('ingreso', `Cobro Cuota ${nroCuota} - Pres. ${p.numero}`, monto);
    renderCuentasCobrar();
    alertaExito('Cuota cobrada correctamente.');
};

// ==========================================
// CUENTAS POR PAGAR (PROVEEDORES)
// ==========================================

function renderCuentasPagar() {
    const tbody = document.getElementById('tabla-cuentas-pagar');
    if (!tbody) return;
    
    const compras = obtenerDatos('compras_tecnorivas');
    const proveedores = obtenerDatos('proveedores_tecnorivas');
    let html = '';
    
    compras.forEach(c => {
        if (c.planPagos && c.planPagos.length > 0) {
            const proveedor = proveedores.find(p => p.id === c.proveedorId);
            const nombreProveedor = proveedor ? proveedor.nombre : 'Desconocido';
            
            c.planPagos.forEach(cuota => {
                if (cuota.estado === 'pendiente') {
                    html += `
                        <tr>
                            <td>${c.numero}</td>
                            <td>${nombreProveedor}</td>
                            <td>${cuota.nroCuota} / ${c.cantidadCuotas}</td>
                            <td>${cuota.vencimiento}</td>
                            <td>${formatearMoneda(cuota.monto)}</td>
                            <td><span class="badge bg-warning text-dark">Pendiente</span></td>
                            <td>
                                <button class="btn btn-sm btn-danger" onclick="pagarCuota(${c.id}, ${cuota.nroCuota}, ${cuota.monto})" title="Pagar Cuota">
                                    <i class="bi bi-wallet2"></i> Pagar
                                </button>
                            </td>
                        </tr>
                    `;
                }
            });
        }
    });
    
    if (html === '') {
        html = '<tr><td colspan="7" class="text-center text-muted py-4">No hay cuotas pendientes por pagar</td></tr>';
    }
    tbody.innerHTML = html;
}

window.pagarCuota = async function(idCompra, nroCuota, monto) {
    const cajaActiva = obtenerCajaActiva();
    if (!cajaActiva) { alertaError('Abre la caja primero.'); return; }
    
    if (!(await confirmarAccion(`¿Registrar pago de la Cuota ${nroCuota} por ${formatearMoneda(monto)}?`, 'Pagar Cuota'))) return;
    
    const compras = obtenerDatos('compras_tecnorivas');
    const idx = compras.findIndex(c => c.id === idCompra);
    if (idx === -1) return;
    
    const c = compras[idx];
    const cuota = c.planPagos.find(ct => ct.nroCuota === nroCuota);
    if (!cuota) return;

    if (!agregarMovimientoCaja('egreso', `Pago Cuota ${nroCuota} - Compra ${c.numero}`, monto)) {
        return;
    }

    cuota.estado = 'pagado';
    cuota.fechaPago = fechaHoraAhora();
    
    // Verificar si se completaron todas
    if (c.planPagos.every(ct => ct.estado === 'pagado')) {
        c.estado = 'pagado';
    }
    
    guardarDatos('compras_tecnorivas', compras);
    renderCuentasPagar();
    alertaExito('Cuota pagada correctamente.');
};
