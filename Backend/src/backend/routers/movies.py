from typing import Annotated, Literal

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, ConfigDict
from sqlmodel import Session, or_, select

from backend.database import Movie, get_session


router = APIRouter(prefix="/movies", tags=["movies"])
SessionDependency = Annotated[Session, Depends(get_session)]
SortBy = Literal["title", "release_year", "average_rating", "num_votes"]


class MovieRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    imdb_id: str
    title: str
    original_title: str | None
    poster_url: str | None
    description: str | None
    release_year: int | None
    genres: str | None
    runtime_minutes: int | None
    average_rating: float | None
    num_votes: int | None


@router.get("", response_model=list[MovieRead])
def list_movies(
    session: SessionDependency,
    q: str | None = Query(
        default=None,
        min_length=1,
        description="Search title, original title, description, or IMDb ID.",
    ),
    genre: str | None = Query(default=None, min_length=1),
    release_year: int | None = Query(default=None, ge=1888),
    min_rating: float | None = Query(default=None, ge=0, le=10),
    skip: int = Query(default=0, ge=0),
    limit: int = Query(default=20, ge=1, le=100),
    sort_by: SortBy = Query(default="title"),
    descending: bool = False,
) -> list[Movie]:
    statement = select(Movie)

    if q is not None:
        search = f"%{q.strip()}%"
        statement = statement.where(
            or_(
                Movie.title.ilike(search),
                Movie.original_title.ilike(search),
                Movie.description.ilike(search),
                Movie.imdb_id.ilike(search),
            )
        )

    if genre is not None:
        statement = statement.where(Movie.genres.ilike(f"%{genre.strip()}%"))
    if release_year is not None:
        statement = statement.where(Movie.release_year == release_year)
    if min_rating is not None:
        statement = statement.where(Movie.average_rating >= min_rating)

    sort_column = {
        "title": Movie.title,
        "release_year": Movie.release_year,
        "average_rating": Movie.average_rating,
        "num_votes": Movie.num_votes,
    }[sort_by]
    statement = statement.order_by(
        sort_column.desc() if descending else sort_column.asc()
    )
    statement = statement.offset(skip).limit(limit)
    return list(session.exec(statement).all())


@router.get("/{movie_id}", response_model=MovieRead)
def get_movie(movie_id: int, session: SessionDependency) -> Movie:
    movie = session.get(Movie, movie_id)
    if movie is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Movie not found.",
        )
    return movie