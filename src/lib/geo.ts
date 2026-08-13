import geoip from "geoip-lite";

/**
 * 从请求头中提取真实客户端 IP。
 * 假设：外层有统一的反向代理/编排（唯一入口），会把真实 IP 追加到 X-Forwarded-For 末尾。
 * 因此这里取最后一个值，避免客户端伪造前段。
 * 若存在多级可信代理，可改为从右往左取第 N 个值。
 */
export function getClientIP(request: Request): string | null {
    const xff = request.headers.get("x-forwarded-for");
    if (xff) {
        const parts = xff.split(",").map((part) => part.trim()).filter(Boolean);
        if (parts.length > 0) {
            return parts[parts.length - 1] ?? null;
        }
    }

    const realIp = request.headers.get("x-real-ip");
    if (realIp) return realIp.trim();

    return null;
}

/**
 * 返回 ISO 3166-1 两位国家码（例如 "CN"），无法判断时返回 null。
 * 优先 Cloudflare 的 CF-IPCountry，否则用本地 GeoIP 库查询。
 */
export function getCountry(request: Request): string | null {
    // 本地调试时可临时用 GEOIP_FORCE_COUNTRY=CN 指定国家码
    const forced = (import.meta.env.GEOIP_FORCE_COUNTRY as string | undefined)?.trim().toUpperCase();
    if (forced) return forced;

    const cf = request.headers.get("cf-ipcountry")?.trim().toUpperCase();
    if (cf) return cf;

    const ip = getClientIP(request);
    if (!ip) return null;

    try {
        return geoip.lookup(ip)?.country ?? null;
    } catch {
        return null;
    }
}

export function isMainlandChina(request: Request): boolean {
    return getCountry(request) === "CN";
}
