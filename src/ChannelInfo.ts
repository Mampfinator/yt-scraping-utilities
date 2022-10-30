import type { ytInitialData, ChannelMetadataRenderer, MicroformatDataRenderer } from "./youtube-types";
import { parseRawData, getThumbnail } from "./util";

export interface ChannelInfo {
    id: string;
    name: string;
    description: string;
    vanityId?: string;
    isFamilySafe: boolean;
    avatarUrl: string;
    tags: string[];
}

/**
 * Extracts information about the viewed channel from a YouTube page or already parsed ytInitialData. Mainly uses the `channelMetadataRenderer`, or the `microFormatRenderer` if present.
 * @param source - either parsed `ytInitialData` via `parseRawData` or raw page string from a community tab or post.
 */
export function extractChannelInfo(source: ytInitialData | string): ChannelInfo {
    const ytInitialData : ytInitialData = typeof source === "string" ? parseRawData({source, ytInitialData: true}).ytInitialData! : source;
    if (!ytInitialData) throw new TypeError(`No YT initial data in provided source.`);

    // I'm pretty sure we can throw here; the microFormatDataRenderer should only appear in conjunction with the channelMetadataRenderer.
    const channelMetadataRenderer: ChannelMetadataRenderer | undefined = ytInitialData.metadata?.channelMetadataRenderer;
    if (!channelMetadataRenderer) throw new Error("Could not find channel metadata.");


    const {
        title: name, 
        description, 
        externalId: id, 
        vanityChannelUrl, 
        avatar,
        isFamilySafe,
        keywords: keywordsString
    } = channelMetadataRenderer;



    const avatarUrl = getThumbnail(avatar.thumbnails);

    let tags: string[];

    const microformatDataRenderer: MicroformatDataRenderer | undefined = ytInitialData.microformat?.microformatDataRenderer;
    if (microformatDataRenderer) {
        const {
            tags: channelTags,
        } = microformatDataRenderer;

        tags = channelTags;
    } else {
        tags = keywordsString.split(" "); // naive parsing; will incorrectly split tags that contain spaces.
    }

    const channelInfo: ChannelInfo = {name, description, id, isFamilySafe, avatarUrl, tags};
    
    const vanityId = vanityChannelUrl.split("/")[4];
    if (vanityId !== id) channelInfo.vanityId = vanityId;

    return channelInfo;
}