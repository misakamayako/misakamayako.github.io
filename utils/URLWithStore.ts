export default class URLWithStore extends URL {
    private static store = new Map<string, Blob>();

    static createObjectURL(blob: Blob) {
        const url = super.createObjectURL(blob);
        URLWithStore.store.set(url, blob)
        return url;
    }

    static getFromObjectURL(url: string) {
        return URLWithStore.store.get(url)
    }

    static revokeObjectURL(url: string) {
        super.revokeObjectURL(url);
        if (
            new URL(url).protocol === "blob:" &&
            URLWithStore.store &&
            url in URLWithStore.store
        ) {
            URLWithStore.store.delete(url)
        }
    }
}
