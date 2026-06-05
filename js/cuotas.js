/**
 * cuotas.js - Módulo de Control de Cuotas
 */

const CLAVE_CUOTAS = 'cuotas_tecnorivas';

let paginadorCuotas;
let filteredCuotas = [];

document.addEventListener('DOMContentLoaded', () => {
    const sesion = protegerPagina();
    if (!sesion) return;

    if (!localStorage.getItem(CLAVE_CUOTAS)) localStorage.setItem(CLAVE_CUOTAS, '[]');

    paginadorCuotas = new Paginador('tabla-body-cuotas', 'paginacion-cuotas', 15);
    
    actualizarVencimientosCuotas();
    cargarCuotas();
    
    configurarFiltrosYBusqueda();
    configurarExportarCuotas();
    
    // Ocultar botones de cobrar para rol que no puede (solo admin/cajero)
    if (sesion.rol === 'vendedor' || sesion.rol === 'tecnico') {
        const btnCobrar = document.querySelectorAll('.btn-cobrar');
        if (btnCobrar) btnCobrar.forEach(b => b.remove());
    }

    // Fix manual para los dropdowns de Acciones sin Popper.js
    document.addEventListener('click', function(e) {
        const toggle = e.target.closest('[data-accion="dropdown"]');
        
        if (toggle) {
            e.stopPropagation();
            const menu = toggle.nextElementSibling;
            if (menu && menu.classList.contains('dropdown-menu')) {
                const isShowing = menu.classList.contains('show');
                
                // Cerrar todos los menús primero
                document.querySelectorAll('.dropdown-menu.show').forEach(m => {
                    m.classList.remove('show');
                    m.style.display = '';
                });
                
                if (!isShowing) {
                    menu.classList.add('show');
                    menu.style.display = 'block';
                    menu.style.position = 'absolute';
                    menu.style.zIndex = '1050';
                    menu.style.right = '0';
                    menu.style.left = 'auto';
                    menu.style.top = '100%';
                    menu.style.marginTop = '4px';
                    menu.style.transform = 'none';
                }
            }
        } else {
            // Clic fuera, cerrar todos
            document.querySelectorAll('.dropdown-menu.show').forEach(m => {
                m.classList.remove('show');
                m.style.display = '';
            });
        }
    });
});

function obtenerCuotas() {
    return obtenerDatos(CLAVE_CUOTAS);
}

function guardarCuotas(cuotas) {
    guardarDatos(CLAVE_CUOTAS, cuotas);
}

function actualizarVencimientosCuotas() {
    let cuotas = obtenerCuotas();
    let modificado = false;
    const hoy = new Date(fechaHoy());
    
    cuotas.forEach(c => {
        if (c.estado === 'pendiente' && c.fecha_vencimiento) {
            const venc = new Date(c.fecha_vencimiento);
            if (hoy > venc) {
                c.estado = 'vencida';
                modificado = true;
            }
        }
    });
    
    if (modificado) guardarCuotas(cuotas);
}

function cargarCuotas() {
    let cuotas = obtenerCuotas();
    
    // Filtro búsqueda
    const inputBuscar = document.getElementById('buscador-cuotas');
    if (inputBuscar && inputBuscar.value.trim() !== '') {
        const q = inputBuscar.value.toLowerCase();
        cuotas = cuotas.filter(c => 
            c.cliente_nombre.toLowerCase().includes(q) || 
            c.factura_numero.toLowerCase().includes(q)
        );
    }
    
    // Separar en Pendientes/Vencidas y Pagadas
    const pendientes = cuotas.filter(c => c.estado === 'pendiente' || c.estado === 'vencida');
    const pagadas = cuotas.filter(c => c.estado === 'pagada');
    
    // Ordenar pendientes: primero las vencidas
    pendientes.sort((a, b) => {
        if (a.estado !== b.estado) return a.estado === 'vencida' ? -1 : 1;
        return new Date(a.fecha_vencimiento) - new Date(b.fecha_vencimiento);
    });

    // Ordenar pagadas: más recientes primero
    pagadas.sort((a, b) => new Date(b.fecha_pago) - new Date(a.fecha_pago));

    filteredCuotas = pendientes; // Para el buscador/paginador, usaremos pendientes
    
    const el = document.getElementById('contador-cuotas');
    if (el) el.textContent = `${pendientes.length} cuota(s) pendiente(s)`;
    
    // Render Pendientes
    const contPend = document.getElementById('tabla-body-cuotas-pendientes');
    if (contPend) renderFilasCuotas(pendientes, contPend);

    // Render Pagadas
    const contPagadas = document.getElementById('tabla-body-cuotas-pagadas');
    if (contPagadas) renderCuotasPagadas(pagadas, contPagadas);

    actualizarEstadisticas();
}

