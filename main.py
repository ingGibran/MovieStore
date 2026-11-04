from fastapi import FastAPI

from backend.routers.users import router as users_router

app = FastAPI()
app.include_router(users_router)
