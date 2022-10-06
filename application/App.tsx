// @ts-nocheck
import React, {useEffect, useRef, useMemo} from 'react';
import {View, Text, SafeAreaView, AppRegistry} from 'react-native';
import {Provider} from 'react-redux';

import Profile_Screen from './src/Profile';
import Navigator from './src/Navigator';
import Connector from './src/Connector';
import Files from './src/Files';
import ImprovedConnector from './src/AlternativeConnector';

import {store} from './src/reducers';

const App = () => {
  const connector = useRef(null);
  const MemoizedConnector = useMemo(() => <ImprovedConnector ref={connector} />, [])
  const MemoizedFiles = useMemo(() => <Files key={'files'} connection={connector} />, [])

  return (
    <Provider store={store}>
      <SafeAreaView style={{flex: 1, height: '100%', width: '100%', overflow: 'hidden'}}>
        {MemoizedConnector}
        <Navigator connection={connector}>
          {MemoizedFiles}
          <View key={'settings'}>
            <Text>Settings</Text>
          </View>
          <Profile_Screen key={'profile'} />
        </Navigator>
      </SafeAreaView>
    </Provider>
  );
};

export default App;
