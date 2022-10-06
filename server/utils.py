from sqlalchemy import select, insert, update
from db import User, Roles, File, Token, async_session
import jwt
import os, shutil
import hashlib
import uuid
import datetime

STORAGE = './STORAGE_DATA' 

async def generate_ID(filename: str):
    async with async_session() as session:
        async with session.begin():
            pre_hash = hashlib.sha512(str(filename).encode()).hexdigest()
            while True: 
                exist = (await session.execute(select(File).where(File.ID == pre_hash))).scalars().first()
                if not exist: return pre_hash
                pre_hash = hashlib.sha512(pre_hash).hexdigest()
    
async def new_user(login: str, role: Roles = Roles.na, password: str = None) -> User:
    async with async_session() as session:
        async with session.begin():
            try:
                password = hashlib.sha256(str(password).encode()).hexdigest() if password else None
                user = (await session.execute(
                    insert(User).values(login = login, role = role, password = password).returning(User)
                )).first()
                # creating storage
                storage_path = f'{STORAGE}/{login}'
                files_path = f'{storage_path}/data'
                if not os.path.exists(STORAGE): os.mkdir(STORAGE)
                if os.path.exists(storage_path): shutil.rmtree(storage_path)
                os.mkdir(storage_path)
                os.mkdir(files_path)
                storage_ID = await generate_ID(login)
                await session.execute(insert(File).values(ID = storage_ID, owner = user.ID, filepath = files_path, filename = 'data', is_folder = True, parent_ID = None))
                return(await session.execute(update(User).where(User.ID == user.ID).values(storage_ID = storage_ID).returning(User))).first()
            except:
                raise Exception('User with that login already exist')

async def check_user_password(login: str, password: str) -> bool:
    async with async_session() as session:
        async with session.begin():
            try:
                user = (await session.execute(select(User).where(User.login == login))).scalars().first()
                pass_hash = hashlib.sha256(str(password).encode()).hexdigest()
                return user.password == pass_hash
            except: return False
    
async def generate_token(login: str):
    async with async_session() as session:
        async with session.begin():
            try:
                key = uuid.uuid4().hex
                while True:
                    encoded = jwt.encode({'login': login}, key = key, algorithm = 'HS256')
                    token = (await session.execute(select(Token).where(Token.token == encoded))).scalars().first()
                    if not token:
                        user = (await session.execute(select(User).where(User.login == login))).scalars().first()
                        return (await session.execute(insert(Token).values(token = encoded, secret = key, user_ID = user.ID).returning(Token))).first()
                    key += uuid.uuid4().hex
            except: raise Exception('Incorrect login')
        
async def check_token(login: str, token: str) -> bool:
    async with async_session() as session:
        async with session.begin():
            try:
                Session = (await session.execute(select(Token).where(Token.token == token))).scalars().first()
                return bool(Session and jwt.decode(token, Session.secret, algorithms = ['HS256'])['login'] == login)
            except Exception as err:
                raise Exception('Incorrect token')

def get_time(timestamp: int):
    dt = datetime.datetime.fromtimestamp(timestamp)
    return dt.strftime('%H:%M:%S %d.%m.%Y')
    
raw_extensions = [
    '3fr', 'ari', 'arw', 'bay', 'braw', 'crw', 'cr2', 'cr3', 'cap', 'data', 
    'dcs', 'dcr', 'dng', 'drf', 'eip',  'erf', 'fff', 'gpr', 'iiq', 'k25',
    'kdc', 'mdc', 'mef', 'mos', 'mrw',  'nef', 'nrw', 'obm', 'orf', 'pef', 
    'ptx', 'pxn', 'r3d', 'raf', 'raw',  'rwl', 'rw2', 'rwz', 'sr2', 'srf',
    'srw', 'tif', 'x3f'
]
image_extensions = [
    'svg', 'gif', 'ico', 'cur', 'jpg', 'jpeg', 'jfif', 'pjpeg', 'pjp', 'png',
] + raw_extensions