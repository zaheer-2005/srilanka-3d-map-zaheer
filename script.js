// Day/Night Theme Auto Switcher
const currentHour = new Date().getHours();
const isNight = currentHour >= 18 || currentHour < 6; 

// Directly using OpenFreeMap Styles without requiring any API keys
const mapStyle = isNight 
    ? 'https://tiles.openfreemap.org/styles/dark'  
    : 'https://tiles.openfreemap.org/styles/bright'; 

const map = new maplibregl.Map({
    container: 'map',
    style: mapStyle,
    center: [80.5, 7.5], 
    zoom: 7.5,
    pitch: 45, 
    bearing: 0, 
    antialias: true
});

const tourismLocations = [
    { id: 0, name: "Sigiriya", coords: [80.7516, 7.9570], desc: "Ancient rock fortress." },
    { id: 1, name: "Ella", coords: [81.0454, 6.8770], desc: "Colonial railway bridge." },
    { id: 2, name: "Galle Fort", coords: [80.2176, 6.0267], desc: "17th-century fortified city." },
    { id: 3, name: "Kandy", coords: [80.6413, 7.2936], desc: "Sacred Buddhist temple." },
    { id: 4, name: "Colombo", coords: [79.8592, 6.9292], desc: "Tallest tower in South Asia." },
    { id: 5, name: "Kurunegala", coords: [80.3647, 7.4871], desc: "The heart of Wayamba province." },
    { id: 6, name: "Ragama", coords: [79.9197, 7.0311], desc: "Major transit hub." }
];

let animationId;
let carMarker;

map.on('load', () => {
    buildUI();
    populateDropdowns();
});

async function buildUI() {
    const listContainer = document.getElementById('location-list');
    if(listContainer) listContainer.innerHTML = ''; 

    for (const loc of tourismLocations) {
        if(listContainer) {
            const btn = document.createElement('button');
            btn.className = 'btn-location';
            btn.innerHTML = `📍 ${loc.name}`;
            btn.onclick = () => flyToLocation(loc);
            listContainer.appendChild(btn);
        }

        // Static fallback weather details
        let weatherText = "29°C | Clear"; 
        let iconUrl = "https://openweathermap.org/img/wn/01d.png";
        
        const el = document.createElement('div');
        el.className = 'weather-marker';
        el.innerHTML = `<img src="${iconUrl}" /> <span>${loc.name}: ${weatherText}</span>`;

        const popup = new maplibregl.Popup({ offset: 20 }).setHTML(`
            <div style="padding:10px; color:black; font-family:'Poppins',sans-serif;">
                <h3 style="margin:0 0 5px 0; color:#00b4d8; font-size:14px;">${loc.name}</h3>
                <p style="margin:0; font-size:11px; color:#555;">${loc.desc}</p>
                <p style="margin:5px 0 0 0; font-size:12px; font-weight:bold; color:#ff4757;">☁️ Status: ${weatherText}</p>
            </div>
        `);

        new maplibregl.Marker(el).setLngLat(loc.coords).setPopup(popup).addTo(map);
    }
}

function populateDropdowns() {
    const startSelect = document.getElementById('start-loc');
    const endSelect = document.getElementById('end-loc');
    
    if(!startSelect || !endSelect) return;
    
    startSelect.innerHTML = '';
    endSelect.innerHTML = '';

    tourismLocations.forEach(loc => {
        startSelect.options[startSelect.options.length] = new Option(loc.name, loc.id);
        endSelect.options[endSelect.options.length] = new Option(loc.name, loc.id);
    });
    
    startSelect.selectedIndex = 4; // Colombo
    endSelect.selectedIndex = 5;   // Kurunegala
    
    calculateRoute();
}

async function calculateRoute() {
    const startId = document.getElementById('start-loc').value;
    const endId = document.getElementById('end-loc').value;

    const startCoords = tourismLocations[startId].coords;
    const endCoords = tourismLocations[endId].coords;

    const url = `https://router.project-osrm.org/route/v1/driving/${startCoords[0]},${startCoords[1]};${endCoords[0]},${endCoords[1]}?overview=full&geometries=geojson`;
    
    try {
        const response = await fetch(url);
        const data = await response.json();
        
        if(data.routes && data.routes.length > 0) {
            const routeCoordinates = data.routes[0].geometry.coordinates;
            drawRoute(routeCoordinates);
            animateCar(routeCoordinates); 
        }
    } catch (error) {
        console.error("Routing error:", error);
    }
}

function drawRoute(coordinates) {
    if (map.getLayer('route')) map.removeLayer('route');
    if (map.getSource('route')) map.removeSource('route');

    map.addSource('route', {
        'type': 'geojson',
        'data': {
            'type': 'Feature',
            'properties': {},
            'geometry': { 'type': 'LineString', 'coordinates': coordinates }
        }
    });

    map.addLayer({
        'id': 'route',
        'type': 'line',
        'source': 'route',
        'layout': { 'line-join': 'round', 'line-cap': 'round' },
        'paint': { 'line-color': '#00b4d8', 'line-width': 5, 'line-opacity': 0.85 }
    });

    const bounds = coordinates.reduce((acc, coord) => acc.extend(coord), new maplibregl.LngLatBounds(coordinates[0], coordinates[0]));
    map.fitBounds(bounds, { padding: 50 });
}

function animateCar(coordinates) {
    if (animationId) cancelAnimationFrame(animationId);
    if (carMarker) carMarker.remove();

    const carEl = document.createElement('div');
    carEl.className = 'car-animator';
    carEl.innerHTML = '🚗';

    carMarker = new maplibregl.Marker(carEl)
        .setLngLat(coordinates[0])
        .addTo(map);

    let progress = 0;
    const speed = 1.5; 

    function step() {
        if (progress >= coordinates.length - 1) { progress = 0; }
        const start = coordinates[Math.floor(progress)];
        const end = coordinates[Math.min(Math.floor(progress) + 1, coordinates.length - 1)];
        if (!start || !end) return;

        const bearing = Math.atan2(end[1] - start[1], end[0] - start[0]) * 180 / Math.PI;
        carEl.style.transform = `rotate(${90 - bearing}deg)`;
        carMarker.setLngLat(start);

        progress += (speed / 10);
        animationId = requestAnimationFrame(step);
    }
    step();
}

function flyToLocation(loc) {
    map.flyTo({ center: loc.coords, zoom: 12, pitch: 50, speed: 1.2, essential: true });
}

window.togglePanel = function() {
    const panel = document.getElementById('main-panel');
    const maxBtn = document.getElementById('max-btn');
    if (!panel || !maxBtn) return;
    
    if (panel.style.display === 'none') {
        panel.style.display = 'flex';
        maxBtn.style.display = 'none';
    } else {
        panel.style.display = 'none';
        maxBtn.style.display = 'block';
    }
}
