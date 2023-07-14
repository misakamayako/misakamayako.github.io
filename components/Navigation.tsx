import React from "react";

import NavigationStyle from "../styles/Navigation.module.scss"
import avatar from "../public/img/avatar.jpg"
import loginLogo from "../public/img/login-logo.png"
import Link from "next/link";
import {Button, Input, Loading, Modal} from "@nextui-org/react";
import Image from "next/image";
import {getUserInfo, login} from "../api/userInfo";
import AlertService from "../utils/AlertService";
import {setLoginState} from "../store/userState";
import {connect} from "react-redux";
import {RootState} from "../store";

interface State {
    name: string,
    password: string,
    loading: boolean,
    showLogin: boolean,
}

interface ConnectProps {
    login: boolean
}

interface ConnectAction {
    setLogin: typeof setLoginState
}
function mapStateToProps (state:any):ConnectProps {
    return {
        login: (state as RootState).userReducer.login
    }
}
const mapDispatchToProps = {
    setLogin: setLoginState
}

class Navigation extends React.Component<ConnectProps & ConnectAction, State> {
    state: State = {
        name: "",
        password: "",
        loading: false,
        showLogin: false,
    }
    static test = 1234

    render() {
        return (
            <div>
                <div className={NavigationStyle.avatar}>
                    <Image src={avatar} width={64} height={64} alt="" onClick={e => {
                        if (e.altKey && e.ctrlKey && e.shiftKey && !this.props.login) {
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
                    {this.props.login ?
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
            this.props.setLogin()
        })
    }
}
export default connect<ConnectProps,ConnectAction>(mapStateToProps, mapDispatchToProps)(Navigation)
