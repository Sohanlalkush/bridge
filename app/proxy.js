const WebSocket = require('ws');
const http = require('http');
const fs = require('fs');
const path = require('path');
const dgram = require('dgram');

// Configuration
const HTTP_PORT = 8000;
const PBX_IP = '139.84.175.21';
const PBX_PORT = 65236;

// Simple HTTP server for static files
const httpServer = http.createServer((req, res) => {
    // Serve index.html
    if (req.url === '/' || req.url === '/index.html') {
        const filePath = path.join(__dirname, 'index.html');
        fs.readFile(filePath, (err, data) => {
            if (err) {
                res.writeHead(404);
                res.end('404 Not Found');
                return;
            }
            res.writeHead(200, { 'Content-Type': 'text/html' });
            res.end(data);
        });
    } else if (req.url === '/app.js') {
        const filePath = path.join(__dirname, 'app.js');
        fs.readFile(filePath, (err, data) => {
            if (err) {
                res.writeHead(404);
                res.end('404 Not Found');
                return;
            }
            res.writeHead(200, { 'Content-Type': 'application/javascript' });
            res.end(data);
        });
    } else {
        res.writeHead(404);
        res.end('404 Not Found');
    }
});

// WebSocket Server (attach to HTTP server)
const wss = new WebSocket.Server({ 
    server: httpServer,
    path: '/ws'
});

let wsClients = [];

wss.on('connection', (ws) => {
    console.log('🔗 WebSocket client connected');
    wsClients.push(ws);
    handleWebSocketConnection(ws);
    
    ws.on('close', () => {
        wsClients = wsClients.filter(c => c !== ws);
        console.log('🔗 WebSocket client disconnected');
    });
});

httpServer.listen(HTTP_PORT, () => {
    console.log(`📡 HTTP server running on http://localhost:${HTTP_PORT}`);
    console.log(`🔗 WebSocket running on ws://localhost:${HTTP_PORT}/ws`);
});

// Handle WebSocket connections
function handleWebSocketConnection(ws) {
    const clientId = Math.random().toString(36).substr(2, 9);
    
    ws.on('message', (data) => {
        console.log(`[${clientId}] WS → PBX:`, data.toString().substring(0, 100));
        
        // Forward to PBX via UDP
        const client = dgram.createSocket('udp4');
        client.send(data, 0, data.length, PBX_PORT, PBX_IP, (err) => {
            if (err) {
                console.error('❌ UDP send error:', err);
            } else {
                console.log(`[${clientId}] ✅ Sent to PBX`);
            }
            client.close();
        });
    });

    ws.on('close', () => {
        console.log(`[${clientId}] WebSocket client disconnected`);
    });

    ws.on('error', (err) => {
        console.error(`[${clientId}] WebSocket error:`, err);
    });
}

// UDP listener for responses from PBX
const udpServer = dgram.createSocket('udp4');
udpServer.on('message', (msg, rinfo) => {
    console.log(`📨 UDP ← PBX (${rinfo.address}:${rinfo.port}):`, msg.toString().substring(0, 100));
    
    // Broadcast to all connected WebSocket clients
    wsClients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
            try {
                client.send(msg);
                console.log('📤 PBX → WS client (broadcast)');
            } catch (err) {
                console.error('Error sending to client:', err);
            }
        }
    });
});

udpServer.on('error', (err) => {
    console.error('❌ UDP error:', err);
});

udpServer.bind(PBX_PORT, '0.0.0.0', () => {
    console.log(`📡 UDP listener on 0.0.0.0:${PBX_PORT}`);
    console.log(`🎯 Forwarding SIP to PBX at ${PBX_IP}:${PBX_PORT}`);
});

// Graceful shutdown
process.on('SIGINT', () => {
    console.log('\n🛑 Shutting down...');
    httpServer.close();
    udpServer.close();
    process.exit(0);
});

console.log('\n✅ Web Phone Gateway Started');
console.log('=====================================');
console.log(`📱 Open: http://localhost:${HTTP_PORT}`);
console.log(`🔗 WS: ws://localhost:${HTTP_PORT}/ws`);
console.log(`🎯 PBX: ${PBX_IP}:${PBX_PORT}`);
console.log('=====================================\n');
