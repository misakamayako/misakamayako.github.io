export class CategorySumDTO {
    category: string
    id: number
    count: number

    constructor(category: string, id: number, count: number) {
        this.id = id
        this.category = category
        this.count = count
    }
}

export enum CategoryType {
    article = 1,
    image
}

export class CategoryDTO {
    category: string;
    id: number;
    type: CategoryType;

    constructor(category: string, id: number, type: number) {
        this.category = category
        this.id = id
        this.type = type
    }
}
