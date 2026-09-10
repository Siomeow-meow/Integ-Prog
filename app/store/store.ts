import { configureStore } from "@reduxjs/toolkit";
import userReducer from "./user";
import postsReducer from "./post";

export const store = configureStore({
  reducer: {
    user: userReducer,
    posts: postsReducer,
  },
});
