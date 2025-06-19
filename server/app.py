import os
import json
import time
import threading
from flask import Flask, send_from_directory, request
from flask_socketio import SocketIO, emit
from collections import defaultdict

# ======== Config ==========
CANVAS_WIDTH = 100
CANVAS_HEIGHT = 100
CANVAS_PATH = 'canvas.json'
SAVE_INTERVAL = 10  # seconds
RATE_LIMIT_SECONDS = 0.01  # 10ms between pixel draws per user
# ==========================

# Setup Flask
static_folder = os.path.join(os.path.dirname(os.path.abspath(__file__)), '../client')
app = Flask(__name__, static_folder=static_folder)
socketio = SocketIO(app, cors_allowed_origins="*", async_mode="threading")

# Load canvas from file or create new
if os.path.exists(CANVAS_PATH):
    with open(CANVAS_PATH, 'r') as f:
        canvas = json.load(f)
else:
    canvas = [[{"r": 255, "g": 255, "b": 255} for _ in range(CANVAS_WIDTH)] for _ in range(CANVAS_HEIGHT)]

# Track user draw timings
user_last_draw = defaultdict(float)

# ========== Routes ==========
@app.route('/')
def index():
    return send_from_directory(app.static_folder, 'index.html')

@app.route('/<path:path>')
def static_proxy(path):
    return send_from_directory(app.static_folder, path)

# ========== Socket Events ==========
@socketio.on('connect')
def handle_connect():
    emit('load_canvas', canvas)

@socketio.on('place_pixel')
def handle_place_pixel(data):
    sid = request.sid
    now = time.time()

    # Rate limiting (per-user)
    if now - user_last_draw[sid] < RATE_LIMIT_SECONDS:
        return
    user_last_draw[sid] = now

    # Update canvas in memory
    x, y, color = data['x'], data['y'], data['color']
    if 0 <= x < CANVAS_WIDTH and 0 <= y < CANVAS_HEIGHT:
        canvas[y][x] = color
        emit('update_pixel', {'x': x, 'y': y, 'color': color}, broadcast=True)

# ========== Save Canvas Periodically ==========
def save_canvas():
    with open(CANVAS_PATH, 'w') as f:
        json.dump(canvas, f)

def periodic_save():
    while True:
        time.sleep(SAVE_INTERVAL)
        save_canvas()

threading.Thread(target=periodic_save, daemon=True).start()

# ========== Start Server ==========
if __name__ == '__main__':
    port = int(os.environ.get('PORT', 10000))
    socketio.run(app, host='0.0.0.0', port=port, allow_unsafe_werkzeug=True)


'''
git add .
git commit -m "v0.1"
git push origin main
'''