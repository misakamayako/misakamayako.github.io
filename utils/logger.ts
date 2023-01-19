export class Logger{
    static debug(...args:string[]){
        console.debug(new Date," DEBUG ",...args)
    }
}
