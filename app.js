const pdfjsLib = window['pdfjs-dist/build/pdf'];
pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://mozilla.github.io/pdf.js/build/pdf.worker.js';

const fileInput = document.getElementById('file-input');
const pdfContainer = document.getElementById('pdf-container');
const errorDisplay = document.getElementById('error-display');
const prevPageButton = document.getElementById('prev-page');
const nextPageButton = document.getElementById('next-page');
const pageNumberInput = document.getElementById('page-number-input');
const goToPageButton = document.getElementById('go-to-page');
const toggleWakeLockButton = document.getElementById('toggle-wake-lock');

let pdfDoc = null;
let pageNum = 1;
let pageRendering = false;
let pageNumPending = null;
let wakeLock = null;

async function toggleWakeLock() {
    if (wakeLock !== null) {
        await wakeLock.release();
        wakeLock = null;
        toggleWakeLockButton.textContent = 'Enable No Sleep';
        console.log('Wake Lock released.');
    } else {
        try {
            wakeLock = await navigator.wakeLock.request('screen');
            toggleWakeLockButton.textContent = 'Disable No Sleep';
            console.log('Wake Lock active.');
        } catch (err) {
            console.error(`${err.name}, ${err.message}`);
        }
    }
}

toggleWakeLockButton.addEventListener('click', toggleWakeLock);

function renderPage(num) {
    pageRendering = true;
    pdfDoc.getPage(num).then((page) => {
        const viewport = page.getViewport({ scale: 1.5 });
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        canvas.height = viewport.height;
        canvas.width = viewport.width;

        const renderContext = {
            canvasContext: context,
            viewport: viewport,
        };
        const renderTask = page.render(renderContext);

        renderTask.promise.then(() => {
            pageRendering = false;
            if (pageNumPending !== null) {
                renderPage(pageNumPending);
                pageNumPending = null;
            }
        });

        pdfContainer.innerHTML = '';
        pdfContainer.appendChild(canvas);
        pageNumberInput.value = num;
    });
}

function queueRenderPage(num) {
    if (pageRendering) {
        pageNumPending = num;
    } else {
        renderPage(num);
    }
}

function onPrevPage() {
    if (pageNum <= 1) {
        return;
    }
    pageNum--;
    queueRenderPage(pageNum);
}

function onNextPage() {
    if (pageNum >= pdfDoc.numPages) {
        return;
    }
    pageNum++;
    queueRenderPage(pageNum);
}

function onGoToPage() {
    const desiredPage = parseInt(pageNumberInput.value, 10);
    if (desiredPage >= 1 && desiredPage <= pdfDoc.numPages) {
        pageNum = desiredPage;
        queueRenderPage(pageNum);
    }
}

prevPageButton.addEventListener('click', onPrevPage);
nextPageButton.addEventListener('click', onNextPage);
goToPageButton.addEventListener('click', onGoToPage);
pdfContainer.addEventListener('click', onNextPage);

fileInput.addEventListener('change', (event) => {
    errorDisplay.textContent = '';
    const file = event.target.files[0];
    if (!file) {
        return;
    }
    if (file.type !== 'application/pdf') {
        const errorMessage = `${file.name} is not a PDF file.`;
        errorDisplay.textContent = errorMessage;
        console.error(errorMessage);
        return;
    }

    const fileReader = new FileReader();
    fileReader.onload = function() {
        try {
            const typedarray = new Uint8Array(this.result);
            pdfjsLib.getDocument(typedarray).promise.then((pdfDoc_) => {
                pdfDoc = pdfDoc_;
                pageNumberInput.max = pdfDoc.numPages;
                pageNum = 1;
                renderPage(pageNum);
            }).catch((reason) => {
                const errorMessage = `Error loading PDF: ${reason.message}`;
                errorDisplay.textContent = errorMessage;
                console.error(errorMessage);
            });
        } catch (error) {
            const errorMessage = `Error processing file: ${error.message}`;
            errorDisplay.textContent = errorMessage;
            console.error(errorMessage);
        }
    };
    fileReader.onerror = function() {
        const errorMessage = 'Error reading file.';
        errorDisplay.textContent = errorMessage;
        console.error(errorMessage);
    };
    fileReader.readAsArrayBuffer(file);
});
