export default function binarySearch<T>(list: Array<T>, target: T, start?: number, end?: number): number {
    let left = start ?? 0
    let right = end ?? list.length - 1
    while (left <= right) {
        const middle = (left + right) >>> 1
        if (list[middle] < target) {
            left = middle + 1
        } else if (list[middle] === target) {
            return middle
        } else {
            right = middle - 1
        }
    }
    return -1
}