function actualizarEstadisticas() {
    const cuotas = obtenerCuotas();
    let totalPendiente = 0;
    let totalVencido = 0;
    let totalCobradoMes = 0;
    
    const mesActual = new Date().getMonth();
    const añoActual = new Date().getFullYear();

    cuotas.forEach(c => {
        if (c.estado === 'pendiente') {
            totalPendiente += c.monto;
        } else if (c.estado === 'vencida') {
            totalPendiente += c.monto;
            totalVencido += c.monto;
        } else if (c.estado === 'pagada' && c.fecha_pago) {
            const fp = new Date(c.fecha_pago);
            if (fp.getMonth() === mesActual && fp.getFullYear() === añoActual) {
                totalCobradoMes += c.monto;
            }
        }
    });

    document.getElementById('stat-total-pendiente').textContent = formatearMoneda(totalPendiente);
    document.getElementById('stat-total-vencido').textContent = formatearMoneda(totalVencido);
    document.getElementById('stat-total-cobrado').textContent = formatearMoneda(totalCobradoMes);
}

function renderFilasCuotas(lista, cont) {
    cont.innerHTML = '';
    const sesion = obtenerSesion();
    const esAdminOCajero = sesion && (sesion.rol === 'admin' || sesion.rol === 'superusuario' || sesion.rol === 'cajero');

    if (lista.length === 0) {
        cont.innerHTML = `<tr><td colspan="9" class="text-center text-muted py-4"><i class="bi bi-inbox fs-3 d-block mb-2"></i>No hay cuotas pendientes</td></tr>`;
        return;
    }
    
    lista.forEach(c => {
        let badgeColor = c.estado === 'vencida' ? 'bg-danger' : 'bg-warning text-dark';
        
        // Calcular días vencidos
        const hoy = new Date(fechaHoy());
        const venc = new Date(c.fecha_vencimiento);
        const diffTime = hoy - venc;
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        let diasVencidosHtml = '-';
        if (diffDays > 0) {
            diasVencidosHtml = `<span class="text-danger fw-bold">${diffDays} DÍAS</span>`;
        } else if (diffDays === 0) {
            diasVencidosHtml = `<span class="text-warning fw-bold">VENCE HOY</span>`;
        } else {
            diasVencidosHtml = `<span class="text-muted">Faltan ${Math.abs(diffDays)} días</span>`;
        }
        
        // Generar resumen visual de cuotas (cajas de progreso)
        let resumenHtml = '';
        for(let i=1; i<=c.total_cuotas; i++) {
            if (i < c.numero_cuota) resumenHtml += '<div style="display:inline-block; width:12px; height:12px; background-color:#1e3a5f; margin-right:2px; border-radius:2px;"></div>';
            else if (i === c.numero_cuota) resumenHtml += '<div style="display:inline-block; width:12px; height:12px; background-color:#6c757d; margin-right:2px; border-radius:2px;"></div>';
            else resumenHtml += '<div style="display:inline-block; width:12px; height:12px; border:1px solid #dee2e6; margin-right:2px; border-radius:2px;"></div>';
        }

        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><strong>${c.cliente_nombre}</strong></td>
            <td>
                <div>${c.factura_numero}</div>
                <div class="text-muted small">${formatearFecha(c.fecha_vencimiento)}</div> <!-- Usando fecha de la cuota como ref -->
            </td>
            <td>
                <div class="d-flex align-items-center gap-2">
                    <div>${resumenHtml}</div>
                    <span class="small text-muted">${c.numero_cuota} de ${c.total_cuotas}</span>
                </div>
            </td>
            <td class="${c.estado === 'vencida' ? 'text-danger fw-bold' : ''}">${formatearFecha(c.fecha_vencimiento)}</td>
            <td>
                <div class="fw-bold">${formatearMoneda(c.monto)}</div>
                <div class="text-muted" style="font-size:11px;">Capital: ${formatearMoneda(c.monto)}</div>
            </td>
            <td>${diasVencidosHtml}</td>
            <td><span class="badge ${badgeColor}">${c.estado.toUpperCase()}</span></td>
            <td>
                <div class="dropdown position-relative">
                    <button class="btn btn-sm btn-outline-secondary dropdown-toggle" type="button" data-accion="dropdown">
                        <i class="bi bi-gear"></i> Acciones
                    </button>
                    <ul class="dropdown-menu shadow-sm" style="min-width: 140px; font-size: 0.85rem; padding: 4px 0;">
                        ${esAdminOCajero ? `
                        <li><a class="dropdown-item py-1 px-3" href="caja.html?accion=cobrar_cuota&id=${c.id}"><i class="bi bi-cash me-1"></i> Pagar Cuota</a></li>
                        <li><a class="dropdown-item py-1 px-3" href="caja.html?accion=cobrar_todas&factura=${c.factura_numero}"><i class="bi bi-check-all me-1"></i> Pagar Todo</a></li>
                        <li><hr class="dropdown-divider my-1"></li>
                        ` : ''}
                        <li><a class="dropdown-item py-1 px-3" href="javascript:void(0)" onclick="mostrarHistoricoCuotas(${c.factura_id})"><i class="bi bi-clock-history me-1"></i> Histórico</a></li>
                    </ul>
                </div>
            </td>
        `;
        cont.appendChild(tr);
    });
}

function renderCuotasPagadas(lista, cont) {
    cont.innerHTML = '';
    const sesion = obtenerSesion();
    const esAdminOCajero = sesion && (sesion.rol === 'admin' || sesion.rol === 'superusuario' || sesion.rol === 'cajero');

    if (lista.length === 0) {
        cont.innerHTML = `<tr><td colspan="7" class="text-center text-muted py-4">No hay cuotas pagadas</td></tr>`;
        return;
    }
    
    lista.forEach(c => {
        let resumenHtml = '';
        for(let i=1; i<=c.total_cuotas; i++) {
            if (i <= c.numero_cuota) resumenHtml += '<div style="display:inline-block; width:12px; height:12px; background-color:#1e3a5f; margin-right:2px; border-radius:2px;"></div>';
            else resumenHtml += '<div style="display:inline-block; width:12px; height:12px; border:1px solid #dee2e6; margin-right:2px; border-radius:2px;"></div>';
        }

        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><strong>${c.cliente_nombre}</strong></td>
            <td>
                <div>${c.factura_numero}</div>
            </td>
            <td>
                <div class="d-flex align-items-center gap-2">
                    <div>${resumenHtml}</div>
                    <span class="small text-muted">${c.numero_cuota} de ${c.total_cuotas}</span>
                </div>
            </td>
            <td>${c.fecha_pago ? formatearFechaHora(c.fecha_pago) : '-'}</td>
            <td>
                <div class="fw-bold text-success">${formatearMoneda(c.monto)}</div>
            </td>
            <td><span class="badge bg-success">PAGADA</span></td>
            <td>
                <button class="btn btn-sm btn-outline-secondary me-1" onclick="generarReciboPDF(${c.id})" title="Recibo PDF"><i class="bi bi-file-pdf"></i></button>
                ${esAdminOCajero ? `
                    <button class="btn btn-sm btn-outline-danger" onclick="revertirPagoCuota(${c.id})" title="Revertir Pago"><i class="bi bi-arrow-counterclockwise"></i></button>
                ` : ''}
            </td>
        `;
        cont.appendChild(tr);
    });
}

