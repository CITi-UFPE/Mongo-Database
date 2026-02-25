// @ts-ignore
import { createStore, combineReducers, applyMiddleware, Middleware } from 'redux';
import thunk from 'redux-thunk';
import authReducer from './reducers/authReducer.js';

const rootReducer = combineReducers({
  auth: authReducer
});

// @ts-ignore
export const store = createStore(
  rootReducer,
  applyMiddleware(thunk as unknown as Middleware)
);

export type RootState = ReturnType<typeof rootReducer>;