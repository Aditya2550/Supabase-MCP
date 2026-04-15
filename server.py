from pydantic import BaseModel
from typing import List, Dict
from typing import Any
import httpx
from mcp.server.fastmcp import FastMCP
import os
from supabase import create_client, Client
import csv
from dotenv import load_dotenv

load_dotenv() 
supabase_url = os.getenv("SUPABASE_URL")
supabase_key = os.getenv("SUPABASE_KEY")
if not supabase_url or not supabase_key:
    raise RuntimeError("SUPABASE_URL / SUPABASE_KEY missing")


supabase: Client = create_client(supabase_url, supabase_key)


mcp = FastMCP("supabase_crud")

def coerce(v):
    if v is None:
        return None
    v = str(v).strip()
    if v == "" or v.lower() in {"null", "none", "na"}:
        return None
    if v.isdigit() or (v.startswith("-") and v[1:].isdigit()):
        return int(v)
    try:
        if "." in v or "e" in v.lower():
            return float(v)
    except Exception:
        pass
    return v

@mcp.tool(description="Fetches a record by name")
async def search_record_by_name(name:str):
    response = (
    supabase.table("registrations")
    .select("*")
    .ilike("name", f"%{name}%")
    .execute()
)
    return response.data

@mcp.tool(description="Inserts a specific record in the table")
async def insert(name:str,mail:str,year:str,branch:str,division:str,agentic:int,python:int):
    response=(supabase.table("registrations").insert({"name":name,"mail":mail,"year":year,"branch":branch,"division":division,"agentic":agentic,"python":python}))
    return response

@mcp.tool(description="Bulk uploads the data in the csv_path file to the table")
async def bulk_upload(csv_path: str):
    try:
        with open(csv_path, newline="", encoding="utf-8") as f:
            reader = csv.DictReader(f)
            if not reader.fieldnames:
                raise ValueError("CSV must have a header row.")
            data = [{k: coerce(v) for k, v in row.items()} for row in reader]

        if not data:
            return {"inserted": 0, "message": "CSV had no rows"}

        res = supabase.table("registrations").insert(data).execute()
        return {"inserted": len(res.data or []), "data": res.data}
    except Exception as e:
        return {"error": str(e)}

if __name__ == "__main__":
    
    print("URL present?", bool(os.getenv("SUPABASE_URL")))
    print("KEY present?", bool(os.getenv("SUPABASE_KEY")))
    print("HELLO WORLD")
    print("SERVER STARTED")
    mcp.run(transport='stdio')