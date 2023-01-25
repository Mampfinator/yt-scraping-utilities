import { mergeRuns, transformYtInitialData } from "./util";
import { GridVideoRenderer, ytInitialData } from "./youtube-types";
import type { extractReelItemRenderers } from "./ReelItemRenderer";

export interface VideoRenderer {
    id: string;
    title: string;
    status: VideoRendererStatus
}


/**
 * Extracts basic information about listed videos. 
 * Note: does **not** extract shorts. See {@linkcode extractReelItemRenderers} instead.
 */
export function extractGridVideoRenderers(source: ytInitialData): VideoRenderer[]
export function extractGridVideoRenderers(source: string): VideoRenderer[]
export function extractGridVideoRenderers(source: string | ytInitialData): VideoRenderer[]
{
    return transformYtInitialData(source, ["richItemRenderer"], (source: {content: {videoRenderer: GridVideoRenderer}}) => extractVideoRenderer(source.content.videoRenderer));
}

export enum VideoRendererStatus {
    Offline = "offline",
    Upcoming = "upcoming",
    Live = "live"
}

// slight optimization
const statusLookupTable = {
    DEFAULT: VideoRendererStatus.Offline,
    SHORTS: VideoRendererStatus.Offline,

    UPCOMING: VideoRendererStatus.Upcoming,

    LIVE: VideoRendererStatus.Live
};

export function extractVideoRenderer(source: GridVideoRenderer): VideoRenderer {
    const {videoId, title, thumbnailOverlays} = source;

    const status: VideoRendererStatus = (() => {
        const rawStatus = thumbnailOverlays.find(overlay => overlay.thumbnailOverlayTimeStatusRenderer)?.thumbnailOverlayTimeStatusRenderer?.style;

        if (!rawStatus) {
            throw new TypeError(`Could not find matching status for videoRenderer status ${rawStatus}`);
        }

        return statusLookupTable[rawStatus];
    })();


    return {
        id: videoId,
        title: mergeRuns(title.runs),
        status
    }
}