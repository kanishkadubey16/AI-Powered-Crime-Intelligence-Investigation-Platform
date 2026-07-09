import { createContext, useContext, useReducer, useCallback } from "react";
import { authService } from "../services/authService";

const AuthContext = createContext(null);

const initialState = {
  user: (() => {
    try { return JSON.parse(localStorage.getItem("user")); } catch { return null; }
  })(),
  token: localStorage.getItem("token") || null,
  loading: false,
  error: null,
};

const authReducer = (state, action) => {
  switch (action.type) {
    case "SET_LOADING":
      return { ...state, loading: action.payload, error: null };
    case "AUTH_SUCCESS":
      localStorage.setItem("token", action.payload.token);
      localStorage.setItem("user", JSON.stringify(action.payload.user));
      return {
        ...state,
        user: action.payload.user,
        token: action.payload.token,
        loading: false,
        error: null,
      };
    case "AUTH_ERROR":
      return { ...state, loading: false, error: action.payload };
    case "LOGOUT":
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      return { user: null, token: null, loading: false, error: null };
    case "UPDATE_USER":
      localStorage.setItem("user", JSON.stringify(action.payload));
      return { ...state, user: action.payload };
    default:
      return state;
  }
};

export const AuthProvider = ({ children }) => {
  const [state, dispatch] = useReducer(authReducer, initialState);

  const login = useCallback(async (credentials) => {
    dispatch({ type: "SET_LOADING", payload: true });
    try {
      const { data } = await authService.login(credentials);
      dispatch({ type: "AUTH_SUCCESS", payload: data });
      return data;
    } catch (err) {
      const message = err.response?.data?.message || "Login failed";
      dispatch({ type: "AUTH_ERROR", payload: message });
      throw err;
    }
  }, []);

  const signup = useCallback(async (userData) => {
    dispatch({ type: "SET_LOADING", payload: true });
    try {
      const { data } = await authService.signup(userData);
      dispatch({ type: "AUTH_SUCCESS", payload: data });
      return data;
    } catch (err) {
      const message = err.response?.data?.message || "Registration failed";
      dispatch({ type: "AUTH_ERROR", payload: message });
      throw err;
    }
  }, []);

  const logout = useCallback(() => {
    dispatch({ type: "LOGOUT" });
  }, []);

  const updateUser = useCallback((user) => {
    dispatch({ type: "UPDATE_USER", payload: user });
  }, []);

  return (
    <AuthContext.Provider value={{ ...state, login, signup, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
};
