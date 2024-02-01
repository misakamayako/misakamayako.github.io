import React from "react";
import {AlbumWithImgList} from "../../DTO/albumDTO";
import {GetStaticPropsContext, GetStaticPropsResult} from "next/types";
import {getAlbumDetail, getAllAlbum} from "../../api/album";
import Image from "next/image"
import Navigation from "../../components/Navigation";
import AlbumDetailStyle from "../../styles/album/albumDetil.module.scss"
import aliyunLoader from "../../utils/aliyunLoader";

interface Props {
    source: AlbumWithImgList
}

export default class AlbumId extends React.Component<Props, null> {
    render() {
        return (
            <div className={AlbumDetailStyle.albumDetailRoot}>
                <Navigation/>
                <main className={AlbumDetailStyle.albumDetailMain}>
                    <div className={AlbumDetailStyle.albumDetailDescription}></div>
                    <div className={AlbumDetailStyle.albumDetailImgSet}>
                        {
                            this.props.source ? this.props.source.imgList?.map(it => (
                                    <figure className={AlbumDetailStyle.albumDetailImageEntry} key={it.url}>
                                        <Image src={it.url} loader={aliyunLoader} alt={it.name} quality={75} width={400}
                                               height={320}/>
                                        <figcaption>An elephant at sunset</figcaption>
                                    </figure>

                                )) :
                                null
                        }
                    </div>
                    <div className={AlbumDetailStyle.albumDetailPreview}></div>
                </main>
            </div>
        )
    }
}

export async function getStaticPaths() {
    const ids = await getAllAlbum()
    return {
        paths: ids.data.data.map(it => ({params: {albumId: it.toString()}})),
        fallback: true
    }
}

export async function generateStaticParams() {
    const ids = await getAllAlbum()
    return ids.data.data.map(it => ({albumId: it.toString()}))
}

export async function getStaticProps(context: GetStaticPropsContext<{
    albumId: string
}>): Promise<GetStaticPropsResult<Props>> {
    if (context.params?.albumId != null) {
        try {
            const detail = await getAlbumDetail(parseInt(context.params?.albumId))
            return {
                props: {
                    source: detail.data.data
                }
            }
        } catch {
            return {
                notFound: true
            }
        }

    } else {
        return {
            notFound: true
        }
    }
}
