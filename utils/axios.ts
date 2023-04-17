import axios from "axios";
import {Response} from "../DTO";
import AlertService from "./AlertService";
import * as https from "https";

const axiosInstance = axios.create({
    baseURL: (typeof window === "undefined" ? "https://127.0.0.1/" : "/") + "lastOrder",
    httpsAgent: new https.Agent({
        rejectUnauthorized: false
    })
})
// process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
// axiosInstance.interceptors.request.use(value => {
//     logger.info(value.method?.toUpperCase(), value.url, value.params || value.data)
//     return value
// })
axiosInstance.interceptors.response.use(function (response) {
    return response;
}, function (error) {
    if (error.config.headers?.noEmit) {
        return Promise.reject(error);
    }
    if(error.response){
        const response: Response<unknown> = error.response.data;
        AlertService.error(response.message ?? '网络请求失败')
    } else {
        AlertService.error(error.message)
    }
    return Promise.reject(error);
});
export default axiosInstance
