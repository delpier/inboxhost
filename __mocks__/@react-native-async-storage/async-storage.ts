// __mocks__/@react-native-async-storage/async-storage.ts
// Usado automaticamente pelo Jest quando se importa AsyncStorage

const storage: Record<string, string> = {};

const AsyncStorageMock = {
  setItem: jest.fn(async (key: string, value: string) => {
    storage[key] = value;
  }),
  getItem: jest.fn(async (key: string) => {
    return storage[key] ?? null;
  }),
  removeItem: jest.fn(async (key: string) => {
    delete storage[key];
  }),
  clear: jest.fn(async () => {
    Object.keys(storage).forEach(k => delete storage[k]);
  }),
  getAllKeys: jest.fn(async () => Object.keys(storage)),
  multiGet: jest.fn(async (keys: string[]) =>
    keys.map(k => [k, storage[k] ?? null])
  ),
  multiSet: jest.fn(async (pairs: [string, string][]) => {
    pairs.forEach(([k, v]) => { storage[k] = v; });
  }),
  _storage: storage,
  _reset: () => { Object.keys(storage).forEach(k => delete storage[k]); },
};

export default AsyncStorageMock;
