const estados = [
  'NORMAL',
  'VIGILANCIA',
  'ADVERTENCIA',
  'POSIBLE INCENDIO',
  'INCENDIO CONFIRMADO'
];

const estadoColores = {
  NORMAL: '#22c55e',
  VIGILANCIA: '#facc15',
  ADVERTENCIA: '#fb923c',
  'POSIBLE INCENDIO': '#ef4444',
  'INCENDIO CONFIRMADO': '#991b1b'
};

const STORAGE_KEY = 'ecoalert-sensores';

const sensores = [
  { id: 'EA-001', nombre: 'Nodo Norte', sector: 'Zona Norte', lat: -30.25, lng: -71.28, temperatura: 24, humo: 10, estado: 'NORMAL', bateria: 96, senal: 95, ultimo: 'Ahora' },
  { id: 'EA-002', nombre: 'Nodo Centro', sector: 'Zona Centro', lat: -30.31, lng: -71.35, temperatura: 35, humo: 24, estado: 'VIGILANCIA', bateria: 92, senal: 90, ultimo: 'Ahora' },
  { id: 'EA-003', nombre: 'Nodo Quebrada', sector: 'Quebrada', lat: -30.37, lng: -71.42, temperatura: 48, humo: 42, estado: 'ADVERTENCIA', bateria: 91, senal: 87, ultimo: 'Ahora' },
  { id: 'EA-004', nombre: 'Nodo Reserva', sector: 'Reserva', lat: -30.42, lng: -71.33, temperatura: 66, humo: 71, estado: 'POSIBLE INCENDIO', bateria: 88, senal: 84, ultimo: 'Ahora' },
  { id: 'EA-005', nombre: 'Nodo Sur', sector: 'Zona Sur', lat: -30.20, lng: -71.47, temperatura: 83, humo: 92, estado: 'INCENDIO CONFIRMADO', bateria: 82, senal: 80, ultimo: 'Ahora' }
];

let sensorActual = sensores[0];
let marcadores = [];
let nextSensorId = sensores.length + 1;
let map;
const refs = {};

function initApp() {
  refs.clock = document.getElementById('clock');
  refs.today = document.getElementById('today');
  refs.serverStatus = document.getElementById('serverStatus');
  refs.sensorCounter = document.getElementById('sensorCounter');
  refs.alertCounter = document.getElementById('alertCounter');
  refs.generalStatus = document.getElementById('generalStatus');
  refs.normalCount = document.getElementById('normalCount');
  refs.watchCount = document.getElementById('watchCount');
  refs.warningCount = document.getElementById('warningCount');
  refs.possibleCount = document.getElementById('possibleCount');
  refs.fireCount = document.getElementById('fireCount');
  refs.sensorList = document.getElementById('sensorList');
  refs.sensorInfo = document.getElementById('sensorInfo');
  refs.sensorForm = document.getElementById('sensorForm');
  refs.sensorId = document.getElementById('sensorId');
  refs.sensorName = document.getElementById('sensorName');
  refs.sensorSector = document.getElementById('sensorSector');
  refs.sensorTemp = document.getElementById('sensorTemp');
  refs.sensorSmoke = document.getElementById('sensorSmoke');
  refs.sensorLat = document.getElementById('sensorLat');
  refs.sensorLng = document.getElementById('sensorLng');
  refs.sensorStatus = document.getElementById('sensorStatus');
  refs.deleteSensorBtn = document.getElementById('deleteSensorBtn');
  refs.addSensorBtn = document.getElementById('addSensorBtn');
  refs.sensorFilter = document.getElementById('sensorFilter');
  refs.resetStorageBtn = document.getElementById('resetStorageBtn');
  refs.eventLog = document.getElementById('eventLog');
  refs.batteryLevel = document.getElementById('batteryLevel');
  refs.signalLevel = document.getElementById('signalLevel');
  refs.lastCommunication = document.getElementById('lastCommunication');
  refs.notification = document.getElementById('notification');
  refs.notificationTitle = document.getElementById('notificationTitle');
  refs.notificationText = document.getElementById('notificationText');

  loadStoredData();
  initializeMap();
  bindEvents();
  updateClock();
  setInterval(updateClock, 1000);
  if (!sensorActual && sensores.length) sensorActual = sensores[0];
  drawSensors();
  refreshDashboard();
  if (sensorActual) selectSensor(sensorActual);
  saveStoredData();
  addLog('EcoAlert inició correctamente.');
}

