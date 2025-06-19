const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");
const socket = io();
const colorPicker = document.getElementById("colorPicker");

const canvasSize = 100;
let scale = 7;
let targetScale = scale;

let offsetX = (window.innerWidth - canvasSize * scale) / 2;
let offsetY = (window.innerHeight - canvasSize * scale) / 2;
let targetOffsetX = offsetX;
let targetOffsetY = offsetY;

let isPanning = false;
let startPan = {};

canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

let canvasData = [];

function draw() {
  const pixelCanvasWidth = canvasSize * scale;
  const pixelCanvasHeight = canvasSize * scale;

  ctx.clearRect(0, 0, canvas.width, canvas.height);
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

  const delta = -Math.sign(e.deltaY);
  targetScale = Math.min(Math.max(1, targetScale + delta), 50);

  const newCanvasX = canvasX * targetScale;
  const newCanvasY = canvasY * targetScale;

  targetOffsetX += mouseX - newCanvasX;
  targetOffsetY += mouseY - newCanvasY;
});

canvas.addEventListener("mousedown", (e) => {
  if (e.button === 1) {
    e.preventDefault();
    isPanning = true;
    startPan = { x: e.clientX, y: e.clientY };
  }
});

canvas.addEventListener("mousemove", (e) => {
  if (isPanning) {
    const dx = e.clientX - startPan.x;
    const dy = e.clientY - startPan.y;
    targetOffsetX += dx;
    targetOffsetY += dy;
    startPan = { x: e.clientX, y: e.clientY };
  }
});

canvas.addEventListener("mouseup", () => isPanning = false);
canvas.addEventListener("mouseleave", () => isPanning = false);

socket.on("load_canvas", (data) => {
  canvasData = data;
});

socket.on("update_pixel", ({ x, y, color }) => {
  canvasData[y][x] = color;
});

function lerp(start, end, t) {
  return start + (end - start) * t;
}

function updateCamera() {
  scale = lerp(scale, targetScale, 0.15);
  offsetX = lerp(offsetX, targetOffsetX, 0.15);
  offsetY = lerp(offsetY, targetOffsetY, 0.15);
  draw();
  requestAnimationFrame(updateCamera);
}

requestAnimationFrame(updateCamera);
