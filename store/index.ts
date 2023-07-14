import {combineReducers, configureStore, Reducer} from "@reduxjs/toolkit";
import userReducer from "./userState";

const reducer = combineReducers({
    userReducer:userReducer
});
const store =  configureStore({
    reducer: reducer
})
export type RootState = ReturnType<typeof store.getState>
export default store
