function cargarReportes() {
    const presupuestos = obtenerDatos('presupuestos_tecnorivas');
    const compras = obtenerDatos('compras_tecnorivas');
    const articulos = obtenerDatos('articulos_tecnorivas');
    const cajas = obtenerDatos('cajas_tecnorivas');
    const proveedores = obtenerDatos('proveedores_tecnorivas');

    // --- KPIs Flujo de Caja ---
    const totalIngresos = cajas.reduce((s, c) => s + (c.ingresos || 0), 0);
    const totalEgresos  = cajas.reduce((s, c) => s + (c.egresos  || 0), 0)
                        + compras.filter(c => c.estado === 'pagado').reduce((s, c) => s + (c.total || 0), 0);
    const presupuestosCobradosCount = presupuestos.filter(p => p.estado === 'cobrado').length;

    const rIngresos    = document.getElementById('r-ingresos');
    const rEgresos     = document.getElementById('r-egresos');
    const rFlujoCaja   = document.getElementById('r-flujo-caja');
    const rPresCobrados = document.getElementById('r-presupuestos-cobrados');

    if (rIngresos)    rIngresos.textContent = formatearMoneda(totalIngresos);
    if (rEgresos)     rEgresos.textContent  = formatearMoneda(totalEgresos);
    if (rFlujoCaja) {
        const flujo = totalIngresos - totalEgresos;
        rFlujoCaja.textContent = formatearMoneda(flujo);
        rFlujoCaja.className = `stat-valor ${flujo < 0 ? 'text-danger' : 'text-success'}`;
    }
    if (rPresCobrados) rPresCobrados.textContent = presupuestosCobradosCount;

    // --- Presupuestos por Estado (barras) ---
    const estadosP = { pendiente: 0, emitido: 0, aprobado: 0, cobrado: 0, rechazado: 0 };
    presupuestos.forEach(p => { if (estadosP[p.estado] !== undefined) estadosP[p.estado]++; });
    const ePresupuestos = document.getElementById('reporte-presupuestos-estados');
    if (ePresupuestos) {
        ePresupuestos.innerHTML = Object.entries(estadosP).map(([k, v]) => {
            const badgeClass = k === 'cobrado' ? 'bg-success' : k === 'aprobado' ? 'bg-info' : k === 'pendiente' || k === 'emitido' ? 'bg-warning text-dark' : 'bg-danger';
            const pct = presupuestos.length ? (v / presupuestos.length * 100).toFixed(0) : 0;
            return `
            <div class="d-flex justify-content-between align-items-center mb-2">
                <span class="badge ${badgeClass}" style="min-width:80px">${k}</span>
                <div class="flex-grow-1 mx-3"><div class="progress" style="height:8px;">
                    <div class="progress-bar ${badgeClass}" style="width:${pct}%"></div>
                </div></div>
                <strong>${v} (${pct}%)</strong>
            </div>`;
        }).join('');
    }

    // --- Tabla presupuestos ---
    const tbodyPres = document.getElementById('presupuestos-reporte-body');
    if (tbodyPres) {
        const clientes = obtenerDatos('clientes_tecnorivas');
        const presRec = [...presupuestos].sort((a, b) => b.id - a.id).slice(0, 20);
        tbodyPres.innerHTML = presRec.length ? presRec.map(p => {
            const cli = clientes.find(c => c.id === p.clienteId);
            const badge = p.estado === 'cobrado' ? 'bg-success' : p.estado === 'aprobado' ? 'bg-info' : p.estado === 'rechazado' ? 'bg-danger' : 'bg-warning text-dark';
            return `<tr>
                <td>${p.numero}</td>
                <td>${formatearFecha(p.fecha)}</td>
                <td>${p.clienteNombre || (cli ? cli.nombre : '-')}</td>
                <td class="fw-bold">${formatearMoneda(p.total)}</td>
                <td><span class="badge ${badge}">${p.estado}</span></td>
            </tr>`;
        }).join('') : '<tr><td colspan="5" class="text-center text-muted">Sin presupuestos</td></tr>';
    }

    // --- Compras por Estado (barras) ---
    const estadosC = { pendiente: 0, pagado: 0, anulado: 0 };
    compras.forEach(c => { if (estadosC[c.estado] !== undefined) estadosC[c.estado]++; });
    const eCompras = document.getElementById('reporte-compras-estados');
    if (eCompras) {
        eCompras.innerHTML = Object.entries(estadosC).map(([k, v]) => {
            const badgeClass = k === 'pagado' ? 'bg-success' : k === 'pendiente' ? 'bg-warning text-dark' : 'bg-danger';
            const pct = compras.length ? (v / compras.length * 100).toFixed(0) : 0;
            return `
            <div class="d-flex justify-content-between align-items-center mb-2">
                <span class="badge ${badgeClass}" style="min-width:80px">${k}</span>
                <div class="flex-grow-1 mx-3"><div class="progress" style="height:8px;">
                    <div class="progress-bar ${badgeClass}" style="width:${pct}%"></div>
                </div></div>
                <strong>${v} (${pct}%)</strong>
            </div>`;
        }).join('');
    }

    // --- Tabla compras ---
    const tbodyComprasRep = document.getElementById('compras-reporte-body');
    if (tbodyComprasRep) {
        const comprasRec = [...compras].sort((a, b) => b.id - a.id).slice(0, 20);
        tbodyComprasRep.innerHTML = comprasRec.length ? comprasRec.map(c => {
            const prov = proveedores.find(p => p.id === c.proveedorId);
            const badge = c.estado === 'pagado' ? 'bg-success' : c.estado === 'anulado' ? 'bg-danger' : 'bg-warning text-dark';
            return `<tr>
                <td>${c.numero}</td>
                <td>${formatearFecha(c.fecha)}</td>
                <td>${prov ? prov.nombre : '-'}</td>
                <td class="fw-bold">${formatearMoneda(c.total)}</td>
                <td><span class="badge ${badge}">${c.estado}</span></td>
            </tr>`;
        }).join('') : '<tr><td colspan="5" class="text-center text-muted">Sin compras</td></tr>';
    }

    // --- Inventario valorizado ---
    const tbodyInv = document.getElementById('inventario-valor-body');
    if (tbodyInv) {
        const artValor = [...articulos].sort((a, b) => (b.stock * b.precio) - (a.stock * a.precio)).slice(0, 15);
        tbodyInv.innerHTML = artValor.length ? artValor.map(a => `<tr>
            <td>${a.nombre}</td>
            <td>${a.stock} ${a.unidad || ''}</td>
            <td>${formatearMoneda(a.precio)}</td>
            <td class="fw-bold">${formatearMoneda(a.stock * a.precio)}</td>
        </tr>`).join('') : '<tr><td colspan="4" class="text-center text-muted">Sin artículos</td></tr>';
    }

    // --- Sesiones de Caja ---
    const tbodyCaja = document.getElementById('movimientos-recientes-body');
    if (tbodyCaja) {
        const cajasRec = [...cajas].reverse().slice(0, 10);
        tbodyCaja.innerHTML = cajasRec.length ? cajasRec.map(c => `<tr>
            <td>${new Date(c.fechaApertura).toLocaleString('es-DO', { year:'numeric', month:'2-digit', day:'2-digit', hour:'2-digit', minute:'2-digit' })}</td>
            <td>${c.cajero}</td>
            <td>${formatearMoneda(c.montoInicial)}</td>
            <td class="text-success fw-bold">+${formatearMoneda(c.ingresos)}</td>
            <td class="text-danger fw-bold">-${formatearMoneda(c.egresos)}</td>
            <td class="fw-bold text-primary">${formatearMoneda((c.montoInicial || 0) + (c.ingresos || 0) - (c.egresos || 0))}</td>
            <td><span class="badge ${c.estado === 'abierta' ? 'bg-success' : 'bg-secondary'}">${c.estado}</span></td>
        </tr>`).join('') : '<tr><td colspan="7" class="text-center text-muted">Sin sesiones de caja</td></tr>';
    }
}

