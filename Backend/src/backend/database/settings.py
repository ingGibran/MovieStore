import ast
import csv
from collections.abc import Generator
from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict
from sqlalchemy import inspect, text
from sqlalchemy.engine import Engine
from sqlmodel import Session, SQLModel, create_engine, select


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
    _add_missing_movie_columns()
    seed_movies()


def _add_missing_movie_columns() -> None:
    """Apply the small schema updates needed by the bundled catalog."""
    columns = {column["name"] for column in inspect(engine).get_columns("movies")}
    if "poster_url" not in columns:
        with engine.begin() as connection:
            connection.execute(text("ALTER TABLE movies ADD COLUMN poster_url TEXT"))


def seed_movies() -> None:
    """Load the bundled IMDb catalog when the movies table is empty."""
    from .models import Movie

    with Session(engine) as session:
        csv_path = Path(__file__).resolve().parents[3] / "temporal_data" / "imdb_top_250_movies.csv"
        if not csv_path.is_file():
            raise FileNotFoundError(f"Movie catalog not found: {csv_path}")

        catalog = {}
        with csv_path.open(encoding="utf-8", newline="") as file:
            for row in csv.DictReader(file):
                genres = ast.literal_eval(row["genres"])
                catalog[row["id"]] = dict(
                    imdb_id=row["id"],
                    title=row["primaryTitle"],
                    original_title=row["originalTitle"] or None,
                    poster_url=row["primaryImage"] or None,
                    description=row["description"] or None,
                    release_year=int(row["startYear"]) if row["startYear"] else None,
                    genres=", ".join(genres),
                    runtime_minutes=int(row["runtimeMinutes"]) if row["runtimeMinutes"] else None,
                    average_rating=row["averageRating"] or None,
                    num_votes=int(row["numVotes"]) if row["numVotes"] else None,
                )

        existing = {
            movie.imdb_id: movie
            for movie in session.exec(select(Movie)).all()
        }
        movies = []
        for imdb_id, values in catalog.items():
            movie = existing.get(imdb_id)
            if movie is None:
                movies.append(Movie(**values))
            else:
                movie.poster_url = values["poster_url"]
        session.add_all(movies)
        session.commit()