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
    configurarAjusteStock();
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
        cont.innerHTML = `<tr><td colspan="6" class="text-center text-muted py-4"><i class="bi bi-inbox fs-3 d-block mb-2"></i>Sin artículos</td></tr>`;
        return;
    }
    const categorias = obtenerDatos('categorias_tecnorivas');
    lista.forEach(a => {
        const cat = categorias.find(c => c.id === a.categoriaId);
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><strong>${a.nombre}</strong></td>
            <td>${cat ? cat.nombre : '-'}</td>
            <td>${formatearMoneda(a.precio)}</td>
            <td>${a.stock} ${a.unidad}</td>
            <td>${formatearMoneda(a.stock * a.precio)}</td>
            <td><span class="badge bg-success"><i class="bi bi-check-circle"></i> OK</span></td>
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
    // Estadísticas
    const articulos = obtenerDatos('articulos_tecnorivas');
    const alerta = document.getElementById('alerta-stock-bajo');
    if (alerta) alerta.classList.add('d-none');

    const totalArt = document.getElementById('stat-total-articulos');
    const totalVal = document.getElementById('stat-valor-inventario');
    const totalMovs = document.getElementById('stat-movimientos');

    if (totalArt) totalArt.textContent = articulos.length;
    if (totalVal) totalVal.textContent = formatearMoneda(articulos.reduce((s, a) => s + (a.stock * a.precio), 0));
    if (totalMovs) totalMovs.textContent = obtenerMovimientos().length;
}

// ============================================================
// EXPORTAR
// ============================================================
function configurarExportarInventario() {
    const btnExpStock = document.getElementById('btn-exportar-stock');
    const btnImpStock = document.getElementById('btn-imprimir-stock');
    const btnPdfStock = document.getElementById('btn-pdf-stock');
    const btnExpMovs = document.getElementById('btn-exportar-movimientos');
    const btnImpMovs = document.getElementById('btn-imprimir-movimientos');
    const btnPdfMovs = document.getElementById('btn-pdf-movimientos');

    if (btnExpStock) btnExpStock.addEventListener('click', () => {
        const categorias = obtenerDatos('categorias_tecnorivas');
        const dataExport = filteredInventario.map(a => {
            const cat = categorias.find(c => c.id === a.categoriaId);
            return {
                ...a,
                categoriaNombre: cat ? cat.nombre : '-',
                stockStr: `${a.stock} ${a.unidad || ''}`,
                valorTotal: a.stock * a.precio
            };
        });
        exportarExcel(dataExport, 'inventario_stock', [
            { key: 'nombre', label: 'Artículo' }, { key: 'categoriaNombre', label: 'Categoría' },
            { key: 'precio', label: 'Precio' }, { key: 'stockStr', label: 'Stock' }, { key: 'valorTotal', label: 'Valor Total' }
        ]);
    });

    if (btnImpStock) btnImpStock.addEventListener('click', () => imprimirTabla('Stock Actual', 'tabla-body-stock'));
    if (btnPdfStock) btnPdfStock.addEventListener('click', () => generarPDF('Inventario - Stock'));

    if (btnExpMovs) btnExpMovs.addEventListener('click', () => {
        const articulos = obtenerDatos('articulos_tecnorivas');
        const dataExport = filteredMovimientos.map(m => {
            const art = articulos.find(a => a.id === m.articuloId);
            return { ...m, articuloNombre: art ? art.nombre : `ID: ${m.articuloId}` };
        });
        exportarExcel(dataExport, 'movimientos', [
            { key: 'fecha', label: 'Fecha' }, { key: 'tipo', label: 'Tipo' },
            { key: 'articuloNombre', label: 'Artículo' }, { key: 'cantidad', label: 'Cantidad' }, { key: 'referencia', label: 'Referencia' }
        ]);
    });

    if (btnImpMovs) btnImpMovs.addEventListener('click', () => imprimirTabla('Historial de Movimientos', 'tabla-body-movimientos'));
    if (btnPdfMovs) btnPdfMovs.addEventListener('click', () => generarPDF('Historial de Movimientos'));
}

// ============================================================
// AJUSTE DE STOCK
// ============================================================
function configurarAjusteStock() {
    const btnAjuste = document.getElementById('btn-ajuste-stock');
    if (btnAjuste) {
        btnAjuste.addEventListener('click', () => {
            const selectArt = document.getElementById('ajuste-articulo');
            selectArt.innerHTML = '<option value="">-- Buscar artículo --</option>';
            const articulos = obtenerDatos('articulos_tecnorivas');
            articulos.forEach(a => {
                selectArt.insertAdjacentHTML('beforeend', `<option value="${a.id}">${a.nombre} (Stock: ${a.stock})</option>`);
            });
            document.getElementById('form-ajuste-stock').reset();
            new bootstrap.Modal(document.getElementById('modal-ajuste-stock')).show();
        });
    }

    const formAjuste = document.getElementById('form-ajuste-stock');
    if (formAjuste) {
        formAjuste.addEventListener('submit', async (e) => {
            e.preventDefault();
            const idArt = parseInt(document.getElementById('ajuste-articulo').value);
            const tipo = document.getElementById('ajuste-tipo').value;
            const cantidad = parseInt(document.getElementById('ajuste-cantidad').value);
            const motivo = document.getElementById('ajuste-motivo').value.trim();

            if (!idArt || !cantidad || !motivo) return;

            const articulos = obtenerDatos('articulos_tecnorivas');
            const movs = obtenerMovimientos();
            const artIdx = articulos.findIndex(a => a.id === idArt);

            if (artIdx === -1) return;

            if (tipo === 'salida' && articulos[artIdx].stock < cantidad) {
                alertaError('La cantidad a restar supera el stock actual.');
                return;
            }

            if (!(await confirmarAccion(`¿Confirmar ${tipo} de ${cantidad} unidades?`, 'Ajuste de Stock'))) return;

            const saldoA = articulos[artIdx].stock;
            if (tipo === 'entrada') {
                articulos[artIdx].stock += cantidad;
            } else {
                articulos[artIdx].stock -= cantidad;
            }
            const saldoB = articulos[artIdx].stock;

            movs.push({
                fecha: fechaHoraAhora(),
                articuloId: idArt,
                tipo: tipo,
                cantidad: cantidad,
                saldoA: saldoA,
                saldoB: saldoB,
                referencia: `AJUSTE: ${motivo}`
            });

            guardarDatos('articulos_tecnorivas', articulos);
            guardarDatos(CLAVE_MOVIMIENTOS, movs);

            bootstrap.Modal.getInstance(document.getElementById('modal-ajuste-stock')).hide();
            setTimeout(() => {
                alertaExito('Ajuste de stock realizado correctamente.');
            }, 300);
            
            cargarInventario('stock');
            cargarInventario('movimientos');
            verificarAlertas();
        });
    }
}