function initializeMap() {
  map = L.map('map').setView([-30.30, -71.35], 10);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap'
  }).addTo(map);
}

function bindEvents() {
  refs.addSensorBtn.addEventListener('click', handleAddSensor);
  refs.sensorForm.addEventListener('submit', handleSaveSensor);
  refs.deleteSensorBtn.addEventListener('click', handleDeleteSensor);
  refs.sensorFilter.addEventListener('input', updateFilter);
  refs.resetStorageBtn.addEventListener('click', handleResetStorage);
  document.querySelectorAll('.btn-quick').forEach(button => {
    button.addEventListener('click', handleQuickSimulation);
  });
}

function updateClock() {
  const now = new Date();
  refs.clock.textContent = now.toLocaleTimeString('es-CL');
  refs.today.textContent = now.toLocaleDateString('es-CL');
}

function colorEstado(estado) {
  return estadoColores[estado] || '#94a3b8';
}

function claseEstado(estado) {
  switch (estado) {
    case 'NORMAL': return 'estado-normal';
    case 'VIGILANCIA': return 'estado-vigilancia';
    case 'ADVERTENCIA': return 'estado-advertencia';
    case 'POSIBLE INCENDIO': return 'estado-posible';
    case 'INCENDIO CONFIRMADO': return 'estado-incendio';
    default: return '';
  }
}

function validateSensorValues(values) {
  const errors = [];
  if (!values.nombre || !values.nombre.trim()) errors.push('Nombre del sensor es obligatorio.');
  if (!values.sector || !values.sector.trim()) errors.push('Sector es obligatorio.');
  if (!Number.isFinite(values.temperatura) || values.temperatura < -20 || values.temperatura > 120) errors.push('Temperatura debe estar entre -20 y 120.');
  if (!Number.isFinite(values.humo) || values.humo < 0 || values.humo > 100) errors.push('Humo debe estar entre 0 y 100.');
  if (!Number.isFinite(values.lat) || values.lat < -90 || values.lat > 90) errors.push('Latitud inválida.');
  if (!Number.isFinite(values.lng) || values.lng < -180 || values.lng > 180) errors.push('Longitud inválida.');
  return errors;
}

function loadStoredData() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (saved && Array.isArray(saved.sensores) && saved.sensores.length) {
      sensores.length = 0;
      saved.sensores.forEach(sensor => sensores.push(sensor));
      nextSensorId = Number(saved.nextSensorId) || sensores.length + 1;
      const selectedId = saved.selectedSensorId;
      sensorActual = sensores.find(s => s.id === selectedId) || sensores[0];
      return;
    }
  } catch (error) {
    console.warn('No se pudo cargar el almacenamiento local:', error);
  }
  sensorActual = sensores[0];
}

