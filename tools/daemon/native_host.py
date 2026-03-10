#!/usr/bin/env python3
import json, os, struct, sys, traceback
from pathlib import Path
VAULT = Path(os.environ.get("OPHEL_VAULT", str(Path.home()/".local/share/ophel-vault")))
VAULT.mkdir(parents=True, exist_ok=True)
def r():
  b=sys.stdin.buffer.read(4)
  if not b: return None
  n=struct.unpack("<I", b)[0]
  d=sys.stdin.buffer.read(n)
  return json.loads(d.decode("utf-8"))
def w(o):
  out=json.dumps(o, ensure_ascii=False).encode("utf-8")
  sys.stdout.buffer.write(struct.pack("<I", len(out))); sys.stdout.buffer.write(out); sys.stdout.buffer.flush()
def slug(s):
  s=(s or "chat").strip().lower()
  for ch in '/\:*?"<>|': s=s.replace(ch,"_")
  return (s[:120] or "chat")
def upsert(req):
  title=req.get("title") or "chat"; prov=req.get("provider") or "unknown"
  doc={"title":title,"provider":prov,"url":req.get("url") or "", "messages":req.get("messages") or []}
  p=VAULT/(prov+"__"+slug(title)+".json")
  p.write_text(json.dumps(doc, ensure_ascii=False, indent=2), encoding="utf-8")
  return {"ok":True,"path":str(p)}
OPS={"ping": lambda _:{ "ok":True,"vault":str(VAULT)}, "upsert": upsert}
def main():
  while True:
    req=r()
    if req is None: break
    try:
      fn=OPS.get(req.get("op") or "ping")
      w(fn(req) if fn else {"ok":False,"error":"unknown op"})
    except Exception as e:
      w({"ok":False,"error":str(e),"trace":traceback.format_exc()})
if __name__=="__main__": main()
