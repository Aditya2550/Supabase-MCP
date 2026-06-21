import os
import httpx
from dotenv import load_dotenv

load_dotenv()
supabase_url = os.getenv("SUPABASE_URL")
supabase_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY") or os.getenv("SUPABASE_KEY")

headers = {
    "apikey": supabase_key,
    "Authorization": f"Bearer {supabase_key}"
}

# Add an extra slash to simulate trailing slash in supabase_url
bad_url = f"{supabase_url}//rest/v1/products"
print("Requesting:", bad_url)

with httpx.Client() as client:
    r = client.get(bad_url, headers=headers)
    print("Status Code:", r.status_code)
    print("Response text:", r.text)
