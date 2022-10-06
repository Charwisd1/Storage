import asyncio
from datetime import datetime
from fastapi import FastAPI, WebSocketDisconnect
from fastapi import File as FileForm
from fastapi.responses import StreamingResponse, FileResponse
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import select, true
from sqlalchemy.orm.attributes import flag_modified
from utils import new_user, check_user_password, generate_token, check_token, raw_extensions, image_extensions, get_time
import os
import hashlib
import uuid
import ujson as json
import base64
from sqlalchemy import select, insert, update

from db import User, File, Token, async_session, Roles
from ws_manager import WSConnectionManager, WebSocket
import websockets.exceptions as WSExeptions

import logging

app = FastAPI()
manager = WSConnectionManager()

app.add_middleware(
    CORSMiddleware,
    allow_origins = ['*'],
    allow_credentials = True,
    allow_methods = ['*'],
    allow_headers = ['*']
)

@app.on_event('startup')
async def startup_event():
    logging.basicConfig(format='[%(asctime)s] %(message)s')
    # from db import engine, Base
    # async with engine.begin() as conn:
    #     await conn.run_sync(Base.metadata.drop_all)
    #     await conn.run_sync(Base.metadata.create_all)
    # await new_user('Кусь', Roles.admin, '123') # test user, will be removed in production 
    return

def check_user(function):
    async def decorated_function(websocket: WebSocket, *args, **kws):
        async with async_session() as session:
            async with session.begin():
                user = (await session.execute(select(User).where(User.ID == manager.connections[websocket.get('client')]['ID']))).scalars().first()
                if user:
                    return await function(user, websocket, *args, *kws)
                return await manager.send_message({'title': 'auth', 'status': 'Unauthorized'}, websocket)
    return decorated_function

async def set_user_activity(ID: int, activity: bool):
    async with async_session() as session:
        async with session.begin():
            await session.execute(update(User).where(User.ID == ID).values(is_active = activity))

@app.websocket('/ws')
async def websocket_endpoint(websocket: WebSocket):
    await manager.connect(websocket)
    user_ID: int or None = None
    client = websocket.get('client')
    file_streams: dict = {}
    try: 
        async for data in websocket.iter_text():
            message = json.loads(data)
            logging.warning(f"{client} {user_ID}: {message['title']}")
            match message['title']:
                case 'auth':
                    user_ID: int = await _auth(websocket, message)
                    if user_ID: asyncio.create_task(set_user_activity(ID = user_ID, activity = True))
                    manager.connections[client]['ID'] = user_ID
                case 'get file':
                    await _get_file(websocket, message['ID'])
                case 'create folder':
                    await _create_folder(websocket, message)
                case 'load file':
                    await _load_file(websocket, message)
                case 'init load file stream':
                    file_streams.update({message['stream_ID']: await _init_file_stream(websocket, message)})
                case 'load file stream':
                    await _load_file_stream(websocket, file_streams[message['stream_ID']], message)
                    file_streams[message['stream_ID']]['slice'] += 1
                case 'end load file stream':
                    await _end_file_load_stream(websocket, file_streams[message['stream_ID']])
                    file_streams.pop(message['stream_ID'], [None])  
    except WSExeptions.ConnectionClosedOK or KeyError: pass
    finally:
        if user_ID: asyncio.create_task(set_user_activity(ID = user_ID, activity = False))
        await manager.disconnect(websocket)

async def _auth(websocket: WebSocket, message: dict) -> int or None:
    try:
        async with async_session() as session:
                async with session.begin():
                    user = (await session.execute(select(User).where(User.login == message['login']))).scalars().first()
        if 'token' in message.keys() and await check_token(login = message['login'], token = message['token']):
            token = message['token']
        elif 'password' in message.keys() and await check_user_password(login = message['login'], password = message['password']):
            new_token = await generate_token(login = message['login'])
            token = new_token.token
        else:
            raise Exception('Incorrect login or password or token')
        manager.connections[websocket.get('client')]['ID'] = user.ID
        await manager.send_message({'title': 'auth', 'status': 'ok', 'token': token, 'login': user.login, 'storage_ID': user.storage_ID}, websocket)
        return user.ID
    except Exception as err:
        await manager.send_message({'title': 'auth', 'status': 'fail', 'message': str(err)}, websocket)
        return None

