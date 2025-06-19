import os
from flask import Flask, send_from_directory
from flask_socketio import SocketIO, emit
import json
import threading
import time

static_folder = os.path.join(os.path.dirname(os.path.abspath(__file__)), '../client')
app = Flask(__name__, static_folder=static_folder)
socketio = SocketIO(app, cors_allowed_origins="*", async_mode="threading")

CANVAS_WIDTH = 100
CANVAS_HEIGHT = 100
CANVAS_PATH = 'canvas.json'

if os.path.exists(CANVAS_PATH):
    with open(CANVAS_PATH, 'r') as f:
        canvas = json.load(f)
else:
    canvas = [[{"r": 255, "g": 255, "b": 255} for _ in range(CANVAS_WIDTH)] for _ in range(CANVAS_HEIGHT)]

@app.route('/')
def index():
    return send_from_directory(app.static_folder, 'index.html')

@app.route('/<path:path>')
def static_proxy(path):
    return send_from_directory(app.static_folder, path)

@socketio.on('connect')
def handle_connect():
    emit('load_canvas', canvas)

@socketio.on('place_pixel')
def handle_place_pixel(data):
    x, y, color = data['x'], data['y'], data['color']
    canvas[y][x] = color
    emit('update_pixel', {'x': x, 'y': y, 'color': color}, broadcast=True)

def save_canvas():
    with open(CANVAS_PATH, 'w') as f:
        json.dump(canvas, f)


def periodic_save(interval=10):
    while True:
        time.sleep(interval)
        save_canvas()

threading.Thread(target=periodic_save, daemon=True).start()

if __name__ == '__main__':
    import os
    port = int(os.environ.get('PORT', 10000))
    socketio.run(app, host='0.0.0.0', port=port, allow_unsafe_werkzeug=True)




#git add .
#git commit -m "v0.1"
#git push origin main