import React, {ReactNode} from "react";
import {CategoryDTO, CategoryType} from "../../../DTO/Category";

import styles from "./AlbumAndImageListLayout.module.scss"
import {getCategory} from "../../../api/category";
import insertOrDelete from "../../../utils/insertOrDelete";
import binarySearch from "../../../utils/binarySearch";
import Navigation from "../../Navigation";

interface Props {
    children: ReactNode
}

interface State {
    category: Array<number>,
    categorySource: CategoryDTO[]
}

export default class AlbumAndImageListLayout extends React.Component<Props, State> {
    static categoryProvider = React.createContext<Array<number>>(new Array<number>())
    state: State = {
        category: new Array<number>(),
        categorySource: []
    }

    private handleClick(category: CategoryDTO) {
        this.setState({category: structuredClone(insertOrDelete(this.state.category, category.id))})
    }

    render() {
        return (
            <div className={styles.AlbumAndImageListLayoutRoot}>
                <Navigation/>
                <div className={styles.AlbumAndImageListLayoutMain}>
                    <div className={styles.AlbumAndImageListLayoutCategory}>
                        {
                            this.state.categorySource.map(category => {
                                const active = binarySearch(this.state.category, category.id) !== -1
                                return (
                                    <div key={category.id}
                                         className={[styles.items, active ? styles.active : null].join(" ")}>
                                        {category.category}
                                        <span className={styles.after} onClick={this.handleClick.bind(this, category)}>
                                            {active ? "🗑" : "➕"}
                                        </span>
                                    </div>
                                )
                            })
                        }
                    </div>
                    <div className={styles.AlbumAndImageListLayoutContent}>
                        <AlbumAndImageListLayout.categoryProvider.Provider value={this.state.category}>
                            {this.props.children}
                        </AlbumAndImageListLayout.categoryProvider.Provider>
                    </div>
                </div>
            </div>
        )
    }

    componentDidMount() {
        this.getImageCategory()
    }

    private getImageCategory() {
        getCategory(CategoryType.image).then(({data}) => {
            this.setState({
                categorySource: data.data
            })
        })
    }
}
