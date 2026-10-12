const stream = new EventSource('/stream');

stream.onmessage = (event) => {
    const data = JSON.parse(event.data);
    const display = document.getElementById('block-display');
    if (display) {
        display.textContent = `#${data.blockNum}`;
    }
};
