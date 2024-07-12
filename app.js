const express = require('express');
const fs = require('fs');
// const { SerialPort } = require('serialport');
// const Readline = require('@serialport/parser-readline');

const app = express();
const PORT = process.env.PORT || 9999;
const PORT_WS = process.env.PORT_WS || 9998;

// // Configura la conexión serial
// const puerto = new SerialPort({
//   baudRate: 115200, // Ajusta la velocidad según tu configuración
//   path: 'COM5', // Ajusta el puerto según tu configuración
// });

// // Crea un parser para leer líneas de la entrada serial
// const parser = puerto.pipe(new Readline({ delimiter: '\n' }));

// Crea un mapa básico con Leaflet
const mapa = `
<!DOCTYPE html>
<html>

<head>
    <title>Mapa en tiempo real</title>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <link rel="stylesheet" href="https://unpkg.com/leaflet/dist/leaflet.css" />
    <style>
        #map {
            height: 100vh;
        }
        
        body {
            margin: 0;
            padding: 0;
        }
    </style>
</head>

<body>
    <div id="map"></div>
    <script src="https://unpkg.com/leaflet/dist/leaflet.js"></script>
    <script>

        const googleLayer = L.tileLayer('http://{s}.google.com/vt/lyrs=s&x={x}&y={y}&z={z}',{
          maxZoom: 20,
          subdomains:['mt0','mt1','mt2','mt3']
        });
        
        const arcgisonlineLayer = L.tileLayer(
          "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
          {
            maxZoom: 17,
          }
        );

        const openStreetMapLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png');

        var map = L.map('map',{
          layers: [googleLayer]
        }).setView([-8.179427, -79.009833], 10);

        const layerControl = L.control.layers({
          "Google": googleLayer,
          "Arcgis": arcgisonlineLayer,
          "OpenStreetMap": openStreetMapLayer
        }, {}).addTo(map);

        // Crea un icono personalizado para mostrar el número de satélites
        var satIcon = L.divIcon({
            className: 'sat-icon',
            html: '<div id="satellites">0</div>'
        });

        // Agrega el icono personalizado al mapa
        var satMarker = L.marker([-8.179427, -79.009833], { icon: satIcon }).addTo(map);

        // Función para actualizar el marcador en el mapa
        function actualizarMapa(latitud, longitud) {
            var marker = L.marker([latitud, longitud]).addTo(map);
        }

        // Función para actualizar el marcador de satélites en el mapa
        function actualizarSatelites(numSatelites) {
            document.getElementById('satellites').textContent = numSatelites;
        }


        // Establece una conexión WebSocket con el servidor
        var ws = new WebSocket('ws://localhost:${PORT_WS}/datos-seriales');
        ws.onmessage = function (event) {
            var datos = JSON.parse(event.data);
            // console.log(datos)
            actualizarSatelites(datos.sat);
            if (datos.sat) actualizarMapa(datos.lat, datos.lng);
        };
    </script>
</body>

</html>
`;

const mapaEstatico = (data) => `
<!DOCTYPE html>
<html>

<head>
    <title>Mapa en tiempo real</title>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <link rel="stylesheet" href="https://unpkg.com/leaflet/dist/leaflet.css" />
    <style>
        #map {
            height: 100vh;
        }
        body {
            margin: 0;
            padding: 0;
        }
    </style>
</head>

<body>
    <div id="map"></div>
    <script src="https://unpkg.com/leaflet/dist/leaflet.js"></script>
    <script>

        const googleLayer = L.tileLayer('http://{s}.google.com/vt/lyrs=s&x={x}&y={y}&z={z}',{
          maxZoom: 20,
          subdomains:['mt0','mt1','mt2','mt3']
        });
        
        const arcgisonlineLayer = L.tileLayer(
          "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
          {
            maxZoom: 17,
          }
        );

        const openStreetMapLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png');

        var map = L.map('map',{
          layers: [googleLayer]
        }).setView([-8.179427, -79.009833], 10);

        const layerControl = L.control.layers({
          "Google": googleLayer,
          "Arcgis": arcgisonlineLayer,
          "OpenStreetMap": openStreetMapLayer
        }, {}).addTo(map);
        
        // Crea un poligono
        var polyline = L.polyline([${data}]).addTo(map);

        // Focus en el poligono
        map.fitBounds(polyline.getBounds());
 
 
    </script>
</body>

</html>
`

