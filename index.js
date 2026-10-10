import http from 'node:http';
import { uptime } from 'node:process';
import { loadEnvFile } from 'node:process';
loadEnvFile();

const RPC_URL = process.env.ETHEREUM_ENDPOINT;

const PORT = 3000;

const server = http.createServer((req, res) => {
    const { method, url } = req;

    if (method == 'GET' && url === '/uptime') {
        return res.end(JSON.stringify({ message: 'test', time: uptime() }));
    }

    if (method === 'GET' && url === '/test') {
        return res.end('test');
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
    console.log('Bloc (hex)', blockHex);
    console.log('Bloc (number) :', parseInt(blockHex, 16));
}

// Obtain address balance

const AddressBalance = async (address) => {

    const balanceHex = await rpcCall(RPC_URL, 'eth_getBalance', [address, 'latest']);
    const balanceWei = BigInt(balanceHex);
    const balanceEth = Number(balanceWei) / 1e18;

    console.log(`Balance : ${balanceEth.toFixed(4)} ETH`);
}


// Obtain transaction details

const txDetails = async (txHash) => {

    const tx = await rpcCall(RPC_URL, 'eth_getTransactionByHash', [txHash])

    if (!tx) {
        console.log('Transaction not found on the blockchain')
    } else {
        console.log('From :', tx.from);
        console.log('To :', tx.to);
        console.log('Value :', Number(BigInt(tx.value)) / 1e18);
    }
}

await lastBlock();
await AddressBalance('0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045');
await txDetails('0xfa53c20abe98de83c7fbd8fa1347478145affa386f8a086beba90a1004605391');