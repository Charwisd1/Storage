// @ts-nocheck
import React, {useEffect, useMemo, useState} from 'react';
import {
  View,
  Text,
  useWindowDimensions,
  StyleSheet,
  ViewStyle,
  TextStyle,
  FlatList,
  Pressable,
  Image,
} from 'react-native';
import Entypo from '@expo/vector-icons/Entypo';
import Icon from '@expo/vector-icons/Ionicons';

import {useSelector, useDispatch} from 'react-redux';
import {CombinedState} from 'redux';
import {setID, turnLoaderOn} from './reducers/reducer';

import {colors, fontSize, fontFamily, FileType} from './const/Consts';

function bytesConventer(Bytes: number) {
  var i = Bytes > 0 ? Math.floor(Math.log(Bytes) / Math.log(1024)) : 0;
  if (Bytes / Math.pow(1024, i) > 1000) {
    i++;
  }
  return (
    (Bytes / Math.pow(1024, i)).toFixed(2) +
    ' ' +
    ['B', 'kB', ' MB', ' GB', ' TB', 'PB', 'EB', 'ZB', 'YB'][i]
  );
}

const Img = (props): JSX.Element => {
  const currentFolder: FileType = useSelector((state: CombinedState<{currentFolder: FileType}>) => state.currentFolder);
  const ID = props.item.ID;
  const [index, setIndex] = useState<number>();
  
  useEffect(() => {
    for (let fid = 0; fid < currentFolder.files.length; fid++) {
      if (currentFolder.files[fid].ID === ID) {
        setIndex(fid);
        break;
      }
    }
  }, []);

  return (
    <View style={props.style}>
      <Image source={currentFolder.files[index]?.file_data} style={{flex: 1, backgroundColor: 'black'}} resizeMode={'contain'} />
    </View>
  )
};

const Files = (props): JSX.Element => {
  interface Styles {
    main: FlatList;
    emptyMain: ViewStyle;
    emptyText: TextStyle;
    file: Pressable;
    fileinfo: View;
    filename: Text;
    filesize: Text;
    filetime: Text;
    dots: Entypo;
  }

  const styles = StyleSheet.create<Styles>({
    main: {
      flex: 1,
      height: '100%',
      width: '100%',
      position: 'absolute',
    },
    emptyMain: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
    },
    emptyText: {
      fontSize: Number(fontSize / useWindowDimensions().fontScale),
      fontFamily: fontFamily,
      color: colors.second,
    },
    file: {
      flex: 1,
      flexDirection: 'row',
      padding: 15,
      borderBottomWidth: 1,
      borderBottomColor: '#959595',
      alignItems: 'center',
      flexWrap: 'wrap',
    },
    extblock: {
      alignItems: 'center',
      justifyContent: 'center',
    },
    filext: {
      color: colors.second,
      position: 'absolute',
      flex: 1,
      marginTop: 10,
      fontWeight: 600,
      marginLeft: -5,
    },
    img: {
      width: 100,
      height: 100,
    },
    fileinfo: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
    },
    filename: {
      color: colors.second,
      padding: 10,
      paddingLeft: 30,
    },
    filesize: {
      color: colors.second,
      padding: 10,
      paddingLeft: 30,
      textAlign: 'center',
      width: 140,
    },
    filetime: {
      color: colors.second,
      padding: 10,
      paddingLeft: 30,
    },
    dots: {
      marginLeft: 'auto',
    },
    fullscreen: {
      main: {
        position: 'absolute',
        
      },
    }
  });

  const currentFolder: FileType = useSelector((state: CombinedState<{currentFolder: FileType}>) => state.currentFolder);

  const dispatch = useDispatch();

  const renderItem = (item: FileType) =>
    item.is_folder ? (
      <Pressable
        key={item.ID}
        style={styles.file}
        onPress={() => {
          dispatch(turnLoaderOn());
          dispatch(setID(item.ID));
        }}>
        <Entypo name="folder" size={100} color={colors.second} />
        <View style={styles.fileinfo}>
          <Text style={styles.filename}>{item.filename}</Text>
          <Pressable style={styles.dots} onPress={{}}>
            <Entypo name="dots-three-horizontal" size={20} style={{}} color={colors.second} />
          </Pressable>
          <Text style={styles.filesize}>{bytesConventer(item.size)}</Text>
          <Text style={styles.filetime}>{item.updated}</Text>
        </View>
      </Pressable>
    ) :
    item.is_image ? (
      <Pressable key={item.ID} style={styles.file}>
        <Img item={item} style={styles.img}/>
        <View style={styles.fileinfo}>
          <Text style={styles.filename}>{item.filename}</Text>
          <Pressable style={styles.dots} onPress={{}}>
            <Entypo name="dots-three-horizontal" size={20} style={{}} color={colors.second} />
          </Pressable>
          <Text style={styles.filesize}>{bytesConventer(item.size)}</Text>
          <Text style={styles.filetime}>{item.updated}</Text>
        </View>
      </Pressable>
    ) : (
      <Pressable key={item.ID} style={styles.file}>
        <View style={styles.extblock}>
          <Icon name="document-outline" size={100} style={{}} color={colors.second} />
          {item.filename.split('.').length > 1 &&
            <Text style={styles.filext}>{item.filename.split('.').pop().length <= 5 ? item.filename.split('.').pop() : item.filename.split('.').pop().substring(0, 4) + '...'}</Text>
          }
        </View>
        <View style={styles.fileinfo}>
          <Text style={styles.filename}>{item.filename}</Text>
          <Pressable style={styles.dots} onPress={{}}>
            <Entypo name="dots-three-horizontal" size={20} style={{}} color={colors.second} />
          </Pressable>
          <Text style={styles.filesize}>{bytesConventer(item.size)}</Text>
          <Text style={styles.filetime}>{item.updated}</Text>
        </View>
      </Pressable>
    );

  return (
    <View style={styles.main}>
      {
        currentFolder.files.length ? (
          <FlatList
            style={styles.main}
            initialNumToRender={7}
            data={currentFolder.files}
            keyExtractor={(item: FileType) => item.ID}
            renderItem={({item}) => renderItem(item)}
          />
        ) : (
          <View style={styles.emptyMain}>
            <Text style={styles.emptyText}>{'Туть пока пусто (-_-)'}</Text>
          </View>
        )
      }
      <View>

      </View>
    </View>
  )
};

export default Files;
