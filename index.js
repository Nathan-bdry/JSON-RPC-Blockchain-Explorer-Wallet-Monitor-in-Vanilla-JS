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




// ------------------------------------------ rpcCall function ------------------------------------------

async function rpcCall(endpoint, method, params = []) {

    const payload = {
        jsonrpc: '2.0',
        id: Date.now(),
        method: method,
        params: params
    };

    const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
    });

    if (!response.ok) {
        throw new Error(`HTTP network error : ${response.status}`)
    }

    const data = await response.json();

    if (data.error) {
        throw new Error(`RPC error (${data.error.code}): ${data.error.message}`)
    }

    return data.result;
}

// ------------------------------------------------------------------------------------------------------


// Obtain last bloc

const lastBlock = async () => {

    const blockHex = await rpcCall(RPC_URL, 'eth_blockNumber');
    const blockNumber = parseInt(blockHex, 16);
    return { blockHex, blockNumber };
}

// Obtain address balance

const AddressBalance = async (address) => {

    const balanceHex = await rpcCall(RPC_URL, 'eth_getBalance', [address, 'latest']);
    const balanceWei = BigInt(balanceHex);
    const balanceEth = (Number(balanceWei) / 1e18).toFixed(4);

    return { balanceEth }
}

// Obtain transaction details

const txDetails = async (txHash) => {

    const tx = await rpcCall(RPC_URL, 'eth_getTransactionByHash', [txHash])

    if (!tx) {
        return Error
    } else {
        const from = tx.from;
        const to = tx.to;
        const value = Number(BigInt(tx.value)) / 1e18;
        return { from, to, value }
    }
}


// --------------------------------------------- web socket ---------------------------------------------

ws.onopen = () => {
    ws.send(JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'eth_subscribe',
        params: ['newHeads']

    }));
};

ws.onmessage = (event) => {
    const msg = JSON.parse(event.data);
    if (msg.method === 'eth_subscription') {
        const blockHex = msg.params.result.number;
        const blockNum = parseInt(blockHex, 16);

        const dataToSend = JSON.stringify({ blockNum, blockHex });
        for (const client of clients) {
            client.write(`data: ${dataToSend}\n\n`)
        }
    }
};
