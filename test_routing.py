from fastapi.testclient import TestClient
from web import app
import os

client = TestClient(app)

print("Testing direct table fetch via proxy...")
response = client.get("/api/db/rest/v1/products")
print("Status Code:", response.status_code)
print("Headers:", response.headers)
try:
    print("Response JSON length:", len(response.json()) if response.status_code == 200 else response.text)
except Exception as e:
    print("Response text:", response.text)

print("\nTesting OpenAPI spec fetch via proxy...")
response_spec = client.get("/api/db/")
print("Status Code:", response_spec.status_code)
try:
    print("Response JSON keys:", response_spec.json().keys() if response_spec.status_code == 200 else response_spec.text)
except Exception as e:
    print("Response text:", response_spec.text)
