function cargarReportes() {
    const ventas = obtenerDatos('ventas_tecnorivas');
    const compras = obtenerDatos('compras_tecnorivas');
    const articulos = obtenerDatos('articulos_tecnorivas');
    const clientes = obtenerDatos('clientes_tecnorivas');

    const totalVentas = ventas.reduce((s, v) => s + v.total, 0);
    const totalCompras = compras.reduce((s, c) => s + c.total, 0);
    
    const rVentas = document.getElementById('r-total-ventas');
    const rCompras = document.getElementById('r-total-compras');
    const rUtilidad = document.getElementById('r-utilidad');
    const rClientes = document.getElementById('r-total-clientes');

    if (rVentas) rVentas.textContent = formatearMoneda(totalVentas);
    if (rCompras) rCompras.textContent = formatearMoneda(totalCompras);
    if (rUtilidad) rUtilidad.textContent = formatearMoneda(totalVentas - totalCompras);
    if (rClientes) rClientes.textContent = clientes.length;

    // Estados ventas
    const estadosV = { completada: 0, pendiente: 0, anulada: 0 };
    ventas.forEach(v => { if (estadosV[v.estado] !== undefined) estadosV[v.estado]++; });
    const eVentas = document.getElementById('reporte-ventas-estados');
    if (eVentas) {
        eVentas.innerHTML = Object.entries(estadosV).map(([k, v]) => `
            <div class="d-flex justify-content-between align-items-center mb-2">
                <span class="badge ${k === 'completada' ? 'bg-success' : k === 'pendiente' ? 'bg-warning text-dark' : 'bg-danger'}">${k}</span>
                <div class="flex-grow-1 mx-3">
                    <div class="progress" style="height:8px;">
                        <div class="progress-bar ${k === 'completada' ? 'bg-success' : k === 'pendiente' ? 'bg-warning' : 'bg-danger'}" style="width:${ventas.length ? (v/ventas.length*100).toFixed(0) : 0}%"></div>
                    </div>
                </div>
                <strong>${v} (${ventas.length ? (v/ventas.length*100).toFixed(0) : 0}%)</strong>
            </div>
        `).join('');
    }

    // Estados compras
    const estadosC = { pendiente: 0, pagado: 0, anulado: 0 };
    compras.forEach(c => { if (estadosC[c.estado] !== undefined) estadosC[c.estado]++; });
    const eCompras = document.getElementById('reporte-compras-estados');
    if (eCompras) {
        eCompras.innerHTML = Object.entries(estadosC).map(([k, v]) => `
            <div class="d-flex justify-content-between align-items-center mb-2">
                <span class="badge ${k === 'pagado' ? 'bg-success' : k === 'pendiente' ? 'bg-warning text-dark' : 'bg-danger'}">${k}</span>
                <div class="flex-grow-1 mx-3">
                    <div class="progress" style="height:8px;">
                        <div class="progress-bar ${k === 'pagado' ? 'bg-success' : k === 'pendiente' ? 'bg-warning' : 'bg-danger'}" style="width:${compras.length ? (v/compras.length*100).toFixed(0) : 0}%"></div>
                    </div>
                </div>
                <strong>${v} (${compras.length ? (v/compras.length*100).toFixed(0) : 0}%)</strong>
            </div>
        `).join('');
    }

    // Top artículos
    const conteoArt = {};
    ventas.forEach(v => v.detalle && v.detalle.forEach(d => {
        if (!conteoArt[d.articuloId]) conteoArt[d.articuloId] = { nombre: d.nombre, cantidad: 0, total: 0 };
        conteoArt[d.articuloId].cantidad += d.cantidad;
        conteoArt[d.articuloId].total += d.subtotal;
    }));
    const topArts = Object.values(conteoArt).sort((a, b) => b.cantidad - a.cantidad).slice(0, 5);
    const tbodyTop = document.getElementById('top-articulos-body');
    if (tbodyTop) {
        tbodyTop.innerHTML = topArts.length ? topArts.map((a, i) => `<tr><td><strong>${i + 1}</strong></td><td>${a.nombre}</td><td>${a.cantidad}</td><td>${formatearMoneda(a.total)}</td></tr>`).join('') : '<tr><td colspan="4" class="text-center text-muted">Sin datos</td></tr>';
    }

    // Inventario valorizado
    const tbodyInv = document.getElementById('inventario-valor-body');
    if (tbodyInv) {
        const artValor = articulos.sort((a, b) => (b.stock * b.precio) - (a.stock * a.precio)).slice(0, 10);
        tbodyInv.innerHTML = artValor.map(a => `<tr><td>${a.nombre}</td><td>${a.stock} ${a.unidad}</td><td>${formatearMoneda(a.precio)}</td><td><strong>${formatearMoneda(a.stock * a.precio)}</strong></td></tr>`).join('');
    }

    // Ventas recientes
    const tbodyVR = document.getElementById('ventas-recientes-body');
    if (tbodyVR) {
        const ventasRec = ventas.slice(-10).reverse();
        tbodyVR.innerHTML = ventasRec.length ? ventasRec.map(v => {
            const cli = clientes.find(c => c.id === v.clienteId);
            return `<tr><td>${v.numero}</td><td>${formatearFecha(v.fecha)}</td><td>${cli ? cli.nombre : 'General'}</td><td>${formatearMoneda(v.total)}</td><td><span class="badge ${v.estado === 'completada' ? 'bg-success' : 'bg-warning text-dark'}">${v.estado}</span></td><td>${v.vendedor || '-'}</td></tr>`;
        }).join('') : '<tr><td colspan="6" class="text-center text-muted">Sin ventas</td></tr>';
    }
}

function exportarReporteVentas() {
    exportarExcel(obtenerDatos('ventas_tecnorivas'), 'reporte_ventas', [
        { key: 'numero', label: 'N°' }, { key: 'fecha', label: 'Fecha' },
        { key: 'total', label: 'Total' }, { key: 'estado', label: 'Estado' }, { key: 'vendedor', label: 'Vendedor' }
    ]);
}

function exportarReporteCompras() {
    exportarExcel(obtenerDatos('compras_tecnorivas'), 'reporte_compras', [
        { key: 'numero', label: 'N°' }, { key: 'fecha', label: 'Fecha' },
        { key: 'total', label: 'Total' }, { key: 'estado', label: 'Estado' }
    ]);
}

function exportarInventarioValoriz() {
    const articulos = obtenerDatos('articulos_tecnorivas').map(a => ({ ...a, valor: a.stock * a.precio }));
    exportarExcel(articulos, 'inventario_valorizado', [
        { key: 'nombre', label: 'Artículo' }, { key: 'stock', label: 'Stock' },
        { key: 'precio', label: 'Precio' }, { key: 'valor', label: 'Valor Total' }
    ]);
}

document.addEventListener('DOMContentLoaded', () => {
    const sesion = protegerPagina();
    if (!sesion) return;
    cargarReportes();
});
