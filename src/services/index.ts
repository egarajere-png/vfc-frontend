import type { Api } from '../lib/types';
import { mockApi } from './mockApi';
import { httpApi } from './httpApi';

export const isMock = import.meta.env.VITE_USE_MOCKS !== 'false';
export const api: Api = isMock ? mockApi : httpApi;
