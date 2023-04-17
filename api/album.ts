import {AxiosPromise} from "axios";
import {Pagination, Response} from "../DTO";
import axiosInstance from "../utils/axios";
import {AlbumDTO} from "../DTO/albumDTO";
const sourceType = "/album"
export function getAlbumList(page:number,pageSize:number,tags:number[]):AxiosPromise<Response<Pagination<AlbumDTO>>>{
    return axiosInstance.get(sourceType,{params:{page,pageSize,tags}})
}