function saveStoredData() {
  try {
    const payload = {
      sensores,
      nextSensorId,
      selectedSensorId: sensorActual ? sensorActual.id : null
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  } catch (error) {
    console.warn('No se pudo guardar el almacenamiento local:', error);
  }
}

function calcularEstado(temp, humo) {
  const temperatura = Number(temp);
  const nivelHumo = Number(humo);
  if (temperatura >= 75 || nivelHumo >= 85) return 'INCENDIO CONFIRMADO';
  if (temperatura >= 60 || nivelHumo >= 65) return 'POSIBLE INCENDIO';
  if (temperatura >= 45 || nivelHumo >= 40) return 'ADVERTENCIA';
  if (temperatura >= 30 || nivelHumo >= 20) return 'VIGILANCIA';
  return 'NORMAL';
}

function makeSensorIcon(estado) {
  const color = colorEstado(estado);
  return L.divIcon({
    className: 'sensor-marker',
    html: `<span style="background:${color};"></span>`,
    iconSize: [30, 30],
    iconAnchor: [15, 15]
  });
}

function getFilteredSensors() {
  const query = refs.sensorFilter && refs.sensorFilter.value.trim().toLowerCase();
  if (!query) return sensores;
  return sensores.filter(sensor => {
    return `${sensor.id} ${sensor.nombre} ${sensor.sector}`.toLowerCase().includes(query);
  });
}

function drawSensors(list = getFilteredSensors()) {
  marcadores.forEach(marker => map.removeLayer(marker));
  marcadores = [];
  list.forEach(sensor => {
    const marker = L.marker([sensor.lat, sensor.lng], {
      icon: makeSensorIcon(sensor.estado),
      draggable: true
    }).addTo(map);
    marker.bindPopup(`<strong>${sensor.nombre}</strong><br>${sensor.estado}<br>🌡 ${sensor.temperatura} °C<br>💨 ${sensor.humo}%<br>📍 ${sensor.sector}`);
    marker.on('click', () => selectSensor(sensor));
    marker.on('dragend', event => {
      const position = event.target.getLatLng();
      updateSensorPosition(sensor, position.lat, position.lng);
    });
    marcadores.push(marker);
  });
}

function updateFilter() {
  drawSensors();
  renderSensorList();
}

function handleResetStorage() {
  localStorage.removeItem(STORAGE_KEY);
  showNotification('Datos restablecidos', 'La aplicación se reiniciará con los valores predeterminados.');
  setTimeout(() => window.location.reload(), 800);
}

function updateSensorPosition(sensor, lat, lng) {
  sensor.lat = Number(lat.toFixed(5));
  sensor.lng = Number(lng.toFixed(5));
  sensor.ultimo = 'Ahora';
  addLog(`Sensor ${sensor.id} movido a ${sensor.lat.toFixed(5)}, ${sensor.lng.toFixed(5)}`);
  if (sensorActual && sensorActual.id === sensor.id) {
    fillForm(sensor);
    showSensorInfo(sensor);
  }
  renderSensorList();
  saveStoredData();
}

function renderSensorList(list = getFilteredSensors()) {
  refs.sensorList.innerHTML = '';
  if (!list.length) {
    refs.sensorList.innerHTML = '<div class="sensor-card"><p>No se encontraron sensores.</p></div>';
    return;
  }
  list.forEach(sensor => {
    const item = document.createElement('div');
    item.className = 'sensor-card';
    if (sensorActual && sensor.id === sensorActual.id) item.classList.add('active');
    item.innerHTML = `
      <h3>${sensor.id} - ${sensor.nombre}</h3>
      <p>${sensor.sector}</p>
      <p><span class="${claseEstado(sensor.estado)}">${sensor.estado}</span></p>
    `;
    item.addEventListener('click', () => selectSensor(sensor));
    refs.sensorList.appendChild(item);
  });
}

function selectSensor(sensor) {
  sensorActual = sensor;
  showSensorInfo(sensor);
  fillForm(sensor);
  renderSensorList();
  map.setView([sensor.lat, sensor.lng], 11, { animate: true });
  saveStoredData();
}

function showSensorInfo(sensor) {
  refs.sensorInfo.innerHTML = `
    <p><strong>ID:</strong> ${sensor.id}</p>
    <p><strong>Nombre:</strong> ${sensor.nombre}</p>
    <p><strong>Sector:</strong> ${sensor.sector}</p>
    <p><strong>Temperatura:</strong> ${sensor.temperatura} °C</p>
    <p><strong>Humo:</strong> ${sensor.humo}%</p>
    <p><strong>Estado:</strong> <span class="${claseEstado(sensor.estado)}">${sensor.estado}</span></p>
    <p><strong>Coordenadas:</strong> ${sensor.lat.toFixed(5)}, ${sensor.lng.toFixed(5)}</p>
    <p><strong>Batería:</strong> ${sensor.bateria}%</p>
    <p><strong>Señal:</strong> ${sensor.senal}%</p>
    <p><strong>Última comunicación:</strong> ${sensor.ultimo}</p>
  `;
  refs.batteryLevel.textContent = `${sensor.bateria}%`;
  refs.signalLevel.textContent = sensor.senal > 80 ? 'Excelente' : sensor.senal > 60 ? 'Buena' : 'Estable';
  refs.lastCommunication.textContent = sensor.ultimo;
}

function fillForm(sensor) {
  refs.sensorId.value = sensor.id;
  refs.sensorName.value = sensor.nombre;
  refs.sensorSector.value = sensor.sector;
  refs.sensorTemp.value = sensor.temperatura;
  refs.sensorSmoke.value = sensor.humo;
  refs.sensorLat.value = sensor.lat;
  refs.sensorLng.value = sensor.lng;
  refs.sensorStatus.value = sensor.estado;
}

function refreshDashboard() {
  refs.sensorCounter.textContent = sensores.length;
  const normal = sensores.filter(s => s.estado === 'NORMAL').length;
  const vigilancia = sensores.filter(s => s.estado === 'VIGILANCIA').length;
  const advertencia = sensores.filter(s => s.estado === 'ADVERTENCIA').length;
  const posible = sensores.filter(s => s.estado === 'POSIBLE INCENDIO').length;
  const incendio = sensores.filter(s => s.estado === 'INCENDIO CONFIRMADO').length;
  refs.normalCount.textContent = normal;
  refs.watchCount.textContent = vigilancia;
  refs.warningCount.textContent = advertencia;
  refs.possibleCount.textContent = posible;
  refs.fireCount.textContent = incendio;
  refs.alertCounter.textContent = posible + incendio;

  updateStateChart({ normal, vigilancia, advertencia, posible, incendio });

  if (incendio > 0) {
    refs.generalStatus.textContent = 'CRÍTICO: Incendio confirmado en la red de sensores.';
    refs.generalStatus.style.background = 'linear-gradient(135deg, rgba(185,28,28,0.16), rgba(17,24,39,0.96))';
    refs.serverStatus.textContent = '🚨 ALERTA';
    refs.serverStatus.style.color = '#fda4af';
  } else if (posible > 0) {
    refs.generalStatus.textContent = 'Alerta mayor: posibles incendios detectados. Revisa los nodos en rojo.';
    refs.generalStatus.style.background = 'linear-gradient(135deg, rgba(239,68,68,0.12), rgba(17,24,39,0.96))';
    refs.serverStatus.textContent = '⚠️ VIGILANCIA';
    refs.serverStatus.style.color = '#facc15';
  } else if (advertencia > 0) {
    refs.generalStatus.textContent = 'Advertencias activas: revisa el estado de los nodos en naranja.';
    refs.generalStatus.style.background = 'linear-gradient(135deg, rgba(251,146,60,0.12), rgba(17,24,39,0.96))';
    refs.serverStatus.textContent = '🟡 ESTABLE';
    refs.serverStatus.style.color = '#facc15';
  } else {
    refs.generalStatus.textContent = 'Operación estable: todos los sensores están en estado NORMAL.';
    refs.generalStatus.style.background = 'linear-gradient(135deg, rgba(34,197,94,0.12), rgba(17,24,39,0.96))';
    refs.serverStatus.textContent = '🟢 EN LÍNEA';
    refs.serverStatus.style.color = '#22c55e';
  }
}

function updateStateChart(values) {
  const total = values.normal + values.vigilancia + values.advertencia + values.posible + values.incendio;
  const normalized = total > 0 ? total : 1;
  refs.barNormal.textContent = values.normal;
  refs.barVigilancia.textContent = values.vigilancia;
  refs.barAdvertencia.textContent = values.advertencia;
  refs.barPosible.textContent = values.posible;
  refs.barIncendio.textContent = values.incendio;
  document.querySelector('.state-normal').style.width = `${(values.normal / normalized) * 100}%`;
  document.querySelector('.state-vigilancia').style.width = `${(values.vigilancia / normalized) * 100}%`;
  document.querySelector('.state-advertencia').style.width = `${(values.advertencia / normalized) * 100}%`;
  document.querySelector('.state-posible').style.width = `${(values.posible / normalized) * 100}%`;
  document.querySelector('.state-incendio').style.width = `${(values.incendio / normalized) * 100}%`;
}

function addLog(message) {
  const item = document.createElement('div');
  item.className = 'event-item';
  const timestamp = new Date().toLocaleTimeString('es-CL', { hour12: false });
  item.innerHTML = `<span class="event-time">${timestamp}</span><span>${message}</span>`;
  refs.eventLog.prepend(item);
  while (refs.eventLog.childElementCount > 8) {
    refs.eventLog.removeChild(refs.eventLog.lastElementChild);
  }
}

function handleAddSensor() {
  const center = map.getCenter();
  const nuevaLat = center.lat + (Math.random() - 0.5) * 0.35;
  const nuevaLng = center.lng + (Math.random() - 0.5) * 0.35;
  const temperatura = Math.round(18 + Math.random() * 50);
  const humo = Math.round(5 + Math.random() * 70);
  const estado = calcularEstado(temperatura, humo);
  const nuevoSensor = {
    id: `EA-${String(nextSensorId).padStart(3, '0')}`,
    nombre: `Nodo ${nextSensorId}`,
    sector: `Sector ${nextSensorId}`,
    lat: Number(nuevaLat.toFixed(5)),
    lng: Number(nuevaLng.toFixed(5)),
    temperatura,
    humo,
    estado,
    bateria: Math.round(80 + Math.random() * 15),
    senal: Math.round(70 + Math.random() * 25),
    ultimo: 'Ahora'
  };
  sensores.push(nuevoSensor);
  nextSensorId += 1;
  drawSensors();
  selectSensor(nuevoSensor);
  refreshDashboard();
  saveStoredData();
  addLog(`Se agregó el sensor ${nuevoSensor.id}.`);
}

function handleSaveSensor(event) {
  event.preventDefault();
  const sensor = sensores.find(s => s.id === refs.sensorId.value);
  if (!sensor) return;
  const updatedValues = {
    nombre: refs.sensorName.value.trim(),
    sector: refs.sensorSector.value.trim(),
    temperatura: Number(refs.sensorTemp.value),
    humo: Number(refs.sensorSmoke.value),
    lat: Number(refs.sensorLat.value),
    lng: Number(refs.sensorLng.value)
  };
  const errors = validateSensorValues(updatedValues);
  if (errors.length) {
    showNotification('Error de validación', errors[0]);
    return;
  }
  sensor.nombre = updatedValues.nombre;
  sensor.sector = updatedValues.sector;
  sensor.temperatura = updatedValues.temperatura;
  sensor.humo = updatedValues.humo;
  sensor.lat = updatedValues.lat;
  sensor.lng = updatedValues.lng;
  sensor.estado = calcularEstado(sensor.temperatura, sensor.humo);
  sensor.ultimo = 'Ahora';
  refs.sensorStatus.value = sensor.estado;
  drawSensors();
  renderSensorList();
  refreshDashboard();
  saveStoredData();
  showSensorInfo(sensor);
  addLog(`Sensor ${sensor.id} actualizado.`);
}

function handleDeleteSensor() {
  if (!sensorActual) return;
  const index = sensores.findIndex(s => s.id === sensorActual.id);
  if (index < 0) return;
  const eliminado = sensores.splice(index, 1)[0];
  addLog(`Sensor ${eliminado.id} eliminado.`);
  if (sensores.length > 0) {
    sensorActual = sensores[0];
    drawSensors();
    selectSensor(sensorActual);
  } else {
    sensorActual = null;
    refs.sensorList.innerHTML = '';
    refs.sensorInfo.textContent = 'No hay sensores activos.';
    refs.sensorForm.reset();
    drawSensors();
  }
  refreshDashboard();
  saveStoredData();
}

function handleQuickSimulation(event) {
  const mode = event.currentTarget.dataset.mode;
  if (!sensorActual) return;
  const template = {
    normal: { temperatura: 24, humo: 12 },
    vigilancia: { temperatura: 33, humo: 22 },
    advertencia: { temperatura: 48, humo: 44 },
    posible: { temperatura: 68, humo: 72 },
    incendio: { temperatura: 82, humo: 92 }
  };
  const valores = template[mode];
  sensorActual.temperatura = valores.temperatura;
  sensorActual.humo = valores.humo;
  sensorActual.estado = calcularEstado(sensorActual.temperatura, sensorActual.humo);
  sensorActual.ultimo = 'Ahora';
  fillForm(sensorActual);
  showSensorInfo(sensorActual);
  drawSensors();
  refreshDashboard();
  saveStoredData();
  addLog(`Simulación aplicada: ${sensorActual.id} -> ${sensorActual.estado}.`);
  showNotification('Simulación aplicada', `Sensor ${sensorActual.id} actualizado a ${sensorActual.estado}.`);
}

function showNotification(title, message) {
  refs.notificationTitle.textContent = title;
  refs.notificationText.textContent = message;
  refs.notification.classList.remove('hidden');
  setTimeout(() => refs.notification.classList.add('hidden'), 4200);
}

function init() {
  if (!document.getElementById('map')) return;
  initApp();
}

document.addEventListener('DOMContentLoaded', init);
