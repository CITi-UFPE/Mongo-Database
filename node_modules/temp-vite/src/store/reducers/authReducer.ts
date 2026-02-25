import {
  LOGIN_WITH_OAUTH_LOADING,
  LOGIN_WITH_OAUTH_SUCCESS,
  LOGIN_WITH_OAUTH_FAIL,
  LOGOUT_SUCCESS,
  LOGIN_WITH_EMAIL_LOADING,
  LOGIN_WITH_EMAIL_SUCCESS,
  LOGIN_WITH_EMAIL_FAIL,
  ME_LOADING,
  ME_SUCCESS,
  ME_FAIL,
} from '../types';

interface AuthState {
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  me: any;
  error: any;
  appLoaded: boolean;
}

interface AuthAction {
  type: string;
  payload?: any;
}

const initialState: AuthState = {
  token: null,
  isAuthenticated: false,
  isLoading: false,
  me: null,
  error: null,
  appLoaded: false,
};

export default function authReducer(state: AuthState = initialState, { type, payload }: AuthAction): AuthState {
  switch (type) {
    case ME_LOADING:
      return {
        ...state,
        isLoading: true,
        appLoaded: false,
        error: null,
      };
    case LOGIN_WITH_EMAIL_LOADING:
    case LOGIN_WITH_OAUTH_LOADING:
      return {
        ...state,
        isLoading: true,
        error: null,
      };
    case LOGIN_WITH_EMAIL_SUCCESS:
    case LOGIN_WITH_OAUTH_SUCCESS:
      return {
        ...state,
        isAuthenticated: true,
        isLoading: false,
        token: payload.token,
        me: payload.me,
        error: null,
      };
    case ME_SUCCESS:
      return {
        ...state,
        isAuthenticated: true,
        isLoading: false,
        me: payload.me,
        error: null,
        appLoaded: true,
      };
    case ME_FAIL:
      return {
        ...state,
        isAuthenticated: false,
        isLoading: false,
        me: null,
        error: null,
        appLoaded: true,
      };
    case LOGOUT_SUCCESS:
    case LOGIN_WITH_EMAIL_FAIL:
      return {
        ...state,
        token: null,
        me: null,
        isAuthenticated: false,
        isLoading: false,
        error: null,
      };
    default:
      return state;
  }
}