#!/usr/bin/env python3
"""Skein Vault MCP Server (FastMCP)

The extension ingests via Native Messaging into LanceDB.
This MCP server is the *insight plane*: tools for keyword/semantic/hybrid retrieval over your vault.

Transport: stdio by default (Claude Desktop compatible).
"""

from __future__ import annotations

import os
from pathlib import Path
from typing import Any, Dict, List

import numpy as np
import lancedb
from fastembed import TextEmbedding
from mcp.server.fastmcp import FastMCP


APP = "skein"
DEFAULT_MODEL = os.environ.get("SKEIN_EMBED_MODEL") or "BAAI/bge-small-en-v1.5"

HOME = Path.home()
VAULT_DIR = Path(os.environ.get("SKEIN_VAULT_DIR") or (HOME / ".local/share" / APP / "vault"))
DB_DIR = Path(os.environ.get("SKEIN_LANCE_DIR") or (VAULT_DIR / "lance"))

mcp = FastMCP("skein-vault")


class Vault:
    def __init__(self) -> None:
        self.db = lancedb.connect(str(DB_DIR))
        self.tbl = self.db.open_table("messages")
        self.embedder = TextEmbedding(model_name=DEFAULT_MODEL)

    def _embed(self, q: str) -> np.ndarray:
        v = next(self.embedder.embed([q]))
        return np.array([float(x) for x in v], dtype="float32")

    def kw(self, q: str, limit: int) -> List[Dict[str, Any]]:
        return self.tbl.search(q, query_type="fts").limit(limit).to_list()

    def vec(self, q: str, limit: int) -> List[Dict[str, Any]]:
        return self.tbl.search(self._embed(q)).limit(limit).to_list()

    def hybrid(self, q: str, limit: int) -> List[Dict[str, Any]]:
        a = self.kw(q, limit)
        b = self.vec(q, limit)
        seen = set()
        merged: List[Dict[str, Any]] = []
        for x in a + b:
            xid = x.get("id")
            if xid in seen:
                continue
            seen.add(xid)
            merged.append(x)
        return merged[:limit]


_vault: Vault | None = None


def vault() -> Vault:
    global _vault
    if _vault is None:
        _vault = Vault()
    return _vault


@mcp.tool()
def vault_search_keyword(q: str, limit: int = 8) -> Dict[str, Any]:
    return {"results": vault().kw(q, limit)}


@mcp.tool()
def vault_search_semantic(q: str, limit: int = 8) -> Dict[str, Any]:
    return {"results": vault().vec(q, limit)}


@mcp.tool()
def vault_search_hybrid(q: str, limit: int = 8) -> Dict[str, Any]:
    return {"results": vault().hybrid(q, limit)}


if __name__ == "__main__":
    mcp.run()
