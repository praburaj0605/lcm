from pydantic import BaseModel, EmailStr


class LoginRequest(BaseModel):
    email: EmailStr
    password: str | None = None


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


class UserOut(BaseModel):
    id: str
    email: str
    name: str
    role: str
    avatar_url: str | None = None

    model_config = {"from_attributes": True}


class UserCreate(BaseModel):
    email: EmailStr
    name: str
    role: str
    password: str | None = None
    id: str | None = None
    avatar_url: str | None = None


class UserUpdate(BaseModel):
    email: EmailStr | None = None
    name: str | None = None
    role: str | None = None
    password: str | None = None
    avatar_url: str | None = None
