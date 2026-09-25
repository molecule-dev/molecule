#!/usr/bin/env python3
"""MADLAD-400 translation server for @molecule/api-ai-translation-madlad.

A small HTTP server around CTranslate2 running Google's MADLAD-400 3B model
(int8). The Node bond talks to it; nothing else is required.

    GET  /health     -> {"status": "ok", "model": ..., "device": ..., "computeType": ...}
    GET  /languages  -> {"languages": ["af", "am", ...]}   (every <2xx> target token)
    POST /translate  {"texts": [...], "target": "de", "beamSize": 1, "maxLength": 256}
                     -> {"translations": [...]}

Configuration (environment variables):

    MADLAD_MODEL_DIR       where the model lives / is downloaded to
                           (default ~/.cache/molecule/madlad/<repo name>)
    MADLAD_MODEL_REPO      Hugging Face repo to download from
                           (default Nextcloud-AI/madlad400-3b-mt-ct2-int8)
    MADLAD_MODEL_REVISION  pinned commit of that repo  (default aa32bbdeba78...)
    MADLAD_HOST / MADLAD_PORT         listen address   (default 0.0.0.0:8765)
    MADLAD_DEVICE          cpu | cuda | auto           (default cpu)
    MADLAD_COMPUTE_TYPE    int8, int8_float16, ...     (default int8)
    MADLAD_INTER_THREADS   batches translated in parallel          (default 1)
    MADLAD_INTRA_THREADS   threads per batch, 0 = all cores        (default 0)
    MADLAD_MAX_BATCH       texts per model batch                   (default 32)
    MADLAD_API_KEY         if set, requests need "Authorization: Bearer <key>"

The model files are downloaded on first start (about 2.96 GB) and checked
against pinned SHA-256 hashes when the default repo and revision are used.

Licences: this script Apache-2.0 (Molecule Dev, Inc.); CTranslate2 MIT;
SentencePiece Apache-2.0; MADLAD-400 weights Apache-2.0 (Google).
"""

import hashlib
import hmac
import json
import os
import sys
import urllib.request
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

import ctranslate2
import sentencepiece

DEFAULT_REPO = "Nextcloud-AI/madlad400-3b-mt-ct2-int8"
DEFAULT_REVISION = "aa32bbdeba7880eff2096ec044cb155a340a9400"

# SHA-256 of each file at DEFAULT_REVISION (from the Hugging Face API / measured).
PINNED_FILES = {
    "config.json": "90fb54962455a4e0a0bc7235c0f063d7e46d9c1a1ae003af8059809abd6aeece",
    "shared_vocabulary.json": "c327551ce3ca6efc7b437e11a267f79979893332dda8a1d146e2c950815193f8",
    "spiece.model": "ef11ac9a22c7503492f56d48dce53be20e339b63605983e9f27d2cd0e0f3922c",
    "model.bin": "77b9fd9ab97c1259d07089b5f854393dad81bc5fb5647d3f9a5d101c94f40daa",
}

MAX_TEXTS_PER_REQUEST = 1000
MAX_BODY_BYTES = 10 * 1024 * 1024


def env(name, default):
    """Read a configuration variable."""
    value = os.environ.get(name, "")
    return value if value != "" else default


def sha256_of(path):
    """Hash a file without loading it into memory."""
    digest = hashlib.sha256()
    with open(path, "rb") as handle:
        for chunk in iter(lambda: handle.read(1 << 20), b""):
            digest.update(chunk)
    return digest.hexdigest()


def ensure_model(model_dir, repo, revision):
    """Download the model files that are missing, verifying pinned hashes."""
    os.makedirs(model_dir, exist_ok=True)
    pinned = repo == DEFAULT_REPO and revision == DEFAULT_REVISION
    for name, expected in PINNED_FILES.items():
        path = os.path.join(model_dir, name)
        if os.path.isfile(path) and os.path.getsize(path) > 0:
            continue
        url = f"https://huggingface.co/{repo}/resolve/{revision}/{name}"
        print(f"madlad: downloading {url}", file=sys.stderr, flush=True)
        partial = f"{path}.partial"
        with urllib.request.urlopen(url) as response, open(partial, "wb") as out:
            while True:
                chunk = response.read(1 << 20)
                if not chunk:
                    break
                out.write(chunk)
        if pinned:
            actual = sha256_of(partial)
            if actual != expected:
                os.remove(partial)
                raise RuntimeError(f"hash mismatch for {name}: expected {expected}, got {actual}")
        os.replace(partial, path)


