const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");
ctx.imageSmoothingEnabled = false;

const socket = io();
const colorPicker = document.getElementById("colorPicker");
const hexValue = document.getElementById("hexValue");

const canvasSize = 100;
let scale = 7;

let isPanning = false;
let isDrawing = false;
let isErasing = false;
let startPan = {};

let canvasData = [];

canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

let windowWidth = window.innerWidth;
let windowHeight = window.innerHeight;

let pixelCanvasWidth = canvasSize * scale;
let pixelCanvasHeight = canvasSize * scale;

let offsetX = (windowWidth - pixelCanvasWidth) / 2;
let offsetY = (windowHeight - pixelCanvasHeight) / 2;

hexValue.textContent = colorPicker.value.toUpperCase();

colorPicker.addEventListener("input", () => {
  hexValue.textContent = colorPicker.value.toUpperCase();
});

function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  for (let y = 0; y < canvasSize; y++) {
    for (let x = 0; x < canvasSize; x++) {
      const color = canvasData[y][x];
      ctx.fillStyle = `rgb(${color.r},${color.g},${color.b})`;
      ctx.fillRect(x * scale + offsetX, y * scale + offsetY, scale, scale);
    }
  }
}

function drawPixelFromEvent(e, erase = false) {
  const rect = canvas.getBoundingClientRect();
  const x = Math.floor((e.clientX - rect.left - offsetX) / scale);
  const y = Math.floor((e.clientY - rect.top - offsetY) / scale);

  if (x >= 0 && y >= 0 && x < canvasSize && y < canvasSize) {
    let color;
    if (erase) {
      color = { r: 255, g: 255, b: 255 };
    } else {
      const hex = colorPicker.value;
      color = {
        r: parseInt(hex.substr(1, 2), 16),
        g: parseInt(hex.substr(3, 2), 16),
        b: parseInt(hex.substr(5, 2), 16)
      };
    }
    socket.emit("place_pixel", { x, y, color });
  }
}

canvas.addEventListener("wheel", (e) => {
  e.preventDefault();
  const rect = canvas.getBoundingClientRect();
  const mouseX = e.clientX - rect.left;
  const mouseY = e.clientY - rect.top;

  const prevScale = scale;
  const canvasX = (mouseX - offsetX) / prevScale;
  const canvasY = (mouseY - offsetY) / prevScale;

  const delta = -Math.sign(e.deltaY);
  scale = Math.min(Math.max(1, scale + delta), 50);

  pixelCanvasWidth = canvasSize * scale;
  pixelCanvasHeight = canvasSize * scale;

  const newCanvasX = canvasX * scale + offsetX;
  const newCanvasY = canvasY * scale + offsetY;

  offsetX += mouseX - newCanvasX;
  offsetY += mouseY - newCanvasY;

  draw();
});

canvas.addEventListener("mousedown", (e) => {
  if (e.button === 1) {
    e.preventDefault();
    isPanning = true;
    startPan = { x: e.clientX, y: e.clientY };
  } else if (e.button === 0) {
    isDrawing = true;
    drawPixelFromEvent(e, false);
  } else if (e.button === 2) {
    isErasing = true;
    drawPixelFromEvent(e, true);
  }
});

canvas.addEventListener("mousemove", (e) => {
  if (isPanning) {
    offsetX += e.clientX - startPan.x;
    offsetY += e.clientY - startPan.y;
    startPan = { x: e.clientX, y: e.clientY };
    draw();
  } else if (isDrawing) {
    drawPixelFromEvent(e, false);
  } else if (isErasing) {
    drawPixelFromEvent(e, true);
  }
});

canvas.addEventListener("mouseup", () => {
  isDrawing = false;
  isErasing = false;
  isPanning = false;
});

canvas.addEventListener("mouseleave", () => {
  isDrawing = false;
  isErasing = false;
  isPanning = false;
});

canvas.addEventListener("contextmenu", (e) => e.preventDefault());

socket.on("load_canvas", (data) => {
  canvasData = data;
  draw();
});

socket.on("update_pixel", ({ x, y, color }) => {
  canvasData[y][x] = color;
  draw();
});
