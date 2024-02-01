import {CategoryDTO} from "./Category";

export interface AlbumDTO {
    id: number;
    title: string;
    cover?: string;
    category: CategoryDTO[];
}

export interface ImgUploadDTO {
    fileUrl: string;
    name: string;
    categories?: Array<number>;
    album?: number;
    nsfw?: boolean;
    private?: boolean;
}

export interface ImgDetailDTO {
    url: string;
    name: string;
    category: Array<CategoryDTO>;
    album?: AlbumDTO;
    nsfw: boolean;
    private: boolean;
}

export interface AlbumWithImgList {
    // id: number
    title: string,
    cover?: string
    category?: Array<CategoryDTO>
    imgList?: Array<ImgDTO>
}

export interface ImgDTO {
    url: string
    name: string
    category?: Array<CategoryDTO>
}
