/**
 * Simulated social feed behind SocialSource interface
 * Replays scripted viral and non-viral posts for repeatable demos
 *
 * IMPORTANT: This is SIMULATED. Real X/TikTok/Instagram APIs need
 * approvals and rate limits you can't get in 15 hours.
 * Swap this implementation for real APIs after the hackathon.
 */

import {
  Post,
  Creator,
  PostMetrics,
  PostDelta,
  Candidate,
  computeVVI,
  VVI_THRESHOLD,
  PER_DEAL_CAP_XLM,
  DAILY_CAP_XLM,
} from './index.js';

// =========================
// Scripted creator roster (~20 creators)
// =========================

const CREATORS: Creator[] = [
  { id: 'c1', handle: '@alex_creates', wallet: 'GCREATOR1AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA', platform: 'x', followerCount: 125000, avgEngagementRate: 0.042 },
  { id: 'c2', handle: '@maya_makes', wallet: 'GCREATOR2BBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB', platform: 'tiktok', followerCount: 89000, avgEngagementRate: 0.067 },
  { id: 'c3', handle: '@jordan_jams', wallet: 'GCREATOR3CCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCC', platform: 'instagram', followerCount: 210000, avgEngagementRate: 0.031 },
  { id: 'c4', handle: '@sam_studios', wallet: 'GCREATOR4DDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDD', platform: 'x', followerCount: 45000, avgEngagementRate: 0.055 },
  { id: 'c5', handle: '@taylor_toks', wallet: 'GCREATOR5EEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEE', platform: 'tiktok', followerCount: 320000, avgEngagementRate: 0.078 },
  { id: 'c6', handle: '@riley_reels', wallet: 'GCREATOR6FFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF', platform: 'instagram', followerCount: 67000, avgEngagementRate: 0.049 },
  { id: 'c7', handle: '@casey_content', wallet: 'GCREATOR7GGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGG', platform: 'x', followerCount: 18000, avgEngagementRate: 0.062 },
  { id: 'c8', handle: '@morgan_media', wallet: 'GCREATOR8HHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHH', platform: 'tiktok', followerCount: 540000, avgEngagementRate: 0.051 },
  { id: 'c9', handle: '@jamie_jams', wallet: 'GCREATOR9IIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIII', platform: 'instagram', followerCount: 95000, avgEngagementRate: 0.038 },
  { id: 'c10', handle: '@drew_digital', wallet: 'GCREATOR10JJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJ', platform: 'x', followerCount: 38000, avgEngagementRate: 0.044 },
  { id: 'c11', handle: '@skyler_social', wallet: 'GCREATOR11KKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKK', platform: 'tiktok', followerCount: 275000, avgEngagementRate: 0.069 },
  { id: 'c12', handle: '@parker_posts', wallet: 'GCREATOR12LLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLL', platform: 'instagram', followerCount: 140000, avgEngagementRate: 0.035 },
  { id: 'c13', handle: '@quinn_creates', wallet: 'GCREATOR13MMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMM', platform: 'x', followerCount: 52000, avgEngagementRate: 0.048 },
  { id: 'c14', handle: '@reese_reels', wallet: 'GCREATOR14NNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNN', platform: 'tiktok', followerCount: 410000, avgEngagementRate: 0.072 },
  { id: 'c15', handle: '@avery_art', wallet: 'GCREATOR15OOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOO', platform: 'instagram', followerCount: 88000, avgEngagementRate: 0.041 },
  { id: 'c16', handle: '@blake_blogs', wallet: 'GCREATOR16PPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPP', platform: 'x', followerCount: 31000, avgEngagementRate: 0.039 },
  { id: 'c17', handle: '@camden_clips', wallet: 'GCREATOR17QQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQ', platform: 'tiktok', followerCount: 195000, avgEngagementRate: 0.058 },
  { id: 'c18', handle: '@dakota_designs', wallet: 'GCREATOR18RRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRR', platform: 'instagram', followerCount: 76000, avgEngagementRate: 0.046 },
  { id: 'c19', handle: '@emery_edits', wallet: 'GCREATOR19SSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSS', platform: 'x', followerCount: 43000, avgEngagementRate: 0.043 },
  { id: 'c20', handle: '@finley_films', wallet: 'GCREATOR20TTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTT', platform: 'tiktok', followerCount: 230000, avgEngagementRate: 0.053 },
];

// =========================
// Scripted posts (mix of viral spikes and normal)
// =========================

interface ScriptedPost {
  creatorIndex: number;
  content: string;
  baseMetrics: PostMetrics;
  // For viral spikes: multiply base metrics by these factors over ~5 minutes
  spikeMultiplier?: { views: number; shares: number; comments: number; durationMinutes: number };
}

