from fastapi import FastAPI, HTTPException, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from client import MCPClient
from contextlib import asynccontextmanager
import os
from dotenv import load_dotenv

load_dotenv()
supabase_url = os.getenv("SUPABASE_URL")
supabase_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY") or os.getenv("SUPABASE_KEY")


# Initialize MCP Client instance
mcp_client = MCPClient()

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Connect to the server.py MCP server
    print("Starting up web server, connecting to MCP server...")
    try:
        await mcp_client.connect_to_server("server.py")
        print("Successfully connected to MCP Server!")
    except Exception as e:
        print(f"Failed to connect to MCP server: {e}")
    yield
    # Shutdown: Clean up MCP Client exit stack
    print("Shutting down...")
    await mcp_client.cleanup()

app = FastAPI(lifespan=lifespan)

# Allow CORS for frontend interaction
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allows all origins for local dev
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class ChatRequest(BaseModel):
    query: str

class ChatResponse(BaseModel):
    response: str

@app.post("/api/chat", response_model=ChatResponse)
async def chat(req: ChatRequest):
    try:
        reply = await mcp_client.process_query(req.query)
        return {"response": reply}
    except Exception as e:
        print(f"Error during chat: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.api_route("/api/db/{path:path}", methods=["GET", "POST", "PATCH", "DELETE", "OPTIONS"])
async def proxy_supabase(path: str, request: Request):
    if not supabase_url or not supabase_key:
        raise HTTPException(status_code=500, detail="Supabase connection environment variables are missing.")

    # Handle CORS preflight explicitly in the proxy
    if request.method == "OPTIONS":
        return Response(
            status_code=200,
            headers={
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Methods": "GET, POST, PATCH, DELETE, OPTIONS",
                "Access-Control-Allow-Headers": "apikey, Authorization, Prefer, Range, Content-Type",
                "Access-Control-Max-Age": "86400"
            }
        )

    method = request.method
    body = await request.body()
    query_params = dict(request.query_params)
    
    # Map empty path to OpenAPI Spec, otherwise table route
    target_url = f"{supabase_url}/rest/v1/{path}" if path else f"{supabase_url}/rest/v1/"
    
    # Headers to pass to Supabase (bypassing browser Origin/Referer to bypass browser block)
    headers = {
        "apikey": supabase_key,
        "Authorization": f"Bearer {supabase_key}",
        "Prefer": request.headers.get("Prefer", ""),
        "Range": request.headers.get("Range", "")
    }
    # Clean out empty headers
    headers = {k: v for k, v in headers.items() if v}
    
    async with httpx.AsyncClient() as client:
        try:
            resp = await client.request(
                method,
                target_url,
                content=body,
                params=query_params,
                headers=headers,
                timeout=15.0
            )
            
            # Extract headers to forward back to browser
            response_headers = {
                "Content-Range": resp.headers.get("Content-Range", ""),
                "Content-Type": resp.headers.get("Content-Type", "application/json"),
                "Access-Control-Expose-Headers": "Content-Range",
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Methods": "GET, POST, PATCH, DELETE, OPTIONS",
                "Access-Control-Allow-Headers": "apikey, Authorization, Prefer, Range, Content-Type"
            }
            # Remove empty response headers
            response_headers = {k: v for k, v in response_headers.items() if v}
            
            return Response(
                content=resp.content,
                status_code=resp.status_code,
                headers=response_headers
            )
        except Exception as e:
            print(f"Proxy request error: {e}")
            raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("web:app", host="0.0.0.0", port=8000, reload=True)
