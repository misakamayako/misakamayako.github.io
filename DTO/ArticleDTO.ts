import {ArticleCategoryDTO} from "./Category";

type Int = number
type List<T> = Array<T>

interface IArticleDTO {
    id: Int
    title: string
    brief: string

    createAt: string
    views: Int
    categories: List<ArticleCategoryDTO>
}

export class ArticleDTO implements IArticleDTO {
    id: Int
    title: string
    brief: string
    createAt: string
    views: Int
    categories: List<ArticleCategoryDTO>

    constructor(
        id: Int,
        title: string,
        brief: string,
        createAt: string,
        views: Int,
        categories: List<ArticleCategoryDTO>
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
                categories: List<ArticleCategoryDTO>,
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
