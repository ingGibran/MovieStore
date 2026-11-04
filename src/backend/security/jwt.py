from datetime import datetime, timedelta, timezone
from typing import Any

import jwt
from pydantic import SecretStr
from pydantic_settings import BaseSettings, SettingsConfigDict


class JWTSettings(BaseSettings):
    secret_key: SecretStr | None = None
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 30

    model_config = SettingsConfigDict(
        env_file=".env",
        env_prefix="JWT_",
        extra="ignore",
    )


jwt_settings = JWTSettings()


def _secret_key(config: JWTSettings) -> str:
    secret_key = config.secret_key
    if secret_key is None or len(secret_key.get_secret_value()) < 32:
        raise RuntimeError(
            "JWT_SECRET_KEY must be configured with at least 32 characters."
        )
    return secret_key.get_secret_value()


def create_access_token(
    subject: str,
    *,
    claims: dict[str, Any] | None = None,
    config: JWTSettings = jwt_settings,
) -> str:
    """Create a signed access token for a user subject."""
    if not subject:
        raise ValueError("Token subject cannot be empty.")
    if config.access_token_expire_minutes <= 0:
        raise ValueError("Token expiration must be greater than zero.")

    now = datetime.now(timezone.utc)
    payload: dict[str, Any] = {
        "sub": subject,
        "iat": now,
        "exp": now + timedelta(minutes=config.access_token_expire_minutes),
    }
    if claims:
        payload.update(claims)
    return jwt.encode(payload, _secret_key(config), algorithm=config.algorithm)


def decode_access_token(
    token: str,
    *,
    config: JWTSettings = jwt_settings,
) -> dict[str, Any]:
    """Validate an access token and return its claims."""
    if not token:
        raise ValueError("Token cannot be empty.")
    try:
        payload = jwt.decode(
            token,
            _secret_key(config),
            algorithms=[config.algorithm],
        )
    except jwt.InvalidTokenError as error:
        raise ValueError("Invalid or expired access token.") from error

    subject = payload.get("sub")
    if not isinstance(subject, str) or not subject:
        raise ValueError("Access token has no valid subject.")
    return payload