@check_user
async def _get_file(user: User, websocket: WebSocket, ID: str = None):
    try:
        async with async_session() as session:
            async with session.begin():
                if not ID: ID = user.storage_ID
                statement = select(File).where(File.ID == ID)
                result = await session.execute(statement)
                file = result.scalars().first()
                # checking rights
                curr_parent = file
                while True:
                    if (curr_parent.owner == user.ID) or (user.ID in curr_parent.editors) or (user.ID in curr_parent.viewers): break
                    if not curr_parent.parent_ID: raise Exception('Not enough rights')
                    statement = select(File).where(File.ID == curr_parent.parent_ID)
                    result = await session.execute(statement)
                    curr_parent = result.scalars().first()
                # checking is path exists
                if not os.path.exists(file.filepath): raise Exception('File not found')
                # processing data
                size = os.path.getsize(file.filepath)
                updated = get_time(os.path.getmtime(file.filepath))
                loaded = get_time(file.loaded)
                if file.is_folder:
                    files = []
                    for fID in file.files:
                        statement = select(File).where(File.ID == fID)
                        result = await session.execute(statement)
                        f = result.scalars().first()
                        try:
                            size = os.path.getsize(f.filepath)
                            updated = get_time(os.path.getmtime(f.filepath))
                            loaded = get_time(f.loaded)
                            is_image = f.filename.split('.')[-1].lower() in image_extensions
                            files.append({'ID': f.ID, 'owner': f.owner, 'filename': f.filename, 'url': f.url, 'loaded': loaded, 'updated': updated, 'size': size, 'is_folder': f.is_folder, 'is_image': is_image, 'files': f.files, 'viewers': f.viewers, 'editors': f.editors, 'deleted': f.deleted, 'delete_time': f.delete_time, 'parent_ID': f.parent_ID})
                        except FileNotFoundError:
                            files.append({'ID': f.ID, 'owner': f.owner, 'filename': f.filename, 'url': f.url, 'is_folder': f.is_folder, 'is_image': is_image, 'files': f.files, 'viewers': f.viewers, 'editors': f.editors, 'deleted': f.deleted, 'delete_time': f.delete_time, 'parent_ID': f.parent_ID, 'lost': True})
                    await manager.send_message({'title': 'file', 'status': 'ok', 'file': {'ID': file.ID, 'owner': file.owner, 'filename': file.filename, 'url': file.url, 'loaded': loaded, 'updated': updated, 'size': size, 'is_folder': True, 'is_image': False, 'files': files, 'viewers': file.viewers, 'editors': file.editors, 'deleted': file.deleted, 'delete_time': file.delete_time, 'parent_ID': file.parent_ID}}, websocket)
                elif file.filename.split('.')[-1].lower() in image_extensions:
                    with open(file.filepath, 'rb') as fp:
                        img_data = base64.b64encode(fp.read()).decode('utf-8')
                        fp.close()
                    await manager.send_message({'title': 'file', 'status': 'ok', 'file': {'ID': file.ID, 'owner': file.owner, 'filename': file.filename, 'url': file.url, 'loaded': loaded, 'updated': updated, 'size': size, 'is_folder': False, 'is_image': True, 'viewers': file.viewers, 'editors': file.editors, 'deleted': file.deleted, 'delete_time': file.delete_time, 'parent_ID': file.parent_ID, 'file_data': img_data}}, websocket)
                return file
    except Exception as err: 
        await manager.send_message({'title': 'file', 'status': 'fail', 'message': str(err)}, websocket)
        return False

@check_user
async def _create_folder(user: User, websocket: WebSocket, message: dict) -> bool: 
    try:
        name = message['name']
        parent_ID = message['parent_ID']
        async with async_session() as session:
            async with session.begin():
                # checking avalible ID
                while True:
                    ID = hashlib.sha256(str(name).encode() + str(uuid.uuid4()).encode()).hexdigest()
                    exist = (await session.execute(select(File).where(File.ID == ID))).scalars().first()
                    if not exist: break
                file = File(ID = ID, owner = user.ID, filename = name, is_folder = True, parent_ID = parent_ID)
                # finding parent
                parent = (await session.execute(select(File).where(File.ID == parent_ID))).scalars().first()
                if not parent: raise Exception('Incorrect parent ID')
                # checking rights and collecting users with access
                access = False 
                curr_parent = parent
                users_IDs = []
                users_IDs.extend(curr_parent.editors)
                users_IDs.extend(curr_parent.viewers)
                while True:
                    for uid in curr_parent.editors:
                        if uid not in users_IDs: users_IDs.append(uid) 
                    for uid in curr_parent.viewers:
                        if uid not in users_IDs: users_IDs.append(uid) 
                    if (curr_parent.owner == user.ID) or (user.ID in curr_parent.editors) or (user.ID in curr_parent.viewers): access = True
                    if not curr_parent.parent_ID: 
                        if curr_parent.owner not in users_IDs: users_IDs.append(curr_parent.owner)
                        break
                    curr_parent = (await session.execute(select(File).where(File.ID == curr_parent.parent_ID))).scalars().first()
                if not access: raise Exception('Not enough rights')
                # generating path
                if not parent.is_folder or not os.path.exists(parent.filepath): raise Exception('Parent file is not folder')
                file.filepath = parent.filepath + '/' + file.filename
                # creating folder
                os.mkdir(file.filepath)
                session.add(file)
                parent.files.append(file.ID)
                session.add(parent)
                flag_modified(parent, 'files')
                size = os.path.getsize(file.filepath)
                loaded = get_time(datetime.now().timestamp())
                updated = get_time(os.path.getmtime(file.filepath))
                # sending messages
                alert = {'title': 'new file', 'status': 'ok', 'file': {'ID': file.ID, 'owner': file.owner, 'filename': file.filename, 'url': file.url, 'loaded': loaded, 'updated': updated, 'size': size, 'is_folder': True, 'is_image': False, 'files': file.files, 'viewers': file.viewers, 'editors': file.editors, 'deleted': file.deleted, 'delete_time': file.delete_time, 'parent_ID': file.parent_ID}}
                await manager.send_message(alert, websocket)
                for user_ID in users_IDs:
                    if user_ID == user.ID: continue
                    sockets: list[WebSocket] = manager.get_websockets(user_ID)
                    for sock in sockets:
                        await manager.send_message(alert, sock)
                await session.commit()
                return True
    except Exception as err:
        await manager.send_message({'title': 'new file', 'status': 'fail', 'message': str(err)}, websocket)
        return False

