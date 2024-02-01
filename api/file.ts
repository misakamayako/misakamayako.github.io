import axiosInstance from "../utils/axios";
import {AxiosPromise} from "axios";
import {Response} from "../DTO";

export function uploadFile(formData: FormData, onUploadProgress?: ((progressEvent: any) => void)):AxiosPromise<Response<string>> {
    return axiosInstance({
        url: "/file/upload",
        data: formData,
        method: "post",
        onUploadProgress,
        headers: {
            "Content-Type": "multipart/form-data"
        },
    })
}
