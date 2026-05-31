from sqlalchemy import Column, Integer, String, Boolean, DateTime, Text, ForeignKey, func
from .database import Base

class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True)
    username = Column(String, unique=True, nullable=False)
    session_id = Column(String, nullable=False)
    ip_address = Column(String)
    created_at = Column(DateTime, default=func.now())

class Interaction(Base):
    __tablename__ = "interactions"
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    session_id = Column(String)
    act = Column(Integer)
    attack_type = Column(String)
    defense_tier_active = Column(Integer, default=0)
    prompt = Column(Text)
    response = Column(Text)
    flag_captured = Column(Boolean, default=False)
    success = Column(Boolean, default=False)
    timestamp = Column(DateTime, default=func.now())

class Flag(Base):
    __tablename__ = "flags"
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    flag_name = Column(String)
    act = Column(Integer)
    attack_type = Column(String)
    points = Column(Integer, default=100)
    captured_at = Column(DateTime, default=func.now())

class AdminSettings(Base):
    __tablename__ = "admin_settings"
    act = Column(Integer, primary_key=True)
    timer_enabled = Column(Boolean, default=False)
    timer_seconds = Column(Integer, default=300)
    act_locked = Column(Boolean, default=False)
    defense_tier_override = Column(Integer, nullable=True)
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())
