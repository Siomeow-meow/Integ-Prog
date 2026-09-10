import { createSlice } from "@reduxjs/toolkit";

const postsSlice = createSlice({
  name: "posts",
  initialState: {
    posts: [] as any[],
  },
  reducers: {
    setPosts: (state, action) => {
      state.posts = action.payload
    },

    addPost: (state, action) => {
      state.posts.unshift(action.payload);
    },

    removePost: (state, action) => {
      state.posts = state.posts.filter((post) => post.id !== action.payload);
    },
  },
});

export const { setPosts, addPost, removePost } = postsSlice.actions;
export default postsSlice.reducer;
