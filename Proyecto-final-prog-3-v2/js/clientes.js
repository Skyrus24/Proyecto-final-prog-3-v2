/**
 * clientes.js - Módulo de Clientes
 */

const CLAVE_CLIENTES = 'clientes_tecnorivas';

let paginadorClientes;
let filteredClientes = [];

document.addEventListener('DOMContentLoaded', () => {
    const sesion = protegerPagina();
    if (!sesion) return;

    if (!localStorage.getItem(CLAVE_CLIENTES)) {
        localStorage.setItem(CLAVE_CLIENTES, JSON.stringify([]));
    }

    paginadorClientes = new Paginador('tabla-body', 'paginacion-clientes', 10);
    
    cargarClientes();
    configurarBuscador();
    configurarBotones();
});

function obtenerClientes() {
    return obtenerDatos(CLAVE_CLIENTES) || [];
}

function guardarClientes(lista) {
    guardarDatos(CLAVE_CLIENTES, lista);
}

function cargarClientes() {
    const clientes = obtenerClientes().sort((a, b) => b.id - a.id);
    filteredClientes = clientes;
    actualizarContador(clientes.length);
    paginadorClientes.setDatos(clientes, renderFilas);
}

function actualizarContador(n) {
    const el = document.getElementById('contador');
    if (el) el.textContent = `${n} registro(s)`;
}

function renderFilas(lista, cont) {
    if (lista.length === 0) {
        cont.innerHTML = `<tr><td colspan="6" class="text-center text-muted py-4"><i class="bi bi-inbox fs-3 d-block mb-2"></i>Sin clientes registrados</td></tr>`;
        return;
    }
    
    const sesion = obtenerSesion();
    const esAdmin = sesion && (sesion.rol === 'admin' || sesion.rol === 'superusuario');

    cont.innerHTML = lista.map(c => {
        const acciones = `
            <button class="btn btn-sm btn-outline-primary me-1" onclick="abrirEditar(${c.id})" title="Editar"><i class="bi bi-pencil-square"></i></button>
            ${esAdmin ? `<button class="btn btn-sm btn-outline-danger" onclick="eliminarCliente(${c.id})" title="Eliminar"><i class="bi bi-trash3"></i></button>` : ''}
        `;
        return `
            <tr>
                <td><strong>${c.nombre}</strong></td>
                <td>${c.cedula}</td>
                <td>${c.telefono || '-'}</td>
                <td>${c.email || '-'}</td>
                <td>${c.direccion || '-'}</td>
                <td>${acciones}</td>
            </tr>
        `;
    }).join('');
}

function configurarBuscador() {
    const input = document.getElementById('buscador');
    if (input) {
        input.addEventListener('input', e => {
            const f = e.target.value.toLowerCase();
            let lista = obtenerClientes();
            if (f) {
                lista = lista.filter(c => 
                    c.nombre.toLowerCase().includes(f) || 
                    c.cedula.toLowerCase().includes(f) ||
                    (c.telefono && c.telefono.toLowerCase().includes(f)) ||
                    (c.email && c.email.toLowerCase().includes(f))
                );
            }
            filteredClientes = lista;
            actualizarContador(lista.length);
            paginadorClientes.setDatos(lista, renderFilas);
        });
    }
}

function configurarBotones() {
    document.getElementById('btn-nuevo')?.addEventListener('click', abrirNuevo);
    document.getElementById('form-cliente')?.addEventListener('submit', guardarCliente);
    
    document.getElementById('btn-exportar')?.addEventListener('click', () => {
        if (filteredClientes.length === 0) { alertaError('No hay datos para exportar'); return; }
        exportarExcel(filteredClientes, 'Clientes_TECNORIVAS');
    });

    document.getElementById('btn-imprimir')?.addEventListener('click', () => {
        if (filteredClientes.length === 0) { alertaError('No hay datos para imprimir'); return; }
        imprimirTablaHTML('Clientes', ['Nombre', 'Cédula/RUC', 'Teléfono', 'Email', 'Dirección'], filteredClientes.map(c => [
            c.nombre, c.cedula, c.telefono || '-', c.email || '-', c.direccion || '-'
        ]));
    });

    document.getElementById('btn-pdf')?.addEventListener('click', () => {
        if (filteredClientes.length === 0) { alertaError('No hay datos para exportar'); return; }
        exportarPDF('Reporte de Clientes', ['Nombre', 'Cédula/RUC', 'Teléfono', 'Email', 'Dirección'], filteredClientes.map(c => [
            c.nombre, c.cedula, c.telefono || '-', c.email || '-', c.direccion || '-'
        ]), 'Clientes_TECNORIVAS');
    });
}

