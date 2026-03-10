#!/usr/bin/env python3
"""Skein Vault Native Messaging Host (Indexer)

Protocol: Firefox Native Messaging (4-byte little-endian length prefix + JSON payload)

Key decisions:
- Avoid Torch: embeddings via FastEmbed (ONNX runtime) to prevent 1GB+ CUDA wheels and fragile installs.
- Store vectors in LanceDB. Provide keyword search via LanceDB FTS (Tantivy under the hood).
"""

from __future__ import annotations

import json
import os
import struct
import sys
import time
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Dict, List, Optional

import numpy as np
import lancedb
from fastembed import TextEmbedding


APP = "skein"
DEFAULT_MODEL = os.environ.get("SKEIN_EMBED_MODEL") or "BAAI/bge-small-en-v1.5"

HOME = Path.home()
VAULT_DIR = Path(os.environ.get("SKEIN_VAULT_DIR") or (HOME / ".local/share" / APP / "vault"))
DB_DIR = Path(os.environ.get("SKEIN_LANCE_DIR") or (VAULT_DIR / "lance"))

LOG_DIR = Path(os.environ.get("SKEIN_LOG_DIR") or (HOME / ".local/state" / APP))
LOG_FILE = LOG_DIR / "indexer_host.log"


def _utc() -> str:
    return time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())


def log(msg: str) -> None:
    LOG_DIR.mkdir(parents=True, exist_ok=True)
    with LOG_FILE.open("a", encoding="utf-8") as f:
        f.write(_utc() + " " + msg + "\n")


def read_msg() -> Optional[Dict[str, Any]]:
    raw_len = sys.stdin.buffer.read(4)
    if not raw_len:
        return None
    (length,) = struct.unpack("<I", raw_len)
    raw = sys.stdin.buffer.read(length)
    if not raw:
        return None
    try:
        return json.loads(raw.decode("utf-8", errors="replace"))
    except Exception as e:
        log("bad_json " + str(e))
        return None


def write_msg(obj: Dict[str, Any]) -> None:
    data = json.dumps(obj, ensure_ascii=False).encode("utf-8")
    sys.stdout.buffer.write(struct.pack("<I", len(data)))
    sys.stdout.buffer.write(data)
    sys.stdout.buffer.flush()


@dataclass
class MsgRow:
    id: str
    provider: str
    role: str
    created_at: str
    convo: str
    text: str

    def to_dict(self) -> Dict[str, Any]:
        return {
            "id": self.id,
            "provider": self.provider,
            "role": self.role,
            "created_at": self.created_at,
            "convo": self.convo,
            "text": self.text,
        }


class Vault:
    def __init__(self, model_name: str = DEFAULT_MODEL) -> None:
        VAULT_DIR.mkdir(parents=True, exist_ok=True)
        DB_DIR.mkdir(parents=True, exist_ok=True)

        self.embedder = TextEmbedding(model_name=model_name)
        self.dim = len(next(self.embedder.embed(["probe"])))

        self.db = lancedb.connect(str(DB_DIR))
        if "messages" in self.db.table_names():
            self.tbl = self.db.open_table("messages")
        else:
            schema = [
                {"name": "id", "type": "string"},
                {"name": "provider", "type": "string"},
                {"name": "role", "type": "string"},
                {"name": "created_at", "type": "string"},
                {"name": "convo", "type": "string"},
                {"name": "text", "type": "string"},
                {"name": "vector", "type": "float32", "shape": [self.dim]},
            ]
            self.tbl = self.db.create_table("messages", schema=schema)

        # FTS: safe to (re)create; Tantivy index is inside the table directory.
        try:
            self.tbl.create_fts_index("text", replace=True)
        except Exception as e:
            log("fts_index_error " + str(e))

    def _embed(self, texts: List[str]) -> List[List[float]]:
        vecs: List[List[float]] = []
        for v in self.embedder.embed(texts):
            vecs.append([float(x) for x in v])
        return vecs

    def upsert(self, rows: List[MsgRow]) -> int:
        if not rows:
            return 0
        vecs = self._embed([r.text for r in rows])
        payload: List[Dict[str, Any]] = []
        ids: List[str] = []
        for r, v in zip(rows, vecs):
            d = r.to_dict()
            d["vector"] = v
            payload.append(d)
            ids.append(r.id)

        # LanceDB doesn't have an atomic upsert; we delete then add.
        try:
            safe_ids = ["'" + i.replace("'", "") + "'" for i in ids]
            self.tbl.delete("id in (" + ",".join(safe_ids) + ")")
        except Exception:
            pass

        self.tbl.add(payload)
        return len(payload)

    def search_keyword(self, q: str, limit: int) -> List[Dict[str, Any]]:
        try:
            return self.tbl.search(q, query_type="fts").limit(limit).to_list()
        except Exception as e:
            log("kw_search_error " + str(e))
            return []

    def search_semantic(self, q: str, limit: int) -> List[Dict[str, Any]]:
        try:
            v = self._embed([q])[0]
            return self.tbl.search(np.array(v, dtype="float32")).limit(limit).to_list()
        except Exception as e:
            log("vec_search_error " + str(e))
            return []


def normalize_messages(msgs: Any) -> List[MsgRow]:
    out: List[MsgRow] = []
    if not isinstance(msgs, list):
        return out

    for m in msgs:
        if not isinstance(m, dict):
            continue
        text = str(m.get("text") or "")
        if not text.strip():
            continue
        provider = str(m.get("provider") or "unknown")
        role = str(m.get("role") or "assistant")
        created_at = str(m.get("createdAt") or m.get("created_at") or "")
        convo = "unknown"
        meta = m.get("meta")
        if isinstance(meta, dict) and meta.get("conversation"):
            convo = str(meta.get("conversation"))
        mid = str(m.get("id") or "")
        if not mid:
            mid = provider + ":" + role + ":" + str(abs(hash(text)))[0:12]
        out.append(MsgRow(id=mid, provider=provider, role=role, created_at=created_at, convo=convo, text=text))
    return out


def main() -> int:
    log("indexer_start")
    vault = Vault()

    while True:
        msg = read_msg()
        if msg is None:
            time.sleep(0.05)
            continue

        mtype = msg.get("type")
        if mtype == "ping":
            write_msg({"ok": True, "type": "pong"})
            continue

        if mtype == "ingest":
            rows = normalize_messages(msg.get("messages"))
            n = vault.upsert(rows)
            write_msg({"ok": True, "type": "ingest_ack", "count": n})
            continue

        if mtype == "search":
            q = str(msg.get("q") or "")
            mode = str(msg.get("mode") or "hybrid")
            limit = int(msg.get("limit") or 8)
            if mode == "keyword":
                res = vault.search_keyword(q, limit)
            elif mode == "semantic":
                res = vault.search_semantic(q, limit)
            else:
                a = vault.search_keyword(q, limit)
                b = vault.search_semantic(q, limit)
                seen = set()
                merged: List[Dict[str, Any]] = []
                for x in a + b:
                    xid = x.get("id")
                    if xid in seen:
                        continue
                    seen.add(xid)
                    merged.append(x)
                res = merged[:limit]
            write_msg({"ok": True, "type": "search_result", "results": res})
            continue

        write_msg({"ok": False, "type": "error", "error": "unknown message type"})
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except KeyboardInterrupt:
        raise
    except Exception as e:
        log("fatal " + str(e))
        raise
