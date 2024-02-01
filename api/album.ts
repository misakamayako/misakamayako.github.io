import {AxiosPromise} from "axios";
import type {PageQuery, Pagination, Response} from "../DTO";
import axiosInstance from "../utils/axios";
import type {AlbumDTO, AlbumWithImgList} from "../DTO/albumDTO";

const sourceType = "/album"

type AlbumQuery = {
    tags?: number[],
    keyword?: string
}

export function getAlbumList(albumQuery: AlbumQuery & PageQuery): AxiosPromise<Response<Pagination<AlbumDTO>>> {
    return axiosInstance.get(sourceType, {params: albumQuery})
}

export function getAlbumDetail(id: number): AxiosPromise<Response<AlbumWithImgList>> {
    return axiosInstance.get(sourceType + '/' + id)
}
export function getAllAlbum():AxiosPromise<Response<Array<number>>>{
    return axiosInstance.get(sourceType+'/all')
}
