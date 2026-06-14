import os
import httpx


_backend_url: str | None = None
_client: httpx.AsyncClient | None = None


def get_backend_url() -> str:
    global _backend_url
    if _backend_url is None:
        _backend_url = os.getenv("BACKEND_URL", "http://backend:8000/api/v1")
    return _backend_url


def get_client() -> httpx.AsyncClient:
    global _client
    if _client is None:
        _client = httpx.AsyncClient(base_url=get_backend_url())
    return _client


async def close_client():
    global _client
    if _client:
        await _client.aclose()
        _client = None
