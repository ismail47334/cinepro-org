import type { Diagnostic, ProviderCapabilities, ProviderMediaObject, ProviderResult, Source } from '@omss/framework';
import { BaseProvider, type SourceType } from '@omss/framework';
export class SuperEmbed extends BaseProvider {
    readonly id = 'superembed-bollywood';
    readonly name = 'SuperEmbed Bollywood';
    readonly enabled = true;
    readonly BASE_URL = 'https://multiembed.mov';
    readonly HEADERS = { 'User-Agent': 'Mozilla/5.0', accept: '*/*', 'accept-language': 'en-US,en;q=0.9', referer: 'https://multiembed.mov/' };
    readonly capabilities: ProviderCapabilities = { supportedContentTypes: ['movies', 'tv'] };
    async getMovieSources(m: ProviderMediaObject): Promise<ProviderResult> { return this.getSources(m); }
    async getTVSources(m: ProviderMediaObject): Promise<ProviderResult> { return this.getSources(m); }
    async healthCheck(): Promise<boolean> { try { const r=await fetch(this.BASE_URL,{method:'HEAD', headers:this.HEADERS as any}); return r.status===200;} catch{return false;} }
    private async getSources(media: ProviderMediaObject): Promise<ProviderResult> {
        try {
            const embedUrl = media.type==='movie' ? `${this.BASE_URL}/?video_id=${media.tmdbId}&tmdb=1` : `${this.BASE_URL}/?video_id=${media.tmdbId}&tmdb=1&s=${media.s}&e=${media.e}`;
            const response = await fetch(embedUrl, { headers: this.HEADERS as any });
            if(!response.ok) return this.emptyResult(`HTTP ${response.status}`, media);
            const html = await response.text();
            const sources: Source[] = [];
            const regexes = [/file:\s*["'](https:\/\/[^"']+\.m3u8[^"']*)["']/gi, /src:\s*["'](https:\/\/[^"']+\.(?:m3u8|mp4)[^"']*)["']/gi, /"(?:hls|file)"\s*:\s*"(https:\/\/[^"]+)"/gi];
            for(const rgx of regexes){ let m; while((m=rgx.exec(html))!==null){ sources.push({ url: this.createProxyUrl(m[1], this.HEADERS as any), type: (m[1].includes('.m3u8')?'hls':'mp4') as SourceType, quality: '1080', audioTracks: [{language:'eng', label:'English'}], provider: {id:this.id, name:this.name} }); } if(sources.length) break; }
            if(sources.length===0){ sources.push({ url: embedUrl, type: 'hls' as SourceType, quality: 'auto', audioTracks: [{language:'eng', label:'English'}], provider: {id:this.id, name:this.name} }); }
            return { sources, subtitles: [], diagnostics: [] };
        } catch(e){ return this.emptyResult(e instanceof Error ? e.message : 'Failed', media); }
    }
    private emptyResult(msg:string, media:ProviderMediaObject): ProviderResult { return { sources:[], subtitles:[], diagnostics:[{code:'PROVIDER_ERROR', message:`${this.name}: ${msg}`, field:'', severity:'error'} as Diagnostic] }; }
}
