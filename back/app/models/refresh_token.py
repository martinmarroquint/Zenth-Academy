# app/models/refresh_token.py
# MODELO DE REFRESH TOKENS - PARA ROTACIÓN Y REVOCACIÓN

from sqlalchemy import Column, String, Boolean, DateTime
from app.database import Base
from datetime import datetime, timezone
import uuid


class RefreshToken(Base):
    __tablename__ = "refresh_tokens"
    __table_args__ = {'extend_existing': True}

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    token_hash = Column(String(64), unique=True, nullable=False, index=True)
    user_id = Column(String, nullable=False, index=True)
    expires_at = Column(DateTime, nullable=False)
    revoked = Column(Boolean, default=False, index=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    def __repr__(self):
        return f"<RefreshToken {self.user_id} revoked={self.revoked}>"