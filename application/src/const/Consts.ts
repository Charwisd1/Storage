export const colors = {
  main: '#241d21',            // rgba(36, 29, 33, 1)
  second: '#696069',          // rgba(105, 96, 105, 1)
  third: '#dad8d9',           // rgba(218, 216, 217, 1)
  info: '#0081ff',            // rgba(0, 129, 255, 1)
  danger: '#de3e44',          // rgba(222, 62, 68, 1)
}
export const fontSize = 20;
export const fontFamily = 'Roboto';

export type FileType = {
  ID: string | null;
  delete_time: number | null;
  deleted: boolean;
  editors: Array<number>;
  filename: string;
  files?: Array<FileType>;
  is_folder: boolean;
  is_image: boolean;
  file_data?: string;
  requested?: boolean;
  owner: number;
  parent_ID: string | null;
  size: number;
  tags: Array<string>;
  updated: string;
  loaded: string;
  url: string | null;
  viewers: Array<number>;
  lost?: true,
}

export type DimensionsType = { 
  width: Number,
  height: Number,
  fontSize: Number,
}

export type ProgressType = {
  elements: number, 
  elements_loaded: number, 
  bytes: number,
  bytes_loaded: number,
  progress: number,
}

export type UserType = {
  login: string | null,
  password: string | null,
  token: string | null,
  storage_ID: string | null,
  authorized: boolean,
}