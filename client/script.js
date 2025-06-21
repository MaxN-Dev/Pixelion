const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");
ctx.imageSmoothingEnabled = false;

const socket = io();
const colorPicker = document.getElementById("colorPicker");
const hexValue = document.getElementById("hexValue");

hexValue.textContent = colorPicker.value.toUpperCase();

colorPicker.addEventListener("input", () => {
  hexValue.textContent = colorPicker.value.toUpperCase();
});

const canvasSize = 100;
let scale = 7;

let isPanning = false;
let isDrawing = false;
let startPan = {};

let canvasData = [];

let pixelCanvasWidth = canvasSize * scale;
let pixelCanvasHeight = canvasSize * scale;

canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

let windowWidth = window.innerWidth;
let windowHeight = window.innerHeight;

let offsetX = (windowWidth - pixelCanvasWidth) / 2;
let offsetY = (windowHeight - pixelCanvasHeight) / 2;

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

function drawPixelFromEvent(e) {
  const rect = canvas.getBoundingClientRect();
  const x = Math.floor((e.clientX - rect.left - offsetX) / scale);
  const y = Math.floor((e.clientY - rect.top - offsetY) / scale);

  if (x >= 0 && y >= 0 && x < canvasSize && y < canvasSize) {
    const hex = colorPicker.value;
    const color = {
      r: parseInt(hex.substr(1, 2), 16),
      g: parseInt(hex.substr(3, 2), 16),
      b: parseInt(hex.substr(5, 2), 16)
    };
    socket.emit("place_pixel", { x, y, color });
  }
}

canvas.addEventListener("mousedown", (e) => {
  if (e.button === 1) {
    // Middle click to pan
    e.preventDefault();
    isPanning = true;
    startPan = { x: e.clientX, y: e.clientY };
  } else if (e.button === 0) {
    // Left click to draw
    isDrawing = true;
    drawPixelFromEvent(e);
  }
});

canvas.addEventListener("mousemove", (e) => {
  if (isPanning) {
    offsetX += e.clientX - startPan.x;
    offsetY += e.clientY - startPan.y;
    startPan = { x: e.clientX, y: e.clientY };
    draw();
  } else if (isDrawing) {
    drawPixelFromEvent(e);
  }
});

canvas.addEventListener("mouseup", () => {
  isPanning = false;
  isDrawing = false;
});

canvas.addEventListener("mouseleave", () => {
  isPanning = false;
  isDrawing = false;
});

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

  const newCanvasX = canvasX * scale + offsetX;
  const newCanvasY = canvasY * scale + offsetY;

  offsetX += mouseX - newCanvasX;
  offsetY += mouseY - newCanvasY;

  draw();
});

socket.on("load_canvas", (data) => {
  canvasData = data;
  draw();
});

socket.on("update_pixel", ({ x, y, color }) => {
  canvasData[y][x] = color;
  draw();
});

window.addEventListener("contextmenu", (e) => {
  e.preventDefault();
});

