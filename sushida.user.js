// ==UserScript==
// @name         sushida hack
// @namespace    http://tampermonkey.net/
// @version      2024-10-11
// @description  lazy?
// @author       wakka
// @match        https://sushida.net/play.html
// @icon         https://www.google.com/s2/favicons?sz=64&domain=sushida.net
// @grant        none
// @run-at       document-start
// ==/UserScript==

let words = [];

function press(key, delay = 1) {
    for (let i = 0; i < key.length; i++) {
        setTimeout(() => {
            const event = new KeyboardEvent('keypress', {
                charCode: key.charCodeAt(i)
            });
            document.dispatchEvent(event);
            if (i === key.length - 1) {
                setTimeout(()=>{ words = words.filter(word => word !== key); }, 500)
            }
        }, i * delay);
    }
}



HTMLCanvasElement.prototype.getContext = new Proxy(HTMLCanvasElement.prototype.getContext, {
    apply(target, thisArg, argumentsList) {
        if (argumentsList[1]) {
            argumentsList[1].preserveDrawingBuffer = true;
        }
        return Reflect.apply(target, thisArg, argumentsList);
    }
});

function getImageData(newWidth = 350) {
    //made this function with chatgpt lol
    const originalWidth = 440;
    const originalHeight = 30;
    const pixels = new Uint8Array(originalWidth * originalHeight * 4);
    gl.readPixels(30, 165, originalWidth, originalHeight, gl.RGBA, gl.UNSIGNED_BYTE, pixels);

    const flippedPixels = new Uint8Array(pixels.length);
    for (let y = 0; y < originalHeight; y++) {
        for (let x = 0; x < originalWidth; x++) {
            const srcIndex = (y * originalWidth + x) * 4;
            const destIndex = ((originalHeight - 1 - y) * originalWidth + x) * 4;
            flippedPixels[destIndex] = pixels[srcIndex];
            flippedPixels[destIndex + 1] = pixels[srcIndex + 1];
            flippedPixels[destIndex + 2] = pixels[srcIndex + 2];
            flippedPixels[destIndex + 3] = pixels[srcIndex + 3];
        }
    }
    const offset = Math.floor((originalWidth - newWidth) / 2);
    const newPixels = new Uint8Array(newWidth * originalHeight * 4);

    for (let y = 0; y < originalHeight; y++) {
        for (let x = 0; x < newWidth; x++) {
            const srcIndex = (y * originalWidth + (x + offset)) * 4;
            const destIndex = (y * newWidth + x) * 4;
            newPixels[destIndex] = flippedPixels[srcIndex];
            newPixels[destIndex + 1] = flippedPixels[srcIndex + 1];
            newPixels[destIndex + 2] = flippedPixels[srcIndex + 2];
            newPixels[destIndex + 3] = flippedPixels[srcIndex + 3];
        }
    }

    const binaryPixels = new Uint8Array(newPixels.length);
    for (let i = 0; i < newPixels.length; i += 4) {
        const r = newPixels[i];
        const g = newPixels[i + 1];
        const b = newPixels[i + 2];
        const brightness = 0.299 * r + 0.587 * g + 0.114 * b;

        const threshold = 150; // 10000yen
        //const threshold = 120 // 3000yen
        const color = brightness > threshold ? 255 : 0;
        binaryPixels[i] = color;
        binaryPixels[i + 1] = color;
        binaryPixels[i + 2] = color;
        binaryPixels[i + 3] = newPixels[i + 3];
    }

    function floodFill(x, y) {
        const stack = [[x, y]];
        const colorToReplace = [255, 255, 255, 255];
        const newColor = [0, 0, 0, 255];

        while (stack.length) {
            const [cx, cy] = stack.pop();
            const index = (cy * newWidth + cx) * 4;
            if (cx < 0 || cx >= newWidth || cy < 0 || cy >= originalHeight) continue;
            if (
                binaryPixels[index] === colorToReplace[0] &&
                binaryPixels[index + 1] === colorToReplace[1] &&
                binaryPixels[index + 2] === colorToReplace[2] &&
                binaryPixels[index + 3] === colorToReplace[3]
            ) {
                binaryPixels[index] = newColor[0];
                binaryPixels[index + 1] = newColor[1];
                binaryPixels[index + 2] = newColor[2];
                binaryPixels[index + 3] = newColor[3];

                stack.push([cx + 1, cy]);
                stack.push([cx - 1, cy]);
                stack.push([cx, cy + 1]);
                stack.push([cx, cy - 1]);
            }
        }
    }

    for (let y = 0; y < originalHeight; y++) {
        if (binaryPixels[y * newWidth * 4] === 255) {
            floodFill(0, y);
        }

        if (binaryPixels[y * newWidth * 4 + (newWidth - 1) * 4] === 255) {
            floodFill(newWidth - 1, y);
        }
    }

    return new ImageData(new Uint8ClampedArray(binaryPixels), newWidth, originalHeight);
}


let ocrCanvas, ctx, ocrDiv, canvas, gl, toggleButton, isActive;

function frame() {
    ctx.putImageData(getImageData(), 0, 0)
    requestAnimationFrame(frame);
}

function wait() {
    const canvasElement = document.getElementById("#canvas");
    if (canvasElement) {
        setTimeout(()=>{
            canvas = document.getElementById("#canvas");
            gl = canvas.getContext('webgl2');
            ocrCanvas = document.createElement("canvas");
            ctx = ocrCanvas.getContext("2d");
            ocrCanvas.width = 440;
            ocrCanvas.height = 30;
            ocrCanvas.id = "ocr"
            document.body.appendChild(ocrCanvas);
            ocrDiv = document.createElement("div");
            ocrDiv.id = "ocrText";
            document.body.appendChild(ocrDiv);
            toggleButton = document.createElement("button");
            toggleButton.textContent = "ON";
            toggleButton.style.fontSize = "20px";
            toggleButton.style.padding = "10px 20px";
            toggleButton.style.width = "150px";
            toggleButton.style.height = "50px";
            isActive = false;
            toggleButton.onclick = function() {
                isActive = !isActive;
                toggleButton.textContent = isActive ? "OFF" : "ON";
            };
            document.body.appendChild(toggleButton);
            requestAnimationFrame(frame);
            ocr();
        },500)
    } else {
        setTimeout(wait, 100)
    }
}

wait();

function cleanText(text) {
    text = text.match(/[a-z0-9-,!?]/g)
    if (!text) return ''
    text = text.join('')
    text = text.replace(/^[0-9-]+/, '');
    text = text.replace(/[A-Z]/g, '').toLowerCase();
    return text;
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function ocr() {
    (async () => {
        await loadTesseract();
        console.log('Tesseract.js loaded');
        const worker = await window.Tesseract.createWorker('eng');
        while(true) {
            const { data: { text } } = await worker.recognize(ocrCanvas.toDataURL());
            let matched = cleanText(text)
            if (matched) {
                if (!words.includes(matched)){
                    ocrDiv.textContent = matched;
                    if (isActive) {
                        words.push(matched);
                        press(matched)
                    }
                }
            }
            await sleep(0)
        }
        await worker.terminate();
    })();
}

function loadTesseract() {
    return new Promise((resolve) => {
        const script = document.createElement('script');
        script.src = 'https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js';
        document.body.appendChild(script);
        script.onload = () => {
            console.log('Tesseract.js loaded');
            resolve();
        };
    });
}
