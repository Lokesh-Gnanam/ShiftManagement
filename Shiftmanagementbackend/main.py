import os
from datetime import datetime, timedelta
from typing import List, Optional

from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from fastapi.middleware.cors import CORSMiddleware
from jose import JWTError, jwt
from passlib.context import CryptContext
from pydantic import BaseModel
from neo4j import GraphDatabase
from dotenv import load_dotenv

load_dotenv()

# Configuration
SECRET_KEY = os.getenv("SECRET_KEY", "secret")
ALGORITHM = os.getenv("ALGORITHM", "HS256")
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", 30))

NEO4J_URI = os.getenv("NEO4J_URI", "bolt://localhost:7687")
NEO4J_USER = os.getenv("NEO4J_USER", "neo4j")
NEO4J_PASSWORD = os.getenv("NEO4J_PASSWORD", "password")
NEO4J_DATABASE = os.getenv("NEO4J_DATABASE", "ShiftSyncDB")
USER_DATABASE = os.getenv("USER_DATABASE", "neo4j")

app = FastAPI(title="ShiftSync Backend")

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Security
pwd_context = CryptContext(schemes=["pbkdf2_sha256"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")

# Models
class UserCreate(BaseModel):
    username: str
    password: str
    name: str
    role: str
    specialization: str

class Token(BaseModel):
    access_token: str
    token_type: str

class User(BaseModel):
    username: str
    name: str
    role: str
    specialization: str

class LogEntry(BaseModel):
    content: str
    timestamp: str
    audio_url: Optional[str] = None
    tags: List[str] = []

# Mock Database
MOCK_DB_TECHNICIANS = [
    {"username": "admin", "password": pwd_context.hash("password123"), "name": "Admin User", "role": "admin", "specialization": "All"},
    {"username": "senior", "password": pwd_context.hash("password123"), "name": "Senior Tech Ravi", "role": "senior", "specialization": "Maintenance"},
    {"username": "junior", "password": pwd_context.hash("password123"), "name": "Junior Tech Arjun", "role": "junior", "specialization": "Mechanical"},
]
MOCK_DB_LOGS = []

# Neo4j Driver Connection
USE_NEO4J = False
try:
    driver = GraphDatabase.driver(NEO4J_URI, auth=(NEO4J_USER, NEO4J_PASSWORD))
    driver.verify_connectivity()
    USE_NEO4J = True
    print("✅ Connected to Neo4j successfully!")
except Exception as e:
    USE_NEO4J = False
    print(f"⚠️  Neo4j Connection Failed: {e}")
    print("⚠️  Running in MOCK MODE (Data will not persist after restart)")

# Automatic Database Initialization
def init_db():
    if USE_NEO4J:
        # Initialize USER_DATABASE (Technicians)
        with driver.session(database=USER_DATABASE) as session:
            try:
                session.run("CREATE CONSTRAINT technician_username IF NOT EXISTS FOR (t:Technician) REQUIRE t.username IS UNIQUE")
            except Exception: pass
            
        # Initialize NEO4J_DATABASE (Logs)
        with driver.session(database=NEO4J_DATABASE) as session:
            try:
                session.run("CREATE INDEX log_timestamp IF NOT EXISTS FOR (l:Log) ON (l.timestamp)")
            except Exception: pass
        print(f"🚀 Neo4j Schema Initialized (Users in {USER_DATABASE}, Logs in {NEO4J_DATABASE})")

# Utilities
def verify_password(plain_password, hashed_password):
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password):
    return pwd_context.hash(password)

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=15)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

