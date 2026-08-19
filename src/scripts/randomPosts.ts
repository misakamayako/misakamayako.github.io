import type {BlogItem} from "./blogList.ts";

const base = import.meta.env.BASE_URL || "/";

function escapeHtml(value: string): string {
    return value.replace(
        /[&<>"']/g,
        (char) =>
            (
                {
                    "&": "&amp;",
                    "<": "&lt;",
                    ">": "&gt;",
                    '"': "&quot;",
                    "'": "&#39;",
                } as Record<string, string>
            )[char],
    );
}

/** Fisher-Yates 洗牌后取前 k 个 */
function sample<T>(items: T[], k: number): T[] {
    const copy = [...items];
    for (let i = copy.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy.slice(0, k);
}

export async function renderRandomPosts(container: HTMLElement): Promise<void> {
    container.innerHTML = `<span class="text-sm text-slate-400">加载中…</span>`;

    try {
        const response = await fetch(`${base}internal/blogs.json`);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const items: BlogItem[] = await response.json();

        if (items.length === 0) {
            container.innerHTML = `<span class="text-sm text-slate-400">暂无文章</span>`;
            return;
        }

        container.innerHTML = sample(items, 3)
            .map(
                (item) =>
                    `<a class="px-3 py-1 bg-slate-600 rounded-full text-sm text-white hover:bg-emerald-500 transition" href="${base}blog/${encodeURIComponent(item.slug)}/">${escapeHtml(item.title)}</a>`,
            )
            .join("");
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        container.innerHTML = `<span class="text-sm text-red-400">加载失败：${escapeHtml(message)}</span>`;
    }
}
