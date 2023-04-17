import {AxiosPromise} from "axios";
import {CategoryOfArticleSumDTO,Response} from "../DTO";
import {CategoryDTO, CategoryType} from "../DTO/Category";
import axiosInstance from "../utils/axios";

export function getCategory(type:CategoryType,keyword?:string):AxiosPromise<Response<Array<CategoryDTO>>>{
    return axiosInstance({
        url:'/category',
        params:{
            type,
            keyword
        }
    })
}

export function addCategory(category: String,type:CategoryType): AxiosPromise<Response<CategoryDTO>> {
    return axiosInstance({
        url: "/category/article",
        method:"post",
        data: {
            category,
            type
        }
    })
}
export function getArticleTagSum():AxiosPromise<Response<Array<CategoryOfArticleSumDTO>>>{
    return axiosInstance({
        url: '/category/article/sum'
    })
}
