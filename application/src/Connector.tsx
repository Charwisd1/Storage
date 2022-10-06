// @ts-nocheck
import React from 'react';
import {
  useRef,
  useEffect,
  forwardRef,
  useImperativeHandle,
  useState,
} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {useDispatch, useSelector} from 'react-redux';
import {setFolder, addFile, setID, turnLoaderOff, changeUser, setProgress, updateData, setRequested} from './reducers/reducer';

import {LoadingFileList, LoadingFile, FileType, LoaderProgress, UserType} from './const/Consts';

const Connector = forwardRef<View>((props, ref) => {
  const wsprotocol = 'ws://';
  // const server = '127.0.0.1:8000';
  const server = '188.255.82.58:8000'

  const dispatch = useDispatch();

  const currentFolder: FileType = useSelector((state: CombinedState<{currentFolder: FileType}>) => state.currentFolder);
  const User: UserType = useSelector((state: CombinedState<{User: UserType}>) => state.User);

  const websocket = useRef<WebSocket>();
  const [lastMessage, setLastMessage] = useState<JSON>();
  const [fileLoader, setFileLoader] = useState<LoadingFileList>([]);
  const chunkSize = 10485760; // 1024 * 1024 * 10 = 10 Mb

  const loaderProgress = useSelector(state => state.ProgressReducer);

  useEffect(() => {
    websocket.current = new WebSocket(wsprotocol + server + '/ws');
    websocket.current.onmessage = (data: MessageEvent) =>
      setLastMessage(JSON.parse(data.data));
    websocket.current.onopen = async () => {
      const token = await AsyncStorage.getItem('token');
      const login = await AsyncStorage.getItem('login');
      dispatch(changeUser({login: login, token: token}));
      websocket.current.send(
        JSON.stringify({
          title: 'auth',
          login: login,
          token: token,
        }),
      );
    };
    return () => websocket.current.close();
  }, [websocket]);

  // Instead of onmessage (this solution works with hooks, while original websocket.onmessage can't)
  useEffect(() => {
    if (lastMessage?.status === 'failed') console.log('Error: ', lastMessage);
    switch (lastMessage?.title) {
      case 'auth': {
        if (lastMessage.status === 'ok') {
          AsyncStorage.setItem('token', lastMessage.token);
          AsyncStorage.setItem('login', lastMessage.login);
          dispatch(changeUser({login: lastMessage.login, token: lastMessage.token, authorized: true}));
          dispatch(setID(lastMessage.storage_ID));
        } else 
        if (lastMessage.status === 'fail') {
          websocket.current.send(
            JSON.stringify({
              title: 'auth',
              login: 'Кусь',
              password: '123',
            }),
          );
        }
        break;
      }
      case 'file': {
        if (lastMessage.file.is_folder) {
          dispatch(setFolder(lastMessage.file));
          dispatch(turnLoaderOff());
        } else if (lastMessage.file.is_image) {
          for (var fid = 0; fid < currentFolder.files.length; fid++) {
            if (currentFolder.files[fid].ID === lastMessage.file.ID) {
              var img = new Image();
              img.src = 'data:image/png;base64,'+lastMessage.file.file_data;
              img.addEventListener('load', async () => dispatch(updateData(lastMessage.file.ID, img)));
            }
          }
        }
        break;
      }
      case 'new file': {
        if ( lastMessage.status === 'ok' && lastMessage?.file.parent_ID === currentFolder.ID ) {
          dispatch(addFile(lastMessage.file));
          if (lastMessage.file.is_image) {
            get_file(lastMessage.file);
          }
        }
        break;
      }
      case 'init load file stream':
      case 'load file stream': {
        for (let fid = 0; fid < fileLoader.length; fid++) {
          if (fileLoader[fid].ID === lastMessage.ID || fileLoader[fid].load_ID === lastMessage.load_ID ) {
            setFileLoader((prevState: LoaderProgress) => {
              prevState[fid].progress = lastMessage.status;
              return [...prevState]
            });
          }
        }
      }
    }
  }, [lastMessage]);

  useEffect(() => {
    if (currentFolder.ID !== null) {
      get_file(currentFolder);
    }
  }, [currentFolder.ID]);

  useEffect(() => {
    for (let fid = 0; fid < currentFolder.files.length; fid++) {
      if (currentFolder.files[fid].is_image && currentFolder.files[fid].file_data === undefined && !currentFolder.files[fid].requested) {
        dispatch(setRequested(currentFolder.files[fid].ID));
        get_file(currentFolder.files[fid]);
        break;
      }
    }
  }, [currentFolder])

  const create_folder = async (name: string) => {
    websocket.current.send(
      JSON.stringify({
        title: 'create folder',
        parent_ID: currentFolder.ID,
        name: name,
      }),
    );
  };

  const send_files = async (files: FileList) => {
    var bytes: number = 0;
    var update: LoadingFileList = []
    for (let fid = 0; fid < files.length; fid++) {
      update.push({
        file: files[fid],
        loaded: false,
        parent: currentFolder.ID,
        status: 'waiting',
      })
      bytes += files[fid].size;
    }
    setFileLoader((prevState: LoadingFileList) => [...prevState, ...update]);
    dispatch(setProgress({bytes: loaderProgress.bytes + bytes, elements: loaderProgress.elements + files.length}));
  };

  useEffect(() => {
    // load files
    var file: LoadingFile | null = null;
    var failed_file: LoadingFile | null = null;
    for (var fid = 0; fid < fileLoader.length; fid++) {
      if (fileLoader[fid].loaded === false) { // && fileLoader[fid].progress !== 'waiting server response' <- extremly fast rerender, can't use this now :(
        if(fileLoader[fid].status === 'failed') failed_file = fileLoader[fid];
        else file = fileLoader[fid];
        break;
      } 
    };
    if (!file) file = failed_file;
    if (file) {
      const reader = new FileReader();
      if (file.file.size < chunkSize) {
        reader.onload = async (ev) => {
          websocket.current.send(
            JSON.stringify({
              title: 'load file',
              file_name: file.file.name,
              parent_ID: file.parent,
              modified: file.file.lastModified,
              stream_ID: fid,
              file: ev.target.result.replace(/^data:(.*)?;base64,/i, ''),
            })
          );
        };
        reader.readAsDataURL(file.file);
        setFileLoader((prevState: LoadingFileList) => {
          prevState[fid].loaded = true;
          prevState[fid].status = 'loaded';
          prevState[fid].stream_ID = fid;
          return [...prevState];
        });
        dispatch(setProgress({elements_loaded: loaderProgress.elements_loaded+1,  bytes_loaded: loaderProgress.bytes_loaded+file.file.size}));
      } else if (!file.progress) {
        websocket.current.send(
          JSON.stringify({
            title: 'init load file stream',
            file_name: file.file.name,
            parent_ID: file.parent,
            modified: file.file.lastModified,
            chunk_size: chunkSize, 
            file_size: file.file.size,
            stream_ID: fid,
          })
        );
        setFileLoader((prevState: LoadingFileList) => {
          prevState[fid].status = 'loading';
          prevState[fid].progress = 'waiting server response';
          prevState[fid].stream_ID = fid;
          prevState[fid].slice = 0;
          return [...prevState];
        });
      } else if (file.progress === 'ready to listen') {
        const start = file.slice * chunkSize;
        const end = Math.min(start + chunkSize, file.file.size);
        if (start >= file.file.size) {
          websocket.current.send(
            JSON.stringify({
              title: 'end load file stream',
              stream_ID: file.stream_ID,
            })
          );
          setFileLoader((prevState:LoadingFileList) => {
            prevState[fid].status = 'loaded';
            prevState[fid].loaded = true;
            prevState[fid].progress = undefined;
            prevState[fid].slice = undefined;
            return [...prevState];
          });
          dispatch(setProgress({elements_loaded: loaderProgress.elements_loaded+1}));
        } else {
          const slice = file.file.slice(start, end);
          reader.onload = async (ev) => {
            websocket.current.send(
              JSON.stringify({
                title: 'load file stream',
                stream_ID: file.stream_ID,
                file: ev.target.result.replace(/^data:(.*)?;base64,/i, ''),
              })
            );
          };
          reader.readAsDataURL(slice);
          setFileLoader((prevState: LoadingFileList) => {
            prevState[fid].progress = 'waiting server response';
            prevState[fid].slice++;
            return [...prevState];
          });
          dispatch(setProgress({bytes_loaded: loaderProgress.bytes_loaded+slice.size}));
        }
      }
    }
  }, [fileLoader])

  const get_file = async (file: FileType) => {
    if (file.is_folder || file.parent_ID === currentFolder.ID) {
      websocket.current.send(
        JSON.stringify({
          title: 'get file',
          ID: file.ID,
        })
      )
    }
  };

  useImperativeHandle(ref, () => ({
    create_folder(name: string) {
      create_folder(name);
    },
    send_files(files: FileList) {
      send_files(files);
    },
    get_file(file: FileType) {
      get_file(file);
    }
  }));

  return <></>;
});

export default Connector;