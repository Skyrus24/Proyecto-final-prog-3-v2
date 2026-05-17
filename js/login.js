// Redirigir si ya hay sesión
if (obtenerSesion()) window.location.href = 'pages/dashboard.html';

// Toggle contraseña
document.getElementById('toggle-pass').addEventListener('click', () => {
    const inp = document.getElementById('login-contrasena');
    const ico = document.querySelector('#toggle-pass i');
    if (inp.type === 'password') { inp.type = 'text'; ico.className = 'bi bi-eye-slash'; }
    else { inp.type = 'password'; ico.className = 'bi bi-eye'; }
});

// Login
document.getElementById('form-login').addEventListener('submit', async (e) => {
    e.preventDefault();
    const usuario = document.getElementById('login-usuario').value.trim();
    const contrasena = document.getElementById('login-contrasena').value.trim();

    // Mostrar spinner
    document.getElementById('btn-login-text').classList.add('d-none');
    document.getElementById('btn-login-spinner').classList.remove('d-none');

    await new Promise(r => setTimeout(r, 600)); // Simular delay

    const usuarios = obtenerDatos('usuarios_tecnorivas');
    
    if (!usuarios || usuarios.length === 0) {
        document.getElementById('btn-login-text').classList.remove('d-none');
        document.getElementById('btn-login-spinner').classList.add('d-none');
        Swal.fire({ icon: 'warning', title: 'Base de Datos Vacía', text: 'No hay usuarios registrados. Utilice el botón "Cargar Defectos" para iniciar.' });
        return;
    }

    const user = usuarios.find(u => u.usuario === usuario && u.contrasena === contrasena);

    if (user) {
        guardarSesion({ id: user.id, nombre: user.nombre, usuario: user.usuario, rol: user.rol });
        await Swal.fire({
            icon: 'success',
            title: `¡Bienvenido, ${user.nombre}!`,
            text: `Rol: ${user.rol === 'admin' ? 'Administrador' : 'Vendedor'}`,
            timer: 1500,
            showConfirmButton: false
        });
        window.location.href = 'pages/dashboard.html';
    } else {
        document.getElementById('btn-login-text').classList.remove('d-none');
        document.getElementById('btn-login-spinner').classList.add('d-none');
        Swal.fire({ icon: 'error', title: 'Credenciales incorrectas', text: 'Verifique su usuario y contraseña.' });
    }
});

