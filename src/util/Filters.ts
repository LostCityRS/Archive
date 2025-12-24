// Takes a query array and builds the query string from it, excluding any keys in excludeKeys
// This is useful for building query strings for links that need to pass along the current query
export function buildQueryString(query: Record<string, any>, excludeKeys: string[] = []): string {
    return Object.entries(query)
        .filter(([key]) => !excludeKeys.includes(key))
        .flatMap(([key, value]) => Array.isArray(value)
            ? value.map(item => `${encodeURIComponent(key)}=${encodeURIComponent(item)}`)
            : `${encodeURIComponent(key)}=${encodeURIComponent(value)}`
        )
        .join('&');
}