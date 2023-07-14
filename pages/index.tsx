import HomeStyle from '../styles/Home.module.scss'
import Link from "next/link";

const Home = () => (
    <div className={HomeStyle.home}>
        <div className={HomeStyle.menu}>
            <Link href="/blog">blog</Link>
            <Link href="/dream-map">dream map</Link>
            <Link href="/album">album</Link>
            <Link href="/about-me">about me</Link>
        </div>
    </div>
)
Home.title = '首页'

export default Home
