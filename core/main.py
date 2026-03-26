import os
import logging
from contextlib import asynccontextmanager
from concurrent.futures import ProcessPoolExecutor

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from database import init_db

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger("h2osim")


@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_db()
    workers = int(os.environ.get("CORE_WORKERS", 2))
    app.state.executor = ProcessPoolExecutor(max_workers=workers)
    logger.info("Core started — %d worker processes, DB at %s",
                workers, os.environ.get("DB_PATH", "default"))
    yield
    app.state.executor.shutdown(wait=False)
    logger.info("Core shutting down")


app = FastAPI(title="H2O-Sim Core", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

from routers.filters import router as filters_router
app.include_router(filters_router, prefix="/filters")


@app.get("/health")
async def health():
    return {"status": "ok"}
