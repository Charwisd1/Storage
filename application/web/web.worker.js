class WS_Worker {
  websocket;
  server;
  is_open;
  files_status;
  constructor () {
    this.server = 'ws://188.255.82.58:8000/ws';
    this.is_open = false;
    this.open();
    this.files_status = [];
  }

  async close () {
    this.websocket.close()
  }

  async open () {
    if (this.is_open) this.close();
    this.websocket = new WebSocket(this.server);
    this.websocket.onopen = async () => {
      this.is_open = true;
      self.postMessage({title: 'connection', status: 'open'});
    };
    this.websocket.onmessage = async (ev) => {
      const message = await JSON.parse(ev.data);
      if (message?.status === 'fail') console.log('Error: ', message); // remove in production
      switch (message.title) {
        case 'auth': 
        case 'new file': {
          self.postMessage(message);
          break;
        }
        case 'file': {
          if (message?.file?.is_folder) self.postMessage(message)
          else if (message?.file?.is_image) {
            message.file.file_data = 'data:image/png;base64,'+message.file.file_data;
            self.postMessage(message);
          }
          break;
        }
      }
    };
    this.websocket.onclose = async () => {
      this.is_open = false;
      self.postMessage({'title': 'connection', 'status': 'closed'});
    };
  };

  async do (message) {
    switch (message?.title) {
      case 'auth': {
        this.websocket.send(
          JSON.stringify({
            title: 'auth',
            login: message.login,
            password: message.password,
            token: message.token,
          }),
        );
        break;
      }
      case 'get file': {
        this.websocket.send(
          JSON.stringify({
            title: 'get file',
            ID: message.ID,
          })
        );
        break;
      }
      case 'create folder': {
        this.websocket.send(
          JSON.stringify({
            title: 'create folder',
            parent_ID: message.parent_ID,
            name: message.name,
          }),
        );
        break;
      }
      case 'send files': {
        for (let fid = 0; fid < message.files.length; fid++) {
          this.files_status.push({
            file: message.files[fid],
            loaded: false,
            parent: currentFolder.ID,
            status: 'waiting',
          })
        }
      }
      case 'load files': {
        
      }
    }
  }
};

var WS_Instance = new WS_Worker();
self.onmessage = async (ev) => {
  const message = ev.data;
  if (WS_Instance.is_open) WS_Instance.do(message);
  else if (message?.title === 'init') WS_Instance.open();
};