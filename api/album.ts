import {AxiosPromise} from "axios";
import {PageQuery, Pagination, Response} from "../DTO";
import axiosInstance from "../utils/axios";
import {AlbumDTO} from "../DTO/albumDTO";

const sourceType = "/album"

type AlbumQuery = {
    tags?: number[],
    keyword?: string
}

export function getAlbumList(albumQuery:AlbumQuery&PageQuery): AxiosPromise<Response<Pagination<AlbumDTO>>> {
    return axiosInstance.get(sourceType, {params: albumQuery})
}
