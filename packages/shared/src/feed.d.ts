/**
 * Simulated social feed behind SocialSource interface
 * Replays scripted viral and non-viral posts for repeatable demos
 *
 * IMPORTANT: This is SIMULATED. Real X/TikTok/Instagram APIs need
 * approvals and rate limits you can't get in 15 hours.
 * Swap this implementation for real APIs after the hackathon.
 */
import { Post, Creator, Candidate } from './index.js';
export interface SocialSource {
    getFeed(): Promise<Post[]>;
    getCreator(id: string): Creator | undefined;
}
export declare class SimulatedFeed implements SocialSource {
    private posts;
    private spikeState;
    constructor();
    private initializeFeed;
    getFeed(): Promise<Post[]>;
    getCandidates(): Candidate[];
    getCreator(id: string): Creator | undefined;
    triggerViralSpike(postIndex: number): void;
    getAllPosts(): Post[];
}
export declare const simulatedFeed: SimulatedFeed;
//# sourceMappingURL=feed.d.ts.map