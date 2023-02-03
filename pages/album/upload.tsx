import {ArticleCategoryDTO} from "../../DTO/Category";
import React from "react";

interface State{
    categories: Array<ArticleCategoryDTO>
    imgUrl:string
    process:number
    selectedCategories:Array<number>
}

export default class ImgUpload extends React.Component<any, State>{}
