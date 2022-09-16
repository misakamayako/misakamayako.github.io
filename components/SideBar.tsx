import {useEffect, useState} from "react";
import {CategoryOfArticleSumDTO} from "../DTO";
import Link from "next/link";
import {getArticleTagSum} from "../api/category";
import {useRouter} from "next/router";
import SidebarStyle from "../styles/SideBar.module.scss"

export default function SideBar() {
    const [categorySum, categorySumUpdate] = useState<CategoryOfArticleSumDTO[]>([])
    const route = useRouter()
    useEffect(() => {
        getArticleTagSum().then(({data}) => {
            categorySumUpdate(data.data)
        })
    }, [])
    return (
        <div className="rounded-lg border overflow-hidden shrink-0">
            <div className="bg-blue-300 text-center w-48 py-1.5 text-2 text-white">分类</div>
            <nav>
                {
                    categorySum.map(i => (
                        <Link
                            key={i.category} href={`/blog/categories/${i.id}`}
                        >
                            <div
                                className={[
                                    "block", "border-b", "px-4",
                                    "py-2", "font-bold", "text-white",
                                    "cursor-pointer", route.query?.category === i.id.toString() ? SidebarStyle.active : null].join(" ")}>
                                <span>{i.category}</span>
                                <span className="float-right">{i.count}</span>
                            </div>
                        </Link>
                    ))
                }
            </nav>
        </div>
    )
}
