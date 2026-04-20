from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from client import MCPClient
from contextlib import asynccontextmanager

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

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("web:app", host="0.0.0.0", port=8000, reload=True)
