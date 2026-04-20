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
supabase_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY") or os.getenv("SUPABASE_KEY")
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

@mcp.tool(description="Fetches a product by name from the inventory")
async def search_record_by_name(name:str):
    response = (
    supabase.table("products")
    .select("*")
    .ilike("name", f"%{name}%")
    .execute()
)
    return response.data

@mcp.tool(description="Inserts a specific product into the inventory table")
async def insert(name:str, category:str, price:float, stock:int, sku:str):
    response=(supabase.table("products").insert({"name":name,"category":category,"price":price,"stock":stock,"sku":sku}).execute())
    return response.data

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

        res = supabase.table("products").upsert(data, on_conflict="sku").execute()
        return {"inserted_or_updated": len(res.data or []), "data": res.data}
    except Exception as e:
        return {"error": str(e)}

@mcp.tool(description="Deletes a specific product from the database using its exact SKU")
async def delete_product_by_sku(sku: str):
    try:
        response = supabase.table("products").delete().eq("sku", sku).execute()
        return {"deleted": len(response.data or []), "data": response.data}
    except Exception as e:
        return {"error": str(e)}

@mcp.tool(description="Deletes a specific product from the database using its exact name")
async def delete_product_by_name(name: str):
    try:
        response = supabase.table("products").delete().eq("name", name).execute()
        return {"deleted": len(response.data or []), "data": response.data}
    except Exception as e:
        return {"error": str(e)}

@mcp.tool(description="Reads the contents of a local CSV file and returns the data as JSON.")
async def read_csv(csv_path: str):
    try:
        with open(csv_path, newline="", encoding="utf-8") as f:
            reader = csv.DictReader(f)
            return {"data": list(reader)}
    except Exception as e:
        return {"error": str(e)}

@mcp.tool(description="Clears all products from the database. Use this to reset or delete all records.")
async def clear_products_table():
    try:
        response = supabase.table("products").delete().neq("sku", "impossible_sku_123").execute()
        return {"deleted": len(response.data or []), "message": "All records have been cleared."}
    except Exception as e:
        return {"error": str(e)}

@mcp.tool(description="Fetches products with a price greater than the specified amount")
async def fetch_products_by_min_price(min_price: float):
    try:
        response = supabase.table("products").select("*").gt("price", min_price).execute()
        return {"data": response.data}
    except Exception as e:
        return {"error": str(e)}

if __name__ == "__main__":
    import sys
    print("Starting server...", file=sys.stderr)
    mcp.run(transport='stdio')