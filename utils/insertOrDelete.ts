export default function insertOrDelete<T>(list: Array<T>, target: T): Array<T> {
    let left = 0;
    let right = list.length - 1;
    while (left <= right) {
        const middle = Math.floor((left + right) / 2);
        if (list[middle] === target) {
            list.splice(middle, 1); // 如果存在则删除
            return list;
        } else if (list[middle] < target) {
            left = middle + 1;
        } else {
            right = middle - 1;
        }
    }
    list.splice(left, 0, target); // 如果不存在则插入
    return list;
}
