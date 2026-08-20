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
    try {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();
        
        doc.setFontSize(18);
        doc.text(`Lista Completa de Asistentes - Sevillanas Dani Candela`, 14, 15);
        let startY = 25;

        clases.forEach((fecha) => {
            const attendees = todasLasReservas.filter(r => r.fechas.includes(fecha));
            if (attendees.length > 0) {
                if (startY > 250) {
                    doc.addPage();
                    startY = 20;
                }
                
                doc.setFontSize(14);
                doc.text(`Clase: ${fecha}`, 14, startY);
                startY += 5;

                const tableData = attendees.map(a => [a.nombre, a.apellidos, a.telefono]);
                
                doc.autoTable({
                    startY: startY,
                    head: [['Nombre', 'Apellidos', 'Teléfono']],
                    body: tableData,
                    theme: 'grid',
                    headStyles: { fillColor: [217, 4, 41] }
                });
                startY = doc.lastAutoTable.finalY + 15;
            }
        });

        doc.save(`Asistentes_Globales_Sevillanas.pdf`);
    } catch (e) {
        console.error("Error exportando a PDF:", e);
        alert("Hubo un error exportando el PDF. Asegúrate de tener conexión a Internet para cargar la librería.");
    }
});

document.getElementById('btn-export-excel').addEventListener('click', () => {
    try {
        const workbook = XLSX.utils.book_new();

        clases.forEach(fecha => {
            const attendees = todasLasReservas.filter(r => r.fechas.includes(fecha));
            if (attendees.length > 0) {
                const sheetData = attendees.map(a => ({
                    "Nombre": a.nombre,
                    "Apellidos": a.apellidos,
                    "Teléfono": a.telefono
                }));
                const worksheet = XLSX.utils.json_to_sheet(sheetData);
                
                // Nombre de hoja seguro para Excel
                let safeSheetName = fecha.replace(/[\\/*?:\[\]]/g, '').substring(0, 31);
                XLSX.utils.book_append_sheet(workbook, worksheet, safeSheetName);
            }
        });
        
        if (workbook.SheetNames.length === 0) {
            XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet([{"Mensaje": "No hay reservas en ninguna clase."}]), "Sin Reservas");
        }

        XLSX.writeFile(workbook, "Asistentes_Globales_Sevillanas.xlsx");
    } catch (e) {
        console.error("Error exportando a Excel:", e);
        alert("Hubo un error exportando el Excel. Asegúrate de tener conexión a Internet para cargar la librería.");
    }
});
