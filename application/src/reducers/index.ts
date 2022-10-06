import {combineReducers, createStore, applyMiddleware} from 'redux';
import {currentFolderReducer, DimensionsReducer, LoaderReducer, ProgressReducer, UserReducer} from './reducer';
import thunk from 'redux-thunk';

// import { composeWithDevTools } from "redux-devtools-extension";

const rootReducer = combineReducers({
  currentFolder: currentFolderReducer,
  LoaderReducer: LoaderReducer,
  User: UserReducer,
  ProgressReducer: ProgressReducer,
  DimensionsReducer: DimensionsReducer,
});

export const store = createStore(rootReducer, applyMiddleware(thunk));
