class WS_Worker {
  websocket: WebSocket;
  server: string;
  is_open: boolean;
  constructor () {
    this.server = 'ws://188.255.82.58:8000/ws';
    this.is_open = false;
    this.open();
  }

  close () {
    this.websocket.close()
  }

  open () {
    console.log('INITING');
    this.websocket = new WebSocket(this.server);
    this.websocket.onopen = () => {
      this.is_open = true;
      self.postMessage({title: 'connection', status: 'open'});
    };
    this.websocket.onmessage = (message) => {
      const data = JSON.parse(message.data);
      switch (data.title) {

      }
      console.log('DATA:', data)
    };
    this.websocket.onclose = () => {
      this.is_open = false;
      self.postMessage({'title': 'connection', 'status': 'closed'});
    }
  };

  do (message: any) {
    if (message?.status === 'failed') console.log('Error: ', message); // remove in production
    console.log('do', message)
  }
};

var WS_Instance = new WS_Worker();
self.onmessage = (ev: MessageEvent) => {
  const message = ev.data;
  console.log('>', message);
  // if (WS_Instance.is_open) {
  //   WS_Instance.do(message);
  // } else if (message?.title === 'init') WS_Instance.open();
};
self.postMessage({title: 'Hello'});
