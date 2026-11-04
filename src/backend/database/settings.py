from collections.abc import Generator

from pydantic_settings import BaseSettings, SettingsConfigDict
from sqlalchemy.engine import Engine
from sqlmodel import Session, SQLModel, create_engine


class Settings(BaseSettings):
    database_url: str = (
        "postgresql+psycopg://postgres:postgres@localhost:5432/moviestore"
    )
    database_echo: bool = False

    model_config = SettingsConfigDict(
        env_file=".env",
        env_prefix="",
        extra="ignore",
    )


settings = Settings()


def create_database_engine(config: Settings = settings) -> Engine:
    """Create the SQLModel engine from the application database settings."""
    return create_engine(
        config.database_url,
        echo=config.database_echo,
        pool_pre_ping=True,
    )


engine = create_database_engine()


def get_session() -> Generator[Session, None, None]:
    """Yield a database session for dependency injection."""
    with Session(engine) as session:
        yield session


def create_db_and_tables() -> None:
    """Create tables for all SQLModel metadata registered by the application."""
    from . import models  # noqa: F401

    SQLModel.metadata.create_all(engine)