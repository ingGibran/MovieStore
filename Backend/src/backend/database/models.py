from datetime import datetime, timezone
from decimal import Decimal

from sqlmodel import Field, Relationship, SQLModel


class Movie(SQLModel, table=True):
    """Movie catalog entry imported from the IMDb source data."""

    __tablename__ = "movies"

    id: int | None = Field(default=None, primary_key=True)
    imdb_id: str = Field(index=True, unique=True, max_length=20)
    title: str = Field(max_length=255)
    original_title: str | None = Field(default=None, max_length=255)
    poster_url: str | None = None
    description: str | None = None
    release_year: int | None = Field(default=None, index=True)
    genres: str | None = Field(default=None, max_length=255)
    runtime_minutes: int | None = None
    average_rating: Decimal | None = Field(default=None, max_digits=3, decimal_places=1)
    num_votes: int | None = None

    rents: list["Rent"] = Relationship(back_populates="movie")
    purchases: list["Purchase"] = Relationship(back_populates="movie")


class User(SQLModel, table=True):
    """Store account information without storing a plaintext password."""

    __tablename__ = "users"

    id: int | None = Field(default=None, primary_key=True)
    email: str = Field(index=True, unique=True, max_length=320)
    full_name: str = Field(max_length=255)
    password_hash: str = Field(max_length=255)
    is_active: bool = True
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

    rents: list["Rent"] = Relationship(back_populates="user")
    purchases: list["Purchase"] = Relationship(back_populates="user")


class Rent(SQLModel, table=True):
    """A movie rental made by a user."""

    __tablename__ = "rents"

    id: int | None = Field(default=None, primary_key=True)
    user_id: int = Field(foreign_key="users.id", index=True)
    movie_id: int = Field(foreign_key="movies.id", index=True)
    rented_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    due_at: datetime
    returned_at: datetime | None = None
    price: Decimal = Field(max_digits=10, decimal_places=2)

    user: User = Relationship(back_populates="rents")
    movie: Movie = Relationship(back_populates="rents")


class Purchase(SQLModel, table=True):
    """A movie purchase made by a user."""

    __tablename__ = "boughts"

    id: int | None = Field(default=None, primary_key=True)
    user_id: int = Field(foreign_key="users.id", index=True)
    movie_id: int = Field(foreign_key="movies.id", index=True)
    bought_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    price: Decimal = Field(max_digits=10, decimal_places=2)

    user: User = Relationship(back_populates="purchases")
    movie: Movie = Relationship(back_populates="purchases")