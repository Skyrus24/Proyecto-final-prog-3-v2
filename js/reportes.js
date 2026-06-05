function cargarReportes() {
    const facturas = obtenerDatos('facturas_tecnorivas') || [];
    const compras = obtenerDatos('compras_tecnorivas');
    const articulos = obtenerDatos('articulos_tecnorivas');
    const cajas = obtenerDatos('cajas_tecnorivas');
    const proveedores = obtenerDatos('proveedores_tecnorivas');

    // --- KPIs Flujo de Caja ---
    const totalIngresos = cajas.reduce((s, c) => s + (c.ingresos || 0), 0);
    const totalEgresos  = cajas.reduce((s, c) => s + (c.egresos  || 0), 0)
                        + compras.filter(c => c.estado === 'pagado').reduce((s, c) => s + (c.total || 0), 0);
    const facturasEmitidasCount = facturas.filter(f => f.estado === 'emitida').length;

    const rIngresos    = document.getElementById('r-ingresos');
    const rEgresos     = document.getElementById('r-egresos');
    const rFlujoCaja   = document.getElementById('r-flujo-caja');
    const rFacturasEmitidas = document.getElementById('r-facturas-emitidas');

    if (rIngresos)    rIngresos.textContent = formatearMoneda(totalIngresos);
    if (rEgresos)     rEgresos.textContent  = formatearMoneda(totalEgresos);
    if (rFlujoCaja) {
        const flujo = totalIngresos - totalEgresos;
        rFlujoCaja.textContent = formatearMoneda(flujo);
        rFlujoCaja.className = `stat-valor ${flujo < 0 ? 'text-danger' : 'text-success'}`;
    }
    if (rFacturasEmitidas) rFacturasEmitidas.textContent = facturasEmitidasCount;

    // --- Facturas por Estado (barras) ---
    const estadosF = { emitida: 0, anulada: 0 };
    facturas.forEach(f => { if (estadosF[f.estado] !== undefined) estadosF[f.estado]++; });
    const eFacturas = document.getElementById('reporte-facturas-estados');
    if (eFacturas) {
        eFacturas.innerHTML = Object.entries(estadosF).map(([k, v]) => {
            const badgeClass = k === 'emitida' ? 'bg-success' : 'bg-danger';
            const pct = facturas.length ? (v / facturas.length * 100).toFixed(0) : 0;
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

    // --- Tabla facturas ---
    const tbodyFac = document.getElementById('facturas-reporte-body');
    if (tbodyFac) {
        const facRec = [...facturas].sort((a, b) => b.id - a.id).slice(0, 20);
        tbodyFac.innerHTML = facRec.length ? facRec.map(f => {
            const badge = f.estado === 'emitida' ? 'bg-success' : 'bg-danger';
            return `<tr>
                <td>${f.numero}</td>
                <td>${formatearFecha(f.fecha)}</td>
                <td>${f.cliente_nombre || '-'}</td>
                <td class="fw-bold">${formatearMoneda(f.total)}</td>
                <td><span class="badge ${badge}">${f.estado.toUpperCase()}</span></td>
            </tr>`;
        }).join('') : '<tr><td colspan="5" class="text-center text-muted">Sin facturas</td></tr>';
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
// FACTURAS
// ============================================================
function _obtenerDatosFacturasFormateados() {
    const facturas = obtenerDatos('facturas_tecnorivas') || [];
    return facturas.map(f => ({
        ...f,
        fecha: formatearFecha(f.fecha),
        cliente_nombre: f.cliente_nombre || '-',
        totalFmt: formatearMoneda(f.total)
    }));
}

const columnasFacturasPDF = [
    { key: 'numero', label: 'N°' }, { key: 'fecha', label: 'Fecha' },
    { key: 'cliente_nombre', label: 'Cliente' }, { key: 'totalFmt', label: 'Total' }, { key: 'estado', label: 'Estado' }
];

function exportarReporteFacturas() {
    exportarExcel(obtenerDatos('facturas_tecnorivas') || [], 'reporte_facturas', [
        { key: 'numero', label: 'N°' }, { key: 'fecha', label: 'Fecha' },
        { key: 'cliente_nombre', label: 'Cliente' }, { key: 'total', label: 'Total (Gs.)' }, { key: 'estado', label: 'Estado' }
    ]);
}

function exportarReporteFacturasPDF() {
    generarPDF('Reporte de Facturas', _obtenerDatosFacturasFormateados(), columnasFacturasPDF);
}

function imprimirReporteFacturas() {
    imprimirTabla('Reporte de Facturas', _obtenerDatosFacturasFormateados(), columnasFacturasPDF);
}

// ============================================================
// COMPRAS
// ============================================================
function _obtenerDatosComprasFormateados() {
    const compras = obtenerDatos('compras_tecnorivas');
    const proveedores = obtenerDatos('proveedores_tecnorivas');
    return compras.map(c => {
        const prov = proveedores.find(p => p.id === c.proveedorId);
        return {
            ...c,
            fecha: formatearFecha(c.fecha),
            proveedorNombre: prov ? prov.nombre : '-',
            totalFmt: formatearMoneda(c.total)
        };
    });
}

const columnasComprasPDF = [
    { key: 'numero', label: 'N°' }, { key: 'fecha', label: 'Fecha' },
    { key: 'proveedorNombre', label: 'Proveedor' }, { key: 'totalFmt', label: 'Total' }, { key: 'estado', label: 'Estado' }
];

function exportarReporteCompras() {
    const dataExport = _obtenerDatosComprasFormateados();
    exportarExcel(obtenerDatos('compras_tecnorivas').map(c => {
        const prov = obtenerDatos('proveedores_tecnorivas').find(x => x.id === c.proveedorId);
        return { ...c, proveedorNombre: prov ? prov.nombre : '-' };
    }), 'reporte_compras', [
        { key: 'numero', label: 'N°' }, { key: 'fecha', label: 'Fecha' },
        { key: 'proveedorNombre', label: 'Proveedor' },
        { key: 'total', label: 'Total (Gs.)' }, { key: 'estado', label: 'Estado' }
    ]);
}

function exportarReporteComprasPDF() {
    generarPDF('Reporte de Compras', _obtenerDatosComprasFormateados(), columnasComprasPDF);
}

function imprimirReporteCompras() {
    imprimirTabla('Reporte de Compras', _obtenerDatosComprasFormateados(), columnasComprasPDF);
}

// ============================================================
// INVENTARIO
// ============================================================
function _obtenerDatosInventarioFormateados() {
    const articulos = obtenerDatos('articulos_tecnorivas');
    return [...articulos]
        .sort((a, b) => (b.stock * b.precio) - (a.stock * a.precio))
        .map(a => ({
            ...a,
            stockUnidad: `${a.stock} ${a.unidad || ''}`,
            precioFmt: formatearMoneda(a.precio),
            valorFmt: formatearMoneda(a.stock * a.precio)
        }));
}

const columnasInventarioPDF = [
    { key: 'nombre', label: 'Artículo' }, { key: 'stockUnidad', label: 'Stock' },
    { key: 'precioFmt', label: 'Precio' }, { key: 'valorFmt', label: 'Valor Total' }
];

function exportarInventarioValoriz() {
    const articulos = obtenerDatos('articulos_tecnorivas').map(a => ({ ...a, valor: a.stock * a.precio }));
    exportarExcel(articulos, 'inventario_valorizado', [
        { key: 'nombre', label: 'Artículo' }, { key: 'stock', label: 'Stock' },
        { key: 'unidad', label: 'Unidad' }, { key: 'precio', label: 'Precio (Gs.)' }, { key: 'valor', label: 'Valor Total (Gs.)' }
    ]);
}

function exportarInventarioValorizPDF() {
    generarPDF('Inventario Valorizado', _obtenerDatosInventarioFormateados(), columnasInventarioPDF);
}

function imprimirInventario() {
    imprimirTabla('Inventario Valorizado', _obtenerDatosInventarioFormateados(), columnasInventarioPDF);
}

// ============================================================
// CAJA
// ============================================================
function _obtenerDatosCajaFormateados() {
    const cajas = obtenerDatos('cajas_tecnorivas');
    return cajas.map(c => ({
        ...c,
        fechaAperturaFmt: new Date(c.fechaApertura).toLocaleString('es-DO'),
        montoInicialFmt: formatearMoneda(c.montoInicial),
        ingresosFmt: formatearMoneda(c.ingresos),
        egresosFmt: formatearMoneda(c.egresos),
        saldoFmt: formatearMoneda((c.montoInicial || 0) + (c.ingresos || 0) - (c.egresos || 0))
    }));
}

const columnasCajaPDF = [
    { key: 'cajero', label: 'Cajero' }, { key: 'fechaAperturaFmt', label: 'Apertura' },
    { key: 'montoInicialFmt', label: 'Inicial' }, { key: 'ingresosFmt', label: 'Ingresos' },
    { key: 'egresosFmt', label: 'Egresos' }, { key: 'saldoFmt', label: 'Saldo' }, { key: 'estado', label: 'Estado' }
];

function exportarSesionesCaja() {
    const cajas = obtenerDatos('cajas_tecnorivas').map(c => ({
        ...c,
        saldo: (c.montoInicial || 0) + (c.ingresos || 0) - (c.egresos || 0)
    }));
    exportarExcel(cajas, 'sesiones_caja', [
        { key: 'cajero', label: 'Cajero' }, { key: 'fechaApertura', label: 'Apertura' },
        { key: 'montoInicial', label: 'Monto Inicial (Gs.)' }, { key: 'ingresos', label: 'Ingresos (Gs.)' },
        { key: 'egresos', label: 'Egresos (Gs.)' }, { key: 'saldo', label: 'Saldo (Gs.)' }, { key: 'estado', label: 'Estado' }
    ]);
}

function exportarSesionesCajaPDF() {
    generarPDF('Sesiones de Caja', _obtenerDatosCajaFormateados(), columnasCajaPDF);
}

function imprimirSesionesCaja() {
    imprimirTabla('Sesiones de Caja', _obtenerDatosCajaFormateados(), columnasCajaPDF);
}

document.addEventListener('DOMContentLoaded', () => {
    const sesion = protegerPagina();
    if (!sesion) return;
    cargarReportes();
});
