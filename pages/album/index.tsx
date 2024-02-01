import React from "react";
import Image from "next/image"

import albumScss from "../../styles/album/albumIndex.module.scss"
import {getAlbumList} from "../../api/album";
import {AlbumDTO} from "../../DTO/albumDTO";
import {Pagination} from "../../DTO";
import AlbumAndImageListLayout from "../../components/layout/AlbumAndImageListLayout";
import Link from "next/link";

interface State extends Pagination<AlbumDTO> {
    category: number[],
}

export default class AlbumIndex extends React.Component<null, State> {
    state: State = {
        page: 1,
        pageSize: 20,
        total: 0,
        category: [],
        data: []
    }

    static getLayout(main: React.ReactElement) {
        return <AlbumAndImageListLayout>{main}</AlbumAndImageListLayout>
    }

    static contextType = AlbumAndImageListLayout.categoryProvider;
    declare context: React.ContextType<typeof AlbumIndex.contextType>

    render() {
        return (
            <div className={albumScss.albumRoot}>
                {
                    this.state.data.map(it => (
                        <div className={albumScss.card} key={it.id}>
                            <div className={albumScss.square1}></div>
                            <div className={albumScss.square2}></div>
                            <Link className={albumScss.square3} href={"/album/" + it.id}>
                                <Image src={it.cover!} alt={it.title}/>
                            </Link>
                            <div className={albumScss.name}>{it.title}</div>
                        </div>
                    ))
                }
            </div>
        )
    }

    search(page: number = 1, pageSize: number = 20) {
        getAlbumList({page, pageSize, tags: this.state.category}).then(({data}) => {
            this.setState({
                total: data.data.total,
                data: data.data.data,
                page: page,
                pageSize: pageSize
            })
        })
    }

    componentDidMount() {
        this.search()
    }

    componentDidUpdate(prevProps: Readonly<null>, prevState: Readonly<State>, snapshot?: any) {
        if (this.state.category.length !== this.context.length) {
            this.setState({
                category: structuredClone(this.context)
            }, () => {
                this.search()
            })
        }
    }
}
