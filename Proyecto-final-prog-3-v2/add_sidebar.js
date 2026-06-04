const fs = require('fs');
const files = [
    'pages/caja.html', 'pages/compras.html', 'pages/dashboard.html',
    'pages/inventario.html', 'pages/presupuestos.html', 'pages/usuarios.html', 'pages/reportes.html'
];
const link = `            <a href="caja.html" class="nav-item-sidebar" id="nav-caja">
                <i class="bi bi-cash-coin"></i> Caja
            </a>\n`;

files.forEach(f => {
    let content = fs.readFileSync(f, 'utf8');
    if (!content.includes('id="nav-caja"')) {
        content = content.replace(/(\s*<div class="sidebar-section">Reportes<\/div>)/, '\n' + link + '$1');
        fs.writeFileSync(f, content);
        console.log('Updated ' + f);
    }
});
