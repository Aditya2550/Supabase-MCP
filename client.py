import asyncio
import os
import sys
from contextlib import AsyncExitStack
from pathlib import Path
from dotenv import load_dotenv

from mcp import ClientSession, StdioServerParameters
from mcp.client.stdio import stdio_client

from openai import AsyncOpenAI

load_dotenv()

GEMINI_MODEL = "llama-3.3-70b-versatile"   # Using Groq's insanely fast and completely reliable free endpoint

class MCPClient:
    def __init__(self):
        self.session: ClientSession | None = None
        self.exit_stack = AsyncExitStack()
        self.openai = AsyncOpenAI(
            api_key=os.environ.get("GROQ_API_KEY"),
            base_url="https://api.groq.com/openai/v1"
        )

    async def connect_to_server(self, server_script_path: str):
        is_python = server_script_path.endswith(".py")
        is_js = server_script_path.endswith(".js")
        if not (is_python or is_js):
            raise ValueError("Server script must be .py or .js")

        if is_python:
            path = Path(server_script_path).resolve()
            server_params = StdioServerParameters(
                command="uv",
                args=["--directory", str(path.parent), "run", path.name],
                env=None,
            )
        else:
            server_params = StdioServerParameters(command="node", args=[server_script_path], env=None)

        stdio_transport = await self.exit_stack.enter_async_context(stdio_client(server_params))
        self.stdio, self.write = stdio_transport
        self.session = await self.exit_stack.enter_async_context(ClientSession(self.stdio, self.write))

        await self.session.initialize()

        tools = (await self.session.list_tools()).tools
        print("\nConnected with tools:", [t.name for t in tools])

    # async def process_query(self, query: str) -> str:
    #     messages = [{"role": "user", "content": query}]

    #     tools = (await self.session.list_tools()).tools

    #     openai_tools = [
    #         {
    #             "type": "function",
    #             "function": {
    #                 "name": t.name,
    #                 "description": t.description,
    #                 "parameters": t.inputSchema,
    #             },
    #         }
    #         for t in tools
    #     ]

    #     response = await self.openai.chat.completions.create(
    #         model=OPENAI_MODEL,
    #         messages=messages,
    #         tools=openai_tools,
    #     )

    #     message = response.choices[0].message

    #     if message.tool_calls:
    #         for call in message.tool_calls:
    #             name = call.function.name
    #             args = eval(call.function.arguments)

    #             result = await self.session.call_tool(name, args)

    #             messages.append(message)
    #             messages.append({"role": "tool","tool_call_id": call.id,"content": result.content})

    #             response = await self.openai.chat.completions.create(
    #                 model=OPENAI_MODEL,
    #                 messages=messages,
    #             )

    #     return response.choices[0].message.content
    async def process_query(self, query: str) -> str:
        messages = [{"role": "user", "content": query}]

    # Load available MCP tools
        mcp_tools = (await self.session.list_tools()).tools

        openai_tools = [
            {
                "type": "function",
                "function": {
                    "name": tool.name,
                    "description": tool.description,
                    "parameters": tool.inputSchema,
                },
            }
            for tool in mcp_tools
        ]

        while True:
            # Ask model what to do next
            print("  -> Calling AI Model...")
            response = await self.openai.chat.completions.create(
                model=GEMINI_MODEL,
                messages=messages,
                tools=openai_tools,
            )

            message = response.choices[0].message

            # Case 1: normal text answer → done
            if not message.tool_calls:
                return message.content

            # Case 2: model wants to use tools
            messages.append(message)

            for call in message.tool_calls:
                tool_name = call.function.name

                print(f"  -> AI decided to use tool: {tool_name}")

                # safer than eval
                import json
                tool_args = json.loads(call.function.arguments)

                # Execute tool via MCP
                tool_result = await self.session.call_tool(tool_name, tool_args)

                # Extract text from MCP result safely stringify it
                result_text = ""
                for msg in tool_result.content:
                    if msg.type == "text":
                        result_text += msg.text + "\n"
                
                if tool_result.isError:
                    result_text = "Error: " + result_text
                    print(f"  -> Tool error: {result_text}")
                else:
                    print(f"  -> Tool success")

                if not result_text.strip():
                    result_text = "Tool executed successfully but returned empty result."

                # Feed tool result back to model
                messages.append({
                    "role": "tool",
                    "tool_call_id": call.id,
                    "content": result_text.strip()
                })


    async def chat_loop(self):
        print("\nMCP Client (Groq) Ready")

        while True:
            q = input("\nQuery: ").strip()
            if q.lower() == "quit":
                break

            try:
                reply = await self.process_query(q)
                print("\n" + reply)
            except Exception as e:
                print("Error:", e)

    async def cleanup(self):
        await self.exit_stack.aclose()


async def main():
    if len(sys.argv) < 2:
        print("Usage: python client.py <server.py>")
        return

    client = MCPClient()
    try:
        await client.connect_to_server(sys.argv[1])
        await client.chat_loop()
    finally:
        await client.cleanup()


if __name__ == "__main__":
    asyncio.run(main())