import {createSlice} from "@reduxjs/toolkit"

interface InitialUserState {
    login: boolean
}

const initialUserState: InitialUserState = {
    login: false
}
export const userStore = createSlice({
    initialState: initialUserState,
    name: 'userState',
    reducers: {
        setLoginState(state) {
            state.login = true
        },
        clearUser(state) {
            state.login = false
        }
    }
})
export const {setLoginState, clearUser} = userStore.actions

export default userStore.reducer
