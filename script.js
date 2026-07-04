const MAPTILER_KEY = 'YOUR_MAPTILER_API_KEY'; 

const mapStyle = MAPTILER_KEY !== 'YOUR_MAPTILER_API_KEY' 
    ? `https://api.maptiler.com/maps/outdoor-v2/style.json?key=${MAPTILER_KEY}`
    : 'https://tiles.openfreemap.org/styles/bright';

const map = new maplibregl.Map({
    container: 'map',
    style: mapStyle,
    center: [80.7718, 7.8731], 
    zoom: 7.5,
    pitch: 45, 
    bearing: 0, 
    antialias: true
});

// Sample Destinations (You can expand this up to 50 easily)
const tourismLocations = [
    { id: 0, name: "Sigiriya Rock Fortress", coords: [80.7516, 7.9570], desc: "Ancient rock fortress." },
    { id: 1, name: "Ella Nine Arch Bridge", coords: [81.0454, 6.8770], desc: "Colonial-era railway bridge." },
    { id: 2, name: "Galle Dutch Fort", coords: [80.2176, 6.0267], desc: "17th-century fortified city." },
    { id: 3, name: "Temple of the Tooth (Kandy)", coords: [80.6413, 7.2936], desc: "Sacred Buddhist temple." },
    { id: 4, name: "Colombo Lotus Tower", coords: [79.8592, 6.9292], desc: "Tallest structure in South Asia." }
];

map.on('load', () => {
    buildUI();
    populateDropdowns();
});

// 1. Build List and Markers
function buildUI() {
    const listContainer = document.getElementById('location-list');
    listContainer.innerHTML = ''; 

    tourismLocations.forEach((loc) => {
        const btn = document.createElement('button');
        btn.className = 'btn-location';
        btn.innerHTML = `📍 ${loc.name}`;
        btn.onclick = () => flyToLocation(loc);
        listContainer.appendChild(btn);

        const el = document.createElement('div');
        el.className = 'custom-marker';

        const queryName = encodeURIComponent(loc.name + " Sri Lanka");
        const imageUrl = `https://source.unsplash.com/featured/300x200/?${queryName}`;

        const popup = new maplibregl.Popup({ offset: 20 }).setHTML(`
            <div>
                <img src="${imageUrl}" class="popup-image" alt="${loc.name}" onerror="this.src='https://images.unsplash.com/photo-1588598126210-97b5d6f83ec5?w=300'"/>
                <div class="popup-text-box">
                    <h3 style="margin:0 0 5px 0; color:#00b4d8; font-size:14px;">${loc.name}</h3>
                    <p style="margin:0; font-size:11px; color:#ccc;">${loc.desc}</p>
                </div>
            </div>
        `);

        new maplibregl.Marker(el).setLngLat(loc.coords).setPopup(popup).addTo(map);
    });
}

// 2. Populate Dropdowns for Routing
function populateDropdowns() {
    const startSelect = document.getElementById('start-loc');
    const endSelect = document.getElementById('end-loc');

    tourismLocations.forEach(loc => {
        startSelect.options[startSelect.options.length] = new Option(loc.name, loc.id);
        endSelect.options[endSelect.options.length] = new Option(loc.name, loc.id);
    });
    endSelect.selectedIndex = 1; // Default different index
}

// 3. Auto Calculate and Draw Route (OSRM API)
async function calculateRoute() {
    const startId = document.getElementById('start-loc').value;
    const endId = document.getElementById('end-loc').value;

    const startCoords = tourismLocations[startId].coords;
    const endCoords = tourismLocations[endId].coords;

    // Call OpenSource Routing Machine API
    const url = `https://router.project-osrm.org/route/v1/driving/${startCoords[0]},${startCoords[1]};${endCoords[0]},${endCoords[1]}?overview=full&geometries=geojson`;
    
    try {
        const response = await fetch(url);
        const data = await response.json();
        
        if(data.routes && data.routes.length > 0) {
            const routeCoordinates = data.routes[0].geometry.coordinates;
            drawRoute(routeCoordinates);
        }
    } catch (error) {
        console.error("Routing error:", error);
    }
}

// 4. Render Route Layer on Map
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
        'paint': { 'line-color': '#ff4757', 'line-width': 5, 'line-opacity': 0.85 }
    });

    const bounds = coordinates.reduce((acc, coord) => acc.extend(coord), new maplibregl.LngLatBounds(coordinates[0], coordinates[0]));
    map.fitBounds(bounds, { padding: 50 });
}

function flyToLocation(loc) {
    map.flyTo({ center: loc.coords, zoom: 13, pitch: 50, speed: 1.2, essential: true });
}

// 5. Minimize & Maximize Dashboard Function
window.togglePanel = function() {
    const panel = document.getElementById('main-panel');
    const maxBtn = document.getElementById('max-btn');

    if (panel.style.display === 'none') {
        panel.style.display = 'flex';
        maxBtn.style.display = 'none';
    } else {
        panel.style.display = 'none';
        maxBtn.style.display = 'block';
    }
}
