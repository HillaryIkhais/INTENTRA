import http.server
import os

class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=os.path.join(os.path.dirname(__file__), "ui"), **kwargs)

    def do_GET(self):
        if self.path == "/":
            self.path = "/index.html"
        return super().do_GET()

if __name__ == "__main__":
    server = http.server.HTTPServer(("0.0.0.0", 8080), Handler)
    print("UI: http://localhost:8080")
    server.serve_forever()
