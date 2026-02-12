
import { configureStore } from '@reduxjs/toolkit';
import { combineReducers } from 'redux';
import {
  persistStore,
  persistReducer,
  FLUSH,
  REHYDRATE,
  PAUSE,
  PERSIST,
  PURGE,
  REGISTER,
} from 'redux-persist';
import storage from 'redux-persist/lib/storage';

import CustomizerReducer from './customizer/CustomizerSlice';
import EcommerceReducer from './apps/eCommerce/ECommerceSlice';
import ChatsReducer from './apps/chat/ChatSlice';
import NotesReducer from './apps/notes/NotesSlice';
import EmailReducer from './apps/email/EmailSlice';
import TicketReducer from './apps/tickets/TicketSlice';
import ContactsReducer from './apps/contacts/ContactSlice';
import UserProfileReducer from './apps/userProfile/UserProfileSlice';
import BlogReducer from './apps/blog/BlogSlice';

import {
  useDispatch as useAppDispatch,
  useSelector as useAppSelector,
  TypedUseSelectorHook,
} from 'react-redux';

const persistConfig = {
  key: 'root', // The key for your entire persisted state in localStorage. Can be anything.
  storage,
  whitelist: [
    'customizer',   // Definitely want to persist customizer settings.
    'ecommerceReducer', // Maybe some e-commerce cart/wishlist state?
    // 'chatReducer', // Decide if you want to persist chat state.
    // 'notesReducer', // Decide if you want to persist notes state.
    // 'emailReducer', // Decide if you want to persist email state.
    // 'ticketReducer', // Decide if you want to persist ticket state.
    // 'contactsReducer', // Decide if you want to persist contacts state.
    // 'userpostsReducer', // Decide if you want to persist user profile posts state.
    // 'blogReducer', // Decide if you want to persist blog state.
  ],
};

// Combine all your reducers into a root reducer.
// This matches your existing rootReducer structure.
const rootReducer = combineReducers({
  customizer: CustomizerReducer,
  ecommerceReducer: EcommerceReducer,
  chatReducer: ChatsReducer,
  emailReducer: EmailReducer,
  notesReducer: NotesReducer,
  contactsReducer: ContactsReducer,
  ticketReducer: TicketReducer,
  userpostsReducer: UserProfileReducer,
  blogReducer: BlogReducer,
});

// Create a persisted reducer using your rootReducer and persistConfig.
const persistedReducer = persistReducer(persistConfig, rootReducer);

export const store = configureStore({
  reducer: persistedReducer, // Use the persisted reducer here
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      // These serializableCheck ignore specific Redux-Persist actions
      // to prevent warnings about non-serializable values.
      serializableCheck: {
        ignoredActions: [FLUSH, REHYDRATE, PAUSE, PERSIST, PURGE, REGISTER],
      },
    }),
});

// Create a persistor object from your store.
// This handles the actual saving and loading process.
export const persistor = persistStore(store);

export type AppState = ReturnType<typeof rootReducer>;
export type AppDispatch = typeof store.dispatch;

// Your existing useDispatch and useSelector hooks (these don't change)
export const { dispatch } = store; // Note: Directly exporting dispatch from store can be problematic in some setups.
// Using useDispatch hook is generally preferred.
export const useDispatch = () => useAppDispatch<AppDispatch>();
export const useSelector: TypedUseSelectorHook<AppState> = useAppSelector;

export default store;
