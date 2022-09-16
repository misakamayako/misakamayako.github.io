import {AxiosPromise} from "axios";
import {ArticleAll, ArticleBriefDTO, Pagination, Response} from "../DTO";
import axiosInstance from "../utils/axios";

export function getArticleList(page: number,category?:string): AxiosPromise<Response<Pagination<ArticleBriefDTO>>> {
    return axiosInstance({
        url: "/article/list",
        data: {
            page,
            category
        }
    })
}

export function uploadArticle(formData: FormData): AxiosPromise<Response<string>> {
    return axiosInstance({
        url: "/article/upload",
        method: "post",
        headers: {
            "Content-Type": "multipart/form-data"
        },
        data: formData
    })
}

export function getAllArticle():AxiosPromise<Response<ArticleAll[]>>{
    return axiosInstance({
        url:'/article/all'
    })
}

export function getArticle(id:string):AxiosPromise<Response<ArticleBriefDTO>>{
    return axiosInstance({
        url:'/article/'+id
    })
}
