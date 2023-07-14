import React from "react";
import {ImgDetailDTO} from "../../DTO/albumDTO";
import {GetStaticPropsContext, GetStaticPropsResult} from "next/types";

interface Props {
    source: ImgDetailDTO[]
}

export default class AlbumId extends React.Component<Props, null> {
    // state: State = {source: []}
    render(){
        return <div></div>
    }
}

export async function getStaticPaths(){

}
export async function getStaticProps(context: GetStaticPropsContext<{ id: string }>): Promise<GetStaticPropsResult<Props>> {
    await new Promise(res => res({source:[]}))
    return {notFound: true, props:     {
        source:[]
    }, redirect: undefined, revalidate: undefined}
}