function configurarFiltrosYBusqueda() {
    const estadoSelect = document.getElementById('filtro-estado-cuotas');
    const inputBuscar = document.getElementById('buscador-cuotas');
    
    if (estadoSelect) estadoSelect.addEventListener('change', cargarCuotas);
    if (inputBuscar) inputBuscar.addEventListener('input', cargarCuotas);
}

async function revertirPagoCuota(id) {
    const cuotas = obtenerCuotas();
    const idx = cuotas.findIndex(x => x.id === id);
    if (idx === -1) return;
    const c = cuotas[idx];

    // Verificar si hay cuotas posteriores pagadas de la misma factura
    const cuotasPost = cuotas.filter(x => x.factura_id === c.factura_id && x.numero_cuota > c.numero_cuota && x.estado === 'pagada');
    if (cuotasPost.length > 0) {
        alertaError(`No se puede revertir el pago de la cuota ${c.numero_cuota} porque hay cuotas posteriores ya pagadas. Revierta primero las posteriores.`);
        return;
    }

    if (!(await confirmarAccion(`¿Revertir el pago de la cuota por ${formatearMoneda(c.monto)}? El dinero saldrá de la caja actual como devolución.`, 'Revertir Pago'))) return;

    const cajaTecnorivas = obtenerDatos('caja_tecnorivas') || [];
    
    // Devolver de Caja
    cajaTecnorivas.push({
        id: generarId(cajaTecnorivas),
        tipo: 'egreso',
        fecha: fechaHoraAhora(),
        concepto: `Reversión Cuota ${c.numero_cuota}/${c.total_cuotas} - Factura ${c.factura_numero}`,
        monto: c.monto,
        caja: c.metodo_pago || 'Efectivo',
        relacionadoCon: { tipo: 'cuota', id: c.id, numero: `${c.factura_numero} (Cta ${c.numero_cuota})` },
        usuario: obtenerSesion().username
    });
    guardarDatos('caja_tecnorivas', cajaTecnorivas);

    // Actualizar Cuota
    c.estado = 'pendiente';
    c.fecha_pago = null;
    c.metodo_pago = null;
    cuotas[idx] = c;
    guardarCuotas(cuotas);
    actualizarVencimientosCuotas();

    // Sincronizar Factura
    const facturas = obtenerDatos('facturas_tecnorivas') || [];
    const fIdx = facturas.findIndex(f => f.id === c.factura_id);
    if (fIdx !== -1) {
        const f = facturas[fIdx];
        f.total_pagado = Math.max(0, (f.total_pagado || 0) - c.monto);
        if (f.total_pagado === 0) f.estado = 'emitida';
        else f.estado = 'parcialmente_pagada';
        f.estadoPago = 'pendiente_cobro'; // Al revertir, se marca como no pagada
        guardarDatos('facturas_tecnorivas', facturas);
    }
    
    alertaExito('El pago ha sido revertido exitosamente.');
    actualizarVencimientosCuotas();
    cargarCuotas();
}

