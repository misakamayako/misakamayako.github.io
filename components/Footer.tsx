import FooterStyle from "../styles/Footer.module.scss"
import {Image} from "@heroui/react"

export default function Footer() {
    return (
        <div className={FooterStyle.footer}>
            <p>Supported and developed by&nbsp;
                {createLink("https://github.com/misakamayako/", "misaka mayako")}
            </p>
            <p>
                Tech with {createLink("https://kotlinlang.org/", "kotlin")},&nbsp;
                {createLink("https://ktor.io/", "ktor")},&nbsp;
                {createLink("https://nextjs.org/", "nextjs")},&nbsp;
                and {createLink("https://pm2.keymetrics.io/", "pm2")}
            </p>
            <p> feed back via {createLink("mailto:misakamayaco@qq.com", "📫")}</p>
            <a rel="license noreferrer" href="https://creativecommons.org/licenses/by-sa/4.0/" target={"_blank"}
               style={{position: "absolute", bottom: 12, right: 12}}>
                <Image alt="知识共享许可协议" style={{borderWidth: 0, display: "inlineBlock"}}
                       src="https://i.creativecommons.org/l/by-sa/4.0/88x31.png"/>
            </a>
        </div>
    )
}

function createLink(target: string, content: string) {
    return <a href={target} target="_blank" rel="noreferrer">{content}</a>
}