function abrirNuevo() {
    document.getElementById('modal-titulo').textContent = 'Nuevo Cliente';
    document.getElementById('form-cliente').reset();
    document.getElementById('cli-id').value = '';
    bootstrap.Modal.getOrCreateInstance(document.getElementById('modal-cliente')).show();
}

function abrirEditar(id) {
    const c = obtenerClientes().find(x => x.id === id);
    if (!c) return;
    document.getElementById('modal-titulo').textContent = 'Editar Cliente';
    document.getElementById('cli-id').value = c.id;
    document.getElementById('cli-nombre').value = c.nombre;
    document.getElementById('cli-cedula').value = c.cedula;
    document.getElementById('cli-telefono').value = c.telefono || '';
    document.getElementById('cli-email').value = c.email || '';
    document.getElementById('cli-direccion').value = c.direccion || '';
    bootstrap.Modal.getOrCreateInstance(document.getElementById('modal-cliente')).show();
}

function guardarCliente(e) {
    e.preventDefault();
    const id = document.getElementById('cli-id').value;
    const obj = {
        nombre: document.getElementById('cli-nombre').value.trim(),
        cedula: document.getElementById('cli-cedula').value.trim(),
        telefono: document.getElementById('cli-telefono').value.trim(),
        email: document.getElementById('cli-email').value.trim(),
        direccion: document.getElementById('cli-direccion').value.trim()
    };
    
    if (obj.nombre.length < 3) {
        alertaError('El nombre del cliente debe tener al menos 3 letras.'); return;
    }
    
    // Validación básica de RUC/Cédula
    if (obj.cedula.length < 3) {
        alertaError('Ingrese un documento válido.'); return;
    }

    const lista = obtenerClientes();
    
    // Validar documento duplicado
    if (lista.find(x => x.cedula === obj.cedula && x.id !== parseInt(id))) { 
        alertaError('Ya existe un cliente con ese documento.'); return; 
    }
    
    if (id) {
        const idx = lista.findIndex(x => x.id === parseInt(id));
        lista[idx] = { ...lista[idx], ...obj };
    } else {
        lista.push({ id: generarId(lista), ...obj });
    }
    
    guardarClientes(lista);
    bootstrap.Modal.getInstance(document.getElementById('modal-cliente')).hide();
    cargarClientes();
    alertaExito('Cliente guardado exitosamente.');
}

async function eliminarCliente(id) {
    const c = obtenerClientes().find(x => x.id === id);
    if (!c) return;
    
    // Evitar borrar Consumidor Final (ID 1)
    if (c.id === 1 || c.nombre === 'Consumidor Final') {
        alertaError('No se puede eliminar al Consumidor Final.');
        return;
    }

    // Verificar si está en uso en Facturas o Presupuestos
    const facturas = obtenerDatos('facturas_tecnorivas') || [];
    if (facturas.find(f => f.clienteId === id)) {
        alertaError('No se puede eliminar el cliente porque tiene facturas asociadas. Esto afectaría la auditoría histórica.');
        return;
    }
    
    const presupuestos = obtenerDatos('presupuestos_tecnorivas') || [];
    if (presupuestos.find(p => p.clienteId === id)) {
        alertaError('No se puede eliminar el cliente porque tiene presupuestos asociados.');
        return;
    }

    if (!(await confirmarEliminar(c.nombre))) return;
    
    guardarClientes(obtenerClientes().filter(x => x.id !== id));
    cargarClientes();
    alertaExito('Cliente eliminado.');
}
