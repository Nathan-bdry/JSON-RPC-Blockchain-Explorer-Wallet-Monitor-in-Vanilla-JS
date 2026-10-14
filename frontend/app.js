
const blockDisplay = document.getElementById('block-display');

fetch('/lastblock')
    .then(res => res.json())
    .then(data => {
        if (data.blockNumber) blockDisplay.textContent = `#${data.blockNumber}`;
    })
    .catch(() => { });

// --- Listen the stream in direct ---
const stream = new EventSource('/stream');
stream.onmessage = (event) => {
    const data = JSON.parse(event.data);
    if (data.blockNum) {
        blockDisplay.textContent = `#${data.blockNum}`;
        updateTrackWallet(data.blockNum);
    }
};

// --- 2. Compartment: Wallet Balance ---
const walletBtn = document.getElementById('wallet-btn');
const walletInput = document.getElementById('wallet-input');
const walletResult = document.getElementById('wallet-result');
walletBtn.addEventListener('click', async () => {
    const address = walletInput.value.trim();
    if (!address) return;
    walletResult.textContent = 'Searching...';
    try {
        const res = await fetch(`/addressBalance/${address}`);
        const data = await res.json();

        if (data.balanceEth !== undefined) {
            walletResult.innerHTML = `<strong>Balance:</strong> ${data.balanceEth} ETH`;
        } else {
            walletResult.textContent = data.error || 'Address not found or invalid.';
        }
    } catch (err) {
        walletResult.textContent = 'Error fetching balance.';
    }
});

// --- 3. Compartment: Transaction Details ---
const txBtn = document.getElementById('tx-btn');
const txInput = document.getElementById('tx-input');
const txResult = document.getElementById('tx-result');
txBtn.addEventListener('click', async () => {
    const hash = txInput.value.trim();
    if (!hash) return;
    txResult.textContent = 'Searching...';
    try {
        const res = await fetch(`/txDetails/${hash}`);
        const data = await res.json();
        if (data && data.from) {
            txResult.innerHTML = `
                <div><strong>From:</strong> ${data.from}</div>
                <div><strong>To:</strong> ${data.to || 'Contract Creation'}</div>
                <div><strong>Amount:</strong> ${data.value} ETH</div>
                ${data.methodId ? `<div><strong>Method ID:</strong> <code>${data.methodId}</code></div>` : ''}
            `;
        } else {
            txResult.textContent = data.error || 'Transaction not found.';
        }
    } catch (err) {
        txResult.textContent = 'Error fetching transaction.';
    }
});

// --- 4. Compartment: Wallet Tracking ---

let trackedAddress = null;

const trackBtn = document.getElementById('track-btn');
const trackInput = document.getElementById('track-input');
const trackResult = document.getElementById('track-result');

async function updateTrackWallet(blockNum) {
    if (!trackedAddress) return;
    try {
        const res = await fetch(`/addressBalance/${trackedAddress}`);
        const data = await res.json();
        if (data.balanceEth !== undefined) {
            trackResult.innerHTML = `
                <div><strong>Address:</strong> ${trackedAddress.slice(0, 6)}...${trackedAddress.slice(-4)}</div>
                <div><strong>Balance:</strong> ${data.balanceEth} ETH</div>
                <div style="color: #4ade80; font-size: 0.8rem; margin-top: 4px;">
                    Last verification: Block #${blockNum || 'latest'}
                </div>
            `;
        }
    } catch (e) {
        trackResult.textContent = 'Error updating tracking.';
    }
}

trackBtn.addEventListener('click', () => {
    const address = trackInput.value.trim();
    if (!address) return;
    trackedAddress = address;
    trackResult.textContent = `Tracking enabled for ${address.slice(0, 8)}...`;
    updateTrackWallet();
});
