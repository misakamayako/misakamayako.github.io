import {CategoryDTO} from "./Category";

type Int = number
type List<T> = Array<T>

interface IArticleDTO {
    id: Int
    title: string
    brief: string

    createAt: string
    views: Int
    categories: List<CategoryDTO>
}

export class ArticleDTO implements IArticleDTO {
    id: Int
    title: string
    brief: string
    createAt: string
    views: Int
    categories: List<CategoryDTO>

    constructor(
        id: Int,
        title: string,
        brief: string,
        createAt: string,
        views: Int,
        categories: List<CategoryDTO>
    ) {
        this.id = id
        this.title = title
        this.brief = brief
        this.createAt = createAt
        this.views = views
        this.categories = categories
    }
}

export class ArticleDetailDTO extends ArticleDTO {
    content: string

    constructor(id: Int,
                title: string,
                brief: string,
                createAt: string,
                views: Int,
                categories: List<CategoryDTO>,
                content: string) {
        super(id, title, brief, createAt, views, categories);
        this.content = content
    }
}

export class ArticleAllDTO {
    id: Int
    title: string
    constructor(id: Int, title: string) {
        this.id = id
        this.title = title
    }
}