function generarReciboPDF(cuotaId) {
    const cuotas = obtenerCuotas();
    const c = cuotas.find(x => x.id === cuotaId);
    if (!c) return;

    if (!window.jspdf) {
        Swal.fire({ title: 'Generando PDF...', text: 'Cargando librerías necesarias...', didOpen: () => { Swal.showLoading(); }});
        const script1 = document.createElement('script');
        script1.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';
        script1.onload = () => { Swal.close(); _ejecutarRecibo(c); };
        document.head.appendChild(script1);
    } else {
        _ejecutarRecibo(c);
    }
}

function _ejecutarRecibo(c) {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF('p', 'pt', 'a5'); // Recibo pequeño a5
    
    doc.setFontSize(18);
    doc.setTextColor(30, 58, 95);
    doc.text("TECNORIVAS", 20, 40);
    
    doc.setFontSize(12);
    doc.setTextColor(100, 100, 100);
    doc.text("Recibo de Dinero", 20, 60);
    
    doc.setFontSize(10);
    doc.setTextColor(0, 0, 0);
    doc.text(`N° Recibo: REC-${c.id.toString().padStart(6, '0')}`, doc.internal.pageSize.width - 20, 40, { align: 'right' });
    doc.text(`Fecha: ${formatearFechaHora(c.fecha_pago)}`, doc.internal.pageSize.width - 20, 55, { align: 'right' });
    
    doc.setLineWidth(1);
    doc.line(20, 75, doc.internal.pageSize.width - 20, 75);
    
    doc.setFontSize(12);
    doc.text(`Recibimos de:`, 20, 100);
    doc.setFontSize(14);
    doc.text(`${c.cliente_nombre}`, 100, 100);
    
    doc.setFontSize(12);
    doc.text(`La cantidad de:`, 20, 130);
    doc.setFontSize(16);
    doc.setTextColor(30, 58, 95);
    doc.text(`${formatearMoneda(c.monto)}`, 110, 130);
    
    doc.setFontSize(12);
    doc.setTextColor(0, 0, 0);
    doc.text(`En concepto de:`, 20, 160);
    doc.setFontSize(11);
    doc.text(`Pago de Cuota ${c.numero_cuota} de ${c.total_cuotas} correspondiente a la Factura ${c.factura_numero}.`, 20, 180);
    
    doc.text(`Método de Pago: ${c.metodo_pago}`, 20, 200);

    doc.setLineWidth(1);
    doc.line(20, 230, doc.internal.pageSize.width - 20, 230);
    
    doc.setFontSize(10);
    doc.setTextColor(150, 150, 150);
    doc.text("Documento generado automáticamente por TECNORIVAS.", doc.internal.pageSize.width / 2, 260, { align: 'center' });
    
    doc.save(`Recibo_Cuota_${c.numero_cuota}_Fac_${c.factura_numero}.pdf`);
}

