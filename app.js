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
    </style>
</head>

<body>
    <div id="map"></div>
    <script src="https://unpkg.com/leaflet/dist/leaflet.js"></script>
    <script>
        var map = L.map('map').setView([-8.179427, -79.009833], 10);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);

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
    </style>
</head>

<body>
    <div id="map"></div>
    <script src="https://unpkg.com/leaflet/dist/leaflet.js"></script>
    <script>
        var map = L.map('map').setView([-8.179427, -79.009833], 10);
        // L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);
        // L.tileLayer('http://{s}.google.com/vt/lyrs=s,h&x={x}&y={y}&z={z}',{
        L.tileLayer('http://{s}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}',{
          maxZoom: 20,
          subdomains:['mt0','mt1','mt2','mt3']
        }).addTo(map);

        // Crea un poligono
        var polygon = L.polygon([${data}]).addTo(map);

        // Focus en el poligono
        map.fitBounds(polygon.getBounds());
 
 
    </script>
</body>

</html>
`

// Sirve la página web con el mapa

app.use(express.json());

app.get('/', (req, res) => {
  res.send(mapa);
});

app.get('/mapa', (req, res) => {
  let data = ''
  try {
    const jsonString = fs.readFileSync('data.json');
    const json = JSON.parse(jsonString);

    data = json.map(({ latitude, longitude }) => `[${latitude}, ${longitude}]`).join(',');

  } catch (error) {
    console.log(error);
  }
  res.send(mapaEstatico(data));
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
const ip = require('ip');

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
  console.log(`Servidor web activo en http://${ip.address()}:${PORT}`);
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
// Note the difference in the "lyrs" parameter in the URL:

// Hybrid: s,h;
// Satellite: s;
// Streets: m;
// Terrain: p;