from contextlib import asynccontextmanager
from collections.abc import AsyncIterator
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
import uvicorn

from backend.database import create_db_and_tables
from backend.routers.movies import router as movies_router
from backend.routers.purchase import router as purchase_router
from backend.routers.rent import router as rent_router
from backend.routers.users import router as users_router


def _frontend_directory() -> Path:
    backend_directory = Path(__file__).resolve().parent
    candidates = (
        backend_directory.parent / "Frontend",
        backend_directory / "Frontend",
    )
    for candidate in candidates:
        if candidate.is_dir():
            return candidate
    raise RuntimeError("Frontend directory was not found.")


frontend_directory = _frontend_directory()


@asynccontextmanager
async def lifespan(_: FastAPI) -> AsyncIterator[None]:
    create_db_and_tables()
    yield


app = FastAPI(lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origin_regex=r"https?://(localhost|127\.0\.0\.1)(:\d+)?$",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.include_router(users_router)
app.include_router(movies_router)
app.include_router(rent_router)
app.include_router(purchase_router)
app.mount(
    "/static",
    StaticFiles(directory=frontend_directory / "static"),
    name="static",
)


@app.get("/", include_in_schema=False)
def serve_frontend() -> FileResponse:
    return FileResponse(frontend_directory / "templates" / "index.html")


if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