# File loading logic -\_(0_o)_/-
@check_user
async def _load_file(user: User, websocket: WebSocket, message: dict):
    try:
        async with async_session() as session:
            async with session.begin():
                # checking avalible ID
                while True:
                    ID = hashlib.sha256(str(message['file_name']).encode() + str(uuid.uuid4()).encode()).hexdigest()
                    statement = select(File).where(File.ID == ID)
                    result = await session.execute(statement)
                    exist = result.scalars().first()
                    if not exist: break
                file = File(ID = ID, owner = user.ID, filename = message['file_name'], is_folder = False, parent_ID = message['parent_ID'])
                # finding parent
                statement = select(File).where(File.ID == message['parent_ID'])
                result = await session.execute(statement)
                parent = result.scalars().first()
                if not parent: raise Exception('Incorrect parent ID')
                # checking rights and collecting users with access
                access = False 
                curr_parent = parent
                users_IDs = []
                users_IDs.extend(curr_parent.editors)
                users_IDs.extend(curr_parent.viewers)
                while True:
                    for uid in curr_parent.editors:
                        if uid not in users_IDs: users_IDs.append(uid) 
                    for uid in curr_parent.viewers:
                        if uid not in users_IDs: users_IDs.append(uid) 
                    if (curr_parent.owner == user.ID) or (user.ID in curr_parent.editors) or (user.ID in curr_parent.viewers): access = True
                    if not curr_parent.parent_ID: 
                        if curr_parent.owner not in users_IDs: users_IDs.append(curr_parent.owner)
                        break
                    statement = select(File).where(File.ID == curr_parent.parent_ID)
                    result = await session.execute(statement)
                    curr_parent = result.scalars().first()
                if not access: raise Exception('Not enough rights')
                # generating path
                if not parent.is_folder or not os.path.exists(parent.filepath): raise Exception('Parent file is not folder')
                file.filepath = parent.filepath + '/' + file.filename
                flag_modified(parent, 'filepath')
                # creating file
                with open(file.filepath, 'wb+') as fp:
                    fp.write(base64.b64decode(message['file']))
                    fp.close()
                python_timestamp = message['modified'] / 1000    # js timestamp -> python timestamp
                os.utime(file.filepath, (python_timestamp, python_timestamp))
                session.add(file)
                parent.files.append(file.ID)
                session.add(parent)
                flag_modified(parent, 'files')
                await session.commit()
                # sending messages  
                size = os.path.getsize(file.filepath)
                updated = get_time(python_timestamp)
                loaded = get_time(file.loaded)
                is_image = file.filename.split('.')[-1].lower() in image_extensions
                alert = {'title': 'new file', 'status': 'ok', 'file': {'ID': file.ID, 'owner': file.owner, 'filename': file.filename, 'url': file.url, 'loaded': loaded, 'updated': updated, 'size': size, 'is_folder': False, 'is_image': is_image, 'files': file.files, 'viewers': file.viewers, 'editors': file.editors, 'deleted': file.deleted, 'delete_time': file.delete_time, 'parent_ID': file.parent_ID}}
                for user_ID in users_IDs:
                    sockets: list[WebSocket] = await manager.get_websockets(user_ID)
                    for sock in sockets:
                        if sock == websocket: alert.update({'stream_ID': message['stream_ID']})
                        await manager.send_message(alert, sock)     
                return True
    except Exception as err:
        await manager.send_message({'title': 'new file', 'status': 'fail', 'message': str(err), 'stram_ID': message['stream_ID']}, websocket)
        return False

