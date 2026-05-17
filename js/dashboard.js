// Reloj
function actualizarReloj() {
    const el = document.getElementById('reloj');
    if (el) el.textContent = new Date().toLocaleString('es-DO', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

// Stats Dashboard
function cargarDashboard() {
    const sesion = obtenerSesion();
    if (sesion) {
        const welcomeEl = document.getElementById('welcome-nombre');
        if (welcomeEl) welcomeEl.textContent = sesion.nombre;
    }

    const ventas = obtenerDatos('ventas_tecnorivas');
    const compras = obtenerDatos('compras_tecnorivas');
    const articulos = obtenerDatos('articulos_tecnorivas');
    const stockBajos = articulos.filter(a => a.stock <= a.stockMinimo);

    const mesActual = new Date().getMonth();
    const ventasMes = ventas.filter(v => new Date(v.fecha).getMonth() === mesActual);
    const comprasMes = compras.filter(c => new Date(c.fecha).getMonth() === mesActual);

    const statVentas = document.getElementById('stat-ventas-total');
    const statCompras = document.getElementById('stat-compras-total');
    const statArticulos = document.getElementById('stat-articulos');
    const statStockBajo = document.getElementById('stat-stock-bajo');

    if (statVentas) statVentas.textContent = formatearMoneda(ventasMes.reduce((s, v) => s + v.total, 0));
    if (statCompras) statCompras.textContent = formatearMoneda(comprasMes.reduce((s, c) => s + c.total, 0));
    if (statArticulos) statArticulos.textContent = articulos.length;
    if (statStockBajo) statStockBajo.textContent = stockBajos.length;

    // Últimas ventas
    const ultimasVentas = ventas.slice(-5).reverse();
    const tbodyVentas = document.getElementById('ultimas-ventas-body');
    if (tbodyVentas && ultimasVentas.length > 0) {
        tbodyVentas.innerHTML = ultimasVentas.map(v => `
            <tr>
                <td>${v.numero}</td>
                <td>${formatearFecha(v.fecha)}</td>
                <td>${formatearMoneda(v.total)}</td>
                <td><span class="badge ${v.estado === 'completada' ? 'bg-success' : 'bg-warning text-dark'}">${v.estado}</span></td>
            </tr>
        `).join('');
    }

    // Stock bajo
    const tbodyStock = document.getElementById('stock-bajo-body');
    if (tbodyStock && stockBajos.length > 0) {
        tbodyStock.innerHTML = stockBajos.map(a => `
            <tr>
                <td>${a.nombre}</td>
                <td class="text-danger fw-bold">${a.stock} ${a.unidad}</td>
                <td>${a.stockMinimo} ${a.unidad}</td>
                <td><span class="badge bg-danger"><i class="bi bi-exclamation-triangle"></i> Stock bajo</span></td>
            </tr>
        `).join('');
    }
}

document.addEventListener('DOMContentLoaded', () => {
    actualizarReloj();
    setInterval(actualizarReloj, 60000);
    cargarDashboard();
});
