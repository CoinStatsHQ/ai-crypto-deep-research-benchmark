function extractLinks(markdown) {
    const links = [];
    const regex = /\[([^\]]+)\]\((https?:\/\/[^)]+)\)/gu;
    let match = regex.exec(markdown);

    while (match) {
        links.push({ label: match[1], url: match[2] });
        match = regex.exec(markdown);
    }

    return links;
}

function toHostname(url) {
    try {
        return new URL(url).hostname.replace(/^www\./u, '');
    } catch (error) {
        return null;
    }
}

function countMatches(markdown, regex) {
    const matches = markdown.match(regex);
    return matches ? matches.length : 0;
}

function extractMarkdownMetrics(markdown) {
    const trimmed = markdown.trim();
    const links = extractLinks(markdown);
    const uniqueDomains = [...new Set(links.map(link => toHostname(link.url)).filter(Boolean))];

    return {
        wordCount: trimmed ? trimmed.split(/\s+/u).length : 0,
        headingCount: countMatches(markdown, /^#{1,6}\s+/gmu),
        bulletCount: countMatches(markdown, /^\s*[-*]\s+/gmu),
        citationCount: links.length,
        uniqueCitationDomains: uniqueDomains.length,
        citationDomains: uniqueDomains
    };
}

module.exports = {
    extractMarkdownMetrics
};
