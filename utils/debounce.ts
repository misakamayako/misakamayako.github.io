export default function debounce<T extends (...args: any[]) => void>(fn: T, delay: number): (...args: Parameters<T>) => void {
    let timer: ReturnType<typeof setTimeout> | null = null;
    return (...args: Parameters<T>) => {
        timer && clearTimeout(timer);
        timer = setTimeout(() => {
            fn.apply(null, args);
        }, delay);
    }
}
