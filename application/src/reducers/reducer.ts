import { FileType, DimensionsType, ProgressType, UserType} from "../const/Consts"

// current folder reducer
const SET_FOLDER = 'SET_FOLDER'
const ADD_FILE = 'ADD_FILE'
const SET_ID = 'SET_ID'
const UPDATE_DATA = 'UPDATE_DATA'
const SET_REQUESTED = 'SET_REQUESTED'
type FolderAction = {
    type: string,
    file?: FileType,
    updateData?: {ID: string, file: File | undefined},
    ID?: string,
}
const defaultCurentFolder: FileType = {
    ID: null,
    delete_time: null,
    deleted: false,
    editors: [],
    filename: '',
    files: [],
    is_folder: true,
    is_image: false,
    owner: -1,
    parent_ID: null,
    size: 0,
    tags: [],
    loaded: '',
    updated: '',
    url: null,
    viewers: [],
}
export const setFolder = (file: FileType) => ({type: SET_FOLDER, file: file})
export const addFile = (file: FileType) => ({type: ADD_FILE, file: file})
export const setID = (ID: string | null) => ({type: SET_ID, file: {...defaultCurentFolder, ID: ID}})
export const setRequested = (ID: string) => ({type: SET_REQUESTED, ID: ID})
export const updateData = (ID: string, file_data: string = null) => ({type: UPDATE_DATA, file: {ID: ID, file_data: file_data}});
export function currentFolderReducer(state: FileType = defaultCurentFolder, action: FolderAction): FileType {
    switch (action.type) {
        case SET_FOLDER:
            return {
                ...state,
                ...action.file,
            }
        case ADD_FILE:
            for (var fID in state.files) {
                if (state.files[fID].ID === action.file.ID) {
                    state.files[fID] = action.file
                    return {...state}
                }
            }
            state.files.push(action.file)
            return {...state}
        case SET_ID:
            return {...action.file}
        case UPDATE_DATA:
            for (var fID in state.files) {
                if (state.files[fID].ID === action.file.ID) {
                    if (action.file.file_data !== null) {
                        state.files[fID].file_data = action.file.file_data;
                        state.files[fID].requested = true;
                    }
                    return {...state}
                }
            }
        case SET_REQUESTED:
            for (var fID in state.files) {
                if (state.files[fID].ID === action.ID) {
                    state.files[fID].requested = true;
                    return {...state}
                }
            }
        default: 
            return state
    }
}

// loader reducer
const TURN_ON = 'ON';
const TURN_OFF = 'OFF';
type LoaderAction = {
    type: string
}
export const turnLoader = (type: string) => ({type: type===TURN_ON ? TURN_ON : type===TURN_OFF ? TURN_OFF : ''})
export const turnLoaderOn = () => ({type: TURN_ON})
export const turnLoaderOff = () => ({type: TURN_OFF})
export function LoaderReducer(state: boolean = true, action: LoaderAction): boolean {
    switch (action.type) {
        case TURN_ON:
            return true
        case TURN_OFF:
            return false
        default: 
            return state
    }
}

// loading progress reducer
const SET_PROGRESS = 'SET_PROGRESS';
type ProgressAction = {
    type: string,
    elements: number, 
    elements_loaded: number, 
    bytes: number,
    bytes_loaded: number,
}
const defaultProgressAction = {
    elements: 0, 
    elements_loaded: 0, 
    bytes: 0,
    bytes_loaded: 0,
    progress: 0,
}
export const setProgress = ({elements = null, elements_loaded = null, bytes = null, bytes_loaded = null}): ProgressAction => ({type: SET_PROGRESS, elements: elements, elements_loaded: elements_loaded, bytes: bytes, bytes_loaded});
export function ProgressReducer(state: ProgressType = defaultProgressAction, action: ProgressAction): ProgressType {
    switch (action.type) {
        case SET_PROGRESS:
            if (action.bytes !== null) state.bytes = action.bytes;
            if (action.bytes_loaded !== null) state.bytes_loaded = action.bytes_loaded;
            if (action.elements !== null) state.elements = action.elements;
            if (action.elements_loaded !== null) state.elements_loaded = action.elements_loaded;
            state.progress = action.bytes === 0 ? 0 : state.bytes_loaded/state.bytes;
            return {... state}
        default:
            return state
    }
}

// dimentions reducer
const CHANGE = 'CHANGE'
const defaultDimensions = {
    width: 0,
    height: 0,
    fontSize: 0,
}
type DimensionsUpdate = {
    type: string,
    width: Number,
    height: Number,
    fontSize: Number,
}
export const changeDimensions = (width: Number, height: Number, fontSize: Number) => ({type: CHANGE, width: width, height: height, fontSize: fontSize});
export function DimensionsReducer(state: DimensionsType = defaultDimensions, action: DimensionsUpdate): DimensionsType {
    switch (action.type) {
        case CHANGE:
            return {width: action.width, height: action.height, fontSize: action.fontSize}
        default: 
            return state
    }
}

// User reducer
const SET_LOGIN = 'SET_LOGIN';
const SET_PASSWORD = 'SET_PASSWORD';
const SET_TOKEN = 'SET_TOKEN';
const SET_STORAGE_ID = 'SET_STORAGE_ID';
const SET_AUTHORIZED = 'SET_AUTHORIZED';
type UserUpdate = {
    type: Array<string>,
    value: Array<string>,
}
const defaultUser: UserType = {
    login: null,
    password: null,
    token: null,
    storage_ID: '',
    authorized: false,
}
export const changeUser = ({login = null, password = null, storage_ID = null, token = null, authorized = null}: {login: string | null, password: string | null, token: string | null, storage_ID: string | null, authorized: boolean | null}): UserUpdate => {
    var type: UserUpdate['type'] = [];
    var value: UserUpdate['value'] = [];
    if (login !== null) {
        type.push(SET_LOGIN);
        value.push(login);
    }
    if (password !== null) {
        type.push(SET_PASSWORD);
        value.push(password);
    }
    if (token !== null) {
        type.push(SET_TOKEN);
        value.push(token);
    }
    if (storage_ID !== null) {
        type.push(SET_STORAGE_ID);
        value.push(storage_ID);
    }
    if (authorized !== null) {
        type.push(SET_AUTHORIZED);
        value.push(authorized ? 'true' : '');
    }
    return {type: type, value: value};
}
export function UserReducer (state: UserType = defaultUser, action: UserUpdate): UserType {
    for (var i = 0; i < action.type.length; i++) {
        switch (action.type[i]) {
            case SET_LOGIN:
                state.login = action.value[i];
                break;
            case SET_PASSWORD:
                state.password = action.value[i];
                break;
            case SET_TOKEN:
                state.token = action.value[i];
                break;
            case SET_STORAGE_ID:
                state.storage_ID = action.value[i];
            case SET_AUTHORIZED:
                state.authorized = Boolean(action.value[i]);
        }
    } 
    return state;
}