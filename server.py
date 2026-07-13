#!/usr/bin/env python3
"""Forge static server + tiny JSON backup API.

Serves the app exactly like `python -m http.server`, PLUS:
  GET  /api/data/<name>   -> returns stored JSON for <name> (or {} if none)
  PUT  /api/data/<name>   -> stores JSON body as data/<name>.json (atomic)
                             and keeps the last 20 timestamped copies in data/history/

<name> must match [A-Za-z0-9_-]{1,40} (prevents path traversal).
Usage: python3 server.py [port]   (default 8080)
"""
import http.server, socketserver, json, os, re, sys, time, threading

ROOT = os.path.dirname(os.path.abspath(__file__))
DATA = os.path.join(ROOT, "data")
HIST = os.path.join(DATA, "history")
os.makedirs(HIST, exist_ok=True)
SAFE = re.compile(r"^[A-Za-z0-9_-]{1,40}$")
LOCK = threading.Lock()
PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 8080


class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *a, **k):
        super().__init__(*a, directory=ROOT, **k)

    def _json(self, code, obj):
        body = json.dumps(obj).encode()
        self.send_response(code)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", "no-store")
        self.send_header("Access-Control-Allow-Origin", "*")
        self.end_headers()
        self.wfile.write(body)

    def _name(self):
        n = self.path[len("/api/data/"):].split("?")[0]
        return n if SAFE.match(n) else None

    def do_GET(self):
        if self.path.startswith("/api/data/"):
            name = self._name()
            if not name:
                return self._json(400, {"error": "bad name"})
            p = os.path.join(DATA, name + ".json")
            if not os.path.exists(p):
                return self._json(200, {})
            try:
                with open(p) as f:
                    return self._json(200, json.load(f))
            except Exception:
                return self._json(200, {})
        return super().do_GET()

    def do_PUT(self):
        if not self.path.startswith("/api/data/"):
            return self._json(404, {"error": "not found"})
        name = self._name()
        if not name:
            return self._json(400, {"error": "bad name"})
        n = int(self.headers.get("Content-Length", 0))
        if n > 8_000_000:
            return self._json(413, {"error": "too big"})
        raw = self.rfile.read(n)
        try:
            obj = json.loads(raw)
        except Exception:
            return self._json(400, {"error": "invalid json"})
        with LOCK:
            os.makedirs(HIST, exist_ok=True)  # recreate if it was removed
            p = os.path.join(DATA, name + ".json")
            tmp = p + ".tmp"
            with open(tmp, "w") as f:
                json.dump(obj, f)
            os.replace(tmp, p)  # atomic
            ts = time.strftime("%Y%m%d-%H%M%S")
            with open(os.path.join(HIST, f"{name}-{ts}.json"), "w") as f:
                json.dump(obj, f)
            keep = sorted(x for x in os.listdir(HIST) if x.startswith(name + "-"))
            for old in keep[:-20]:
                try:
                    os.remove(os.path.join(HIST, old))
                except OSError:
                    pass
        return self._json(200, {"ok": True, "saved": name})

    def do_POST(self):
        return self.do_PUT()

    def log_message(self, *a):
        pass  # quiet


class Server(socketserver.ThreadingTCPServer):
    allow_reuse_address = True
    daemon_threads = True


if __name__ == "__main__":
    print(f"Forge server on 0.0.0.0:{PORT} (root={ROOT})")
    Server(("0.0.0.0", PORT), Handler).serve_forever()
