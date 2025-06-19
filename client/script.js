const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");
ctx.imageSmoothingEnabled = false;

const socket = io();
const colorPicker = document.getElementById("colorPicker");

const canvasSize = 100; // 100x100 pixel grid
let canvasData = [];

let scale = 7;
let targetScale = scale;

let offsetX = 0;
let offsetY = 0;

let isPanning = false;
let startPan = { x: 0, y: 0 };

// Resize to full screen
function resizeCanvas() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}
window.addEventListener("resize", () => {
  resizeCanvas();
  centerCanvas();
  draw();
});

// Center canvas on first load
function centerCanvas() {
  const pixelWidth = canvasSize * scale;
  const pixelHeight = canvasSize * scale;
  offsetX = (canvas.width - pixelWidth) / 2;
  offsetY = (canvas.height - pixelHeight) / 2;
}

function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  for (let y = 0; y < canvasSize; y++) {
    for (let x = 0; x < canvasSize; x++) {
      const color = canvasData[y][x];
      ctx.fillStyle = `rgb(${color.r},${color.g},${color.b})`;
      ctx.fillRect(
        x * scale + offsetX,
        y * scale + offsetY,
        scale,
        scale
      );
    }
  }
}

// Send pixel placement
canvas.addEventListener("click", (e) => {
  const { x, y } = getCanvasCoordinates(e.clientX, e.clientY);
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

// Smooth zoom into mouse position
canvas.addEventListener("wheel", (e) => {
  e.preventDefault();
  const mouseX = e.clientX;
  const mouseY = e.clientY;
  const { x: worldX, y: worldY } = getCanvasCoordinates(mouseX, mouseY);

  const zoomFactor = 1.2;
  const direction = -Math.sign(e.deltaY);
  const zoomAmount = direction > 0 ? zoomFactor : 1 / zoomFactor;

  const newScale = Math.max(1, Math.min(targetScale * zoomAmount, 50));
  const scaleRatio = newScale / scale;

  // Adjust offset so zoom feels centered on mouse
  offsetX = mouseX - (mouseX - offsetX) * scaleRatio;
  offsetY = mouseY - (mouseY - offsetY) * scaleRatio;

  scale = newScale;
  targetScale = newScale;
  draw();
}, { passive: false });

// Drag (middle mouse)
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
    offsetX += dx;
    offsetY += dy;
    startPan = { x: e.clientX, y: e.clientY };
    draw();
  }
});

canvas.addEventListener("mouseup", () => isPanning = false);
canvas.addEventListener("mouseleave", () => isPanning = false);

// Convert screen (mouse) coordinates to canvas grid coords
function getCanvasCoordinates(screenX, screenY) {
  const x = Math.floor((screenX - offsetX) / scale);
  const y = Math.floor((screenY - offsetY) / scale);
  return { x, y };
}

// Socket events
socket.on("load_canvas", (data) => {
  canvasData = data;
  resizeCanvas();
  centerCanvas();
  draw();
});

socket.on("update_pixel", ({ x, y, color }) => {
  canvasData[y][x] = color;
  draw();
});
