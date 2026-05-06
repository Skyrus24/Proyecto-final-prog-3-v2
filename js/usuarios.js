/**
 * usuarios.js - Módulo de Gestión de Usuarios
 */

const CLAVE_USUARIOS = 'usuarios_tecnorivas';

function obtenerUsuarios() { return obtenerDatos(CLAVE_USUARIOS); }
function guardarUsuarios(lista) { guardarDatos(CLAVE_USUARIOS, lista); }

let paginadorUsuarios;
let usuariosFiltered = [];

document.addEventListener('DOMContentLoaded', () => {
    const sesion = protegerPagina();
    if (!sesion) return;
    paginadorUsuarios = new Paginador('tabla-body', 'paginacion-usuarios', 10);
    cargarTablaUsuarios();
    configurarBusqueda();
    configurarFormulario();
    configurarExportar();
    configurarImprimir();
    document.getElementById('btn-nuevo').addEventListener('click', abrirModalNuevo);
});

function cargarTablaUsuarios(filtro = '') {
    let usuarios = obtenerUsuarios();
    if (filtro) {
        const f = filtro.toLowerCase();
        usuarios = usuarios.filter(u =>
            u.nombre.toLowerCase().includes(f) ||
            u.usuario.toLowerCase().includes(f) ||
            u.cedula.includes(f) ||
            u.rol.toLowerCase().includes(f)
        );
    }
    usuariosFiltered = usuarios;
    document.getElementById('contador').textContent = `${usuarios.length} registro(s)`;
    paginadorUsuarios.setDatos(usuarios, renderFilasUsuarios);
}

function renderFilasUsuarios(lista, contenedor) {
    if (lista.length === 0) {
        contenedor.innerHTML = `<tr><td colspan="7" class="text-center text-muted py-4"><i class="bi bi-inbox fs-3 d-block mb-2"></i>No hay usuarios registrados</td></tr>`;
        return;
    }
    lista.forEach(u => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${u.cedula}</td>
            <td><strong>${u.nombre}</strong></td>
            <td>${u.celular}</td>
            <td>${u.usuario}</td>
            <td><span class="badge ${u.rol === 'admin' ? 'bg-danger' : 'bg-primary'}">${u.rol === 'admin' ? 'Administrador' : 'Vendedor'}</span></td>
            <td>${formatearFecha(u.fechaCreacion)}</td>
            <td>
                <button class="btn btn-sm btn-outline-primary me-1" onclick="abrirEditar(${u.id})" title="Editar"><i class="bi bi-pencil-square"></i></button>
                <button class="btn btn-sm btn-outline-danger" onclick="eliminarUsuario(${u.id})" title="Eliminar"><i class="bi bi-trash3"></i></button>
            </td>
        `;
        contenedor.appendChild(tr);
    });
}

function configurarBusqueda() {
    const input = document.getElementById('buscador');
    if (input) input.addEventListener('input', () => cargarTablaUsuarios(input.value));
}

function abrirModalNuevo() {
    document.getElementById('modal-titulo').textContent = 'Nuevo Usuario';
    document.getElementById('form-usuario').reset();
    document.getElementById('usuario-id').value = '';
    document.getElementById('contrasena').required = true;
    document.getElementById('contrasena-hint').classList.remove('d-none');
    new bootstrap.Modal(document.getElementById('modal-usuario')).show();
}

function abrirEditar(id) {
    const u = obtenerUsuarios().find(x => x.id === id);
    if (!u) return;
    document.getElementById('modal-titulo').textContent = 'Editar Usuario';
    document.getElementById('usuario-id').value = u.id;
    document.getElementById('cedula').value = u.cedula;
    document.getElementById('nombre').value = u.nombre;
    document.getElementById('celular').value = u.celular;
    document.getElementById('usuario-nombre').value = u.usuario;
    document.getElementById('contrasena').value = '';
    document.getElementById('contrasena').required = false;
    document.getElementById('contrasena-hint').classList.add('d-none');
    document.getElementById('rol').value = u.rol;
    new bootstrap.Modal(document.getElementById('modal-usuario')).show();
}

function configurarFormulario() {
    const form = document.getElementById('form-usuario');
    if (!form) return;
    form.addEventListener('submit', e => { e.preventDefault(); guardarUsuario(); });
}

function guardarUsuario() {
    const id = document.getElementById('usuario-id').value;
    const cedula = document.getElementById('cedula').value.trim();
    const nombre = document.getElementById('nombre').value.trim();
    const celular = document.getElementById('celular').value.trim();
    const usuario = document.getElementById('usuario-nombre').value.trim();
    const contrasena = document.getElementById('contrasena').value.trim();
    const rol = document.getElementById('rol').value;
    const usuarios = obtenerUsuarios();

    if (usuarios.find(u => u.cedula === cedula && u.id !== parseInt(id))) { alertaError('Ya existe un usuario con esa cédula.'); return; }
    if (usuarios.find(u => u.usuario === usuario && u.id !== parseInt(id))) { alertaError('El nombre de usuario ya está en uso.'); return; }

    if (id) {
        const idx = usuarios.findIndex(u => u.id === parseInt(id));
        usuarios[idx] = { ...usuarios[idx], cedula, nombre, celular, usuario, rol };
        if (contrasena) usuarios[idx].contrasena = contrasena;
    } else {
        if (!contrasena) { alertaError('La contraseña es obligatoria.'); return; }
        usuarios.push({ id: generarId(usuarios), cedula, nombre, celular, usuario, contrasena, rol, fechaCreacion: fechaHoraAhora() });
    }
    guardarUsuarios(usuarios);
    bootstrap.Modal.getInstance(document.getElementById('modal-usuario')).hide();
    cargarTablaUsuarios(document.getElementById('buscador').value);
    alertaExito(id ? 'Usuario actualizado.' : 'Usuario creado.');
}

async function eliminarUsuario(id) {
    const sesion = obtenerSesion();
    if (!sesion || sesion.rol !== 'admin') { alertaAdvertencia('Solo administradores pueden eliminar usuarios.'); return; }
    if (sesion.id === id) { alertaError('No puedes eliminar tu propio usuario.'); return; }
    const u = obtenerUsuarios().find(x => x.id === id);
    if (!u) return;
    if (!(await confirmarEliminar(u.nombre))) return;
    guardarUsuarios(obtenerUsuarios().filter(x => x.id !== id));
    cargarTablaUsuarios(document.getElementById('buscador').value);
    alertaExito('Usuario eliminado.');
}

function configurarExportar() {
    const btn = document.getElementById('btn-exportar');
    if (btn) btn.addEventListener('click', () => exportarCSV(usuariosFiltered, 'usuarios', [
        { key: 'cedula', label: 'Cédula' }, { key: 'nombre', label: 'Nombre' },
        { key: 'celular', label: 'Celular' }, { key: 'usuario', label: 'Usuario' }, { key: 'rol', label: 'Rol' }
    ]));
}

function configurarImprimir() {
    const btn = document.getElementById('btn-imprimir');
    if (btn) btn.addEventListener('click', () => imprimirTabla('Usuarios'));
}