async def get_current_user(token: str = Depends(oauth2_scheme)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("sub")
        if username is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception
    
    if USE_NEO4J:
        with driver.session(database=USER_DATABASE) as session:
            result = session.run("MATCH (u:Technician {username: $username}) RETURN u", username=username)
            record = result.single()
            if record:
                user_node = record["u"]
                return User(**dict(user_node))
    else:
        user_data = next((u for u in MOCK_DB_TECHNICIANS if u["username"] == username), None)
        if user_data:
            return User(**user_data)
            
    raise credentials_exception

@app.on_event("startup")
async def startup():
    if USE_NEO4J:
        init_db()
    else:
        print("💡 TIP: No Neo4j database detected. Changes will be saved in memory only.")
        print("💡 Download Neo4j Desktop: https://neo4j.com/download-center/#desktop")

# Routes
@app.post("/register", response_model=User)
async def register(user: UserCreate):
    if USE_NEO4J:
        with driver.session(database=USER_DATABASE) as session:
            check = session.run("MATCH (u:Technician {username: $username}) RETURN u", username=user.username)
            if check.single():
                raise HTTPException(status_code=400, detail="Username already registered")
            
            hashed_password = get_password_hash(user.password)
            session.run(
                "CREATE (u:Technician {username: $username, password: $password, name: $name, role: $role, specialization: $specialization, created_at: datetime()})",
                username=user.username, password=hashed_password, name=user.name, role=user.role, specialization=user.specialization
            )
    else:
        if any(u["username"] == user.username for u in MOCK_DB_TECHNICIANS):
            raise HTTPException(status_code=400, detail="Username already registered")
        MOCK_DB_TECHNICIANS.append({**user.dict(), "password": get_password_hash(user.password)})
    
    return User(username=user.username, name=user.name, role=user.role, specialization=user.specialization)

@app.post("/token", response_model=Token)
async def login_for_access_token(form_data: OAuth2PasswordRequestForm = Depends()):
    user_password_hash = None
    if USE_NEO4J:
        with driver.session(database=USER_DATABASE) as session:
            result = session.run("MATCH (u:Technician {username: $username}) RETURN u", username=form_data.username)
            record = result.single()
            if record:
                user_node = record["u"]
                user_password_hash = user_node["password"]
    else:
        user_data = next((u for u in MOCK_DB_TECHNICIANS if u["username"] == form_data.username), None)
        if user_data:
            user_password_hash = user_data["password"]

    if not user_password_hash or not verify_password(form_data.password, user_password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # Update last login in Neo4j
    if USE_NEO4J:
        with driver.session(database=USER_DATABASE) as session:
            session.run(
                "MATCH (u:Technician {username: $username}) SET u.last_login = datetime()",
                username=form_data.username
            )
    
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": form_data.username}, expires_delta=access_token_expires
    )
    return {"access_token": access_token, "token_type": "bearer"}

@app.get("/users/me", response_model=User)
async def read_users_me(current_user: User = Depends(get_current_user)):
    return current_user

@app.get("/stats")
async def get_stats(current_user: User = Depends(get_current_user)):
    if USE_NEO4J:
        with driver.session(database=NEO4J_DATABASE) as session:
            log_result = session.run("MATCH (l:Log) RETURN count(l) as logCount")
            log_count = log_result.single()["logCount"]
        with driver.session(database=USER_DATABASE) as session:
            tech_result = session.run("MATCH (t:Technician) RETURN count(t) as techCount")
            tech_count = tech_result.single()["techCount"]
    else:
        log_count = len(MOCK_DB_LOGS)
        tech_count = len(MOCK_DB_TECHNICIANS)
        
    return {
        "nodes": log_count + tech_count,
        "resolutionRate": "85%",
        "downtimeSaved": "12h",
        "activeLogs": log_count
    }

@app.post("/logs")
async def create_log(log: LogEntry, current_user: User = Depends(get_current_user)):
    if USE_NEO4J:
        with driver.session(database=NEO4J_DATABASE) as session:
            session.run(
                "CREATE (l:Log {content: $content, timestamp: $timestamp, audio_url: $audio_url, tags: $tags, author: $username})",
                username=current_user.username, content=log.content, timestamp=log.timestamp, audio_url=log.audio_url, tags=log.tags
            )
    else:
        MOCK_DB_LOGS.append({**log.dict(), "author": current_user.username})
    return {"status": "success"}

@app.get("/logs")
async def get_logs(current_user: User = Depends(get_current_user)):
    if USE_NEO4J:
        with driver.session(database=NEO4J_DATABASE) as session:
            result = session.run(
                "MATCH (l:Log) RETURN l, id(l) as logId ORDER BY l.timestamp DESC"
            )
            return [{
                "id": r["logId"],
                "content": r["l"]["content"], 
                "timestamp": r["l"]["timestamp"], 
                "audio_url": r["l"]["audio_url"], 
                "tags": r["l"]["tags"]
            } for r in result]
    else:
        return [l for l in reversed(MOCK_DB_LOGS)]

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
