#!/usr/bin/env python3
import asyncio
import os
import lancedb
from mcp.server import FastMCP

# Define FastMCP server for Hypebrut Loom
mcp = FastMCP("hypebrut-loom-vault")
DB_PATH = os.path.expanduser("~/.local/share/hypebrut-loom/vault")

def get_db():
    if not os.path.exists(DB_PATH):
        return None
    try:
        db = lancedb.connect(DB_PATH)
        return db.open_table("messages")
    except Exception:
        return None

@mcp.tool()
async def search_vault_keyword(query: str, limit: int = 10) -> str:
    """
    Search the Hypebrut Loom AI Chat vault using keyword (full-text) search.
    Useful for finding specific terms, errors, or exact names from past AI conversations.
    """
    tbl = get_db()
    if not tbl:
        return "Vault is empty or uninitialized."
        
    try:
        # FTS query over 'text' column if configured
        results = tbl.search(query).limit(limit).to_pandas()
        if results.empty:
            return "No matching chats found."
            
        formatted = []
        for idx, row in results.iterrows():
            preview = row.get("text", "")[:500]
            role = row.get("role", "unknown")
            provider = row.get("provider", "unknown")
            formatted.append(f"[{provider.upper()} | {role.upper()}] {row.get('created_at', '')}:\n{preview}...")
            
        return "\n\n---\n\n".join(formatted)
    except Exception as e:
        return f"Search error: {str(e)}"

@mcp.tool()
async def search_vault_semantic(query: str, limit: int = 10) -> str:
    """
    Search the Hypebrut Loom AI Chat vault using semantic vector similarity.
    Useful for asking conceptual questions like "when did we discuss database schemas?"
    Requires the indexer to have embedded the messages (which occurs automatically).
    """
    tbl = get_db()
    if not tbl:
        return "Vault is empty or uninitialized."

    try:
        # Default string query forces vector search using LanceDB's embedding registry
        results = tbl.search(query).limit(limit).to_pandas()
        if results.empty:
            return "No matching chats found."
            
        formatted = []
        for idx, row in results.iterrows():
            preview = row.get("text", "")[:500]
            role = row.get("role", "unknown")
            provider = row.get("provider", "unknown")
            score = row.get("_distance", 0)
            formatted.append(f"[{provider.upper()} | {role.upper()}] (score: {score:.3f}):\n{preview}...")
            
        return "\n\n---\n\n".join(formatted)
    except Exception as e:
        return f"Semantic search error: {str(e)}"

if __name__ == "__main__":
    print("Starting Hypebrut Loom Vault MCP...")
    mcp.run(transport="stdio")
