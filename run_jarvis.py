import os
import sys

# Add backend to path
sys.path.append(os.path.join(os.getcwd(), 'backend'))

from backend.server import app, socketio

if __name__ == '__main__':
    print("Initializing Jarvis Online...")
    
    port = int(os.environ.get('PORT', 5001))
    print(f"Starting Web Server on port {port}...")
    print(f"Open http://localhost:{port} in your browser to see the Hologram Interface.")
    
    socketio.run(app, host='0.0.0.0', port=port, debug=False, allow_unsafe_werkzeug=True)
