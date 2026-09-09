export type BlogItem = {
    slug: string;
    title: string;
    description: string;
    pubDate: string;
    tags?: string[];
};

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

function cardHTML(item: BlogItem): string {
    const tags = (item.tags ?? [])
        .map((tag) => `<span class="tag-pill text-xs px-3 py-1 rounded-full text-nowrap">${escapeHtml(tag)}</span>`)
        .join("");

    return `
    <article class="article-card rounded-xl p-6 border border-primary/30 hover:border-cyan-300/50 hover:-translate-y-0.5 transition-transform h-min">
      <div class="flex items-center space-x-2 mb-3 overflow-hidden">${tags}</div>
      <h3 class="text-xl font-semibold mb-3 hover:text-cyan-300 transition-colors text-zinc-200">
        <a href="${base}blog/${encodeURIComponent(item.slug)}/">${escapeHtml(item.title)}</a>
      </h3>
      <p class="text-sm text-gray-400 mb-4 line-clamp-3">${escapeHtml(item.description)}</p>
      <div class="text-xs text-gray-500"><span>${escapeHtml(item.pubDate)}</span></div>
    </article>`;
}

export async function renderBlogList(container: HTMLElement): Promise<void> {
    const tag = container.dataset.tag ?? "";
    const url = `${base}internal/blogs.json`;

    container.innerHTML = `<div class="col-span-2 text-gray-400 py-8 text-center">加载中…</div>`;

    try {
        const response = await fetch(url);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const items = (await response.json() as BlogItem[]).filter(it=>tag?it.tags?.includes(tag):it);

        if (items.length === 0) {
            container.innerHTML = `<div class="col-span-2 text-gray-400 py-8 text-center">暂无文章</div>`;
            return;
        }

        container.innerHTML = items.map(cardHTML).join("");
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        container.innerHTML = `<div class="col-span-2 text-red-400 py-8 text-center">加载失败：${escapeHtml(message)}</div>`;
    }
}
