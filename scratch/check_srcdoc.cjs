const stops = [
  { id: 'job-1', clientName: 'Jose Test 1', serviceType: 'Regular Cleaning', address: '100 E Pine St, Orlando, FL 32801', lat: 28.5415, lng: -81.3788 }
];
const startLocation = { lat: 28.5, lng: -81.4 };
const routeGeometry = [];

const stopsJson = JSON.stringify(stops).replace(/`/g, '\\`').replace(/\${/g, '\\${');
const startJson = JSON.stringify(startLocation).replace(/`/g, '\\`').replace(/\${/g, '\\${');
const routeGeometryJson = JSON.stringify(routeGeometry || []).replace(/`/g, '\\`').replace(/\${/g, '\\${');

const srcDoc = `
  <!DOCTYPE html>
  <html>
  <head>
    <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
    <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
    <style>
      html, body, #map { margin: 0; padding: 0; height: 100%; background: #0b0f19; }
      .leaflet-control-zoom { display: none; }
      .popup-content { font-family: monospace; font-size: 10px; color: #fff; background: #0f172a; padding: 4px; border-radius: 4px; }
      .leaflet-popup-content-wrapper { background: #0f172a; color: #fff; border: 1px solid rgba(255,255,255,0.1); }
      .leaflet-popup-tip { background: #0f172a; }
    </style>
  </head>
  <body>
    <div id="map"></div>
    <script>
      const stops = ${stopsJson};
      const startLoc = ${startJson};
      
      const map = L.map('map', { zoomControl: false });
      
      L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; OpenStreetMap &copy; CartoDB'
      }).addTo(map);
      
      const bounds = [];
      
      // Custom Leaflet Icons
      const workerIcon = L.divIcon({
        html: '<div style="background-color: #3b82f6; width: 18px; height: 18px; border: 2px solid white; border-radius: 50%; box-shadow: 0 0 12px #3b82f6; display: flex; align-items: center; justify-content: center; color: white; font-size: 9px;">🚗</div>',
        className: '',
        iconSize: [18, 18],
        iconAnchor: [9, 9]
      });
      
      if (startLoc && typeof startLoc.lat === 'number' && !isNaN(startLoc.lat) && typeof startLoc.lng === 'number' && !isNaN(startLoc.lng)) {
        L.marker([startLoc.lat, startLoc.lng], { icon: workerIcon })
          .addTo(map)
          .bindPopup('<div class="popup-content"><b>Mi Ubicación Actual</b></div>');
        bounds.push([startLoc.lat, startLoc.lng]);
      }
      
      // Draw stops and lines
      const roadPoints = ${routeGeometryJson};
      const fallbackPoints = [];
      if (startLoc && typeof startLoc.lat === 'number' && !isNaN(startLoc.lat) && typeof startLoc.lng === 'number' && !isNaN(startLoc.lng)) {
        fallbackPoints.push([startLoc.lat, startLoc.lng]);
      }
      
      stops.forEach((s, idx) => {
        const stopIcon = L.divIcon({
          html: \\\`<div style="background-color: #22c55e; width: 22px; height: 22px; border: 2px solid white; border-radius: 50%; box-shadow: 0 0 10px #22c55e; display: flex; align-items: center; justify-content: center; color: white; font-family: sans-serif; font-size: 10px; font-weight: bold;">\\\\&nbsp;\\\\\\\${idx + 1}</div>\\\`,
          className: '',
          iconSize: [22, 22],
          iconAnchor: [11, 11]
        });
        
        if (s && typeof s.lat === 'number' && !isNaN(s.lat) && typeof s.lng === 'number' && !isNaN(s.lng)) {
          L.marker([s.lat, s.lng], { icon: stopIcon })
            .addTo(map)
            .bindPopup(\\\`<div class="popup-content"><b>Parada \\\\\\\${idx + 1}: \\\\\\\${s.clientName || 'Desconocido'}</b><br>\\\\&nbsp;\\\\\\\${s.serviceType || ''}<br>\\\\&nbsp;\\\\\\\${s.address || ''}</div>\\\`);
          
          bounds.push([s.lat, s.lng]);
          fallbackPoints.push([s.lat, s.lng]);
        }
      });
      
      const drawPoints = roadPoints && roadPoints.length > 0 ? roadPoints : fallbackPoints;
      if (drawPoints.length > 1) {
        L.polyline(drawPoints, { color: '#F5C518', weight: 4, opacity: 0.8, dashArray: '5, 8' }).addTo(map);
      }
      
      if (bounds.length > 0) {
        map.fitBounds(bounds, { padding: [50, 50] });
      } else {
        map.setView([28.5383, -81.3792], 10);
      }
    </script>
  </body>
  </html>
`;

console.log("GENERATED SRCDOC:");
console.log(srcDoc);
