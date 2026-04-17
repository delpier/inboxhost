// __mocks__/expo-file-system.ts

export const documentDirectory = 'file:///documents/';
export const cacheDirectory = 'file:///cache/';

export const downloadAsync = jest.fn(async (url: string, fileUri: string) => ({
  uri: fileUri,
  status: 200,
  headers: {},
  md5: undefined,
}));

export const readAsStringAsync = jest.fn(async (_uri: string) => '');

export const writeAsStringAsync = jest.fn(async () => {});
export const deleteAsync = jest.fn(async () => {});
export const getInfoAsync = jest.fn(async () => ({ exists: true, isDirectory: false, size: 0, modificationTime: 0 }));
export const makeDirectoryAsync = jest.fn(async () => {});
