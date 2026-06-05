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

    const facturas = obtenerDatos('facturas_tecnorivas') || [];
    const compras = obtenerDatos('compras_tecnorivas') || [];
    const articulos = obtenerDatos('articulos_tecnorivas') || [];

    const mesActual = new Date().getMonth();
    const añoActual = new Date().getFullYear();
    const facturasMes = facturas.filter(f => new Date(f.fecha).getMonth() === mesActual && new Date(f.fecha).getFullYear() === añoActual);
    const comprasMes = compras.filter(c => new Date(c.fecha).getMonth() === mesActual && new Date(c.fecha).getFullYear() === añoActual);

    const statPresupuestos = document.getElementById('stat-ventas-total');
    const statCompras = document.getElementById('stat-compras-total');
    const statArticulos = document.getElementById('stat-articulos');

    if (statPresupuestos) statPresupuestos.textContent = facturasMes.length;
    if (statCompras) statCompras.textContent = formatearMoneda(comprasMes.reduce((s, c) => s + c.total, 0));
    if (statArticulos) statArticulos.textContent = articulos.length;

    // Últimas facturas
    const ultimasFacturas = facturas.slice(-5).reverse();
    const tbodyVentas = document.getElementById('ultimas-ventas-body');
    if (tbodyVentas && ultimasFacturas.length > 0) {
        tbodyVentas.innerHTML = ultimasFacturas.map(f => `
            <tr>
                <td>${f.numero}</td>
                <td>${formatearFecha(f.fecha)}</td>
                <td>${formatearMoneda(f.total)}</td>
                <td><span class="badge ${f.estado === 'anulada' ? 'bg-danger' : f.estado === 'emitida' ? 'bg-success' : 'bg-secondary'}">${f.estado.toUpperCase()}</span></td>
            </tr>
        `).join('');
    }

    // Ocultar elementos del dashboard según rol del usuario
    if (sesion) {
        const accesos = {
            'usuarios.html': ['superusuario', 'admin'],
            'compras.html': ['superusuario', 'admin', 'supervisor'],
            'reportes.html': ['superusuario', 'admin'],
            'inventario.html': ['superusuario', 'admin', 'supervisor', 'asesor'],
            'presupuestos.html': ['superusuario', 'admin', 'asesor', 'tecnico', 'cajero']
        };

        // Filtrar Acceso Rápido
        document.querySelectorAll('.acceso-card').forEach(card => {
            const page = card.getAttribute('href');
            const rolesPermitidos = accesos[page];
            if (rolesPermitidos && !rolesPermitidos.includes(sesion.rol)) {
                card.style.setProperty('display', 'none', 'important');
            }
        });

        // Filtrar tarjetas de estadísticas
        const cardStatPres = document.querySelector('.stat-card.azul');
        if (cardStatPres && !['superusuario', 'admin', 'asesor', 'tecnico', 'cajero'].includes(sesion.rol)) {
            cardStatPres.style.setProperty('display', 'none', 'important');
        }

        const cardStatComp = document.querySelector('.stat-card.dorado');
        if (cardStatComp && !['superusuario', 'admin', 'supervisor'].includes(sesion.rol)) {
            cardStatComp.style.setProperty('display', 'none', 'important');
        }

        const cardStatArt = document.querySelector('.stat-card.verde');
        if (cardStatArt && !['superusuario', 'admin', 'supervisor', 'asesor'].includes(sesion.rol)) {
            cardStatArt.style.setProperty('display', 'none', 'important');
        }

        // Filtrar panel de Últimas Facturas
        if (tbodyVentas) {
            const cardFacturas = tbodyVentas.closest('.col-lg-6');
            if (cardFacturas && !['superusuario', 'admin', 'asesor', 'tecnico', 'cajero'].includes(sesion.rol)) {
                cardFacturas.style.setProperty('display', 'none', 'important');
            }
        }
    }
}

document.addEventListener('DOMContentLoaded', () => {
    actualizarReloj();
    setInterval(actualizarReloj, 60000);
    cargarDashboard();
});
