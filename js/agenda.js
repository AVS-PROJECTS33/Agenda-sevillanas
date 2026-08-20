const firebaseConfig = {
  apiKey: "AIzaSyAJzOyvSjg85atJtE5K0jiKzREt-peiPbs",
  authDomain: "sevillanas-candelas.firebaseapp.com",
  projectId: "sevillanas-candelas",
  storageBucket: "sevillanas-candelas.firebasestorage.app",
  messagingSenderId: "651443310469",
  appId: "1:651443310469:web:42ab90f18f3f8637d4beec",
  measurementId: "G-27H0WGE3EJ"
};
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

const clases = [
    "8 octubre", "12 noviembre", "17 diciembre", 
    "29 enero", "25 febrero", "25 marzo", 
    "29 abril", "27 mayo", "24 junio", "15 julio"
];

const linksContainer = document.getElementById('date-links');
const tbody = document.getElementById('attendees-body');
const currentTitle = document.getElementById('current-date-title');
const totalCount = document.getElementById('total-count');
const emptyMessage = document.getElementById('empty-message');

let currentActiveLink = null;
let todasLasReservas = [];

// Escuchar cambios en tiempo real
db.collection("reservas").onSnapshot((snapshot) => {
    todasLasReservas = [];
    snapshot.forEach(doc => {
        todasLasReservas.push(doc.data());
    });
    if (currentActiveLink) {
        loadDataForDate(currentActiveLink.textContent);
    }
});

// Render sidebar links
clases.forEach(fecha => {
    const li = document.createElement('li');
    li.textContent = fecha;
    li.addEventListener('click', () => {
        if(currentActiveLink) currentActiveLink.classList.remove('active');
        li.classList.add('active');
        currentActiveLink = li;
        loadDataForDate(fecha);
    });
    linksContainer.appendChild(li);
});

function loadDataForDate(fecha) {
    currentTitle.textContent = `Apuntados para el ${fecha}`;
    const reservas = todasLasReservas;
    
    // Filter reservas that include this fecha
    const attendees = reservas.filter(r => r.fechas.includes(fecha));
    
    totalCount.textContent = attendees.length;
    tbody.innerHTML = '';

    if (attendees.length === 0) {
        emptyMessage.classList.remove('hidden');
        document.getElementById('attendees-table').style.display = 'none';
    } else {
        emptyMessage.classList.add('hidden');
        document.getElementById('attendees-table').style.display = 'table';
        
        attendees.forEach(a => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td class="td-nombre">${a.nombre}</td>
                <td class="td-apellidos">${a.apellidos}</td>
                <td class="td-telefono">${a.telefono}</td>
                <td class="actions-cell">
                    <button class="btn-sm btn-edit" onclick="editRecord(this, '${a.id}', '${fecha}')">Editar</button>
                    <button class="btn-sm btn-delete" onclick="deleteRecord('${a.id}', '${fecha}')">Borrar</button>
                </td>
            `;
            tbody.appendChild(tr);
        });
    }
}

// Load first date by default
if(linksContainer.firstChild) {
    linksContainer.firstChild.click();
}

// Funciones de Edición y Borrado
window.deleteRecord = function(id, fecha) {
    if (confirm("¿Estás seguro de que quieres borrar este registro de este día?")) {
        const index = todasLasReservas.findIndex(r => r.id === id);
        
        if (index !== -1) {
            const reserva = todasLasReservas[index];
            const nuevasFechas = reserva.fechas.filter(f => f !== fecha);
            
            if (nuevasFechas.length === 0) {
                db.collection("reservas").doc(id).delete();
            } else {
                db.collection("reservas").doc(id).update({ fechas: nuevasFechas });
            }
        }
    }
}

window.editRecord = function(btn, id, fecha) {
    const tr = btn.closest('tr');
    const tdNombre = tr.querySelector('.td-nombre');
    const tdApellidos = tr.querySelector('.td-apellidos');
    const tdTelefono = tr.querySelector('.td-telefono');
    const actionsCell = tr.querySelector('.actions-cell');

    // Cambiar a inputs
    const currentNombre = tdNombre.textContent;
    const currentApellidos = tdApellidos.textContent;
    const currentTelefono = tdTelefono.textContent;

    tdNombre.innerHTML = `<input type="text" class="edit-input" value="${currentNombre}" id="edit-nombre-${id}">`;
    tdApellidos.innerHTML = `<input type="text" class="edit-input" value="${currentApellidos}" id="edit-apellidos-${id}">`;
    tdTelefono.innerHTML = `<input type="text" class="edit-input" value="${currentTelefono}" id="edit-telefono-${id}">`;

    // Cambiar botones
    actionsCell.innerHTML = `
        <button class="btn-sm btn-save" onclick="saveRecord('${id}', '${fecha}')">Guardar</button>
        <button class="btn-sm btn-delete" onclick="loadDataForDate('${fecha}')">Cancelar</button>
    `;
}

window.saveRecord = function(id, fecha) {
    const nuevoNombre = document.getElementById(`edit-nombre-${id}`).value;
    const nuevoApellidos = document.getElementById(`edit-apellidos-${id}`).value;
    const nuevoTelefono = document.getElementById(`edit-telefono-${id}`).value;

    db.collection("reservas").doc(id).update({
        nombre: nuevoNombre,
        apellidos: nuevoApellidos,
        telefono: nuevoTelefono
    });
}

// Funciones de Exportación
document.getElementById('btn-export-pdf').addEventListener('click', () => {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    const currentFecha = currentActiveLink ? currentActiveLink.textContent : 'Fecha Desconocida';
    
    doc.text(`Lista de Asistentes - Sevillanas Dani Candela`, 14, 15);
    doc.text(`Fecha: ${currentFecha}`, 14, 25);
    
    doc.autoTable({
        html: '#attendees-table',
        startY: 30,
        // Only include the first 3 columns, ignore actions
        columns: [
            { header: 'Nombre', dataKey: 0 },
            { header: 'Apellidos', dataKey: 1 },
            { header: 'Teléfono', dataKey: 2 }
        ]
    });
    
    doc.save(`Asistentes_${currentFecha.replace(' ', '_')}.pdf`);
});

document.getElementById('btn-export-excel').addEventListener('click', () => {
    const reservas = todasLasReservas;
    const flatData = [];
    
    // Aplanar datos para que salga una fila por cada persona-día
    reservas.forEach(r => {
        r.fechas.forEach(fecha => {
            flatData.push({
                "Fecha de Clase": fecha,
                "Nombre": r.nombre,
                "Apellidos": r.apellidos,
                "Teléfono": r.telefono
            });
        });
    });
    
    const worksheet = XLSX.utils.json_to_sheet(flatData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Reservas");
    
    XLSX.writeFile(workbook, "Reservas_Dani_Candela_Global.xlsx");
});
