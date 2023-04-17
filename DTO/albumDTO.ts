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
