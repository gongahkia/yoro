import { createContext, useContext } from 'react';
export const SinglishContext = createContext(false);
export const useSinglish = () => useContext(SinglishContext);
