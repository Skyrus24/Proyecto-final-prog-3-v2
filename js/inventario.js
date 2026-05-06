/**
 * inventario.js - Módulo de Inventario
 */

const CLAVE_MOVIMIENTOS = 'movimientos_inventario';

function obtenerMovimientos() { return obtenerDatos(CLAVE_MOVIMIENTOS); }

const PANELES_INV = ['stock', 'movimientos'];
let paginadorInventario, paginadorMovimientos;
let filteredInventario = [], filteredMovimientos = [];

document.addEventListener('DOMContentLoaded', () => {
    const sesion = protegerPagina();
    if (!sesion) return;

    paginadorInventario = new Paginador('tabla-body-stock', 'paginacion-stock', 10);
    paginadorMovimientos = new Paginador('tabla-body-movimientos', 'paginacion-movimientos', 15);

    const hashInicial = location.hash.replace('#', '');
    const tabInicial = PANELES_INV.includes(hashInicial) ? hashInicial : 'stock';
    cargarInventario(tabInicial);

    inicializarPaneles(PANELES_INV, 'stock');

    window.addEventListener('hashchange', () => {
        const h = location.hash.replace('#', '');
        if (PANELES_INV.includes(h)) cargarInventario(h);
    });

    configurarBusquedorInventario();
    configurarExportarInventario();
    verificarAlertas();
});


// ============================================================
// STOCK
// ============================================================
function cargarInventario(tab) {
    if (tab === 'stock') {
        let articulos = obtenerDatos('articulos_tecnorivas');
        filteredInventario = articulos;
        const el = document.getElementById('contador-stock');
        if (el) el.textContent = `${articulos.length} artículo(s)`;
        paginadorInventario.setDatos(articulos, renderFilasStock);
    } else {
        let movs = obtenerMovimientos().reverse();
        filteredMovimientos = movs;
        const el = document.getElementById('contador-movimientos');
        if (el) el.textContent = `${movs.length} movimiento(s)`;
        paginadorMovimientos.setDatos(movs, renderFilasMovimientos);
    }
}

function renderFilasStock(lista, cont) {
    if (lista.length === 0) {
        cont.innerHTML = `<tr><td colspan="7" class="text-center text-muted py-4"><i class="bi bi-inbox fs-3 d-block mb-2"></i>Sin artículos</td></tr>`;
        return;
    }
    const categorias = obtenerDatos('categorias_tecnorivas');
    lista.forEach(a => {
        const cat = categorias.find(c => c.id === a.categoriaId);
        const bajo = a.stock <= a.stockMinimo;
        const tr = document.createElement('tr');
        if (bajo) tr.classList.add('table-warning');
        tr.innerHTML = `
            <td><strong>${a.nombre}</strong></td>
            <td>${cat ? cat.nombre : '-'}</td>
            <td>${formatearMoneda(a.precio)}</td>
            <td class="${bajo ? 'text-danger fw-bold' : 'text-success'}">${a.stock} ${a.unidad}</td>
            <td>${a.stockMinimo} ${a.unidad}</td>
            <td>${formatearMoneda(a.stock * a.precio)}</td>
            <td>${bajo ? '<span class="badge bg-danger"><i class="bi bi-exclamation-triangle"></i> Stock bajo</span>' : '<span class="badge bg-success"><i class="bi bi-check-circle"></i> OK</span>'}</td>
        `;
        cont.appendChild(tr);
    });
}

