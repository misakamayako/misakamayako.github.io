import type {ReactElement, ReactNode} from 'react'
import {StrictMode, useEffect, useState} from "react";
import type {NextPage} from 'next'
import type {AppProps} from 'next/app'
import {createTheme, NextUIProvider} from '@nextui-org/react';
import {useRouter} from "next/router"

import '../styles/globals.css'
import '../public/css/github-dark-dimmed.css'
import Head from "next/head";
import {SSRProvider} from "@react-aria/ssr";
import {Provider, useSelector} from "react-redux";
import store, {RootState} from "../store";

type NextPageWithLayout<P = {}, IP = P> = NextPage<P, IP> & {
    getLayout?: (page: ReactElement) => ReactNode,
    title?: string,
    auth?: boolean
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
    const loginState = useSelector<RootState, boolean>((state) => state.userReducer.login)
    const router = useRouter()
    useEffect(() => {
        if (Component.title) {
            setTitle(`✨御坂网络-${Component.title}✨`)
        } else {
            setTitle("✨御坂网络✨")
        }
        if (Component.auth && !loginState) {
            router.push("/401")
        }
    }, [Component, loginState,router])
    return (
        <NextUIProvider theme={darkTheme}>
            <Head>
                <title>{title}</title>
            </Head>
            <StrictMode>
                <SSRProvider>
                    {getLayout(<Component {...pageProps}/>)}
                </SSRProvider>
            </StrictMode>
        </NextUIProvider>
    );
}

function Root(appPropsWithLayout: AppPropsWithLayout) {
    return (
        <Provider store={store}>
            <MyApp {...appPropsWithLayout}/>
        </Provider>
    )
}

export default Root;

