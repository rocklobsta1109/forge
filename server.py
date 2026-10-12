#!/usr/bin/env python3
"""Forge static server + tiny JSON backup API.

Serves only the app's static files (STATIC; anything else is 404), PLUS:
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
# Everything the app loads: sw.js ASSETS, plus sw.js itself. ROOT also holds
# data/, .git/, .claude/, logs and docs, none of which may be readable off the
# LAN, so a new asset must be added here as well as to ASSETS.
STATIC = {"/", "/index.html", "/styles.css", "/icons.js", "/core.js", "/ui.js",
          "/workout.js", "/screens.js", "/exercises.js", "/manifest.webmanifest",
          "/icon.svg", "/icon-maskable.svg", "/apple-touch-icon.png", "/sw.js"}


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

    def _static(self):
        # exact match on the raw path, so //, %-escapes and .. can't reach other files
        return self.path.split("?", 1)[0].split("#", 1)[0] in STATIC

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
        if not self._static():
            return self.send_error(http.HTTPStatus.NOT_FOUND, "File not found")
        return super().do_GET()

    def do_HEAD(self):
        if not self._static():
            return self.send_error(http.HTTPStatus.NOT_FOUND, "File not found")
        return super().do_HEAD()

    def do_PUT(self):
        if not self.path.startswith("/api/data/"):
            return self._json(404, {"error": "not found"})
        # Browsers can only send application/json cross-origin after a CORS
        # preflight, which this server never answers, so other pages can't write.
        if self.headers.get("Content-Type", "").split(";")[0].strip().lower() != "application/json":
            return self._json(415, {"error": "expected application/json"})
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

    def log_message(self, *a):
        pass  # quiet


class Server(socketserver.ThreadingTCPServer):
    allow_reuse_address = True
    daemon_threads = True


if __name__ == "__main__":
    print(f"Forge server on 0.0.0.0:{PORT} (root={ROOT})")
    Server(("0.0.0.0", PORT), Handler).serve_forever()
