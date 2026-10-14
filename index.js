import http from 'node:http';
import { uptime } from 'node:process';
import { loadEnvFile } from 'node:process';
import fs from 'node:fs/promises';
import path from 'node:path';
loadEnvFile();

const RPC_URL = process.env.ETHEREUM_ENDPOINT;
const WSS_URL = process.env.ETHEREUM_ENDPOINT.replace('https://', 'wss://');
const ws = new WebSocket(WSS_URL);
const PORT = 3000;
const clients = [];


// --------------------------------------------- web server ---------------------------------------------

const server = http.createServer(async (req, res) => {
    const { method, url } = req;

    if (method === 'GET' && url === '/') {
        const html = await fs.readFile(path.join('frontend', 'index.html'));
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        return res.end(html);
    }

    if (method === 'GET' && url === '/app.js') {
        const js = await fs.readFile(path.join('frontend', 'app.js'));
        res.writeHead(200, { 'Content-Type': 'application/javascript' });
        return res.end(js);
    }

    if (method == 'GET' && url === '/stream') {
        res.writeHead(200, {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive'
        });

        clients.push(res);

        req.on('close', () => {
            const index = clients.indexOf(res);
            if (index !== -1) clients.splice(index, 1)
        });

        return;
    }

    res.writeHead(200, { 'Content-Type': 'application/json' });

    if (method == 'GET' && url === '/uptime') {
        return res.end(JSON.stringify({ message: 'test', time: uptime() }));
    }

    if (method === 'GET' && url === '/lastblock') {
        return res.end(JSON.stringify(await lastBlock()));
    }

    if (method === 'GET' && url.startsWith('/addressBalance/')) {
        const address = url.replace('/addressBalance/', '')
        return res.end(JSON.stringify(await AddressBalance(address)));
    }

    if (method === 'GET' && url.startsWith('/txDetails/')) {
        const txHash = url.replace('/txDetails/', '')
        return res.end(JSON.stringify(await txDetails(txHash)));
    }

    res.end(JSON.stringify({ error: 'Path not found' }));
});

server.listen(PORT, () => {
    console.log(`Server active on http://localhost:${PORT}`);
})

// ------------------------------------------------------------------------------------------------------




// -------------------------------------------- Request Queue --------------------------------------------

class RequestQueue {
    constructor(concurrency = 3, minIntervalMs = 50) {
        this.concurrency = concurrency; // Max requests in parallel
        this.minIntervalMs = minIntervalMs; // Rate limiting delay between dispatches
        this.lastDispatch = 0;
        this.running = 0;
        this.queue = [];
    }

    // Add a single task to the queue
    add(task) {
        return new Promise((resolve, reject) => {
            this.queue.push({ task, resolve, reject });
            this.next();
        });
    }

    // Execute multiple tasks with concurrency control and Promise.allSettled
    async allSettled(tasks) {
        return Promise.allSettled(tasks.map((task) => this.add(task)));
    }

    async next() {
        if (this.running >= this.concurrency || this.queue.length === 0) {
            return;
        }

        const now = Date.now();
        const timeSinceLast = now - this.lastDispatch;
        if (timeSinceLast < this.minIntervalMs) {
            setTimeout(() => this.next(), this.minIntervalMs - timeSinceLast);
            return;
        }

        this.lastDispatch = Date.now();
        this.running++;
        const { task, resolve, reject } = this.queue.shift();

        try {
            const result = await task();
            resolve(result);
        } catch (error) {
            reject(error);
        } finally {
            this.running--;
            this.next(); // Trigger next queued request
        }
    }
}

// Global queue instance with rate limiting
const rpcQueue = new RequestQueue(3, 50);

// ------------------------------------------ rpcCall function ------------------------------------------

async function rpcCall(endpoint, method, params = []) {
    return rpcQueue.add(async () => {
        const payload = { jsonrpc: '2.0', id: Date.now(), method, params };
        const response = await fetch(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        const data = await response.json();
        if (data.error) throw new Error(data.error.message || `RPC error (${data.error.code})`);
        return data.result;
    });
}

// ------------------------------------------------------------------------------------------------------

// Obtain last block
const lastBlock = async () => {
    try {
        const blockHex = await rpcCall(RPC_URL, 'eth_blockNumber');
        const blockNumber = parseInt(blockHex, 16);
        return { blockHex, blockNumber };
    } catch (err) {
        return { error: 'Failed to fetch last block' };
    }
};

// Obtain address balance
const AddressBalance = async (address) => {
    try {
        const balanceHex = await rpcCall(RPC_URL, 'eth_getBalance', [address, 'latest']);
        const balanceWei = BigInt(balanceHex);
        const balanceEth = (Number(balanceWei) / 1e18).toFixed(4);
        return { balanceEth };
    } catch (err) {
        return { error: 'Invalid address or RPC error' };
    }
};

// Obtain transaction details
const txDetails = async (txHash) => {
    try {
        const tx = await rpcCall(RPC_URL, 'eth_getTransactionByHash', [txHash]);

        if (!tx) {
            return { error: 'Transaction not found' };
        }

        const from = tx.from;
        const to = tx.to;
        const value = Number(BigInt(tx.value)) / 1e18;

        // Function selector decoder (first 4 bytes / 8 hex characters after 0x)
        let methodId = null;
        if (tx.input && tx.input !== '0x' && tx.input.length >= 10) {
            methodId = tx.input.slice(0, 10);
        }

        return { from, to, value, methodId, isContractCall: Boolean(methodId) };
    } catch (err) {
        return { error: 'Invalid transaction hash' };
    }
};

// --------------------------------------------- WebSocket ----------------------------------------------

ws.onopen = () => {
    ws.send(JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'eth_subscribe',
        params: ['newHeads']
    }));
};

ws.onmessage = (event) => {
    try {
        const msg = JSON.parse(event.data);
        if (msg.method === 'eth_subscription') {
            const blockHex = msg.params.result.number;
            const blockNum = parseInt(blockHex, 16);

            const dataToSend = JSON.stringify({ blockNum, blockHex });
            for (const client of clients) {
                client.write(`data: ${dataToSend}\n\n`);
            }
        }
    } catch (e) {
        console.error('WebSocket parse error:', e);
    }
};

