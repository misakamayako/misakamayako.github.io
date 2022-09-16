import React from "react";

import NavigationStyle from "../styles/Navigation.module.scss"

interface State {
    login: boolean,
    name: string,
    password: string,
    loading: boolean,
    showLogin: boolean,
}

import avatar from "../public/img/avatar.jpg"
import loginLogo from "../public/img/login-logo.png"
import Link from "next/link";
import {Button, Input, Loading, Modal} from "@nextui-org/react";
import Image from "next/image";
import {getUserInfo, login} from "../api/userInfo";
import AlertService from "../utils/AlertService";

export default class Navigation extends React.Component<{}, State> {
    state: State = {
        login: false,
        name: "",
        password: "",
        loading: false,
        showLogin: false,
    }

    render() {
        return (
            <div>
                <div className={NavigationStyle.avatar}>
                    <Image src={avatar} width={64} height={64} alt="" onClick={e => {
                        if (e.altKey && e.ctrlKey && e.shiftKey && !this.state.login) {
                            this.setState({
                                showLogin: true
                            })
                        }
                    }}/>
                </div>
                <Modal
                    open={this.state.showLogin} onClose={() => this.setState({showLogin: false})}
                >
                    <Modal.Header>
                        以管理员身份登录
                    </Modal.Header>
                    <Modal.Body>
                        <div className="text-center">
                            <Image src={loginLogo} alt="" layout='intrinsic'/>
                            <Input placeholder="input name" labelPlaceholder="用户名" fullWidth underlined
                                   value={this.state.name} onChange={e => this.setState({name: e.target.value})}/>
                            <div style={{marginTop: "2rem"}}>
                                <Input placeholder="input password" labelPlaceholder="密码" fullWidth underlined
                                       type="password"
                                       value={this.state.password}
                                       onChange={e => this.setState({password: e.target.value})}/>
                            </div>
                        </div>
                    </Modal.Body>
                    <Modal.Footer>
                        {
                            this.state.loading ? null :
                                <Button light auto onPress={() => this.setState({showLogin: false})}>
                                    取消
                                </Button>
                        }
                        <Button disabled={this.state.loading} shadow color="primary" auto ghost
                                onPress={this.login.bind(this)}>
                            {this.state.loading ? <Loading/> : "登录"}
                        </Button>
                    </Modal.Footer>
                </Modal>
                <nav className={NavigationStyle.menu}>
                    <Link href="/blog" className={NavigationStyle.navLink}>blog</Link>
                    {this.state.login ?
                        <Link href="/blog/upload" className={'inline-block'}>blog upload</Link> : null}
                    <Link href="/dream-map" className={'inline-block'}>dream map</Link>
                    <Link href="/album" className={NavigationStyle.navLink}>album</Link>
                    <Link href="/about-me" className={NavigationStyle.navLink}>about me</Link>
                </nav>
            </div>
        )
    }

    login() {
        this.setState({
            loading: true
        })
        login({
            name: this.state.name,
            password: this.state.password
        }).then(() => {
            this.setState({
                login: true,
                showLogin: false
            })
            AlertService.info('登录成功')
        }).finally(() => {
            this.setState({
                loading: false
            })
        })
    }

    componentDidMount() {
        getUserInfo().then(() => {
            this.setState({
                login: true
            })
        })
    }
}
