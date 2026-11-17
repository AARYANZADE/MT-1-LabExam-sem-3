import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const PORT = 3000;
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const INFO_FILE = path.join(__dirname, 'public', 'info.html');

// In-memory "database"
const vehicles = [
  { id: 1, vehicleName: 'Hyundai Creta', vehicleNumber: 'HR26AB1234', type: 'SUV', price: 1500000 },
  { id: 2, vehicleName: 'Maruti Swift', vehicleNumber: 'DL8CAF5030', type: 'Hatchback', price: 750000 },
  { id: 3, vehicleName: 'Honda City', vehicleNumber: 'UP14CD5678', type: 'Sedan', price: 1200000 }
];

const REQUIRED_FIELDS = ['id', 'vehicleName', 'vehicleNumber', 'type', 'price'];

// Helpers
const sendJson = (res, statusCode, data) => {
  res.writeHead(statusCode, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(data, null, 2));
};

const sendHtml = (res, statusCode, html) => {
  res.writeHead(statusCode, { 'Content-Type': 'text/html' });
  res.end(html);
};

const sendText = (res, statusCode, text) => {
  res.writeHead(statusCode, { 'Content-Type': 'text/plain' });
  res.end(text);
};

const isMissing = (value) => value === undefined || value === null || value === '';

// POST /add-vehicle
const handleAddVehicle = (req, res) => {
  let body = '';

  req.on('data', (chunk) => {
    body += chunk.toString();
  });

  req.on('end', () => {
    let vehicle;
    try {
      vehicle = JSON.parse(body);
    } catch (error) {
      return sendJson(res, 400, { error: 'Invalid JSON' });
    }

    if (vehicle === null || typeof vehicle !== 'object' || Array.isArray(vehicle)) {
      return sendJson(res, 400, { error: 'Request body must be a JSON object' });
    }

    const missing = REQUIRED_FIELDS.filter((field) => isMissing(vehicle[field]));
    if (missing.length > 0) {
      return sendJson(res, 400, { error: 'Missing required fields', missingFields: missing });
    }

    const { id, vehicleName, vehicleNumber, type, price } = vehicle;
    const newVehicle = { id, vehicleName, vehicleNumber, type, price };
    vehicles.push(newVehicle);

    sendJson(res, 201, { message: 'Vehicle added successfully', vehicle: newVehicle });
  });

  req.on('error', () => {
    sendJson(res, 400, { error: 'Error reading request body' });
  });
};

// Server
const server = http.createServer((req, res) => {
  const { method } = req;
  const pathname = new URL(req.url, `http://${req.headers.host || 'localhost'}`).pathname;

  if (method === 'GET' && pathname === '/') {
    return sendHtml(
      res,
      200,
      `<!DOCTYPE html>
<html>
<head><title>Vehicle Management</title></head>
<body>
  <h1>Welcome to the Vehicle Management Application</h1>
  <ul>
    <li><a href="/vehicles">/vehicles</a> - all vehicles (JSON)</li>
    <li><a href="/about">/about</a> - application information</li>
    <li><a href="/info">/info</a> - static info page</li>
  </ul>
</body>
</html>`
    );
  }

  if (method === 'GET' && pathname === '/vehicles') {
    return sendJson(res, 200, vehicles);
  }

  if (method === 'GET' && pathname === '/about') {
    return sendText(
      res,
      200,
      'Vehicle Management Web Application - built with the Node.js HTTP module for the Full Stack Development MT1 Lab Examination.'
    );
  }

  if (method === 'GET' && pathname === '/info') {
    return fs.readFile(INFO_FILE, (err, data) => {
      if (err) {
        return sendText(res, 500, 'Internal Server Error: unable to read info.html');
      }
      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end(data);
    });
  }

  if (method === 'POST' && pathname === '/add-vehicle') {
    return handleAddVehicle(req, res);
  }

  // Known route but wrong method
  if (['/', '/vehicles', '/about', '/info', '/add-vehicle'].includes(pathname)) {
    res.setHeader('Allow', pathname === '/add-vehicle' ? 'POST' : 'GET');
    return sendJson(res, 405, { error: `Method ${method} not allowed on ${pathname}` });
  }

  sendJson(res, 404, { error: 'Route not found' });
});

server.listen(PORT, () => {
  console.log(`HTTP Server running at http://localhost:${PORT}`);
});