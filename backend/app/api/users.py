import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.config import get_settings
from app.database import get_db
from app.deps import AdminUser, CurrentUser
from app.models import User
from app.schemas.auth import UserCreate, UserOut, UserUpdate
from app.security import hash_password

router = APIRouter()


@router.get("", response_model=list[UserOut])
def list_users(_user: CurrentUser, db: Session = Depends(get_db)):
    return db.scalars(select(User).order_by(User.email)).all()


@router.post("", response_model=UserOut, status_code=status.HTTP_201_CREATED)
def create_user(_admin: AdminUser, body: UserCreate, db: Session = Depends(get_db)):
    email = str(body.email).lower().strip()
    if db.scalars(select(User).where(User.email == email)).first():
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Email already exists")
    uid = (body.id or "").strip() or f"u_{uuid.uuid4().hex[:12]}"
    if db.get(User, uid):
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="User id already exists")
    settings = get_settings()
    hashed = hash_password(body.password) if body.password else None
    if not hashed and not settings.auth_allow_email_only:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Password is required")
    avatar = (body.avatar_url or "").strip() or None
    row = User(
        id=uid,
        email=email,
        name=body.name.strip(),
        role=body.role.strip(),
        hashed_password=hashed,
        avatar_url=avatar,
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return row


@router.put("/{user_id}", response_model=UserOut)
def update_user(user_id: str, _admin: AdminUser, body: UserUpdate, db: Session = Depends(get_db)):
    row = db.get(User, user_id)
    if not row:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND)
    patch = body.model_dump(exclude_unset=True)
    if "email" in patch:
        email = str(patch["email"]).lower().strip()
        other = db.scalars(select(User).where(User.email == email, User.id != user_id)).first()
        if other:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Email already exists")
        row.email = email
    if "name" in patch:
        row.name = str(patch["name"]).strip()
    if "role" in patch:
        row.role = str(patch["role"]).strip()
    if "password" in patch:
        pw = patch["password"]
        row.hashed_password = hash_password(pw) if pw and str(pw).strip() else None
    if "avatar_url" in patch:
        au = patch["avatar_url"]
        row.avatar_url = (str(au).strip() or None) if au is not None else None
    db.commit()
    db.refresh(row)
    return row


@router.delete("/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_user(user_id: str, _admin: AdminUser, db: Session = Depends(get_db)):
    if user_id == _admin.id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Cannot delete your own account")
    row = db.get(User, user_id)
    if not row:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND)
    db.delete(row)
    db.commit()
    return None
