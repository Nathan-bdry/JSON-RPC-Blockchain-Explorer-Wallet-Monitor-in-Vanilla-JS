# Ethereum JSON-RPC Explorer & Live Wallet Monitor (Vanilla JS)

A lightweight Ethereum blockchain explorer and live wallet monitor built with **pure Vanilla JavaScript and Node.js**, without any third-party Web3 libraries (no Ethers.js, no Web3.js).

It communicates directly with Ethereum JSON-RPC nodes (such as Alchemy or Infura) using native `fetch` and standard WebSocket connections.

---

## ✨ Features

- **No Third-Party Web3 Libraries**: Pure native JavaScript implementation.
- **Manual JSON-RPC Client**: Direct HTTP/WebSocket requests sending standard payloads (`eth_blockNumber`, `eth_getBalance`, `eth_getTransactionByHash`).
- **Real-Time Block Updates**: Native WebSocket connection listening for `eth_subscribe` (`newHeads`), broadcast to browser clients via Server-Sent Events (SSE).
- **Smart Polling Live Wallet Tracking**: Tracks wallet address balance automatically on every newly mined block.
- **Request Queue & Concurrency Management**: Custom in-memory queue with rate limiting and `Promise.allSettled` support to prevent RPC provider rate-limit errors (e.g., HTTP 429).
- **Hexadecimal & Binary Manipulation**:
  - Raw hexadecimal block number conversion (`parseInt(hex, 16)`).
  - Exact Wei-to-Ether decoding using native `BigInt`.
  - Transaction input data decoding: extracts the first 4 bytes (8 hex characters) to identify the function selector (`Method ID`, e.g., ERC-20 `transfer`).

---

## 🚀 Getting Started

### Prerequisites

- **Node.js** (v20+ recommended, supports native WebSocket and `.env` loading).
- An Ethereum RPC Endpoint URL (from [Alchemy](https://www.alchemy.com/), [Infura](https://www.infura.io/), or any public RPC node).

### Setup

1. **Clone the repository:**
   ```bash
   git clone https://github.com/Nathan-bdry/JSON-RPC-Blockchain-Explorer-Wallet-Monitor-in-Vanilla-JS.git
   cd JSON-RPC-Blockchain-Explorer-Wallet-Monitor-in-Vanilla-JS
   ```

2. **Configure environment variables:**
   Create a `.env` file in the root directory:
   ```env
   ETHEREUM_ENDPOINT=https://eth-mainnet.g.alchemy.com/v2/YOUR_API_KEY
   ```
   *(Note: The server automatically derives the WebSocket URL by replacing `https://` with `wss://`)*

3. **Start the application:**
   ```bash
   npm start
   ```

4. **Open in browser:**
   Navigate to [http://localhost:3000](http://localhost:3000)

---

## 🛠️ Architecture

### Backend (`index.js`)
- **HTTP Server**: Serves static HTML/JS frontend assets and exposes JSON REST endpoints.
- **SSE Stream (`/stream`)**: Pushes new mined blocks to connected clients in real time.
- **Request Queue (`RequestQueue`)**: Ensures safe request concurrency and rate limits outgoing RPC calls.
- **RPC Methods**:
  - `GET /lastblock` : Fetches latest block number.
  - `GET /addressBalance/:address` : Fetches wallet balance formatted in ETH.
  - `GET /txDetails/:txHash` : Retrieves transaction info (`from`, `to`, `value`, and decoded `methodId`).

### Frontend (`frontend/`)
- Responsive dark-mode dashboard with 4 cards:
  1. **Last Block**: Displays the latest mined Ethereum block in real time.
  2. **Wallet Balance**: Queries the current balance of any Ethereum address.
  3. **Transaction Details**: Inspects transaction amount and extracts smart contract Method ID.
  4. **Wallet Tracking**: Continuously monitors a target address and updates its balance on every new block.

---

## 📄 License

This project is licensed under the ISC License.
