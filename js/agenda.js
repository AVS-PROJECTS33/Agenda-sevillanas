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

// Delegación de eventos (Borrar, Editar, Guardar)
if (tbody) {
    tbody.addEventListener('click', (e) => {
        const btn = e.target.closest('button');
        if (!btn) return;

        const docId = btn.getAttribute('data-id');
        const fecha = btn.getAttribute('data-fecha');

        if (btn.classList.contains('btn-delete')) {
            if (btn.textContent === 'Cancelar') {
                loadDataForDate(fecha);
            } else {
                deleteRecordJS(docId, fecha);
            }
        } else if (btn.classList.contains('btn-edit')) {
            editRecordJS(btn, docId, fecha);
        } else if (btn.classList.contains('btn-save')) {
            saveRecordJS(docId, fecha);
        }
    });
}

// Escuchar Firebase
db.collection("reservas").onSnapshot((snapshot) => {
    todasLasReservas = [];
    snapshot.forEach(doc => {
        const data = doc.data();
        data.docId = doc.id; 
        todasLasReservas.push(data);
    });
    if (currentActiveLink) {
        loadDataForDate(currentActiveLink.textContent);
    }
});

// Renderizar menú
if (linksContainer) {
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

    if(linksContainer.firstChild) {
        linksContainer.firstChild.click();
    }
}

function loadDataForDate(fecha) {
    if (!currentTitle || !tbody || !totalCount || !emptyMessage) return;
    
    currentTitle.textContent = `Apuntados para el ${fecha}`;
    
    const attendees = todasLasReservas.filter(r => (r.fechas || []).includes(fecha));
    
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
                    <button class="btn-sm btn-edit" data-id="${realId}" data-fecha="${fecha}">Editar</button>
                    <button class="btn-sm btn-delete" data-id="${realId}" data-fecha="${fecha}">Borrar</button>
                </td>
            `;
            tbody.appendChild(tr);
        });
    }
}

function deleteRecordJS(docId, fecha) {
    if (confirm("¿Estás seguro de que quieres borrar este registro de este día?")) {
        const reserva = todasLasReservas.find(r => r.docId === docId || r.id === docId);
        if (reserva) {
            const nuevasFechas = (reserva.fechas || []).filter(f => f !== fecha);
            if (nuevasFechas.length === 0) {
                db.collection("reservas").doc(docId).delete().catch(e => console.error(e));
            } else {
                db.collection("reservas").doc(docId).update({ fechas: nuevasFechas }).catch(e => console.error(e));
            }
        }
    }
}

function editRecordJS(btn, docId, fecha) {
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
        <button class="btn-sm btn-save" data-id="${docId}" data-fecha="${fecha}">Guardar</button>
        <button class="btn-sm btn-delete" data-id="${docId}" data-fecha="${fecha}">Cancelar</button>
    `;
}

function saveRecordJS(docId, fecha) {
    const nombreInput = document.getElementById(`edit-nombre-${docId}`);
    const apellidosInput = document.getElementById(`edit-apellidos-${docId}`);
    const telefonoInput = document.getElementById(`edit-telefono-${docId}`);

    if (!nombreInput || !apellidosInput || !telefonoInput) return;

    db.collection("reservas").doc(docId).update({
        nombre: nombreInput.value,
        apellidos: apellidosInput.value,
        telefono: telefonoInput.value
    }).catch(e => console.error(e));
}

window.exportPDF = function() {
    try {
        if (!window.jsPDF) {
            alert("La librería PDF no se cargó.");
            return;
        }
        
        const doc = new jsPDF();
        doc.setFontSize(18);
        doc.text(`Lista Completa de Asistentes`, 14, 15);
        let currentY = 25;
        let recordsFound = false;

        clases.forEach((fecha) => {
            const attendees = todasLasReservas.filter(r => (r.fechas || []).includes(fecha));
            if (attendees.length > 0) {
                recordsFound = true;
                if (currentY > 250) {
                    doc.addPage();
                    currentY = 20;
                }
                
                doc.setFontSize(14);
                doc.text(`Clase: ${fecha}`, 14, currentY);
                currentY += 5;

                const tableData = attendees.map(a => [a.nombre || '', a.apellidos || '', a.telefono || '']);
                
                if (typeof doc.autoTable === 'function') {
                    doc.autoTable({
                        startY: currentY,
                        head: [['Nombre', 'Apellidos', 'Teléfono']],
                        body: tableData,
                        theme: 'grid',
                        headStyles: { fillColor: [217, 4, 41] }
                    });
                    currentY = doc.previousAutoTable ? doc.previousAutoTable.finalY + 15 : currentY + 15;
                }
            }
        });

        if (recordsFound) {
            doc.save(`Asistentes_Sevillanas.pdf`);
        } else {
            alert("No hay reservas guardadas para descargar.");
        }
    } catch (e) {
        alert("Fallo generando PDF: " + e.message);
    }
};

window.exportExcel = function() {
    try {
        let csvContent = "\uFEFF"; // BOM para UTF-8
        csvContent += "Fecha,Nombre,Apellidos,Telefono\n";
        
        let recordsFound = false;

        clases.forEach(fecha => {
            const attendees = todasLasReservas.filter(r => (r.fechas || []).includes(fecha));
            attendees.forEach(a => {
                recordsFound = true;
                const nombre = (a.nombre || '').replace(/"/g, '""');
                const apellidos = (a.apellidos || '').replace(/"/g, '""');
                const telefono = (a.telefono || '').replace(/"/g, '""');
                csvContent += `"${fecha}","${nombre}","${apellidos}","${telefono}"\n`;
            });
        });
        
        if (!recordsFound) {
            alert("No hay reservas guardadas para descargar.");
            return;
        }

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement("a");
        const url = URL.createObjectURL(blob);
        link.setAttribute("href", url);
        link.setAttribute("download", "Asistentes_Sevillanas.csv");
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    } catch (e) {
        alert("Fallo generando Excel: " + e.message);
    }
};
