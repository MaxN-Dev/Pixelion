const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");
const socket = io();
const colorPicker = document.getElementById("colorPicker");

const canvasSize = 100;

let scale = 7;
let targetScale = scale;

let isPanning = false;
let startPan = { x: 0, y: 0 };

canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

let offsetX = (canvas.width - canvasSize * scale) / 2;
let offsetY = (canvas.height - canvasSize * scale) / 2;

let canvasData = [];

let mouseX = 0;
let mouseY = 0;
let canvasX = 0;
let canvasY = 0;

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
  }
  mouseX = e.clientX;
  mouseY = e.clientY;
});

canvas.addEventListener("mouseup", () => isPanning = false);
canvas.addEventListener("mouseleave", () => isPanning = false);

canvas.addEventListener("wheel", (e) => {
  e.preventDefault();
  const rect = canvas.getBoundingClientRect();
  mouseX = e.clientX - rect.left;
  mouseY = e.clientY - rect.top;
  canvasX = (mouseX - offsetX) / scale;
  canvasY = (mouseY - offsetY) / scale;

  const zoomFactor = 1.2;
  const direction = -Math.sign(e.deltaY);
  const zoomAmount = direction > 0 ? zoomFactor : 1 / zoomFactor;
  targetScale = Math.min(Math.max(1, targetScale * zoomAmount), 50);
});

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

socket.on("load_canvas", (data) => {
  canvasData = data;
});

socket.on("update_pixel", ({ x, y, color }) => {
  canvasData[y][x] = color;
});

function tick() {
  const zoomSpeed = 0.05;
  const diff = targetScale - scale;
  if (Math.abs(diff) > 0.001) {
    scale += diff * zoomSpeed;
    const newCanvasX = canvasX * scale + offsetX;
    const newCanvasY = canvasY * scale + offsetY;
    offsetX += mouseX - newCanvasX;
    offsetY += mouseY - newCanvasY;
  }

  draw();
  requestAnimationFrame(tick);
}

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

tick();
