export default function binaryInsert<T>(list: Array<T>, value: T): void {
    let left = 0;
    let right = list.length - 1;
    while (left <= right) {
        const middle =  (left + right) >>> 1
        if (list[middle] === value) {
            return; // 如果已有相同值，则不插入
        } else if (list[middle] < value) {
            left = middle + 1;
        } else {
            right = middle - 1;
        }
    }
    list.splice(left, 0, value); // 在 left 索引处插入新值
}
