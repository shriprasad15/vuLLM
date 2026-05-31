from sqlalchemy import Column, Integer, String, Boolean, DateTime, Text, ForeignKey, UniqueConstraint, func
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
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    session_id = Column(String)
    act = Column(Integer, nullable=False)
    attack_type = Column(String, nullable=False)
    defense_tier_active = Column(Integer, default=0)
    prompt = Column(Text, nullable=False)
    response = Column(Text)
    flag_captured = Column(Boolean, default=False)
    success = Column(Boolean, default=False)
    timestamp = Column(DateTime, default=func.now())

class Flag(Base):
    __tablename__ = "flags"
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    flag_name = Column(String, nullable=False)
    act = Column(Integer, nullable=False)
    attack_type = Column(String, nullable=False)
    points = Column(Integer, default=100)
    captured_at = Column(DateTime, default=func.now())
    __table_args__ = (UniqueConstraint("user_id", "flag_name", name="uq_user_flag"),)

class AdminSettings(Base):
    __tablename__ = "admin_settings"
    act = Column(Integer, primary_key=True)
    timer_enabled = Column(Boolean, default=False)
    timer_seconds = Column(Integer, default=300)
    act_locked = Column(Boolean, default=False)
    defense_tier_override = Column(Integer, nullable=True)
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())

class GlobalSettings(Base):
    __tablename__ = "global_settings"
    id = Column(Integer, primary_key=True)
    # "demo" = naive/compliant BLACKBUCK, "realistic" = production-grade guardrails
    blackbuck_mode = Column(String, default="demo")

class LabProgress(Base):
    __tablename__ = "lab_progress"
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    lab_number = Column(Integer, nullable=False)  # 1-6
    phase = Column(Integer, default=1)            # 1=Learn, 2=Objective, 3=Attempt, 4=Debrief, 5=Complete
    questions_passed = Column(Boolean, default=False)
    hints_used = Column(String, default="[]")     # JSON list e.g. [1, 2] or ["payload"]
    flag_submitted = Column(Boolean, default=False)
    score = Column(Integer, default=0)
    bonus_earned = Column(Boolean, default=False)
    started_at = Column(DateTime, default=func.now())
    completed_at = Column(DateTime, nullable=True)
    __table_args__ = (UniqueConstraint("user_id", "lab_number", name="uq_user_lab"),)
