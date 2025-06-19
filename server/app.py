import os
import json
import eventlet
import threading
eventlet.monkey_patch()

from flask import Flask, send_from_directory
from flask_socketio import SocketIO, emit

static_folder = os.path.join(os.path.dirname(os.path.abspath(__file__)), '../client')
app = Flask(__name__, static_folder=static_folder)
socketio = SocketIO(app, cors_allowed_origins="*", async_mode="eventlet")

CANVAS_WIDTH = 100
CANVAS_HEIGHT = 100
CANVAS_PATH = 'canvas.json'

if os.path.exists(CANVAS_PATH):
    with open(CANVAS_PATH, 'r') as f:
        canvas = json.load(f)
else:
    canvas = [[{"r": 255, "g": 255, "b": 255} for _ in range(CANVAS_WIDTH)] for _ in range(CANVAS_HEIGHT)]

update_queue = []
update_lock = threading.Lock()

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
    with update_lock:
        update_queue.append({'x': x, 'y': y, 'color': color})

def batch_update_sender():
    while True:
        eventlet.sleep(0.1)
        with update_lock:
            if not update_queue:
                continue
            batch = update_queue[:]
            update_queue.clear()
        socketio.emit('batch_update_pixels', batch, broadcast=True)

def periodic_save(interval=30):
    while True:
        eventlet.sleep(interval)
        with update_lock:
            with open(CANVAS_PATH, 'w') as f:
                json.dump(canvas, f)

if __name__ == '__main__':
    socketio.start_background_task(batch_update_sender)
    socketio.start_background_task(periodic_save)

    port = int(os.environ.get('PORT', 10000))
    socketio.run(app, host='0.0.0.0', port=port)


'''
git add .
git commit -m "v0.1"
git push origin main
'''