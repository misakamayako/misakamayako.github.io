import type {ReactElement, ReactNode} from 'react'
import type {NextPage} from 'next'
import type {AppProps} from 'next/app'
import {createTheme, NextUIProvider} from '@nextui-org/react';

import '../styles/globals.css'
import '../public/css/github-dark-dimmed.css'
import {useEffect, useState} from "react";
import Head from "next/head";

export type NextPageWithLayout<P = {}, IP = P> = NextPage<P, IP> & {
    getLayout?: (page: ReactElement) => ReactNode,
    title?: string
}

type AppPropsWithLayout = AppProps & {
    Component: NextPageWithLayout
}


const darkTheme = createTheme({
    type: 'dark',
    theme: {}
});

function MyApp({Component, pageProps}: AppPropsWithLayout) {
    const getLayout = Component.getLayout ?? ((page) => page)
    const [title, setTitle] = useState("")
    useEffect(() => {
        if (Component.title) {
            setTitle(`"✨御坂网络-${Component.title}✨`)
        } else {
            setTitle("✨御坂网络✨")
        }
    }, [Component])
    return (
        <NextUIProvider theme={darkTheme}>
            <Head>
                <title>{title}</title>
            </Head>
            {getLayout(<Component {...pageProps}/>)}
        </NextUIProvider>
    );
}

export default MyApp;