// ============================================================
// HELPERS DE EXPORTACIÓN GENÉRICOS
// ============================================================
function _exportarPDF(titulo, cabeceras, filas, nombreArchivo) {
    const { jsPDF } = window.jspdf || {};
    if (!jsPDF) { alertaError('jsPDF no disponible.'); return; }
    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text(`${titulo} - TECNORIVAS`, 14, 18);
    doc.setFontSize(10);
    doc.text(`Generado: ${new Date().toLocaleString('es-DO')}`, 14, 25);
    doc.autoTable({ head: [cabeceras], body: filas, startY: 30, styles: { fontSize: 9 } });
    doc.save(`${nombreArchivo}.pdf`);
}

function _imprimirTabla(idTabla, titulo) {
    const tabla = document.getElementById(idTabla);
    if (!tabla) return;
    const win = window.open('', '_blank');
    win.document.write(`
        <html><head><title>${titulo}</title>
        <style>
            body { font-family: Arial, sans-serif; padding: 20px; }
            h2 { color: #1e3a5f; }
            table { border-collapse: collapse; width: 100%; margin-top: 15px; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
            th { background: #1e3a5f; color: white; }
            tr:nth-child(even) { background: #f5f5f5; }
            .badge { padding: 3px 8px; border-radius: 4px; font-size: 11px; }
        </style>
        </head><body>
        <h2>${titulo} - TECNORIVAS</h2>
        <p>Generado: ${new Date().toLocaleString('es-DO')}</p>
        ${tabla.outerHTML}
        <script>window.onload = () => window.print()<\/script>
        </body></html>
    `);
    win.document.close();
}

