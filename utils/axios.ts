import axios from "axios";
import {Response} from "../DTO";
import AlertService from "./AlertService";

const axiosInstance = axios.create({
    baseURL: "/lastOrder"
})
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
