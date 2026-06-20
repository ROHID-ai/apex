import socket
from app.main import create_app

def find_free_port(start_port):
    port = start_port
    while True:
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
            if s.connect_ex(('0.0.0.0', port)) != 0:
                return port
            port += 1

app = create_app()

if __name__ == '__main__':
    # Start checking from 5001 (to avoid macOS 5000 conflict)
    free_port = find_free_port(5001)
    
    print(f"🚀 Starting Gym Backend on port: {free_port}")
    app.run(host='0.0.0.0', port=free_port, debug=True)
