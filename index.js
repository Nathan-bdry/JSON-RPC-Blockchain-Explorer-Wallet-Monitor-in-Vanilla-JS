import http from 'node:http';
import { uptime } from 'node:process';
import { loadEnvFile } from 'node:process';
loadEnvFile();

const RPC_URL = process.env.ETHEREUM_ENDPOINT;

const PORT = 3000;

const server = http.createServer(async (req, res) => {
    const { method, url } = req;

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
