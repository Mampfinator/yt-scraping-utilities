import { VideoRenderer, VideoRendererStatus } from "./GridVideoRenderer";
import { findValuesByKeys, getTextOrMergedRuns, mergeRuns, parseRawData, transformYtInitialData } from "./util";
import { ReelItemRenderer, ytInitialData } from "./youtube-types";

export function extractReelItemRenderers(source: ytInitialData): VideoRenderer[]
export function extractReelItemRenderers(source: string): VideoRenderer[]
export function extractReelItemRenderers(source: string | ytInitialData): VideoRenderer[] {
    return transformYtInitialData(source, ["reelItemRenderer"], extractReelVideoRenderer);
}


export function extractReelVideoRenderer(source: ReelItemRenderer): VideoRenderer {
    const { videoId, headline } = source;

    return {
        id: videoId,
        title: getTextOrMergedRuns(headline),
        status: VideoRendererStatus.Offline, // as far as I'm aware, you can only upload shorts, not schedule them. So this should be fine.
    }
}