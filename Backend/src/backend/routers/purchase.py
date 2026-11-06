from datetime import datetime
from decimal import Decimal
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, ConfigDict, Field
from sqlalchemy.exc import IntegrityError
from sqlmodel import Session, select

from backend.database import Movie, Purchase, User, get_session
from backend.routers.users import CurrentUserDependency


router = APIRouter(prefix="/purchases", tags=["purchases"])
SessionDependency = Annotated[Session, Depends(get_session)]


class PurchaseCreate(BaseModel):
    movie_id: int = Field(gt=0)
    price: Decimal = Field(ge=0, max_digits=10, decimal_places=2)


class PurchaseRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    movie_id: int
    movie_title: str
    poster_url: str | None
    bought_at: datetime
    price: Decimal


def _purchase_read(purchase: Purchase, movie: Movie) -> PurchaseRead:
    return PurchaseRead(
        id=purchase.id,
        movie_id=movie.id,
        movie_title=movie.title,
        poster_url=movie.poster_url,
        bought_at=purchase.bought_at,
        price=purchase.price,
    )


def _get_user_purchase(
    purchase_id: int,
    current_user: User,
    session: Session,
) -> tuple[Purchase, Movie]:
    result = session.exec(
        select(Purchase, Movie)
        .join(Movie, Purchase.movie_id == Movie.id)
        .where(
            Purchase.id == purchase_id,
            Purchase.user_id == current_user.id,
        )
    ).first()
    if result is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Purchase not found.",
        )
    return result


@router.post(
    "",
    response_model=PurchaseRead,
    status_code=status.HTTP_201_CREATED,
)
def buy_movie(
    payload: PurchaseCreate,
    current_user: CurrentUserDependency,
    session: SessionDependency,
) -> PurchaseRead:
    movie = session.get(Movie, payload.movie_id)
    if movie is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Movie not found.",
        )

    existing_purchase = session.exec(
        select(Purchase).where(
            Purchase.user_id == current_user.id,
            Purchase.movie_id == movie.id,
        )
    ).first()
    if existing_purchase is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="You have already purchased this movie.",
        )

    purchase = Purchase(
        user_id=current_user.id,
        movie_id=movie.id,
        price=payload.price,
    )
    session.add(purchase)
    try:
        session.commit()
    except IntegrityError:
        session.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="You have already purchased this movie.",
        ) from None
    session.refresh(purchase)
    return _purchase_read(purchase, movie)


@router.get("/me", response_model=list[PurchaseRead])
def list_my_purchases(
    current_user: CurrentUserDependency,
    session: SessionDependency,
) -> list[PurchaseRead]:
    results = session.exec(
        select(Purchase, Movie)
        .join(Movie, Purchase.movie_id == Movie.id)
        .where(Purchase.user_id == current_user.id)
        .order_by(Purchase.bought_at.desc())
    ).all()
    return [_purchase_read(purchase, movie) for purchase, movie in results]


@router.get("/{purchase_id}", response_model=PurchaseRead)
def get_my_purchase(
    purchase_id: int,
    current_user: CurrentUserDependency,
    session: SessionDependency,
) -> PurchaseRead:
    purchase, movie = _get_user_purchase(purchase_id, current_user, session)
    return _purchase_read(purchase, movie)