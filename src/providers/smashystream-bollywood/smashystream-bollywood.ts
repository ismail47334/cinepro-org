import type {
    Diagnostic,
    ProviderCapabilities,
    ProviderMediaObject,
    ProviderResult,
    Source
} from '@omss/framework';
import { BaseProvider, type SourceType } from '@omss/framework';

export class SmashyStreamBollywood extends BaseProvider {
    readonly id = 'smashystream-bollywood';
    readonly name = 'SmashyStream Bollywood';
    readonly enabled = true;
    readonly BASE_URL = 'https://embed.smashystream.com';
    readonly HEADERS = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        accept: '*/*',
        'accept-language': 'en-US,en;q=0.9',
        referer: 'https://smashystream.com/'
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
            const res = await fetch(this.BASE_URL + '/', { method: 'HEAD', headers: this.HEADERS as any });
            return res.status === 200;
        } catch { return false; }
    }

    private async getSources(media: ProviderMediaObject): Promise<ProviderResult> {
        try {
            const url = media.type === 'movie'
                ? `${this.BASE_URL}/playere.php?tmdb=${media.tmdbId}`
                : `${this.BASE_URL}/playere.php?tmdb=${media.tmdbId}&season=${media.s}&episode=${media.e}`;

            const resp = await fetch(url, { headers: this.HEADERS as any });
            if (!resp.ok) return this.emptyResult(`HTTP ${resp.status}`, media);

            const html = await resp.text();
            const sources: Source[] = [];

            const patterns = [
                /file:\s*["'](https:\/\/[^"']+\.m3u8[^"']*)["']/gi,
                /src:\s*["'](https:\/\/[^"']+\.(?:m3u8|mp4)[^"']*)["']/gi
            ];

            for (const pat of patterns) {
                let m;
                while ((m = pat.exec(html)) !== null) {
                    sources.push({
                        url: this.createProxyUrl(m[1], this.HEADERS as any),
                        type: (m[1].includes('.m3u8') ? 'hls' : 'mp4') as SourceType,
                        quality: '1080',
                        provider: { id: this.id, name: this.name }
                    });
                }
                if (sources.length) break;
            }

            if (sources.length === 0) {
                // Direct embed for iframe
                sources.push({
                    url: url,
                    type: 'hls' as SourceType,
                    quality: 'auto',
                    provider: { id: this.id, name: this.name }
                });
            }

            return { sources, subtitles: [], diagnostics: [] };

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
