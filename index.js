import http from 'node:http';
import { uptime } from 'node:process';

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