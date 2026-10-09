A Node.js tool (or runnable in-browser without any framework) that communicates directly with Ethereum RPC nodes (via Alchemy or Infura) without using any third-party libraries (no Ethers.js, no Web3.js).

What the tool needs to do:

Manual RPC requests: Code a native HTTP/WebSocket client using native fetch to send standard JSON-RPC calls (eth_blockNumber, eth_getBalance, eth_getTransactionByHash).

Advanced asynchronous handling:

Real-time wallet address tracking (smart polling or WebSocket).

Request queue with concurrency management (Promise.allSettled, custom rate limiting).

Binary and hexadecimal manipulation:

Manually parse raw hexadecimal data returned by the RPC (block conversion, Wei/Ether decoding using native BigInt).

Decode the first 4 bytes of transaction input data to identify the function selector (Method ID).