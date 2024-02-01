import axios from "axios";
import {Response} from "../DTO";
import AlertService from "./AlertService";
import * as https from "https";

const axiosInstance = axios.create({
    baseURL: getHost(),
    httpsAgent: new https.Agent({
        rejectUnauthorized: false
    })
})

function getHost():string {
    console.log(`host:${process.env.USE_HOST}`)
    if (typeof window !== "undefined") {
        return "/lastOrder"
    } else if (process.env.USE_HOST) {
        return "http://host.docker.internal:8080/"
    } else {
        return "https://localhost/lastOrder"
    }
}

axiosInstance.interceptors.response.use(function (response) {
    return response;
}, function (error) {
    if (error.response && error.response.statusCode === 404 && typeof window === "undefined") {
        return Promise.resolve(error.response)
    }
    if (error.config.headers?.noEmit) {
        return Promise.reject(error);
    }
    if (error.response) {
        const response: Response<unknown> = error.response.data;
        AlertService.error(response.message ?? '网络请求失败')
    } else {
        AlertService.error(error.message)
    }
    return Promise.reject(error);
});
export default axiosInstance
