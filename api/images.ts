import {ImgDetailDTO, ImgUploadDTO} from "../DTO/albumDTO";
import {AxiosPromise} from "axios";
import {Response} from "../DTO";
import axiosInstance from "../utils/axios";
const sourceType = "/images"
export function addImage(imgUploadDTO:ImgUploadDTO):AxiosPromise<Response<ImgDetailDTO>>{
    return axiosInstance.post(sourceType,imgUploadDTO)
}