class Model:
    """The translator, its tokenizer, and the language tokens it knows."""

    def __init__(self):
        self.repo = env("MADLAD_MODEL_REPO", DEFAULT_REPO)
        self.revision = env("MADLAD_MODEL_REVISION", DEFAULT_REVISION)
        self.model_dir = env(
            "MADLAD_MODEL_DIR",
            os.path.join(os.path.expanduser("~"), ".cache", "molecule", "madlad", self.repo.split("/")[-1]),
        )
        ensure_model(self.model_dir, self.repo, self.revision)
        self.device = env("MADLAD_DEVICE", "cpu")
        self.compute_type = env("MADLAD_COMPUTE_TYPE", "int8")
        self.max_batch = int(env("MADLAD_MAX_BATCH", "32"))
        self.translator = ctranslate2.Translator(
            self.model_dir,
            device=self.device,
            compute_type=self.compute_type,
            inter_threads=int(env("MADLAD_INTER_THREADS", "1")),
            intra_threads=int(env("MADLAD_INTRA_THREADS", "0")),
        )
        self.tokenizer = sentencepiece.SentencePieceProcessor(
            model_file=os.path.join(self.model_dir, "spiece.model")
        )
        with open(os.path.join(self.model_dir, "shared_vocabulary.json"), encoding="utf-8") as handle:
            vocabulary = json.load(handle)
        self.languages = sorted(
            token[2:-1] for token in vocabulary if token.startswith("<2") and token.endswith(">")
        )
        self.language_set = set(self.languages)

    def translate(self, texts, target, beam_size, max_length):
        """Translate texts into one target language, keeping blank texts as they are."""
        if target not in self.language_set:
            raise ValueError(f"unknown target language: {target}")
        out = list(texts)
        todo = [i for i, text in enumerate(texts) if text.strip() != ""]
        if not todo:
            return out
        batch = [
            self.tokenizer.encode(f"<2{target}> {texts[i].strip()}", out_type=str) + ["</s>"]
            for i in todo
        ]
        results = self.translator.translate_batch(
            batch,
            beam_size=beam_size,
            max_decoding_length=max_length,
            max_batch_size=self.max_batch,
        )
        for i, result in zip(todo, results):
            text = texts[i]
            leading = text[: len(text) - len(text.lstrip())]
            trailing = text[len(text.rstrip()) :]
            out[i] = leading + self.tokenizer.decode(result.hypotheses[0]) + trailing
        return out


class Handler(BaseHTTPRequestHandler):
    """HTTP routes."""

    model = None
    api_key = ""
    server_version = "madlad-sidecar/1.0"

    def log_message(self, fmt, *args):
        """Log requests to stderr in one line."""
        sys.stderr.write("madlad: %s %s\n" % (self.address_string(), fmt % args))

    def send_json(self, status, payload):
        """Write a JSON response."""
        body = json.dumps(payload, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def authorized(self):
        """Check the bearer token when MADLAD_API_KEY is set."""
        if not self.api_key:
            return True
        header = self.headers.get("Authorization", "")
        return hmac.compare_digest(header, f"Bearer {self.api_key}")

    def do_GET(self):
        """Health and language list."""
        if not self.authorized():
            return self.send_json(401, {"error": "unauthorized"})
        if self.path == "/health":
            return self.send_json(
                200,
                {
                    "status": "ok",
                    "model": f"{self.model.repo}@{self.model.revision}",
                    "device": self.model.device,
                    "computeType": self.model.compute_type,
                },
            )
        if self.path == "/languages":
            return self.send_json(200, {"languages": self.model.languages})
        return self.send_json(404, {"error": "not found"})

    def do_POST(self):
        """Translate."""
        if not self.authorized():
            return self.send_json(401, {"error": "unauthorized"})
        if self.path != "/translate":
            return self.send_json(404, {"error": "not found"})
        length = int(self.headers.get("Content-Length") or 0)
        if length <= 0 or length > MAX_BODY_BYTES:
            return self.send_json(413 if length > 0 else 400, {"error": "body required, at most 10 MB"})
        try:
            body = json.loads(self.rfile.read(length))
            texts = body["texts"]
            target = body["target"]
            if not isinstance(texts, list) or not all(isinstance(t, str) for t in texts):
                raise ValueError("texts must be a list of strings")
            if len(texts) > MAX_TEXTS_PER_REQUEST:
                raise ValueError(f"at most {MAX_TEXTS_PER_REQUEST} texts per request")
            beam_size = max(1, min(int(body.get("beamSize", 1)), 8))
            max_length = max(16, min(int(body.get("maxLength", 256)), 1024))
        except (KeyError, TypeError, ValueError, json.JSONDecodeError) as error:
            return self.send_json(400, {"error": str(error)})
        try:
            translations = self.model.translate(texts, target, beam_size, max_length)
        except ValueError as error:
            return self.send_json(400, {"error": str(error)})
        return self.send_json(200, {"translations": translations})


def main():
    """Load the model and serve."""
    Handler.model = Model()
    Handler.api_key = env("MADLAD_API_KEY", "")
    host = env("MADLAD_HOST", "0.0.0.0")
    port = int(env("MADLAD_PORT", "8765"))
    server = ThreadingHTTPServer((host, port), Handler)
    print(f"madlad: serving {Handler.model.repo} on http://{host}:{port}", file=sys.stderr, flush=True)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        server.server_close()


if __name__ == "__main__":
    main()
