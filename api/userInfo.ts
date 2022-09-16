import {AxiosPromise} from "axios";
import {LoginDTO, UserDTO} from "../DTO";
import axiosInstance from "../utils/axios";


export function getUserInfo(): AxiosPromise<UserDTO> {
    return axiosInstance({
        url: "/user/info",
        headers: {
            noEmit: true
        }
    })
}

export function login(userDTO: LoginDTO): AxiosPromise<UserDTO> {
    return axiosInstance({
        url: "/login",
        data: userDTO,
        method: "post"
    })
}
