
from flask import Flask, send_from_directory
from flask_socketio import SocketIO, emit
import json
import os
import threading
import time

app = Flask(__name__, static_folder='../client')
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
    socketio.run(app, host='127.0.0.1', port=5001, debug=True, allow_unsafe_werkzeug=True, use_reloader=False)

#ngrok http 5001


