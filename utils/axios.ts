import axios from "axios";
import {Response} from "../DTO";
import AlertService from "./AlertService";
import logger from "next/dist/build/output/log";

const axiosInstance = axios.create({
    baseURL: (typeof window === "undefined" ? "http://127.0.0.1/" : "/") + "lastOrder"
})
// axiosInstance.interceptors.request.use(value => {
//     logger.info(value.method?.toUpperCase(), value.url, value.params || value.data)
//     return value
// })
axiosInstance.interceptors.response.use(function (response) {
    return response;
}, function (error) {
    if (error.request.headers?.noEmit) {
        return Promise.reject(error);
    }
    const response: Response<unknown> = error.response.data;
    AlertService.error(response.message ?? '网络请求失败')
    return Promise.reject(error);
});
export default axiosInstance
