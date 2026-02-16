from flask import Flask, render_template, send_from_directory
from flask_socketio import SocketIO
import os
import threading
from jarvis import Jarvis

app = Flask(__name__, static_folder="../frontend", template_folder="../frontend")
app.config['SECRET_KEY'] = os.environ.get('SECRET_KEY', 'jarvis-secret-key-2024')
socketio = SocketIO(app, cors_allowed_origins="*", async_mode='threading')

# Initialize Jarvis
jarvis = Jarvis(socketio=socketio)

@app.route('/')
def index():
      return render_template('index.html')

@app.route('/<path:path>')
def static_files(path):
      return send_from_directory('../frontend', path)

@socketio.on('connect')
def handle_connect():
      print('Client connected')
      socketio.emit('status', {'data': 'Connected to Jarvis Backend'})

@socketio.on('user_command')
def handle_user_command(data):
      # Process commands from the web UI
      command = data.get('command')
      if command:
                print(f"Received command via UI: {command}")
                jarvis.process_command(command)

  @socketio.on('disconnect')
def handle_disconnect():
      print('Client disconnected')

if __name__ == '__main__':
      port = int(os.environ.get('PORT', 5001))
      print(f"Starting Jarvis Server on http://localhost:{port}")
      socketio.run(app, host='0.0.0.0', port=port, debug=False, allow_unsafe_werkzeug=True)