function renderFilasMovimientos(lista, cont) {
    if (lista.length === 0) {
        cont.innerHTML = `<tr><td colspan="5" class="text-center text-muted py-4"><i class="bi bi-inbox fs-3 d-block mb-2"></i>Sin movimientos</td></tr>`;
        return;
    }
    const articulos = obtenerDatos('articulos_tecnorivas');
    lista.forEach(m => {
        const art = articulos.find(a => a.id === m.articuloId);
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${formatearFecha(m.fecha)}</td>
            <td><span class="badge ${m.tipo === 'entrada' ? 'bg-success' : 'bg-danger'}">${m.tipo === 'entrada' ? '<i class="bi bi-arrow-down-circle"></i>' : '<i class="bi bi-arrow-up-circle"></i>'} ${m.tipo}</span></td>
            <td>${art ? art.nombre : `ID: ${m.articuloId}`}</td>
            <td>${m.cantidad}</td>
            <td>${m.referencia}</td>
        `;
        cont.appendChild(tr);
    });
}

// ============================================================
// BÚSQUEDA
// ============================================================
function configurarBusquedorInventario() {
    const input = document.getElementById('buscador-stock');
    if (input) input.addEventListener('input', () => {
        const f = input.value.toLowerCase();
        let lista = obtenerDatos('articulos_tecnorivas');
        if (f) lista = lista.filter(a => a.nombre.toLowerCase().includes(f) || JSON.stringify(a).toLowerCase().includes(f));
        filteredInventario = lista;
        const el = document.getElementById('contador-stock');
        if (el) el.textContent = `${lista.length} artículo(s)`;
        paginadorInventario.setDatos(lista, renderFilasStock);
    });

    const inputMov = document.getElementById('buscador-movimientos');
    if (inputMov) inputMov.addEventListener('input', () => {
        const f = inputMov.value.toLowerCase();
        let lista = obtenerMovimientos().reverse();
        if (f) lista = lista.filter(m => JSON.stringify(m).toLowerCase().includes(f));
        filteredMovimientos = lista;
        const el = document.getElementById('contador-movimientos');
        if (el) el.textContent = `${lista.length} movimiento(s)`;
        paginadorMovimientos.setDatos(lista, renderFilasMovimientos);
    });
}

// ============================================================
// ALERTAS DE STOCK BAJO
// ============================================================
function verificarAlertas() {
    const articulos = obtenerDatos('articulos_tecnorivas');
    const bajos = articulos.filter(a => a.stock <= a.stockMinimo);
    const alerta = document.getElementById('alerta-stock-bajo');
    if (alerta) {
        if (bajos.length > 0) {
            alerta.classList.remove('d-none');
            alerta.innerHTML = `<i class="bi bi-exclamation-triangle-fill me-2"></i>
                <strong>${bajos.length} artículo(s) con stock bajo o agotado:</strong>
                ${bajos.map(a => `<span class="badge bg-danger ms-1">${a.nombre}</span>`).join('')}`;
        } else {
            alerta.classList.add('d-none');
        }
    }

    // Estadísticas
    const totalArt = document.getElementById('stat-total-articulos');
    const totalVal = document.getElementById('stat-valor-inventario');
    const totalBajos = document.getElementById('stat-stock-bajo');
    const totalMovs = document.getElementById('stat-movimientos');

    if (totalArt) totalArt.textContent = articulos.length;
    if (totalVal) totalVal.textContent = formatearMoneda(articulos.reduce((s, a) => s + (a.stock * a.precio), 0));
    if (totalBajos) totalBajos.textContent = bajos.length;
    if (totalMovs) totalMovs.textContent = obtenerMovimientos().length;
}

// ============================================================
// EXPORTAR
// ============================================================
function configurarExportarInventario() {
    const btnExpStock = document.getElementById('btn-exportar-stock');
    const btnImpStock = document.getElementById('btn-imprimir-stock');
    const btnExpMovs = document.getElementById('btn-exportar-movimientos');

    if (btnExpStock) btnExpStock.addEventListener('click', () => exportarCSV(filteredInventario, 'inventario_stock', [
        { key: 'nombre', label: 'Artículo' }, { key: 'precio', label: 'Precio' },
        { key: 'stock', label: 'Stock' }, { key: 'stockMinimo', label: 'Stock Mínimo' }, { key: 'unidad', label: 'Unidad' }
    ]));

    if (btnImpStock) btnImpStock.addEventListener('click', () => imprimirTabla('Inventario - Stock'));

    if (btnExpMovs) btnExpMovs.addEventListener('click', () => exportarCSV(filteredMovimientos, 'movimientos', [
        { key: 'fecha', label: 'Fecha' }, { key: 'tipo', label: 'Tipo' },
        { key: 'articuloId', label: 'ID Artículo' }, { key: 'cantidad', label: 'Cantidad' }, { key: 'referencia', label: 'Referencia' }
    ]));
}
