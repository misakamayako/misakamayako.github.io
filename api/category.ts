import {AxiosPromise} from "axios";
import {ArticleCategoryDTO, CategoryOfArticleSumDTO,Response} from "../DTO";
import axiosInstance from "../utils/axios";

export function getArticleTag():AxiosPromise<Response<Array<ArticleCategoryDTO>>>{
    return axiosInstance({
        url:'/category/article/'
    })
}

export function addArticleTag(category: String): AxiosPromise<Response<ArticleCategoryDTO>> {
    return axiosInstance({
        url: "/category/article/",
        method:"post",
        data: {
            category
        }
    })
}
export function getArticleTagSum():AxiosPromise<Response<Array<CategoryOfArticleSumDTO>>>{
    return axiosInstance({
        url: '/category/article/sum'
    })
}
