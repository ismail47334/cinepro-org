import { BaseProvider, ProviderCapabilities, ProviderContext, Source } from '@omss/framework';

/**
 * Bollywood Provider: SmashyStream - Latest Bollywood/Hindi fast
 */
export default class SmashyStreamProvider extends BaseProvider {
  id = 'smashystream';
  name = 'SmashyStream (Bollywood Fast)';
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
      // SmashyStream supports TMDB directly
      const embedUrl = type === 'movie'
        ? `https://embed.smashystream.com/playere.php?tmdb=${tmdbId}`
        : `https://embed.smashystream.com/playere.php?tmdb=${tmdbId}&season=${season}&episode=${episode}`;

      const res = await ctx.fetch(embedUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Referer': 'https://smashystream.com/'
        }
      });

      if (!res.ok) return sources;
      const html = await res.text();

      // Extract m3u8 or mp4
      const patterns = [
        /src:\s*["'](https:\/\/[^"']+\.m3u8[^"']*)["']/gi,
        /file:\s*["'](https:\/\/[^"']+\.(?:m3u8|mp4)[^"']*)["']/gi,
        /"hls"\s*:\s*"(https:\/\/[^"]+)"/gi
      ];

      for (const regex of patterns) {
        let m;
        while ((m = regex.exec(html)) !== null) {
          sources.push({
            url: m[1],
            quality: '1080p',
            provider: { id: this.id, name: this.name },
            type: m[1].includes('.m3u8') ? 'hls' : 'mp4'
          } as any);
        }
        if (sources.length > 0) break;
      }

      if (sources.length === 0) {
        // Return embed as fallback - CinePro proxy will handle it
        sources.push({
          url: embedUrl,
          quality: 'Auto',
          provider: { id: this.id, name: this.name },
          type: 'embed'
        } as any);
      }

    } catch (e) {
      ctx.log?.error(`SmashyStream error ${tmdbId}: ${e}`);
    }

    return sources;
  }
}
