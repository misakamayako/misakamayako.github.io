import {ImageLoaderProps} from "next/image";

export default function aliyunLoader({ src, width, quality }:ImageLoaderProps) {
    return `https://oss-cn-shanghai.aliyuncs.com/${src}?w=${width}&q=${quality || 75}`
}
