// @ts-nocheck
import React, { 
  useRef,
  useEffect,
  forwardRef,
  useImperativeHandle,
  useState,
} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {useDispatch, useSelector} from 'react-redux';

import {setFolder, addFile, setID, turnLoaderOff, changeUser, setProgress, updateData} from './reducers/reducer';
import {FileType, UserType} from './const/Consts';

const ImprovedConnector = forwardRef<View>((props, ref) => {
  const [webWorker, setWebWorker] = useState<Worker>();
  const [lastMessage, setLastMessage] = useState<JSON>();

  const currentFolder: FileType = useSelector((state: CombinedState<{currentFolder: FileType}>) => state.currentFolder);
  const User: UserType = useSelector((state: CombinedState<{User: UserType}>) => state.User);
  const dispatch = useDispatch();

  useEffect(() => {
    const worker = new Worker('web.worker.js', {type: 'module'});
    worker.onmessage = async (ev: MessageEvent) => setLastMessage(ev.data);
    setWebWorker(worker);
  }, []);

  useEffect(() => {
    switch (lastMessage?.title) {
      case 'connection': {
        if (lastMessage?.status === 'open') {
          (async () => {
            const token = await AsyncStorage.getItem('token');
            const login = await AsyncStorage.getItem('login');
            dispatch(changeUser({login: login, token: token}));
            webWorker.postMessage({title: 'auth', login: login, token: token})
          })();
        } else if (lastMessage?.status === 'closed') webWorker.postMessage({title: 'init'})
        break;
      }
      case 'auth': {
        if (lastMessage.status === 'ok') {
          AsyncStorage.setItem('token', lastMessage.token);
          AsyncStorage.setItem('login', lastMessage.login);
          AsyncStorage.setItem('storage_ID', lastMessage.storage_ID);
          dispatch(changeUser({login: lastMessage.login, token: lastMessage.token, storage_ID: lastMessage.storage_ID, authorized: true}));
          dispatch(setID(lastMessage.storage_ID));
        } else {
          // do sth bad...
          webWorker.postMessage({title: 'auth', login: 'Кусь', password: '123'})  // will be removed soon
        }
        break;
      }
      case 'file': {
        if (lastMessage.file.is_folder) {
          dispatch(setFolder(lastMessage.file));
          dispatch(turnLoaderOff());
        } else if (lastMessage.file.is_image) {
          dispatch(updateData(lastMessage.file.ID, lastMessage.file.file_data));
          break;
        }
        break;
      }
      case 'new file': {
        if ( lastMessage.status === 'ok' && lastMessage?.file.parent_ID === currentFolder.ID ) {
          dispatch(addFile(lastMessage.file));
        }
        break;
      }
      // case 'init load file stream':
      // case 'load file stream': {
      //   for (let fid = 0; fid < fileLoader.length; fid++) {
      //     if (fileLoader[fid].ID === lastMessage.ID || fileLoader[fid].load_ID === lastMessage.load_ID ) {
      //       setFileLoader((prevState: LoaderProgress) => {
      //         prevState[fid].progress = lastMessage.status;
      //         return [...prevState]
      //       });
      //     }
      //   }
      // }
    }
  }, [lastMessage]);

  const get_file = async (ID: string) => {
    if (ID === '') {
      console.log(ID)
      if (User.storage_ID) ID = User.storage_ID
      else ID = await AsyncStorage.getItem('storage_ID');
    }
    webWorker.postMessage({title: 'get file', ID: ID});
  };
  const create_folder = async (name: string) => {
    webWorker.postMessage({title: 'create folder', parent_ID: currentFolder.ID,name: name});
  };
  const send_files = async (files: FileList) => {
    var bytes: number = 0;
    for (let fid = 0; fid < files.length; fid++) bytes += files[fid].size;
    dispatch(setProgress({bytes: loaderProgress.bytes + bytes, elements: loaderProgress.elements + files.length}));
    webWorker.postMessage({title: 'send files', files: files});
  };

  useEffect(() => {
    if (currentFolder.ID !== null) get_file(currentFolder.ID)
  }, [currentFolder.ID]);

  useEffect(() => {
    for (let fid = 0; fid < currentFolder.files.length; fid++) {
      if (currentFolder.files[fid].is_image && currentFolder.files[fid].file_data === undefined) {
        get_file(currentFolder.files[fid].ID);
        break;
      }
    }
  }, [currentFolder])

  useImperativeHandle(ref, () => ({
    create_folder(name: string) {
      create_folder(name);
    },
    send_files(files: FileList) {
      send_files(files);
    },
    get_file(file: string) {
      get_file(file);
    }
  }));

  return <></>;
});

export default ImprovedConnector;