// Gestión de Base de Datos
document.getElementById('btn-ver-bd').addEventListener('click', () => {
    let tabsHtml = '<ul class="nav nav-tabs" id="bdTabs" role="tablist" style="margin-bottom:15px; flex-wrap:wrap;">';
    let contentHtml = '<div class="tab-content" id="bdTabsContent" style="max-height:50vh; overflow-y:auto; overflow-x:auto;">';
    let foundAny = false;
    let isFirst = true;
    
    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key.includes('tecnorivas')) {
            foundAny = true;
            let data = [];
            try { data = JSON.parse(localStorage.getItem(key)); } catch(e) { continue; }
            
            const tabId = key.replace('_tecnorivas', '');
            const tituloTabla = tabId.replace('_', ' ').toUpperCase();
            const activeClass = isFirst ? 'active' : '';
            const showClass = isFirst ? 'show active' : '';
            
            // Tab button
            tabsHtml += `
                <li class="nav-item" role="presentation">
                    <button class="nav-link ${activeClass} text-nowrap" style="padding: 8px 12px; font-size: 13px; font-weight: bold; color: #1e3a5f;" data-bs-target="#tab-${tabId}" type="button" role="tab">
                        ${tituloTabla} <span class="badge bg-secondary ms-1">${Array.isArray(data) ? data.length : 1}</span>
                    </button>
                </li>
            `;
            
            // Tab content
            contentHtml += `<div class="tab-pane fade ${showClass}" id="tab-${tabId}" role="tabpanel">`;
            
            if (Array.isArray(data) && data.length > 0) {
                const headers = Object.keys(data[0]);
                contentHtml += '<div class="table-responsive"><table class="table table-sm table-striped table-bordered m-0" style="font-size:12px; white-space:nowrap;">';
                contentHtml += '<thead class="table-dark"><tr>';
                headers.forEach(h => contentHtml += `<th>${h}</th>`);
                contentHtml += '</tr></thead><tbody>';
                
                data.forEach(item => {
                    contentHtml += '<tr>';
                    headers.forEach(h => {
                        let val = item[h];
                        if (typeof val === 'object') val = JSON.stringify(val);
                        contentHtml += `<td>${val !== null && val !== undefined ? val : ''}</td>`;
                    });
                    contentHtml += '</tr>';
                });
                
                contentHtml += '</tbody></table></div>';
            } else if (Array.isArray(data) && data.length === 0) {
                contentHtml += '<p class="text-muted text-center mt-3" style="font-size:13px;">No hay registros en esta tabla.</p>';
            } else {
                contentHtml += `<pre style="font-size:12px; background:#f4f4f4; padding:10px;">${JSON.stringify(data, null, 2)}</pre>`;
            }
            
            contentHtml += '</div>';
            isFirst = false;
        }
    }
    
    tabsHtml += '</ul>';
    contentHtml += '</div>';
    
    let finalHtml = foundAny ? (tabsHtml + contentHtml) : '<div class="alert alert-warning mt-4 text-center">La base de datos local está vacía.</div>';

    Swal.fire({
        title: 'Explorador de Base de Datos',
        html: finalHtml,
        width: '95%',
        confirmButtonText: 'Cerrar',
        didOpen: () => {
            const tabBtns = document.querySelectorAll('#bdTabs .nav-link');
            const tabPanes = document.querySelectorAll('#bdTabsContent .tab-pane');
            tabBtns.forEach(btn => {
                btn.addEventListener('click', (e) => {
                    e.preventDefault();
                    tabBtns.forEach(b => b.classList.remove('active'));
                    tabPanes.forEach(p => p.classList.remove('show', 'active'));
                    btn.classList.add('active');
                    document.querySelector(btn.getAttribute('data-bs-target')).classList.add('show', 'active');
                });
            });
        }
    });
});

document.getElementById('btn-cargar-bd').addEventListener('click', () => {
    Swal.fire({
        title: '¿Cargar Datos por Defecto?',
        text: 'Esto restaurará la base de datos a su estado inicial. Se cargarán los usuarios, compras, y todos los items preconfigurados del array.',
        icon: 'question',
        showCancelButton: true,
        confirmButtonColor: '#28a745',
        cancelButtonColor: '#3085d6',
        confirmButtonText: 'Sí, cargar',
        cancelButtonText: 'Cancelar'
    }).then((result) => {
        if (result.isConfirmed) {
            const keys = [];
            for (let i = 0; i < localStorage.length; i++) {
                if (localStorage.key(i).includes('tecnorivas')) keys.push(localStorage.key(i));
            }
            keys.forEach(k => localStorage.removeItem(k));
            
            if (typeof inicializarDatos === 'function') { inicializarDatos(); }
            Swal.fire('Cargado', 'Los datos por defecto han sido recargados.', 'success');
        }
    });
});

document.getElementById('btn-vaciar-bd').addEventListener('click', () => {
    Swal.fire({
        title: '¿Eliminar Base de Datos?',
        text: 'Esto eliminará completamente todos los items y registros locales.',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#d33',
        cancelButtonColor: '#3085d6',
        confirmButtonText: 'Sí, eliminar',
        cancelButtonText: 'Cancelar'
    }).then((result) => {
        if (result.isConfirmed) {
            const keys = [];
            for (let i = 0; i < localStorage.length; i++) {
                if (localStorage.key(i).includes('tecnorivas')) keys.push(localStorage.key(i));
            }
            keys.forEach(k => localStorage.removeItem(k));
            Swal.fire('Eliminada', 'Todos los arrays locales fueron limpiados.', 'success').then(() => location.reload());
        }
    });
});
