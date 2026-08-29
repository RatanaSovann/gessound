#!/usr/bin/env python3
"""Static file server that sends COOP/COEP headers.

MediaPipe Tasks Vision only uses its multi-threaded/SIMD WASM build when the
page is cross-origin isolated (window.crossOriginIsolated === true), which
requires these two response headers. Plain `python -m http.server` doesn't
send them, so hand-tracking silently falls back to a much slower
single-threaded build with no error or warning.
"""
import http.server
import sys

PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 8000


class CrossOriginIsolatedHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header("Cross-Origin-Opener-Policy", "same-origin")
        self.send_header("Cross-Origin-Embedder-Policy", "require-corp")
        super().end_headers()


if __name__ == "__main__":
    http.server.test(HandlerClass=CrossOriginIsolatedHandler, port=PORT)
