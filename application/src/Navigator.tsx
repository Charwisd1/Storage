// @ts-nocheck
import React, {useState, useEffect, PropsWithChildren} from 'react';
import {
  View,
  Text,
  TextInput,
  Button,
  TouchableWithoutFeedback,
  Animated,
  SafeAreaView,
  Pressable,
  ActivityIndicator,
  Dimensions,
  Platform,
} from 'react-native';
import Entypo from '@expo/vector-icons/Entypo';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import * as DocumentPicker from 'expo-document-picker';

import {useSelector, useDispatch} from 'react-redux';
import {CombinedState} from 'redux';
import {turnLoaderOn, turnLoaderOff, setID, changeDimensions} from './reducers/reducer';

import {colors, DimensionsType, fontFamily, ProgressType} from './const/Consts';
import RollingProgressBar from './components/ProgressBar/RollingProgressBar';

export default function Navigator (props: PropsWithChildren): JSX.Element {
  const [currentPage, setCurrentPage] = useState<string>('files');
  const [newFolderName, setNewFolderName] = useState<string>('');
  const [newFolderButtonDisabled, setNewFolderButtonDisabled] = useState<boolean>(true);
  const [hint, setHint] = useState<string>('');
  
  const Loader: boolean = useSelector((state: CombinedState<{Loader: boolean}>) => state.Loader);
  const Screen: DimensionsType = useSelector((state: CombinedState<{DimensionsReducer: DimensionsType}>) => state.DimensionsReducer);
  const LoaderProgress: ProgressType = useSelector((state: CombinedState<{ProgressReducer: ProgressType}>) => state.ProgressReducer);

  const dispatch = useDispatch();

  const styles = {
    main: {
      flex: 1,
      height: '100%',
      width: '100%',
      overflow: 'hidden',
    },
    text: {
      fontSize: Screen.fontSize,
      fontFamily: fontFamily,
      color: colors.main,
      fontWeight: 400,
    },
    title: {
      fontSize: Screen.fontSize,
      fontFamily: fontFamily,
      color: colors.main,
      fontWeight: 500,
    },
    micro: {
      fontSize: Screen.fontSize*0.7,
      fontFamily: fontFamily,
      color: colors.main,
      fontWeight: 400,
    },
    Header: {
      top: 0,
      left: 0,
      right: 0,
      height: 50,
      width: '100%',
      alignItems: 'center',
      justifyContent: 'space-between',
      flexDirection: 'row',
      backgroundColor: colors.second,
      zIndex: 100,
      elevation: 100,
      paddingLeft: 20,
      paddingRight: 20,
      borderBottomColor: colors.main,
      borderBottomWidth: 1,
    },
    Navigation: {
      flex: 1,
      height: '100%',
      width: '100%',
      padding: 10,
      backgroundColor: colors.main,
      zIndex: 1,
      elevation: 1,
    },
    SideBar: {
      main: {
        backgroundColor: colors.second,
        position: 'absolute',
        top: 0,
        left: 0,
        bottom: 0,
        width: Screen.width > 500 ? 400 : 300,
        paddingLeft: 100,
        height: '100%',
        zIndex: 98,
        elevation: 98,
        paddingTop: 60,
      },
      element: {
        flexDirection:'row',
        flexWrap:'wrap',
        height: 60,
        padding: 10,
        alignItems: 'center',
      },
      progressiveElement: {
        flexDirection:'column',
        flexWrap:'wrap',
        padding: 10,
      },
      progressiveChild: {
        flexDirection:'row',
        flexWrap:'wrap',
        alignItems: 'center',
      },
      progressiveSubChild: {
        flexDirection:'row',
        flexWrap:'wrap',
        alignItems: 'center',
        paddingLeft: 10,
        paddingTop: 5,
      },
      icon: {
        marginRight: 10,
        size: Screen.fontSize+10,
      }
    },
    BottomBar: {
      main: {
        backgroundColor: colors.second,
        position: 'absolute',
        left: 0,
        right: 0,
        width: '100%',
        height: Screen.height > 900 ? 450 : 350,
        zIndex: 99,
        elevation: 99,
        paddingBottom: 100,
        paddingTop: 30,
        transform: [{translateY: 100}],
        borderTopLeftRadius: 40,
        borderTopRightRadius: 40,
        flexDirection: 'column',
        alignItems: 'center',
      },
      title: {
        height: 50,
        alignItems: 'center',
        justifyContent: 'center',
      },
      elementsBox: {
        width: '100%',
        flexDirection: 'row',
        justifyContent: 'space-around',
        alignItems: 'center',
      },
      element: {
        flexDirection:'column',
        alignItems: 'center',
        justifyContent: 'center',
      },
      icon: {
        size: Number(Math.max(Math.min(Screen.width / 12, 90), 60)),
      }
    },
    SlidingDialog: {
      main: {
        backgroundColor: colors.second,
        position: 'absolute',
        width: 400,
        height: 250,
        zIndex: 99,
        elevation: 99,
        borderRadius: 20,
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        marginLeft: '50%',
        transform: [{translateX: '-50%'}, {translateY: '-50%'}],
      },
      input: {
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        height: 40,
        padding: 5,
        width: 300,
        borderBottomColor: colors.main,
        borderBottomWidth: 1,
      },
      buttons: {
        flexDirection: 'row',
        justifyContent: 'right',
        width: '100%',
        paddingLeft: 40,
        paddingRight: 40,
        paddingTop: 40,
      },
      button: {
        marginLeft: 20,
        width: 90,
      }
    },
    hint: {
      color: 'red',
    }
  }

  const SideBar = {
    x: new Animated.Value(-styles.SideBar.main.width),
    pulled: false,
    pullOut: async () => {
      Animated.spring(SideBar.x, {
        toValue: -100,
        useNativeDriver: true,
      }).start();
      SideBar.pulled = true;
    },
    pullIn: async () => {
      Animated.spring(SideBar.x, {
        toValue: -styles.SideBar.main.width,
        useNativeDriver: true,
      }).start();
      SideBar.pulled = false;
    },
    toggle: async () => SideBar.pulled ? SideBar.pullIn() : SideBar.pullOut(),
  };

  const BottomBar = {
    y: new Animated.Value(-styles.BottomBar.main.height),
    pulled: false,
    pullOut: async () => {
      Animated.spring(BottomBar.y, {
        toValue: 0,
        useNativeDriver: true,
      }).start();
      BottomBar.pulled = true;
    },
    pullIn: async () => {
      Animated.spring(BottomBar.y, {
        toValue: -styles.BottomBar.main.height,
        useNativeDriver: true,
      }).start();
      BottomBar.pulled = false;
    },
    toggle: async () => BottomBar.pulled ? BottomBar.pullIn() : BottomBar.pullOut(),
  };

  const SlidingDialog = {
    y: new Animated.Value(0),
    pulled: false,
    pullOut: async () => {
      Animated.spring(SlidingDialog.y, {
        toValue: 1,
        useNativeDriver: true,
      }).start();
      SlidingDialog.pulled = true;
    },
    pullIn: async () => {
      Animated.spring(SlidingDialog.y, {
        toValue: 0,
        useNativeDriver: true,
      }).start();
      SlidingDialog.pulled = false;
    }
  };
  
  const changePage = async (page: string) => {
    setCurrentPage(page);
    SideBar.pullIn();
  };
  
  const pickDocument = async (imgOnly: boolean = false, folder: boolean = false) => {
    // specific file-picker for web (support files with size > 500mb)
    if (Platform.OS === 'web') {
      const input = document.createElement('input');
      input.style.display = 'none';
      input.setAttribute('type', 'file');
      input.setAttribute('readonly', 'readonly');
      input.setAttribute('multiple', 'multiple');
      document.body.appendChild(input);
      folder && input.setAttribute('directory',  'directory');
      folder && input.setAttribute('webkitdirectory', 'webkitdirectory');
      input.setAttribute('accept', imgOnly ? 'image/*' : '*/*');
      input.addEventListener('change', () => {
        props.connection.current.send_files(input.files);
        document.body.removeChild(input);
      });
      input.dispatchEvent(new MouseEvent('click'));
    } else {
      const result = await DocumentPicker.getDocumentAsync();
      props.connection.current.send_files(result.output);
    }
  }

  useEffect(() => {
    function refreshDimensions (dimensions) {
      const width = Dimensions.get('window').width;
      const height = Dimensions.get('window').height;
      const fontSize = Number(16 * (Math.max(width, height) / 450) * 0.5);
      dispatch(changeDimensions(width, height, fontSize));
    };
    refreshDimensions();
    Dimensions.addEventListener('change', refreshDimensions);
  }, []);

  useEffect(() => {
    const illegalChars = /[<>:"/\|?*/]/;
    if (illegalChars.test(newFolderName)) {
      setHint('Имя папки не может содержать следующие символы:\n< > : " / \ | ? * /')
      setNewFolderButtonDisabled(true)
    } else {
      if (newFolderName === '') setNewFolderButtonDisabled(true)
      else setNewFolderButtonDisabled(false)
      hint && setHint('')
    }
  }, [newFolderName]);

  useEffect(() => {
    SideBar.pullIn();
  }, [currentPage]);

  return (
    <View style={styles.main}>
      {/* Header */}
      <View style={styles.Header}>
        <Pressable onPress={() => {SideBar.toggle(); BottomBar.pullIn(); SlidingDialog.pullIn()}}>
          <Entypo name="menu" size={40} color={colors.main} />
        </Pressable>

        {(currentPage === 'files' && !Loader) && 
        <Pressable onPress={() => {BottomBar.toggle(); SideBar.pullIn(); SlidingDialog.pullIn()}} >
          <Entypo name="dots-three-vertical" size={30} color={colors.main} />
        </Pressable>
        }
      </View>

      {/* Sidebar */}
      <Animated.View style={{...styles.SideBar.main, marginLeft: SideBar.x}}>
        <Pressable underlayColor={colors.third} style={styles.SideBar.element} onPress={() => {dispatch(turnLoaderOn()); dispatch(setID('')); changePage('files')}}>
          <MaterialIcons name="storage" size={styles.SideBar.icon.size} color={colors.main} style={styles.SideBar.icon} />
          <Text style={styles.title}>Файлы</Text>
        </Pressable>

        <Pressable underlayColor={colors.third} style={styles.SideBar.element} onPress={() => {dispatch(turnLoaderOff()); changePage('profile')}}>
          <MaterialIcons name="account-circle" size={styles.SideBar.icon.size} color={colors.main} style={styles.SideBar.icon} />
          <Text style={styles.title}>Профиль</Text>
        </Pressable>

        <Pressable underlayColor={colors.third} style={styles.SideBar.element} onPress={() => {dispatch(turnLoaderOff()); changePage('settings')}}>
          <MaterialIcons name="settings" size={styles.SideBar.icon.size} color={colors.main} style={styles.SideBar.icon} />
          <Text style={styles.title}>Настройки</Text>
        </Pressable>

        <Pressable underlayColor={colors.third} style={styles.SideBar.element} onPress={() => {dispatch(turnLoaderOff()); changePage('settings')}}>
          <MaterialIcons name="wb-cloudy" size={styles.SideBar.icon.size} color={colors.main} style={styles.SideBar.icon} />
          <Text style={styles.title}>Хранилище</Text>
        </Pressable>

        {LoaderProgress.elements > 0 && (
          <View style={styles.SideBar.progressiveElement}>
            <View style={styles.SideBar.progressiveChild}>
              <RollingProgressBar style={styles.SideBar.icon} progress={LoaderProgress.progress} filledColor={colors.main} unfilledColor={colors.third} size={styles.SideBar.icon.size} />
              <Text style={styles.title}>Загрузка</Text>
            </View>
            <View style={styles.SideBar.progressiveSubChild}>
              <Text style={styles.micro}>{LoaderProgress.elements_loaded} из {LoaderProgress.elements} файлов загружено</Text>
            </View>
          </View>
        )}
      </Animated.View>

      {/* Current page */}
      <SafeAreaView style={styles.Navigation}>
        <TouchableWithoutFeedback style={styles.main} onPress={() => {SideBar.pullIn(); BottomBar.pullIn(); SlidingDialog.pullIn()}}>
          {Loader ? <ActivityIndicator size='large' color={colors.second} style={styles.main} />
          : <View style={styles.main}>
              {props.children.map(element => element.key === currentPage && element)}
            </View>
          }
        </TouchableWithoutFeedback>
      </SafeAreaView>

      {/* Bottom Menu */}
      <Animated.View style={{...styles.BottomBar.main, bottom: BottomBar.y}}>
        <View style={styles.BottomBar.title}>
          <Text style={styles.title}>Новый объект</Text>
        </View>
        <View style={styles.BottomBar.elementsBox}>
          <Pressable underlayColor={colors.third} style={styles.BottomBar.element} onPress={() => {SlidingDialog.pullOut(); BottomBar.pullIn()}}>
            <Entypo name="folder" size={styles.BottomBar.icon.size} color={colors.main} />
            <Text style={styles.micro}>Папка</Text>
          </Pressable>

          <Pressable underlayColor={colors.third} style={styles.BottomBar.element} onPress={() => {pickDocument(false); BottomBar.pullIn()}}>
            <Entypo name="text-document" size={styles.BottomBar.icon.size} color={colors.main} />
            <Text style={styles.micro}>Файл</Text>
          </Pressable>

          <Pressable underlayColor={colors.third} style={styles.BottomBar.element} onPress={() => {pickDocument(true); BottomBar.pullIn()}}>
            <Entypo name="images" size={styles.BottomBar.icon.size} color={colors.main} />
            <Text style={styles.micro} numberOfLines={2} ellipsizeMode={'tail'}>Изображение</Text>
          </Pressable>
        </View>
      </Animated.View>

      {/* Sliding Dialog */}
      <Animated.View style={{...styles.SlidingDialog.main, top: SlidingDialog.y.interpolate({inputRange: [0, 1], outputRange:[-400, Number(Screen.height/2)]})}}>
        <Text style={styles.text}>Новая папка</Text>
        <Text style={{...styles.hint, ...styles.micro}}>{hint}</Text>
        <TextInput style={styles.SlidingDialog.input} onChangeText={setNewFolderName} value={newFolderName} placeholder='Имя папки' keyboardType='default' autoCorrect={false} />
        <View style={styles.SlidingDialog.buttons}>
          <View style={styles.SlidingDialog.button}>
            <Button onPress={() => {props.connection.current.create_folder(newFolderName); SlidingDialog.pullIn()}} title='Создать' color={colors.info} disabled={newFolderButtonDisabled} accessibilityLabel='Нажмите чтобы создать новую папку' />
          </View>
          <View style={styles.SlidingDialog.button}>
            <Button onPress={SlidingDialog.pullIn} title='Отмена' color={colors.danger} accessibilityLabel='Нажмите чтобы отменить создание новой папки' />
          </View>
        </View>
      </Animated.View>
    </View>
  )
}
