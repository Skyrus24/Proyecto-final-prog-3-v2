/**
 * servicios.js - Módulo de Servicios
 */

const CLAVE_SERVICIOS = 'servicios_tecnorivas';

let paginadorServicios;
let filteredServicios = [];

document.addEventListener('DOMContentLoaded', () => {
    const sesion = protegerPagina();
    if (!sesion) return;

    paginadorServicios = new Paginador('tabla-body-servicios', 'paginacion-servicios', 10);
    
    cargarServicios();
    configurarBuscadorServicios();
    configurarExportarServicios();
    configurarCRUD();
    poblarSelectCategoriasServicio();
});

function poblarSelectCategoriasServicio() {
    const sel = document.getElementById('serv-categoria');
    if (!sel) return;
    sel.innerHTML = '<option value="">-- Seleccionar --</option>';
    obtenerDatos('categorias_tecnorivas').forEach(c => {
        sel.insertAdjacentHTML('beforeend', `<option value="${c.id}">${c.nombre}</option>`);
    });
}

function obtenerServicios() {
    return obtenerDatos(CLAVE_SERVICIOS);
}

function guardarServicios(servicios) {
    guardarDatos(CLAVE_SERVICIOS, servicios);
}

function cargarServicios() {
    let servicios = obtenerServicios();
    filteredServicios = servicios;
    const el = document.getElementById('contador-servicios');
    if (el) el.textContent = `${servicios.length} servicio(s)`;
    paginadorServicios.setDatos(servicios, renderFilasServicios);
}

