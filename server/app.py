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
    try:
        x = int(data.get('x'))
        y = int(data.get('y'))
        color = data.get('color')

        if not (0 <= x < CANVAS_WIDTH and 0 <= y < CANVAS_HEIGHT):
            print(f"Blocked invalid coords: ({x}, {y})")
            return

        if not isinstance(color, dict):
            print(f"Blocked non-dict color: {color}")
            return

        r = int(color.get('r'))
        g = int(color.get('g'))
        b = int(color.get('b'))

        if not all(0 <= v <= 255 for v in [r, g, b]):
            print(f"Blocked out-of-range color: {color}")
            return

        canvas[y][x] = {'r': r, 'g': g, 'b': b}
        emit('update_pixel', {'x': x, 'y': y, 'color': {'r': r, 'g': g, 'b': b}}, broadcast=True)

    except Exception as e:
        print(f"Blocked malformed pixel data: {e}")


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


'''
git add .
git commit -m "v0.1"
git push origin main
'''