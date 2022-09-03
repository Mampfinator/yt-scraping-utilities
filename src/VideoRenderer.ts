import { findValuesByKeys, mergeRuns, parseRawData } from "./util";
import { GridVideoRenderer, ytInitialData } from "./youtube-types";

export interface VideoRenderer {
    id: string;
    title: string;
    status: "live" | "upcoming" | "offline";
}

export function extractVideoRenderers(source: ytInitialData): VideoRenderer[]
export function extractVideoRenderers(source: string): VideoRenderer[]
export function extractVideoRenderers(source: string | ytInitialData): VideoRenderer[]
{
    if (typeof source !== "object") source = parseRawData({ytInitialData: true, source}).ytInitialData!;
    const gridVideoRenderers = findValuesByKeys(source, ["gridVideoRenderer"]);
    return gridVideoRenderers.map(extractVideoRenderer);
}


export function extractVideoRenderer(source: GridVideoRenderer): VideoRenderer {
    const {videoId, title, thumbnail, ownerBadges, thumbnailOverlays} = source;

    
    
    const status: "live" | "upcoming" | "offline" = (() => {
        const statusRenderer = thumbnailOverlays.find(overlay => overlay.thumbnailOverlayTimeStatusRenderer)?.thumbnailOverlayTimeStatusRenderer;
        switch (statusRenderer?.style) {
            case "DEFAULT":
                return "offline";
            case "UPCOMING":
                return "upcoming";
            case "LIVE":
                return "live";
            default:
                throw new Error(`Could not determine status of video ${videoId}. Unknown status ${statusRenderer?.style}`);
        }
    })();


    return {
        id: videoId,
        title: mergeRuns(title.runs),
        status
    }
}