function renderFilasServicios(lista, cont) {
    if (lista.length === 0) {
        cont.innerHTML = `<tr><td colspan="6" class="text-center text-muted py-4"><i class="bi bi-tools fs-3 d-block mb-2"></i>Sin servicios registrados</td></tr>`;
        return;
    }
    
    lista.forEach(s => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><strong>${s.nombre}</strong></td>
            <td>${s.descripcion || '-'}</td>
            <td><span class="badge bg-secondary">${s.categoria || 'General'}</span></td>
            <td>${formatearMoneda(s.precio_base)}</td>
            <td>
                ${s.activo 
                    ? '<span class="badge bg-success"><i class="bi bi-check-circle"></i> Activo</span>' 
                    : '<span class="badge bg-danger"><i class="bi bi-x-circle"></i> Inactivo</span>'}
            </td>
            <td>
                <button class="btn btn-sm btn-info text-white btn-editar" data-id="${s.id}" title="Editar"><i class="bi bi-pencil"></i></button>
                <button class="btn btn-sm btn-danger btn-eliminar" data-id="${s.id}" title="Eliminar"><i class="bi bi-trash"></i></button>
            </td>
        `;
        cont.appendChild(tr);
    });

    // Configurar eventos de los botones recién creados
    document.querySelectorAll('.btn-editar').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const id = parseInt(e.currentTarget.dataset.id);
            abrirModalEdicion(id);
        });
    });

    document.querySelectorAll('.btn-eliminar').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const id = parseInt(e.currentTarget.dataset.id);
            eliminarServicio(id);
        });
    });
}

function configurarBuscadorServicios() {
    const input = document.getElementById('buscador-servicios');
    if (input) input.addEventListener('input', () => {
        const f = input.value.toLowerCase();
        let lista = obtenerServicios();
        if (f) {
            lista = lista.filter(s => 
                s.nombre.toLowerCase().includes(f) || 
                (s.descripcion && s.descripcion.toLowerCase().includes(f)) ||
                (s.categoria && s.categoria.toLowerCase().includes(f))
            );
        }
        filteredServicios = lista;
        const el = document.getElementById('contador-servicios');
        if (el) el.textContent = `${lista.length} servicio(s)`;
        paginadorServicios.setDatos(lista, renderFilasServicios);
    });
}

function configurarExportarServicios() {
    const btnExp = document.getElementById('btn-exportar-servicios');
    const btnImp = document.getElementById('btn-imprimir-servicios');
    const btnPdf = document.getElementById('btn-pdf-servicios');

    if (btnExp) btnExp.addEventListener('click', () => {
        const dataExport = filteredServicios.map(s => {
            return {
                nombre: s.nombre,
                descripcion: s.descripcion || '',
                categoria: s.categoria || '',
                precio: s.precio_base,
                estado: s.activo ? 'Activo' : 'Inactivo'
            };
        });
        exportarExcel(dataExport, 'catalogo_servicios', [
            { key: 'nombre', label: 'Nombre' },
            { key: 'descripcion', label: 'Descripción' },
            { key: 'categoria', label: 'Categoría' },
            { key: 'precio', label: 'Precio Base' },
            { key: 'estado', label: 'Estado' }
        ]);
    });

    if (btnImp) btnImp.addEventListener('click', () => imprimirTabla('Catálogo de Servicios', 'tabla-body-servicios'));
    if (btnPdf) btnPdf.addEventListener('click', () => generarPDF('Catálogo de Servicios'));
}

function configurarCRUD() {
    const btnNuevo = document.getElementById('btn-nuevo-servicio');
    const formServicio = document.getElementById('form-servicio');

    if (btnNuevo) {
        btnNuevo.addEventListener('click', () => {
            document.getElementById('form-servicio').reset();
            document.getElementById('serv-id').value = '';
            document.getElementById('modal-titulo-servicio').innerHTML = '<i class="bi bi-tools me-2"></i>Nuevo Servicio';
            bootstrap.Modal.getOrCreateInstance(document.getElementById('modal-servicio')).show();
        });
    }

    if (formServicio) {
        formServicio.addEventListener('submit', (e) => {
            e.preventDefault();
            
            const id = document.getElementById('serv-id').value;
            const nombre = document.getElementById('serv-nombre').value.trim();
            const descripcion = document.getElementById('serv-descripcion').value.trim();
            const catSelect = document.getElementById('serv-categoria');
            const categoriaId = parseInt(catSelect.value) || '';
            const categoria = catSelect.options[catSelect.selectedIndex]?.text || 'General';
            const precioBase = parseFloat(document.getElementById('serv-precio').value) || 0;
            const activo = document.getElementById('serv-activo').checked;

            let servicios = obtenerServicios();

            // Validación de nombre duplicado
            const existe = servicios.find(s => s.nombre.toLowerCase() === nombre.toLowerCase() && s.id != id);
            if (existe) {
                alertaError('Ya existe un servicio con ese nombre.');
                return;
            }

            if (id) {
                // Editar
                const idx = servicios.findIndex(s => s.id == id);
                if (idx !== -1) {
                    servicios[idx] = {
                        ...servicios[idx],
                        nombre, descripcion, categoria, categoriaId, precio_base: precioBase, activo
                    };
                    alertaExito('Servicio actualizado correctamente.');
                }
            } else {
                // Nuevo
                servicios.push({
                    id: generarId(servicios),
                    nombre,
                    descripcion,
                    categoria,
                    categoriaId,
                    precio_base: precioBase,
                    activo
                });
                alertaExito('Servicio creado correctamente.');
            }

            guardarServicios(servicios);
            bootstrap.Modal.getInstance(document.getElementById('modal-servicio')).hide();
            cargarServicios();
            // Refrescar buscador si estaba activo
            document.getElementById('buscador-servicios').dispatchEvent(new Event('input'));
        });
    }
}

function abrirModalEdicion(id) {
    const servicios = obtenerServicios();
    const s = servicios.find(srv => srv.id === id);
    if (!s) return;

    document.getElementById('serv-id').value = s.id;
    document.getElementById('serv-nombre').value = s.nombre;
    document.getElementById('serv-descripcion').value = s.descripcion || '';
    document.getElementById('serv-categoria').value = s.categoriaId || '';
    document.getElementById('serv-precio').value = s.precio_base;
    document.getElementById('serv-activo').checked = s.activo;

    document.getElementById('modal-titulo-servicio').innerHTML = '<i class="bi bi-pencil me-2"></i>Editar Servicio';
    bootstrap.Modal.getOrCreateInstance(document.getElementById('modal-servicio')).show();
}

async function eliminarServicio(id) {
    const servicios = obtenerServicios();
    const s = servicios.find(srv => srv.id === id);
    if (!s) return;

    // Verificar permisos
    if (!soloAdmin()) return;

    if (await confirmarEliminar(s.nombre)) {
        const nuevosServicios = servicios.filter(srv => srv.id !== id);
        guardarServicios(nuevosServicios);
        alertaExito('Servicio eliminado correctamente.');
        cargarServicios();
        document.getElementById('buscador-servicios').dispatchEvent(new Event('input'));
    }
}
