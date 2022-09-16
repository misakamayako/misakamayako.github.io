import FooterStyle from "../styles/Footer.module.scss"
export default function Footer() {
    return (
        <div className={FooterStyle.footer}>
            <p>Supported and developed by&nbsp;
                {createLink("https://github.com/misakamayako/", "misaka mayako")}
            </p>
            <p>
                Tech with {createLink("https://kotlinlang.org/","kotlin")},&nbsp;
                {createLink("https://ktor.io/","ktor")},&nbsp;
                {createLink("https://nextjs.org/","nextjs")},&nbsp;
                and {createLink("https://pm2.keymetrics.io/","pm2")}
            </p>
            <p> feed back via {createLink("mailto:misakamayaco@qq.com","📫")}</p>
        </div>
    )
}

function createLink(target: string, content: string){
    return <a href={target} target="_blank" rel="noreferrer">{content}</a>
}
