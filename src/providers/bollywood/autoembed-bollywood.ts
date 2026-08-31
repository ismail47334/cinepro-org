import { BaseProvider, ProviderCapabilities, ProviderContext, Source } from '@omss/framework';

/**
 * Bollywood Provider: AutoEmbed Bollywood Special - Optimized for Hindi
 * This is enhanced version of existing autoembed with Bollywood priority
 */
export default class AutoEmbedBollywoodProvider extends BaseProvider {
  id = 'autoembed-bollywood';
  name = 'AutoEmbed Bollywood+';
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
      // AutoEmbed has best Bollywood coverage - use multiple endpoints
      const endpoints = [
        type === 'movie'
          ? `https://autoembed.co/movie/tmdb/${tmdbId}`
          : `https://autoembed.co/tv/tmdb/${tmdbId}-${season}-${episode}`,
        type === 'movie'
          ? `https://autoembed.cc/movie/tmdb/${tmdbId}`
          : `https://autoembed.cc/tv/tmdb/${tmdbId}/${season}/${episode}`
      ];

      for (const url of endpoints) {
        try {
          const res = await ctx.fetch(url, {
            headers: {
              'User-Agent': 'Mozilla/5.0',
              'Referer': 'https://autoembed.co/'
            }
          });
          if (!res.ok) continue;
          const html = await res.text();

          // AutoEmbed usually returns embed with multiple qualities
          const qualityRegex = /"(1080p|720p|480p|360p)"\s*:\s*"(https:\/\/[^"]+)"/gi;
          let m;
          while ((m = qualityRegex.exec(html)) !== null) {
            sources.push({
              url: m[2],
              quality: m[1],
              provider: { id: this.id, name: `${this.name} ${m[1]}` },
              type: m[2].includes('.m3u8') ? 'hls' : 'mp4'
            } as any);
          }

          // If found, break
          if (sources.length > 0) break;

          // Fallback - return embed URL itself
          sources.push({
            url: url,
            quality: 'Auto',
            provider: { id: this.id, name: this.name },
            type: 'embed'
          } as any);
          break;

        } catch {}
      }

    } catch (e) {
      ctx.log?.error(`AutoEmbed Bollywood error ${tmdbId}: ${e}`);
    }

    return sources;
  }
}
