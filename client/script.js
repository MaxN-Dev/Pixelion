const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");
const socket = io();
const colorPicker = document.getElementById("colorPicker");

const canvasSize = 100;
let scale = 7;
let targetScale = scale;
const zoomSpeed = 0.15;

let isPanning = false;
let startPan = {};

canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

let offsetX = (window.innerWidth - canvasSize * scale) / 2;
let offsetY = (window.innerHeight - canvasSize * scale) / 2;

let canvasData = [];

function lerp(start, end, t) {
  return start + (end - start) * t;
}

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

function animate() {
  if (Math.abs(scale - targetScale) > 0.001) {
    const prevScale = scale;
    scale = lerp(scale, targetScale, zoomSpeed);
    scale = Math.min(Math.max(1, scale), 50);

    // Adjust offset so zoom focuses on mouse position smoothly
    // We'll store the last mouse position from wheel event for this:
    if (lastMousePos) {
      const mouseX = lastMousePos.x;
      const mouseY = lastMousePos.y;

      const canvasX = (mouseX - offsetX) / prevScale;
      const canvasY = (mouseY - offsetY) / prevScale;

      const newCanvasX = canvasX * scale + offsetX;
      const newCanvasY = canvasY * scale + offsetY;

      offsetX += mouseX - newCanvasX;
      offsetY += mouseY - newCanvasY;
    }

    draw();
  }
  requestAnimationFrame(animate);
}

let lastMousePos = null;

canvas.addEventListener("wheel", (e) => {
  e.preventDefault();

  lastMousePos = { x: e.clientX, y: e.clientY };

  const delta = -e.deltaY * 0.0015; // smaller multiplier for smooth gradual zooming
  targetScale = Math.min(Math.max(1, targetScale * (1 + delta)), 50);
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

animate();
