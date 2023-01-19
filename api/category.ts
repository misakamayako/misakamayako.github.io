import {AxiosPromise} from "axios";
import {CategoryOfArticleSumDTO,Response} from "../DTO";
import { ArticleCategoryDTO } from "../DTO/Category";
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
