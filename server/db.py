from sqlalchemy import Column, Integer, String, Enum, DateTime, Boolean, Float
from sqlalchemy.dialects import postgresql
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.orm import sessionmaker, declarative_base
import enum
import time
import os

DATABASE_URL = "postgresql+asyncpg://postgres:3924@localhost/storage" #os.environ.get("DATABASE_URL")

Base = declarative_base()
engine = create_async_engine(DATABASE_URL, echo = False, future = True)
async_session = sessionmaker(
    engine, 
    expire_on_commit = False, 
    class_ = AsyncSession
)

class Roles(enum.Enum):
    na = 'Not activeted'
    user = 'User'
    admin = 'Admin'


class User(Base):
    __tablename__ = 'Users'

    ID = Column(Integer, primary_key = True, index = True, nullable = False)
    login = Column(String, unique = True, nullable = False)
    password = Column(String, nullable = True)
    role = Column(Enum(Roles), nullable = False)
    storage_ID = Column(String, unique = True, nullable = True)
    friends = Column(postgresql.ARRAY(String), default = list)
    favourite = Column(postgresql.ARRAY(String), default = list)
    available = Column(postgresql.ARRAY(String), default = list)
    is_active = Column(Boolean, default = True, nullable = False)
    created = Column(Float, default = time.time(), nullable = False)

class File(Base):
    __tablename__ = 'Files'

    ID = Column(String, primary_key = True, unique = True, index = True, nullable = False)
    owner = Column(Integer, unique = False, nullable = False)
    filepath = Column(String, unique = False, nullable = True)
    filename = Column(String, unique = False, nullable = False)
    url = Column(String, unique = True, index = True, nullable = True)
    loaded = Column(Float, default = time.time(), nullable = False)
    is_folder = Column(Boolean, default = False, nullable = False)
    files = Column(postgresql.ARRAY(String), default = list)
    viewers = Column(postgresql.ARRAY(Integer), default = list)
    editors = Column(postgresql.ARRAY(Integer), default = list)
    deleted = Column(Boolean, default = False, nullable = False)
    delete_time = Column(DateTime(timezone = True), default = None, nullable = True)
    parent_ID = Column(String, unique = False, nullable = True)

class Token(Base):
    __tablename__ = 'Tokens'

    token = Column(String, primary_key = True, unique = True, index = True, nullable = False)
    secret = Column(String, unique = False, nullable = False)
    created = Column(Float, default = time.time(), nullable = False)
    user_ID = Column(Integer, unique = False, nullable = True)