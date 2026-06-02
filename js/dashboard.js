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

    const presupuestos = obtenerDatos('presupuestos_tecnorivas');
    const compras = obtenerDatos('compras_tecnorivas');
    const articulos = obtenerDatos('articulos_tecnorivas');

    const mesActual = new Date().getMonth();
    const presupuestosMes = presupuestos.filter(p => new Date(p.fecha).getMonth() === mesActual);
    const comprasMes = compras.filter(c => new Date(c.fecha).getMonth() === mesActual);

    const statPresupuestos = document.getElementById('stat-ventas-total');
    const statCompras = document.getElementById('stat-compras-total');
    const statArticulos = document.getElementById('stat-articulos');

    if (statPresupuestos) statPresupuestos.textContent = presupuestosMes.length;
    if (statCompras) statCompras.textContent = formatearMoneda(comprasMes.reduce((s, c) => s + c.total, 0));
    if (statArticulos) statArticulos.textContent = articulos.length;

    // Últimos presupuestos
    const ultimosPresupuestos = presupuestos.slice(-5).reverse();
    const tbodyVentas = document.getElementById('ultimas-ventas-body');
    if (tbodyVentas && ultimosPresupuestos.length > 0) {
        tbodyVentas.innerHTML = ultimosPresupuestos.map(p => `
            <tr>
                <td>${p.numero}</td>
                <td>${formatearFecha(p.fecha)}</td>
                <td>${formatearMoneda(p.total)}</td>
                <td><span class="badge ${p.estado === 'aprobado' ? 'bg-success' : p.estado === 'pendiente' ? 'bg-warning text-dark' : 'bg-danger'}">${p.estado}</span></td>
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

        // Filtrar panel de Últimos Presupuestos
        if (tbodyVentas) {
            const cardPresupuestos = tbodyVentas.closest('.col-lg-6');
            if (cardPresupuestos && !['superusuario', 'admin', 'asesor', 'tecnico', 'cajero'].includes(sesion.rol)) {
                cardPresupuestos.style.setProperty('display', 'none', 'important');
            }
        }
    }
}

document.addEventListener('DOMContentLoaded', () => {
    actualizarReloj();
    setInterval(actualizarReloj, 60000);
    cargarDashboard();
});