// ============================================================
// PRESUPUESTOS
// ============================================================
function exportarReportePresupuestos() {
    exportarExcel(obtenerDatos('presupuestos_tecnorivas'), 'reporte_presupuestos', [
        { key: 'numero', label: 'N°' }, { key: 'fecha', label: 'Fecha' },
        { key: 'clienteNombre', label: 'Cliente' }, { key: 'total', label: 'Total (Gs.)' }, { key: 'estado', label: 'Estado' }
    ]);
}

function exportarReportePresupuestosPDF() {
    const pres = obtenerDatos('presupuestos_tecnorivas');
    const filas = pres.map(p => [p.numero, formatearFecha(p.fecha), p.clienteNombre || '-', formatearMoneda(p.total), p.estado]);
    _exportarPDF('Reporte de Presupuestos', ['N°', 'Fecha', 'Cliente', 'Total', 'Estado'], filas, 'reporte_presupuestos');
}

function imprimirReportePresupuestos() {
    _imprimirTabla('tabla-presupuestos-reporte', 'Reporte de Presupuestos');
}

// ============================================================
// COMPRAS
// ============================================================
function exportarReporteCompras() {
    exportarExcel(obtenerDatos('compras_tecnorivas'), 'reporte_compras', [
        { key: 'numero', label: 'N°' }, { key: 'fecha', label: 'Fecha' },
        { key: 'total', label: 'Total (Gs.)' }, { key: 'estado', label: 'Estado' }
    ]);
}

function exportarReporteComprasPDF() {
    const compras = obtenerDatos('compras_tecnorivas');
    const proveedores = obtenerDatos('proveedores_tecnorivas');
    const filas = compras.map(c => {
        const prov = proveedores.find(p => p.id === c.proveedorId);
        return [c.numero, formatearFecha(c.fecha), prov ? prov.nombre : '-', formatearMoneda(c.total), c.estado];
    });
    _exportarPDF('Reporte de Compras', ['N°', 'Fecha', 'Proveedor', 'Total', 'Estado'], filas, 'reporte_compras');
}

function imprimirReporteCompras() {
    _imprimirTabla('tabla-compras-reporte', 'Reporte de Compras');
}

// ============================================================
// INVENTARIO
// ============================================================
function exportarInventarioValoriz() {
    const articulos = obtenerDatos('articulos_tecnorivas').map(a => ({ ...a, valor: a.stock * a.precio }));
    exportarExcel(articulos, 'inventario_valorizado', [
        { key: 'nombre', label: 'Artículo' }, { key: 'stock', label: 'Stock' },
        { key: 'unidad', label: 'Unidad' }, { key: 'precio', label: 'Precio (Gs.)' }, { key: 'valor', label: 'Valor Total (Gs.)' }
    ]);
}

function exportarInventarioValorizPDF() {
    const articulos = obtenerDatos('articulos_tecnorivas');
    const filas = [...articulos]
        .sort((a, b) => (b.stock * b.precio) - (a.stock * a.precio))
        .map(a => [a.nombre, `${a.stock} ${a.unidad || ''}`, formatearMoneda(a.precio), formatearMoneda(a.stock * a.precio)]);
    _exportarPDF('Inventario Valorizado', ['Artículo', 'Stock', 'Precio', 'Valor Total'], filas, 'inventario_valorizado');
}

function imprimirInventario() {
    _imprimirTabla('tabla-inventario-reporte', 'Inventario Valorizado');
}

// ============================================================
// CAJA
// ============================================================
function exportarSesionesCaja() {
    exportarExcel(obtenerDatos('cajas_tecnorivas'), 'sesiones_caja', [
        { key: 'cajero', label: 'Cajero' }, { key: 'fechaApertura', label: 'Apertura' },
        { key: 'montoInicial', label: 'Monto Inicial (Gs.)' }, { key: 'ingresos', label: 'Ingresos (Gs.)' },
        { key: 'egresos', label: 'Egresos (Gs.)' }, { key: 'estado', label: 'Estado' }
    ]);
}

function exportarSesionesCajaPDF() {
    const cajas = obtenerDatos('cajas_tecnorivas');
    const filas = cajas.map(c => [
        c.cajero,
        new Date(c.fechaApertura).toLocaleString('es-DO'),
        formatearMoneda(c.montoInicial),
        formatearMoneda(c.ingresos),
        formatearMoneda(c.egresos),
        formatearMoneda((c.montoInicial || 0) + (c.ingresos || 0) - (c.egresos || 0)),
        c.estado
    ]);
    _exportarPDF('Sesiones de Caja', ['Cajero', 'Apertura', 'Inicial', 'Ingresos', 'Egresos', 'Saldo', 'Estado'], filas, 'sesiones_caja');
}

function imprimirSesionesCaja() {
    _imprimirTabla('tabla-caja-reporte', 'Sesiones de Caja');
}

document.addEventListener('DOMContentLoaded', () => {
    const sesion = protegerPagina();
    if (!sesion) return;
    cargarReportes();
});
