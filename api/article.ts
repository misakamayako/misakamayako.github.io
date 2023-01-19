import {AxiosPromise} from "axios";
import {ArticleUploadVo, Pagination, Response} from "../DTO";
import axiosInstance from "../utils/axios";
import {ArticleAllDTO, ArticleDetailDTO, ArticleDTO} from "../DTO/ArticleDTO";

export function getArticleList(page: number,pageSize:number, category?: string): AxiosPromise<Response<Pagination<ArticleDTO>>> {
    return axiosInstance({
        url: "/article/list",
        params: {
            page,
            pageSize,
            category
        }
    })
}

export function uploadArticle(articleUploadVo: ArticleUploadVo): AxiosPromise<Response<ArticleDTO>> {
    return axiosInstance({
        url: "/article/upload",
        method: "post",
        data: articleUploadVo
    })
}

export function getAllArticle(): AxiosPromise<Response<ArticleAllDTO[]>> {
    return axiosInstance({
        url: '/article/all',
        baseURL: undefined
    })
}

export function getArticle(id: string): AxiosPromise<Response<ArticleDetailDTO>> {
    return axiosInstance({
        url: '/article/' + id
    })
}