const SCRIPTED_POSTS: ScriptedPost[] = [
  // Normal posts (low VVI)
  { creatorIndex: 0, content: 'Just finished a new piece! 🎨', baseMetrics: { views: 1200, shares: 12, comments: 8, likes: 89 } },
  { creatorIndex: 2, content: 'Morning coffee ☕ Ready to create', baseMetrics: { views: 3400, shares: 23, comments: 15, likes: 234 } },
  { creatorIndex: 4, content: 'New tutorial dropping tomorrow!', baseMetrics: { views: 8900, shares: 156, comments: 67, likes: 543 } },
  { creatorIndex: 1, content: 'Behind the scenes of my latest project', baseMetrics: { views: 5600, shares: 45, comments: 32, likes: 312 } },
  { creatorIndex: 3, content: 'Testing new brushes today 🖌️', baseMetrics: { views: 2100, shares: 18, comments: 11, likes: 145 } },

  // VIRAL SPIKE 1: c5 (Taylor) - TikTok dance trend
  {
    creatorIndex: 4,
    content: 'This trend is taking over my FYP! 💃 #viral #dance',
    baseMetrics: { views: 15000, shares: 890, comments: 340, likes: 2100 },
    spikeMultiplier: { views: 150, shares: 80, comments: 40, durationMinutes: 5 }
  },

  // Normal posts
  { creatorIndex: 6, content: 'Sketch dump from this week ✏️', baseMetrics: { views: 890, shares: 8, comments: 5, likes: 67 } },
  { creatorIndex: 8, content: 'Sunset inspiration 🌅', baseMetrics: { views: 4300, shares: 34, comments: 21, likes: 289 } },

  // VIRAL SPIKE 2: c11 (Skyler) - TikTok educational content
  {
    creatorIndex: 10,
    content: 'You won\'t believe this productivity hack! 🤯 #learnontiktok',
    baseMetrics: { views: 22000, shares: 1200, comments: 560, likes: 3400 },
    spikeMultiplier: { views: 200, shares: 100, comments: 50, durationMinutes: 4 }
  },

  // Normal posts
  { creatorIndex: 12, content: 'New color palette exploration 🎨', baseMetrics: { views: 1800, shares: 15, comments: 9, likes: 123 } },
  { creatorIndex: 14, content: 'Process video: from sketch to final', baseMetrics: { views: 6700, shares: 56, comments: 34, likes: 412 } },

  // VIRAL SPIKE 3: c13 (Reese) - Instagram Reel going viral
  {
    creatorIndex: 13,
    content: 'POV: You\'re an artist in 2026 🎭 #artistlife #reels',
    baseMetrics: { views: 35000, shares: 2100, comments: 890, likes: 5600 },
    spikeMultiplier: { views: 300, shares: 150, comments: 70, durationMinutes: 6 }
  },

  // More normal posts to fill the feed
  { creatorIndex: 16, content: 'Client work sneak peek 👀', baseMetrics: { views: 3200, shares: 28, comments: 17, likes: 198 } },
  { creatorIndex: 18, content: 'New equipment unboxing! 📦', baseMetrics: { views: 5400, shares: 42, comments: 28, likes: 334 } },
  { creatorIndex: 5, content: 'Weekend vibes only ✨', baseMetrics: { views: 2800, shares: 22, comments: 14, likes: 167 } },
  { creatorIndex: 7, content: 'Collab announcement coming soon! 🤝', baseMetrics: { views: 12000, shares: 234, comments: 156, likes: 890 } },
  { creatorIndex: 9, content: 'Throwback to my first piece 🖼️', baseMetrics: { views: 4100, shares: 38, comments: 24, likes: 278 } },
  { creatorIndex: 15, content: 'Q&A: Your art questions answered', baseMetrics: { views: 8900, shares: 78, comments: 145, likes: 567 } },
  { creatorIndex: 17, content: 'Studio tour 2026 edition 🏠', baseMetrics: { views: 15000, shares: 189, comments: 98, likes: 987 } },
  { creatorIndex: 19, content: 'Time-lapse: 10 hours in 30 seconds ⏱️', baseMetrics: { views: 28000, shares: 567, comments: 234, likes: 1890 } },
];

// =========================
// SocialSource interface
// =========================

export interface SocialSource {
  getFeed(): Promise<Post[]>;
  getCreator(id: string): Creator | undefined;
}

function generatePostId(creatorId: string, index: number): string {
  // Stable identifiers let the agent remember paid posts across server restarts.
  return `post_${creatorId}_${index}`;
}

function applySpike(base: PostMetrics, multiplier: ScriptedPost['spikeMultiplier']): PostMetrics {
  if (!multiplier) return base;
  return {
    views: Math.floor(base.views * multiplier.views),
    shares: Math.floor(base.shares * multiplier.shares),
    comments: Math.floor(base.comments * multiplier.comments),
    likes: Math.floor(base.likes * multiplier.views),
  };
}

function computeDelta(base: PostMetrics, spiked: PostMetrics, minutes: number): PostDelta {
  return {
    views: spiked.views - base.views,
    shares: spiked.shares - base.shares,
    comments: spiked.comments - base.comments,
    minutes,
  };
}

