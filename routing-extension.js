// ================= DIJKSTRA ROUTING EXTENSION =================
// This file adds routing functionality to the existing KNUST Water Monitoring Dashboard
// Simply include this script after the existing script in Adom.html

// Add these global variables after your existing ones
let routingLayer = null;
let selectedPumps = [];
let waterRouter = null;

// Dijkstra's Algorithm Implementation
class Graph {
    constructor() {
        this.nodes = new Map();
    }
    
    addNode(node) {
        if (!this.nodes.has(node)) {
            this.nodes.set(node, new Map());
        }
    }
    
    addEdge(from, to, weight) {
        this.addNode(from);
        this.addNode(to);
        this.nodes.get(from).set(to, weight);
        this.nodes.get(to).set(from, weight);
    }
    
    dijkstra(start, end) {
        const distances = new Map();
        const previous = new Map();
        const unvisited = new Set();
        
        for (const node of this.nodes.keys()) {
            distances.set(node, Infinity);
            previous.set(node, null);
            unvisited.add(node);
        }
        distances.set(start, 0);
        
        while (unvisited.size > 0) {
            let current = null;
            let minDistance = Infinity;
            
            for (const node of unvisited) {
                if (distances.get(node) < minDistance) {
                    minDistance = distances.get(node);
                    current = node;
                }
            }
            
            if (current === null || distances.get(current) === Infinity) break;
            unvisited.delete(current);
            if (current === end) break;
            
            const neighbors = this.nodes.get(current) || new Map();
            for (const [neighbor, weight] of neighbors) {
                if (unvisited.has(neighbor)) {
                    const alt = distances.get(current) + weight;
                    if (alt < distances.get(neighbor)) {
                        distances.set(neighbor, alt);
                        previous.set(neighbor, current);
                    }
                }
            }
        }
        
        const path = [];
        let current = end;
        while (current !== null) {
            path.unshift(current);
            current = previous.get(current);
        }
        
        return { path, distance: distances.get(end) };
    }
}

// Water Pump Router
class WaterPumpRouter {
    constructor() {
        this.graph = new Graph();
        this.pumps = [];
    }
    
    loadPumps(pumpData) {
        this.pumps = pumpData;
        this.buildGraph();
    }
    
    buildGraph() {
        this.pumps.forEach(pump => {
            const nodeId = `${pump.latitude},${pump.longitude}`;
            this.graph.addNode(nodeId);
        });
        
        this.pumps.forEach((pump1, i) => {
            this.pumps.forEach((pump2, j) => {
                if (i !== j) {
                    const distance = this.calculateDistance(
                        pump1.latitude, pump1.longitude,
                        pump2.latitude, pump2.longitude
                    );
                    
                    if (distance <= 1.0) {
                        const node1 = `${pump1.latitude},${pump1.longitude}`;
                        const node2 = `${pump2.latitude},${pump2.longitude}`;
                        this.graph.addEdge(node1, node2, distance);
                    }
                }
            });
        });
    }
    
    calculateDistance(lat1, lon1, lat2, lon2) {
        const R = 6371;
        const dLat = (lat2 - lat1) * Math.PI / 180;
        const dLon = (lon2 - lon1) * Math.PI / 180;
        const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                  Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
                  Math.sin(dLon/2) * Math.sin(dLon/2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        return R * c;
    }
    
    findRoute(startPump, endPump) {
        const startNode = `${startPump.latitude},${startPump.longitude}`;
        const endNode = `${endPump.latitude},${endPump.longitude}`;
        return this.graph.dijkstra(startNode, endNode);
    }
}

// Initialize routing
function initRouting() {
    waterRouter = new WaterPumpRouter();
    
    // Add routing controls
    const routingControl = L.control({position: 'topright'});
    routingControl.onAdd = function(map) {
        const div = L.DomUtil.create('div', 'routing-control');
        div.innerHTML = `
