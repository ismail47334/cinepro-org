import type {
    Diagnostic,
    ProviderCapabilities,
    ProviderMediaObject,
    ProviderResult,
    Source
} from '@omss/framework';
import { BaseProvider, type SourceType } from '@omss/framework';

export class AutoEmbedBollywoodPlus extends BaseProvider {
    readonly id = 'autoembed-bollywood-plus';
    readonly name = 'AutoEmbed Bollywood+';
    readonly enabled = true;
    readonly BASE_URL = 'https://autoembed.co';
    readonly HEADERS = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        accept: '*/*',
        'accept-language': 'en-US,en;q=0.9',
        referer: 'https://autoembed.co/'
    };

    readonly capabilities: ProviderCapabilities = {
        supportedContentTypes: ['movies', 'tv']
    };

    async getMovieSources(media: ProviderMediaObject): Promise<ProviderResult> {
        return this.getSources(media);
    }

    async getTVSources(media: ProviderMediaObject): Promise<ProviderResult> {
        return this.getSources(media);
    }

    async healthCheck(): Promise<boolean> {
        try {
            const res = await fetch(this.BASE_URL, { method: 'HEAD', headers: this.HEADERS as any });
            return res.status === 200;
        } catch { return false; }
    }

    private async getSources(media: ProviderMediaObject): Promise<ProviderResult> {
        try {
            const endpoints = [
                media.type === 'movie'
                    ? `${this.BASE_URL}/movie/tmdb/${media.tmdbId}`
                    : `${this.BASE_URL}/tv/tmdb/${media.tmdbId}-${media.s}-${media.e}`,
                `https://autoembed.cc/movie/tmdb/${media.tmdbId}`
            ];

            for (const ep of endpoints) {
                try {
                    const resp = await fetch(ep, { headers: this.HEADERS as any });
                    if (!resp.ok) continue;
                    const html = await resp.text();

                    const sources: Source[] = [];
                    const qualityRegex = /"(1080p|720p|480p|360p)"\s*:\s*"(https:\/\/[^"]+)"/gi;
                    let m;
                    while ((m = qualityRegex.exec(html)) !== null) {
                        sources.push({
                            url: this.createProxyUrl(m[2], this.HEADERS as any),
                            type: (m[2].includes('.m3u8') ? 'hls' : 'mp4') as SourceType,
                            quality: m[1].replace('p', ''),
                            audioTracks: [{ language: 'eng', label: 'English' }],
                            provider: { id: this.id, name: `${this.name} ${m[1]}` }
                        });
                    }

                    if (sources.length > 0) {
                        return { sources, subtitles: [], diagnostics: [] };
                    }

                    // Fallback: return embed URL
                    // FIX: Return DIRECT embed URL for iframe, not proxied (proxy breaks embed JS)
                    return {
                        sources: [{
                            url: ep,
                            type: 'hls' as SourceType,
                            quality: 'auto',
                            audioTracks: [{ language: 'eng', label: 'English' }],
                            provider: { id: this.id, name: this.name }
                        }],
                        subtitles: [],
                        diagnostics: []
                    };
                } catch { continue; }
            }

            return this.emptyResult('No sources found', media);

        } catch (e) {
            return this.emptyResult(e instanceof Error ? e.message : 'Failed', media);
        }
    }

    private emptyResult(message: string, media: ProviderMediaObject): ProviderResult {
        return {
            sources: [],
            subtitles: [],
            diagnostics: [{
                code: 'PROVIDER_ERROR',
                message: `${this.name}: ${message}`,
                field: '',
                severity: 'error'
            } as Diagnostic]
        };
    }
}