// =========================
// SimulatedFeed implementation
// =========================

export class SimulatedFeed implements SocialSource {
  private posts: Post[] = [];
  private spikeState = new Map<number, { active: boolean; startTime: number }>();

  constructor() {
    this.initializeFeed();
  }

  private initializeFeed() {
    this.posts = [];
    SCRIPTED_POSTS.forEach((scripted, index) => {
      const creator = CREATORS[scripted.creatorIndex];
      const isSpike = !!scripted.spikeMultiplier;
      const spikedMetrics = isSpike ? applySpike(scripted.baseMetrics, scripted.spikeMultiplier!) : scripted.baseMetrics;

      let delta: PostDelta;
      if (isSpike && scripted.spikeMultiplier) {
        delta = computeDelta(scripted.baseMetrics, spikedMetrics, scripted.spikeMultiplier.durationMinutes);
      } else {
        delta = {
          views: Math.floor(spikedMetrics.views * 0.02),
          shares: Math.floor(spikedMetrics.shares * 0.05),
          comments: Math.floor(spikedMetrics.comments * 0.03),
          minutes: 30,
        };
      }

      this.posts.push({
        id: generatePostId(creator.id, index),
        creatorId: creator.id,
        creatorHandle: creator.handle,
        creatorWallet: creator.wallet,
        platform: creator.platform,
        content: scripted.content,
        metrics: spikedMetrics,
        timestamp: Date.now() - Math.random() * 3600000,
        url: `https://${creator.platform}.com/${creator.handle.replace('@', '')}/status/${index}`,
      });

      if (isSpike) {
        this.spikeState.set(index, { active: true, startTime: Date.now() });
      }
    });
  }

  /**
   * Calculates VVI for every post using simulated engagement data.
   */
  getFeedWithVVI(): Array<Post & {
    vvi: number;
    delta: PostDelta;
    flagged: boolean;
  }> {
    return this.posts
      .map((post, index) => {
        const scripted = SCRIPTED_POSTS[index];
        let delta: PostDelta;

        if (scripted?.spikeMultiplier) {
          delta = computeDelta(
            scripted.baseMetrics,
            post.metrics,
            scripted.spikeMultiplier.durationMinutes
          );
        } else {
          delta = {
            views: Math.floor(post.metrics.views * 0.02),
            shares: Math.floor(post.metrics.shares * 0.05),
            comments: Math.floor(post.metrics.comments * 0.03),
            minutes: 30,
          };
        }

        const vvi = computeVVI(delta);

        return {
          ...post,
          vvi,
          delta,
          flagged: vvi >= VVI_THRESHOLD,
        };
      })
      .sort((a, b) => b.vvi - a.vvi);
  }

  async getFeed(): Promise<Post[]> {
    return this.getFeedWithVVI().map(
      ({ vvi, delta, flagged, ...post }) => post
    );
  }

  getCandidates(): Candidate[] {
    return this.getFeedWithVVI()
      .filter(post => post.flagged)
      .map(({ vvi, delta, flagged, ...post }) => ({
        post,
        vvi,
        delta,
      }));
  }
  getCreator(id: string): Creator | undefined {
    return CREATORS.find(c => c.id === id);
  }

  // Demo helper: trigger a viral spike programmatically
  triggerViralSpike(postIndex: number): void {
    if (postIndex < 0 || postIndex >= this.posts.length) {
      console.warn(`[SimulatedFeed] Invalid postIndex: ${postIndex}`);
      return;
    }

    const scripted = SCRIPTED_POSTS[postIndex];
    if (!scripted) {
      console.warn(`[SimulatedFeed] No scripted post at index ${postIndex}`);
      return;
    }

    const isSpike = !!scripted.spikeMultiplier;
    if (!isSpike) {
      // Convert a normal post into a spike by creating a temporary spike
      console.log(`[SimulatedFeed] Converting post ${postIndex} to viral spike`);
      scripted.spikeMultiplier = { views: 100, shares: 50, comments: 25, durationMinutes: 5 };
    }

    // Update the post metrics immediately
    const spikedMetrics = applySpike(scripted.baseMetrics, scripted.spikeMultiplier!);
    this.posts[postIndex] = {
      ...this.posts[postIndex],
      metrics: spikedMetrics,
      content: this.posts[postIndex].content + ' 🔥 VIRAL SPIKE ACTIVATED',
    };

    this.spikeState.set(postIndex, { active: true, startTime: Date.now() });
    console.log(`[SimulatedFeed] Viral spike triggered on post ${postIndex}: ${this.posts[postIndex].content}`);
  }

  // Demo helper: get all posts (for dashboard)
  getAllPosts(): Post[] {
    return [...this.posts];
  }
}

// Singleton instance for the demo
export const simulatedFeed = new SimulatedFeed();