@check_user
async def _init_file_stream(user: User, websocket: WebSocket, message: dict):
    async with async_session() as session:
        async with session.begin():
            # checking avalible ID
            while True:
                ID = hashlib.sha256(str(message['file_name']).encode() + str(uuid.uuid4()).encode()).hexdigest()
                statement = select(File).where(File.ID == ID)
                result = await session.execute(statement)
                exist = result.scalars().first()
                if not exist: break
            file = File(ID = ID, owner = user.ID, filename = message['file_name'], is_folder = False, parent_ID = message['parent_ID'])
            # finding parent
            statement = select(File).where(File.ID == message['parent_ID'])
            result = await session.execute(statement)
            parent = result.scalars().first()
            if not parent: raise Exception('Incorrect parent ID')
            # checking rights
            curr_parent = parent
            while True:
                if (curr_parent.owner == user.ID) or (user.ID in curr_parent.editors): break
                statement = select(File).where(File.ID == curr_parent.parent_ID)
                result = await session.execute(statement)
                curr_parent = result.scalars().first()
            else: raise Exception('Not enough rights')
            # generating path
            if not parent.is_folder or not os.path.exists(parent.filepath): raise Exception('Parent file is not folder')
            file.filepath = parent.filepath + '/' + file.filename
            flag_modified(parent, 'filepath')
            # creating file
            python_timestamp = message['modified'] / 1000    # js timestamp -> python timestamp
            with open(file.filepath, 'wb+') as fp:
                fp.close()
            os.utime(file.filepath, (python_timestamp, python_timestamp))
            session.add(file)
            parent.files.append(file.ID)
            session.add(parent)
            flag_modified(parent, 'files')
            await session.commit()
            await manager.send_message({'title': 'init load file stream', 'stream_ID': message['stream_ID'], 'status': 'ready to listen'}, websocket)
            return {
                'stream_ID': message['stream_ID'],
                'file_name': message['file_name'],
                'parent_ID': message['parent_ID'],
                'modified': python_timestamp,
                'chunk_size': message['chunk_size'],
                'file_size': message ['file_size'],
                'file_ID': file.ID,
                'file_path': file.filepath,
                'slice': 0
            }

async def _load_file_stream(websocket: WebSocket, file: dict, message: dict):
    with open(file['file_path'], 'ab+') as fp:
        fp.write(base64.b64decode(message['file']))
        fp.close()
    await manager.send_message({'title': 'load file stream', 'stream_ID': file['stream_ID'], 'slice': file['slice']+1, 'status': 'ready to listen'}, websocket)
    os.utime(file['file_path'], (file['modified'], file['modified']))
    return

async def _end_file_load_stream(websocket: WebSocket, fileInfo: dict):
    async with async_session() as session:
        async with session.begin():
            statement = select(File).where(File.ID == fileInfo['file_ID'])
            result = await session.execute(statement)
            file = result.scalars().first()
            # finding parent
            statement = select(File).where(File.ID == file.parent_ID)
            result = await session.execute(statement)
            parent = result.scalars().first()
            if not parent: raise Exception('Incorrect parent ID')
            # collecting users with access
            curr_parent = parent
            users_IDs = []
            users_IDs.extend(curr_parent.editors)
            users_IDs.extend(curr_parent.viewers)
            while True:
                for uid in curr_parent.editors:
                    if uid not in users_IDs: users_IDs.append(uid) 
                for uid in curr_parent.viewers:
                    if uid not in users_IDs: users_IDs.append(uid) 
                if not curr_parent.parent_ID: 
                    if curr_parent.owner not in users_IDs: users_IDs.append(curr_parent.owner)
                    break
                statement = select(File).where(File.ID == curr_parent.parent_ID)
                result = await session.execute(statement)
                curr_parent = result.scalars().first()
            # sending messages
            size = os.path.getsize(file.filepath)
            updated = get_time(fileInfo['modified'])
            loaded = get_time(file.loaded)
            is_image = file.filename.split('.')[-1].lower() in image_extensions
            alert = {'title': 'new file', 'status': 'ok', 'file': {'ID': file.ID, 'owner': file.owner, 'filename': file.filename, 'url': file.url, 'loaded': loaded, 'updated': updated, 'size': size, 'is_folder': False, 'is_image': is_image, 'files': file.files, 'viewers': file.viewers, 'editors': file.editors, 'deleted': file.deleted, 'delete_time': file.delete_time, 'parent_ID': file.parent_ID}}
            for user_ID in users_IDs:
                sockets: list[WebSocket] = await manager.get_websockets(user_ID)
                for sock in sockets:
                    await manager.send_message(alert, sock)
    
if __name__ == '__main__':
    import uvicorn
    uvicorn.run('server:app', host = '0.0.0.0', port = 8000, reload = True, debug = True) #, ssl_keyfile = 'd:/others/Storage/server/ssl/private.key', ssl_certfile = 'd:/others/Storage/server/ssl/cert.crt'