from datetime import datetime, timezone
from decimal import Decimal
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, ConfigDict, Field
from sqlmodel import Session, select

from backend.database import Movie, Rent, User, get_session
from backend.routers.users import CurrentUserDependency


router = APIRouter(prefix="/rents", tags=["rents"])
SessionDependency = Annotated[Session, Depends(get_session)]


class RentCreate(BaseModel):
    movie_id: int = Field(gt=0)
    due_at: datetime
    price: Decimal = Field(ge=0, max_digits=10, decimal_places=2)


class RentRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    movie_id: int
    movie_title: str
    poster_url: str | None
    rented_at: datetime
    due_at: datetime
    returned_at: datetime | None
    price: Decimal


def _rent_read(rent: Rent, movie: Movie) -> RentRead:
    return RentRead(
        id=rent.id,
        movie_id=movie.id,
        movie_title=movie.title,
        poster_url=movie.poster_url,
        rented_at=rent.rented_at,
        due_at=rent.due_at,
        returned_at=rent.returned_at,
        price=rent.price,
    )


def _get_user_rent(
    rent_id: int,
    current_user: User,
    session: Session,
) -> tuple[Rent, Movie]:
    result = session.exec(
        select(Rent, Movie)
        .join(Movie, Rent.movie_id == Movie.id)
        .where(Rent.id == rent_id, Rent.user_id == current_user.id)
    ).first()
    if result is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Rental not found.",
        )
    return result


@router.post(
    "",
    response_model=RentRead,
    status_code=status.HTTP_201_CREATED,
)
def rent_movie(
    payload: RentCreate,
    current_user: CurrentUserDependency,
    session: SessionDependency,
) -> RentRead:
    if payload.due_at.tzinfo is None:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="due_at must include a timezone.",
        )
    if payload.due_at <= datetime.now(timezone.utc):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="due_at must be in the future.",
        )

    movie = session.get(Movie, payload.movie_id)
    if movie is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Movie not found.",
        )

    active_rent = session.exec(
        select(Rent).where(
            Rent.user_id == current_user.id,
            Rent.movie_id == movie.id,
            Rent.returned_at.is_(None),
        )
    ).first()
    if active_rent is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="You already have an active rental for this movie.",
        )

    rent = Rent(
        user_id=current_user.id,
        movie_id=movie.id,
        due_at=payload.due_at,
        price=payload.price,
    )
    session.add(rent)
    session.commit()
    session.refresh(rent)
    return _rent_read(rent, movie)


@router.get("/me", response_model=list[RentRead])
def list_my_rents(
    current_user: CurrentUserDependency,
    session: SessionDependency,
) -> list[RentRead]:
    results = session.exec(
        select(Rent, Movie)
        .join(Movie, Rent.movie_id == Movie.id)
        .where(Rent.user_id == current_user.id)
        .order_by(Rent.rented_at.desc())
    ).all()
    return [_rent_read(rent, movie) for rent, movie in results]


@router.post("/{rent_id}/return", response_model=RentRead)
def return_movie(
    rent_id: int,
    current_user: CurrentUserDependency,
    session: SessionDependency,
) -> RentRead:
    rent, movie = _get_user_rent(rent_id, current_user, session)
    if rent.returned_at is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="This rental has already been returned.",
        )

    rent.returned_at = datetime.now(timezone.utc)
    session.add(rent)
    session.commit()
    session.refresh(rent)
    return _rent_read(rent, movie)