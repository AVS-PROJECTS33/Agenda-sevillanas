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
        const data = doc.data();
        data.docId = doc.id; // Guarda el ID real de Firestore
        todasLasReservas.push(data);
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
    const attendees = reservas.filter(r => (r.fechas || []).includes(fecha));
    
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
            const realId = a.docId || a.id;
            tr.innerHTML = `
                <td class="td-nombre">${a.nombre || ''}</td>
                <td class="td-apellidos">${a.apellidos || ''}</td>
                <td class="td-telefono">${a.telefono || ''}</td>
                <td class="actions-cell">
                    <button class="btn-sm btn-edit" onclick="editRecord(this, '${realId}', '${fecha}')">Editar</button>
                    <button class="btn-sm btn-delete" onclick="deleteRecord('${realId}', '${fecha}')">Borrar</button>
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
window.deleteRecord = function(docId, fecha) {
    if (confirm("¿Estás seguro de que quieres borrar este registro de este día?")) {
        const reserva = todasLasReservas.find(r => r.docId === docId || r.id === docId);
        
        if (reserva) {
            const nuevasFechas = (reserva.fechas || []).filter(f => f !== fecha);
            
            if (nuevasFechas.length === 0) {
                db.collection("reservas").doc(docId).delete().catch(e => alert("Error borrando: " + e));
            } else {
                db.collection("reservas").doc(docId).update({ fechas: nuevasFechas }).catch(e => alert("Error actualizando: " + e));
            }
        } else {
            alert("No se encontró el registro para borrar.");
        }
    }
}

window.editRecord = function(btn, docId, fecha) {
    const tr = btn.closest('tr');
    const tdNombre = tr.querySelector('.td-nombre');
    const tdApellidos = tr.querySelector('.td-apellidos');
    const tdTelefono = tr.querySelector('.td-telefono');
    const actionsCell = tr.querySelector('.actions-cell');

    const currentNombre = tdNombre.textContent;
    const currentApellidos = tdApellidos.textContent;
    const currentTelefono = tdTelefono.textContent;

    tdNombre.innerHTML = `<input type="text" class="edit-input" value="${currentNombre}" id="edit-nombre-${docId}">`;
    tdApellidos.innerHTML = `<input type="text" class="edit-input" value="${currentApellidos}" id="edit-apellidos-${docId}">`;
    tdTelefono.innerHTML = `<input type="text" class="edit-input" value="${currentTelefono}" id="edit-telefono-${docId}">`;

    actionsCell.innerHTML = `
        <button class="btn-sm btn-save" onclick="saveRecord('${docId}', '${fecha}')">Guardar</button>
        <button class="btn-sm btn-delete" onclick="loadDataForDate('${fecha}')">Cancelar</button>
    `;
}

window.saveRecord = function(docId, fecha) {
    const nuevoNombre = document.getElementById(`edit-nombre-${docId}`).value;
    const nuevoApellidos = document.getElementById(`edit-apellidos-${docId}`).value;
    const nuevoTelefono = document.getElementById(`edit-telefono-${docId}`).value;

    db.collection("reservas").doc(docId).update({
        nombre: nuevoNombre,
        apellidos: nuevoApellidos,
        telefono: nuevoTelefono
    }).catch(e => alert("Error al guardar: " + e));
}

// Funciones de Exportación
document.getElementById('btn-export-pdf').addEventListener('click', () => {
    try {
        const jsPDF = window.jspdf ? window.jspdf.jsPDF : window.jsPDF;
        if (!jsPDF) {
            alert("No se pudo cargar el creador de PDF. Comprueba tu conexión a Internet.");
            return;
        }
        const doc = new jsPDF();
        
        doc.setFontSize(18);
        doc.text(`Lista Completa de Asistentes - Sevillanas Dani Candela`, 14, 15);
        let currentY = 25;

        clases.forEach((fecha) => {
            const attendees = todasLasReservas.filter(r => (r.fechas || []).includes(fecha));
            if (attendees.length > 0) {
                if (currentY > 250) {
                    doc.addPage();
                    currentY = 20;
                }
                
                doc.setFontSize(14);
                doc.text(`Clase: ${fecha}`, 14, currentY);
                currentY += 5;

                const tableData = attendees.map(a => [a.nombre || '', a.apellidos || '', a.telefono || '']);
                
                doc.autoTable({
                    startY: currentY,
                    head: [['Nombre', 'Apellidos', 'Teléfono']],
                    body: tableData,
                    theme: 'grid',
                    headStyles: { fillColor: [217, 4, 41] }
                });
                
                currentY = (doc.lastAutoTable ? doc.lastAutoTable.finalY : currentY + (attendees.length * 10)) + 15;
            }
        });

        doc.save(`Asistentes_Globales_Sevillanas.pdf`);
    } catch (e) {
        console.error("Error exportando a PDF:", e);
        alert("Hubo un error exportando el PDF: " + e.message);
    }
});

document.getElementById('btn-export-excel').addEventListener('click', () => {
    try {
        if (!window.XLSX) {
            alert("No se pudo cargar la librería Excel. Comprueba tu conexión a Internet.");
            return;
        }
        const workbook = XLSX.utils.book_new();

        clases.forEach(fecha => {
            const attendees = todasLasReservas.filter(r => (r.fechas || []).includes(fecha));
            if (attendees.length > 0) {
                const sheetData = attendees.map(a => ({
                    "Nombre": a.nombre || '',
                    "Apellidos": a.apellidos || '',
                    "Teléfono": a.telefono || ''
                }));
                const worksheet = XLSX.utils.json_to_sheet(sheetData);
                
                let safeSheetName = fecha.replace(/[\\/*?:\[\]]/g, '').substring(0, 31);
                XLSX.utils.book_append_sheet(workbook, worksheet, safeSheetName);
            }
        });
        
        if (workbook.SheetNames.length === 0) {
            XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet([{"Mensaje": "No hay reservas"}]), "Sin Reservas");
        }

        XLSX.writeFile(workbook, "Asistentes_Globales_Sevillanas.xlsx");
    } catch (e) {
        console.error("Error exportando a Excel:", e);
        alert("Hubo un error exportando el Excel: " + e.message);
    }
});
