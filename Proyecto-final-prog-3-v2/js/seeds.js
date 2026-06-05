/**
 * seeds.js - Datos Iniciales (Seed) de TECNORIVAS
 */

function inicializarDatos() {
    // Usuarios por defecto
    if (!localStorage.getItem('usuarios_tecnorivas')) {
        const usuarios = [
            { id: 1, cedula: '1234567', nombre: 'Administrador Principal', celular: '0981100001', usuario: 'admin', contrasena: 'admin123', rol: 'superusuario', fechaCreacion: new Date().toISOString() },
            { id: 2, cedula: '2345678', nombre: 'Asesor Demo', celular: '0971200002', usuario: 'asesor', contrasena: 'asesor123', rol: 'asesor', fechaCreacion: new Date().toISOString() },
            { id: 3, cedula: '3456789', nombre: 'Cajero Demo', celular: '0961300003', usuario: 'cajero', contrasena: 'cajero123', rol: 'cajero', fechaCreacion: new Date().toISOString() },
            { id: 4, cedula: '4567890', nombre: 'Cajero Demo 2', celular: '0951400004', usuario: 'cajero2', contrasena: 'cajero123', rol: 'cajero', fechaCreacion: new Date().toISOString() },
            { id: 5, cedula: '5678901', nombre: 'Supervisor Demo', celular: '0981500005', usuario: 'supervisor', contrasena: 'supervisor123', rol: 'supervisor', fechaCreacion: new Date().toISOString() },
            { id: 6, cedula: '6789012', nombre: 'María Pérez', celular: '0971600006', usuario: 'mperez', contrasena: 'Vendedor1@', rol: 'asesor', fechaCreacion: new Date().toISOString() },
            { id: 7, cedula: '7890123', nombre: 'Jorge Díaz', celular: '0961700007', usuario: 'jdiaz', contrasena: 'Vendedor1@', rol: 'asesor', fechaCreacion: new Date().toISOString() },
            { id: 8, cedula: '8901234', nombre: 'Laura Medina', celular: '0951800008', usuario: 'lmedina', contrasena: 'Vendedor1@', rol: 'cajero', fechaCreacion: new Date().toISOString() },
            { id: 9, cedula: '9012345', nombre: 'Pedro Sánchez', celular: '0981900009', usuario: 'psanchez', contrasena: 'Vendedor1@', rol: 'supervisor', fechaCreacion: new Date().toISOString() },
            { id: 10, cedula: '1023456', nombre: 'Elena Castillo', celular: '0972000010', usuario: 'ecastillo', contrasena: 'Vendedor1@', rol: 'asesor', fechaCreacion: new Date().toISOString() }
        ];
        guardarDatos('usuarios_tecnorivas', usuarios);
    }

    // Categorías por defecto
    if (!localStorage.getItem('categorias_tecnorivas')) {
        const categorias = [
            { id: 1, nombre: 'Refrigeración', descripcion: 'Equipos y repuestos de refrigeración' },
            { id: 2, nombre: 'Electricidad', descripcion: 'Materiales eléctricos' },
            { id: 3, nombre: 'Construcción', descripcion: 'Materiales de construcción' },
            { id: 4, nombre: 'Herramientas', descripcion: 'Herramientas generales' },
            { id: 5, nombre: 'Plomería', descripcion: 'Tuberías y accesorios de agua' },
            { id: 6, nombre: 'Pintura', descripcion: 'Pinturas y solventes' },
            { id: 7, nombre: 'Iluminación', descripcion: 'Lámparas y bombillas' },
            { id: 8, nombre: 'Seguridad', descripcion: 'Equipos de protección y alarmas' },
            { id: 9, nombre: 'Jardinería', descripcion: 'Equipos para mantenimiento exterior' },
            { id: 10, nombre: 'Automotriz', descripcion: 'Accesorios y repuestos básicos' }
        ];
        guardarDatos('categorias_tecnorivas', categorias);
    }

    // Servicios por defecto
    if (!localStorage.getItem('servicios_tecnorivas')) {
        const servicios = [
            { id: 1, nombre: 'Mantenimiento de Aire Acondicionado', categoriaId: 1, precio: 150000, iva: 10 },
            { id: 2, nombre: 'Instalación de Compresor', categoriaId: 1, precio: 250000, iva: 10 },
            { id: 3, nombre: 'Instalación Eléctrica Básica', categoriaId: 2, precio: 300000, iva: 10 },
            { id: 4, nombre: 'Cambio de Panel Eléctrico', categoriaId: 2, precio: 450000, iva: 10 },
            { id: 5, nombre: 'Mano de Obra Construcción (Día)', categoriaId: 3, precio: 180000, iva: 10 },
            { id: 6, nombre: 'Reparación de Fugas de Agua', categoriaId: 5, precio: 120000, iva: 10 },
            { id: 7, nombre: 'Pintura de Interiores (m2)', categoriaId: 6, precio: 25000, iva: 10 },
            { id: 8, nombre: 'Instalación de Lámparas', categoriaId: 7, precio: 80000, iva: 10 },
            { id: 9, nombre: 'Instalación de Cámaras', categoriaId: 8, precio: 350000, iva: 10 },
            { id: 10, nombre: 'Mantenimiento de Jardín', categoriaId: 9, precio: 90000, iva: 10 }
        ];
        guardarDatos('servicios_tecnorivas', servicios);
    }

    // Proveedores por defecto (RUC paraguayo: 6-8 dígitos + guión + dígito verificador)
    if (!localStorage.getItem('proveedores_tecnorivas')) {
        const proveedores = [
            { id: 1, nombre: 'Distribuidora Fría S.A.', ruc: '1234561-2', telefono: '0981555101', email: 'ventas@fria.com.py', direccion: 'Av. Principal #10, Asunción', contacto: 'Juan Pérez' },
            { id: 2, nombre: 'ElectroSupplies PY', ruc: '2345672-3', telefono: '0971555202', email: 'info@electro.com.py', direccion: 'Calle 5 #22, Luque', contacto: 'María López' },
            { id: 3, nombre: 'Materiales Constanza', ruc: '3456783-4', telefono: '0961555303', email: 'ventas@constanza.com.py', direccion: 'Av. Industrial #1, San Lorenzo', contacto: 'Pedro Gil' },
            { id: 4, nombre: 'Herramientas Globales', ruc: '4567894-5', telefono: '0951555404', email: 'contacto@hglobales.com.py', direccion: 'Calle Nueva #3, Fernando de la Mora', contacto: 'Luis Roa' },
            { id: 5, nombre: 'Tuberías y Más', ruc: '5678905-6', telefono: '0981555505', email: 'ventas@tuberiasymas.com.py', direccion: 'Plaza Central L2, Lambaré', contacto: 'Ana Rivas' },
            { id: 6, nombre: 'Pinturas Caribe', ruc: '6789016-7', telefono: '0971555606', email: 'info@pcaribe.com.py', direccion: 'Av. Mariscal López #45, Asunción', contacto: 'Carlos Mora' },
            { id: 7, nombre: 'Luz y Diseño', ruc: '7890127-8', telefono: '0961555707', email: 'ventas@luzdiseno.com.py', direccion: 'Calle 8 #12, Asunción', contacto: 'Elena Cruz' },
            { id: 8, nombre: 'Seguridad Total', ruc: '8901238-9', telefono: '0951555808', email: 'info@seguridadt.com.py', direccion: 'Shopping del Sol, Asunción', contacto: 'José Mateo' },
            { id: 9, nombre: 'Jardines del Sur', ruc: '9012349-0', telefono: '0981555909', email: 'ventas@jardines.com.py', direccion: 'Av. Sur #90, Encarnación', contacto: 'Lucía Peña' },
            { id: 10, nombre: 'Autopartes Rápidas', ruc: '10234560-1', telefono: '0971551010', email: 'ventas@autopartes.com.py', direccion: 'Av. Eusebio Ayala, Asunción', contacto: 'Roberto Gil' }
        ];
        guardarDatos('proveedores_tecnorivas', proveedores);
    }

    // Migración de datos: Renombrar 'rnc' a 'ruc' en proveedores existentes
    let provsExistentes = localStorage.getItem('proveedores_tecnorivas');
    if (provsExistentes) {
        let provsParsed = JSON.parse(provsExistentes);
        let migrado = false;
        provsParsed.forEach(p => {
            if (p.rnc !== undefined) {
                p.ruc = p.rnc;
                delete p.rnc;
                migrado = true;
            }
        });
        if (migrado) {
            guardarDatos('proveedores_tecnorivas', provsParsed);
        }
    }

    // Artículos por defecto
    if (!localStorage.getItem('articulos_tecnorivas')) {
        const articulos = [
            { id: 1, codigo: '7501000001001', nombre: 'Compresor 1/2 HP', categoriaId: 1, precio: 8500, stock: 10, unidad: 'und', iva: 10 },
            { id: 2, codigo: '7501000001002', nombre: 'Gas Refrigerante R22', categoriaId: 1, precio: 1200, stock: 25, unidad: 'kg', iva: 15 },
            { id: 3, codigo: '7501000002003', nombre: 'Cable #12 AWG', categoriaId: 2, precio: 85, stock: 200, unidad: 'm', iva: 10 },
            { id: 4, codigo: '7501000002004', nombre: 'Breaker 20A', categoriaId: 2, precio: 450, stock: 30, unidad: 'und', iva: 15 },
            { id: 5, codigo: '7501000003005', nombre: 'Cemento Portland', categoriaId: 3, precio: 650, stock: 100, unidad: 'saco', iva: 10 },
            { id: 6, codigo: '7501000004006', nombre: 'Taladro Percutor 800W', categoriaId: 4, precio: 3500, stock: 15, unidad: 'und', iva: 15 },
            { id: 7, codigo: '7501000005007', nombre: 'Tubo PVC 1/2"', categoriaId: 5, precio: 250, stock: 150, unidad: 'm', iva: 10 },
            { id: 8, codigo: '7501000006008', nombre: 'Galón Pintura Blanca Acrílica', categoriaId: 6, precio: 1800, stock: 40, unidad: 'galon', iva: 15 },
            { id: 9, codigo: '7501000007009', nombre: 'Bombillo LED 12W', categoriaId: 7, precio: 150, stock: 300, unidad: 'und', iva: 10 },
            { id: 10, codigo: '7501000008010', nombre: 'Cámara IP 1080p', categoriaId: 8, precio: 2200, stock: 20, unidad: 'und', iva: 15 }
        ];
        guardarDatos('articulos_tecnorivas', articulos);
    }

    // Clientes por defecto (CI paraguayo: número entre 100000 y 20000000)
    if (!localStorage.getItem('clientes_tecnorivas')) {
        const clientes = [
            { id: 1, cedula: '1111111', nombre: 'Cliente General', telefono: '0981111111', email: 'cliente@email.com.py', direccion: 'Sin dirección' },
            { id: 2, cedula: '2222222', nombre: 'Empresa ABC S.R.L.', telefono: '0972222222', email: 'abc@empresa.com.py', direccion: 'Zona Industrial #5, Luque' },
            { id: 3, cedula: '3333333', nombre: 'Juan Francisco', telefono: '0963333333', email: 'juanf@email.com.py', direccion: 'Calle 10 #20, Asunción' },
            { id: 4, cedula: '4444444', nombre: 'Constructora del Sol', telefono: '0954444444', email: 'info@csol.com.py', direccion: 'Av. España, Asunción' },
            { id: 5, cedula: '5555555', nombre: 'María Almonte', telefono: '0985555555', email: 'malmonte@email.com.py', direccion: 'Barrio San Pablo, Asunción' },
            { id: 6, cedula: '6666666', nombre: 'Ferretería Popular', telefono: '0976666666', email: 'ferrep@email.com.py', direccion: 'Av. Eusebio Ayala #100, Asunción' },
            { id: 7, cedula: '7777777', nombre: 'José Liranzo', telefono: '0967777777', email: 'jliranzo@email.com.py', direccion: 'Barrio Obrero, Asunción' },
            { id: 8, cedula: '8888888', nombre: 'Plaza del Pollo', telefono: '0958888888', email: 'plazap@email.com.py', direccion: 'Av. Artigas, Asunción' },
            { id: 9, cedula: '9999999', nombre: 'Rosa Tavares', telefono: '0989999999', email: 'rosat@email.com.py', direccion: 'Villa Morra, Asunción' },
            { id: 10, cedula: '1000001', nombre: 'Inversiones Múltiples', telefono: '0970001111', email: 'invm@email.com.py', direccion: 'Barrio Sajonia, Asunción' }
        ];
        guardarDatos('clientes_tecnorivas', clientes);
    }

    // Inicializar arrays vacíos si no existen
    ['compras_tecnorivas', 'ventas_tecnorivas', 'movimientos_inventario', 'pagos_compras', 'cobros_ventas', 'cajas_tecnorivas'].forEach(clave => {
        if (!localStorage.getItem(clave)) {
            guardarDatos(clave, []);
        }
    });
}