// Sirve la página web con el mapa

app.use(express.json());

app.get('/', (req, res) => {
  res.send(mapa);
});

app.get('/registros', (req, res) => {
  // Validar que exista la carpeta data
  if (!fs.existsSync('data')) {
    fs.mkdirSync('data');
  }

  // Listar los archivos de la carpeta data
  const files = fs.readdirSync('data');

  const data = files.map((file) =>
    `<a href="/registros/${file}">${file}</a>`
  ).join('<br>');

  res.send(data);
});

app.get('/registros/:id', (req, res) => {
  let data = ''
  try {
    const path = join('data', req.params.id);
    const jsonString = fs.readFileSync(path, 'utf8');
    const json = JSON.parse(jsonString);
    data = json.map(({ latitude, longitude }) => `[${latitude}, ${longitude}]`).join(',');
    res.send(mapaEstatico(data));
  } catch (error) {
    console.log(error);
    res.send('Error al leer el archivo');
  }
});


app.post('/datos-satelite', (req, res) => {

  const { lat, lng, sat } = req?.body;

  console.log({ lat, lng, sat });

  wss.clients.forEach((cliente) => {
    cliente.send(JSON.stringify({ lat, lng, sat }));
  });

  res.send('Datos recibidos');
});

// Establece una conexión WebSocket para enviar datos seriales al cliente
const WebSocket = require('ws');
const { join } = require('path');

const { networkInterfaces } = require('os');

const nets = networkInterfaces();
const ips = []

for (const name of Object.keys(nets)) {
  for (const net of nets[name]) {
    const familyV4Value = typeof net.family === 'string' ? 'IPv4' : 4
    if (net.family === familyV4Value && !net.internal) {
      ips.push(net.address);
    }
  }
}

const wss = new WebSocket.Server({ port: PORT_WS });

wss.on('connection', () => {
  console.log('Cliente conectado', wss.clients.size);
});

// // Función para analizar y convertir datos seriales
// function parsearDatos(datosSeriales) {
//   console.log(datosSeriales);
//   const [latitud, longitud, numSatelites] = datosSeriales.split(',').map(parseFloat);
//   return { latitud, longitud, numSatelites };
// }

app.listen(PORT, () => {
  console.log(`Servidor web activo en: `);
  ips.forEach(ip => {
    console.log(`\thttp://${ip}:${PORT}`);
  });
});


// Streets

// googleStreets = L.tileLayer('http://{s}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}',{
//         maxZoom: 20,
//         subdomains:['mt0','mt1','mt2','mt3']
// });
// Hybrid:

// googleHybrid = L.tileLayer('http://{s}.google.com/vt/lyrs=s,h&x={x}&y={y}&z={z}',{
//         maxZoom: 20,
//         subdomains:['mt0','mt1','mt2','mt3']
// });
// Satellite:

// googleSat = L.tileLayer('http://{s}.google.com/vt/lyrs=s&x={x}&y={y}&z={z}',{
//         maxZoom: 20,
//         subdomains:['mt0','mt1','mt2','mt3']
// });
// Terrain

// googleTerrain = L.tileLayer('http://{s}.google.com/vt/lyrs=p&x={x}&y={y}&z={z}',{
//         maxZoom: 20,
//         subdomains:['mt0','mt1','mt2','mt3']
// });

// const googleLayer = L.tileLayer(
//   "http://mt0.google.com/vt/lyrs=s&hl=en&x={x}&y={y}&z={z}",
//   {
//     maxZoom: 20,
//     subdomains: ["mt0", "mt1", "mt2", "mt3"],
//   }
// );
// const arcgisonlineLayer = L.tileLayer(
//   "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
//   {
//     maxZoom: 17,
//   }
// );
// Note the difference in the "lyrs" parameter in the URL:

// Hybrid: s,h;
// Satellite: s;
// Streets: m;
// Terrain: p;