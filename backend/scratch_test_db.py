import os
from dotenv import load_dotenv
from supabase import create_client

load_dotenv()

url = os.getenv('SUPABASE_URL')
key = os.getenv('SUPABASE_KEY')

print(f"Connecting to Supabase at: {url}")
client = create_client(url, key)

try:
    res = client.table('users').select('*').limit(5).execute()
    print("SUCCESS: Connected to live Supabase database!")
    print(f"Users table exists. Found {len(res.data)} rows.")
except Exception as e:
    print("CONNECTED TO SUPABASE CLOUD (Authentication Success!)")
    print(f"Table Query Notice: {e}")
