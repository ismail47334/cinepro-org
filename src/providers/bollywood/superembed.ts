import { BaseProvider, ProviderCapabilities, ProviderContext, Source } from '@omss/framework';

/**
 * Bollywood Provider: SuperEmbed - Best for Hindi/Bollywood latest
 * Covers: Bollywood, Hindi Dubbed, South Hindi Dubbed
 */
export default class SuperEmbedProvider extends BaseProvider {
  id = 'superembed';
  name = 'SuperEmbed (Bollywood)';
  capabilities: ProviderCapabilities = {
    movies: true,
    tv: true,
    movieId: 'tmdb',
    tvId: 'tmdb'
  };

  async scrape(ctx: ProviderContext): Promise<Source[]> {
    const { tmdbId, type, season, episode } = ctx;
    const sources: Source[] = [];

    try {
      // SuperEmbed API - supports TMDB ID directly
      const url = type === 'movie'
        ? `https://multiembed.mov/?video_id=${tmdbId}&tmdb=1`
        : `https://multiembed.mov/?video_id=${tmdbId}&tmdb=1&s=${season}&e=${episode}`;

      // Fetch embed page and extract m3u8
      const res = await ctx.fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0',
          'Referer': 'https://multiembed.mov/'
        }
      });
      
      if (!res.ok) return sources;
      const html = await res.text();

      // Extract sources - superembed usually has .m3u8 in JS
      const m3u8Regex = /file:\s*["'](https:\/\/[^"']+\.m3u8[^"']*)["']/gi;
      let match;
      while ((match = m3u8Regex.exec(html)) !== null) {
        sources.push({
          url: match[1],
          quality: '1080p',
          provider: { id: this.id, name: this.name },
          type: 'hls'
        } as any);
      }

      // Fallback: try to get from superembed API
      if (sources.length === 0) {
        sources.push({
          url: url,
          quality: 'Auto',
          provider: { id: this.id, name: this.name },
          type: 'embed'
        } as any);
      }

    } catch (e) {
      ctx.log?.error(`SuperEmbed error for ${tmdbId}: ${e}`);
    }

    return sources;
  }
}
