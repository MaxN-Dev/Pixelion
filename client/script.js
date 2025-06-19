const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");
const socket = io();
const colorPicker = document.getElementById("colorPicker");

const canvasSize = 100;
let scale = 7;
let targetScale = scale;
let zoomAnimationFrame = null;

let isPanning = false;
let startPan = {};

let pixelCanvasWidth = canvasSize * scale;
let pixelCanvasHeight = canvasSize * scale;

canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

let windowWidth = window.innerWidth;
let windowHeight = window.innerHeight;

let offsetX = (windowWidth - pixelCanvasWidth) / 2;
let offsetY = (windowHeight - pixelCanvasHeight) / 2;

let canvasData = [];

function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.imageSmoothingEnabled = false;
  for (let y = 0; y < canvasSize; y++) {
    for (let x = 0; x < canvasSize; x++) {
      const color = canvasData[y][x];
      ctx.fillStyle = `rgb(${color.r},${color.g},${color.b})`;
      ctx.fillRect(x * scale + offsetX, y * scale + offsetY, scale, scale);
    }
  }
}

canvas.addEventListener("click", (e) => {
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
});

canvas.addEventListener("wheel", (e) => {
  e.preventDefault();
  const rect = canvas.getBoundingClientRect();
  const mouseX = e.clientX - rect.left;
  const mouseY = e.clientY - rect.top;
  const canvasX = (mouseX - offsetX) / scale;
  const canvasY = (mouseY - offsetY) / scale;
  const zoomFactor = 1.01;
  const direction = -Math.sign(e.deltaY);
  const zoomAmount = direction > 0 ? zoomFactor : 1 / zoomFactor;
  targetScale = Math.min(Math.max(1, targetScale * zoomAmount), 50);
  if (!zoomAnimationFrame) {
    smoothZoom(canvasX, canvasY, mouseX, mouseY);
  }
});

function smoothZoom(canvasX, canvasY, mouseX, mouseY) {
  const zoomSpeed = 0.1;
  const diff = targetScale - scale;
  if (Math.abs(diff) < 0.001) {
    scale = targetScale;
    zoomAnimationFrame = null;
    return;
  }
  scale += diff * zoomSpeed;
  const newCanvasX = canvasX * scale + offsetX;
  const newCanvasY = canvasY * scale + offsetY;
  offsetX += mouseX - newCanvasX;
  offsetY += mouseY - newCanvasY;
  draw();
  zoomAnimationFrame = requestAnimationFrame(() => smoothZoom(canvasX, canvasY, mouseX, mouseY));
}

canvas.addEventListener("mousedown", (e) => {
  if (e.button === 1) {
    e.preventDefault();
    isPanning = true;
    startPan = { x: e.clientX, y: e.clientY };
  }
});

canvas.addEventListener("mousemove", (e) => {
  if (isPanning) {
    offsetX += e.clientX - startPan.x;
    offsetY += e.clientY - startPan.y;
    startPan = { x: e.clientX, y: e.clientY };
    draw();
  }
});

canvas.addEventListener("mouseup", () => isPanning = false);
canvas.addEventListener("mouseleave", () => isPanning = false);

socket.on("load_canvas", (data) => {
  canvasData = data;
  draw();
});

socket.on("update_pixel", ({ x, y, color }) => {
  canvasData[y][x] = color;
  draw();
});