function configurarExportarCuotas() {
    const btnExp = document.getElementById('btn-exportar-cuotas');
    const btnImp = document.getElementById('btn-imprimir-cuotas');

    if (btnExp) btnExp.addEventListener('click', () => {
        const dataExport = filteredCuotas.map(c => {
            return {
                cliente: c.cliente_nombre,
                factura: c.factura_numero,
                cuota: `${c.numero_cuota}/${c.total_cuotas}`,
                vencimiento: formatearFecha(c.fecha_vencimiento),
                monto: c.monto,
                estado: c.estado.toUpperCase()
            };
        });
        exportarExcel(dataExport, 'listado_cuotas', [
            { key: 'cliente', label: 'Cliente' },
            { key: 'factura', label: 'Factura' },
            { key: 'cuota', label: 'Cuota' },
            { key: 'vencimiento', label: 'Vencimiento' },
            { key: 'monto', label: 'Monto' },
            { key: 'estado', label: 'Estado' }
        ]);
    });

    if (btnImp) btnImp.addEventListener('click', () => imprimirTabla('Control de Cuotas', 'tabla-body-cuotas'));
}

// --- Historial de Cuotas ---
function mostrarHistoricoCuotas(factura_id) {
    const facturas = obtenerDatos('facturas_tecnorivas') || [];
    const cuotas = obtenerCuotas();
    
    const factura = facturas.find(f => f.id === factura_id);
    const cuotasFactura = cuotas.filter(c => c.factura_id === factura_id).sort((a, b) => a.numero_cuota - b.numero_cuota);
    
    if (!factura || cuotasFactura.length === 0) return;
    
    document.getElementById('hist-cliente').textContent = factura.cliente_nombre;
    document.getElementById('hist-factura').textContent = factura.numero;
    document.getElementById('hist-fecha').textContent = formatearFechaHora(factura.fecha);
    
    const totalFinanciado = cuotasFactura.reduce((sum, c) => sum + c.monto, 0);
    const pagado = cuotasFactura.filter(c => c.estado === 'pagada').reduce((sum, c) => sum + c.monto, 0);
    
    document.getElementById('hist-total').textContent = formatearMoneda(totalFinanciado);
    document.getElementById('hist-pagado').textContent = formatearMoneda(pagado);
    document.getElementById('hist-saldo').textContent = formatearMoneda(totalFinanciado - pagado);
    
    const timelineCont = document.getElementById('hist-timeline');
    timelineCont.innerHTML = '';
    
    // Icon for genesis
    timelineCont.innerHTML += `
        <div class="mb-4 position-relative">
            <div style="position:absolute; left:-30px; top:0; width:14px; height:14px; background:#6c757d; border-radius:50%; border:2px solid white; box-shadow:0 0 0 1px #dee2e6;"></div>
            <div class="text-muted small fw-bold">${formatearFecha(factura.fecha)}</div>
            <div class="text-dark">Factura emitida por <strong class="text-primary">${formatearMoneda(factura.total)}</strong>. Plan de ${cuotasFactura.length} cuotas generado.</div>
        </div>
    `;
    
    cuotasFactura.forEach(c => {
        let color = '#ffc107'; // Pendiente
        let icon = '<i class="bi bi-clock-fill"></i>';
        let statusText = 'PENDIENTE';
        let detailHtml = '';
        
        if (c.estado === 'pagada') {
            color = '#198754';
            icon = '<i class="bi bi-check-circle-fill"></i>';
            statusText = 'PAGADA';
            
            const diffDays = (new Date(c.fecha_pago) - new Date(c.fecha_vencimiento)) / (1000 * 3600 * 24);
            let delayHtml = '';
            if (diffDays > 0) delayHtml = `<span class="badge bg-danger ms-2">Atraso de ${Math.floor(diffDays)} días</span>`;
            else delayHtml = `<span class="badge bg-success ms-2">A tiempo</span>`;
            
            detailHtml = `
                <div class="mt-1" style="font-size:0.85rem;">
                    <strong>Monto abonado:</strong> ${formatearMoneda(c.monto)} en ${c.metodo_pago || 'Efectivo'}<br>
                    <strong>Fecha de pago:</strong> ${formatearFechaHora(c.fecha_pago)} ${delayHtml}
                </div>
            `;
        } else if (c.estado === 'vencida') {
            color = '#dc3545';
            icon = '<i class="bi bi-exclamation-circle-fill"></i>';
            statusText = 'VENCIDA';
            
            const diffDays = Math.floor((new Date() - new Date(c.fecha_vencimiento)) / (1000 * 3600 * 24));
            detailHtml = `
                <div class="mt-1 text-danger" style="font-size:0.85rem;">
                    Faltan abonar ${formatearMoneda(c.monto)}. <strong>Atraso actual: ${diffDays} días</strong>.
                </div>
            `;
        } else {
            // Pendiente normal
            detailHtml = `
                <div class="mt-1 text-muted" style="font-size:0.85rem;">
                    Debe abonar ${formatearMoneda(c.monto)} antes del ${formatearFecha(c.fecha_vencimiento)}.
                </div>
            `;
        }
        
        timelineCont.innerHTML += `
            <div class="mb-4 position-relative">
                <div style="position:absolute; left:-34px; top:2px; font-size:18px; color:${color}; background:white; line-height:1; border-radius:50%; box-shadow:0 0 0 2px white;">
                    ${icon}
                </div>
                <div class="d-flex justify-content-between align-items-center">
                    <h6 class="mb-0 fw-bold">Cuota ${c.numero_cuota}/${c.total_cuotas}</h6>
                    <span class="badge" style="background-color:${color}; font-size:0.7rem;">${statusText}</span>
                </div>
                ${detailHtml}
            </div>
        `;
    });
    
    bootstrap.Modal.getOrCreateInstance(document.getElementById('modal-historico')).show();
}
