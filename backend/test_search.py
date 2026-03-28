import httpx
import asyncio
import json

async def test_search():
    async with httpx.AsyncClient() as client:
        try:
            # First login to get a token
            login_data = {"username": "senior", "password": "password123"}
            login_res = await client.post("http://localhost:8000/token", data=login_data, timeout=5.0)
            if login_res.status_code != 200:
                print(f"Login failed: {login_res.text}")
                return
            
            token = login_res.json()["access_token"]
            headers = {"Authorization": f"Bearer {token}"}
            
            res = await client.post("http://localhost:8000/search", json={"query": "pump"}, headers=headers, timeout=5.0)
            print(f"Status Code: {res.status_code}")
            print(f"Response: {res.json()}")
        except Exception as e:
            print(f"Error: {e}")

if __name__ == "__main__":
    asyncio.run(test_search())
