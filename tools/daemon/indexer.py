#!/usr/bin/env python3
import sys
import struct
import json
import logging
import os
import lancedb
import pyarrow as pa
from typing import List, Dict, Any

# Configure logging
LOG_PATH = os.path.expanduser("~/.local_logs/indexer_host.log")
os.makedirs(os.path.dirname(LOG_PATH), exist_ok=True)
logging.basicConfig(filename=LOG_PATH, level=logging.INFO,
                    format='%(asctime)s - %(levelname)s - %(message)s')

DB_PATH = os.path.expanduser("~/.local/share/hypebrut-loom/vault")

def get_db():
    os.makedirs(DB_PATH, exist_ok=True)
    return lancedb.connect(DB_PATH)

def init_table(db):
    try:
        from lancedb.pydantic import LanceModel, Vector
        from lancedb.embeddings import get_registry
        
        # We use a default embedding model for LanceDB
        func = get_registry().get("sentence-transformers").create()
        
        schema = pa.schema([
            pa.field("id", pa.string()),
            pa.field("provider", pa.string()),
            pa.field("role", pa.string()),
            pa.field("text", pa.string()),
            pa.field("created_at", pa.string()),
            pa.field("vector", pa.list_(pa.float32(), func.ndims))
        ])
        
        # Enable full text search (FTS) index
        tbl = db.create_table("messages", schema=schema, exist_ok=True)
        try:
            tbl.create_fts_index("text", replace=True)
        except Exception as e:
            logging.warning(f"FTS index creation skipped/failed: {e}")
            
        return tbl
    except Exception as e:
        logging.error(f"Failed to init table: {e}")
        return None

def process_message(payload: Dict[str, Any]):
    try:
        if payload.get("schema_version") != 1:
            logging.error("Unsupported schema version")
            return
            
        db = get_db()
        tbl = init_table(db)
        if not tbl:
            return
            
        msgs = payload.get("messages", [])
        data = []
        for m in msgs:
            # Basic deduplication or upsert could be added here
            data.append({
                "id": m.get("id", ""),
                "provider": m.get("provider", "unknown"),
                "role": m.get("role", "user"),
                "text": m.get("text", ""),
                "created_at": m.get("createdAt", "")
            })
            
        if data:
            tbl.add(data)
            logging.info(f"Inserted {len(data)} messages into LanceDB")
            try:
                tbl.create_fts_index("text", replace=True)
            except Exception:
                pass
                
    except Exception as e:
        logging.error(f"Error processing message: {e}")

# Native Messaging I/O functions
def read_message():
    raw_length = sys.stdin.buffer.read(4)
    if len(raw_length) == 0:
        sys.exit(0)
    msg_length = struct.unpack('@I', raw_length)[0]
    message = sys.stdin.buffer.read(msg_length).decode('utf-8')
    return json.loads(message)

def send_message(msg):
    encoded = json.dumps(msg).encode('utf-8')
    sys.stdout.buffer.write(struct.pack('@I', len(encoded)))
    sys.stdout.buffer.write(encoded)
    sys.stdout.buffer.flush()

if __name__ == '__main__':
    logging.info("Starting Hypebrut Loom native messenger host")
    while True:
        try:
            msg = read_message()
            logging.info(f"Received native message payload keys: {list(msg.keys())}")
            process_message(msg)
            
            # Send ACK
            send_message({"ok": True, "acked": len(msg.get("messages", []))})
        except Exception as e:
            logging.error(f"Loop error: {e}")
            sys.exit(1)
