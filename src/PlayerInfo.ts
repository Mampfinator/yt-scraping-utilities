import { getLastItem, sanitizeUrl, tryParseDate, parseRawData } from "./util";
import {ytInitialPlayerResponse } from "./youtube-types";

export enum Playability {
    OK = "OK",
    Unplayable = "UNPLAYABLE"
} 

export interface VideoFormat {
    url: string;
    mimeType: string;
    label: string;
    bitrate: number;
    video: {
        width: number; 
        height: number;
        fps: number;
    }
    audio: {
        sampleRate: number;
        channels: number;
    }
}

export interface PlayerInfo {
    videoId: string;
    channelId: string;
    channelName: string;
    description: string;
    thumbnail: string;

    /**
     * For live streams, represents concurrent viewers.
     * For past streams and uploads, represents total views.
     */
    viewers: number;
    ratable: boolean;
    title: string;
    length: number;
    keywords: string[];
    playability: Playability;

    unlisted: boolean;
    familySafe: boolean;

    /**
     * Whether the video is playable outside of YouTube.
     */
    embeddable: boolean;
    
    /**
     * Whether this video is or was a stream or premiere.
     */
    isStream: boolean;

    /**
     * Whether the stream is live right now.
     */
    live: boolean;

    /**
     * Whether this is a past stream.
     */
    hasEnded: boolean;

    startTime?: Date;
    endTime?: Date;


    /**
     * Only present if playability is OK
     */
    manifests?: {
        dash?: string;
        hls?: string;
    }

    formats?: VideoFormat[];

    membersOnly: boolean;
}

/**
 * Extracts info from the player renderer from a `/watch` page or a `youtu.be`.
 * @param source - either parsed `ytPlayerInitialResponse` (via `parseRawData`) or page source string from a player page.
 */
export function extractPlayerInfo(source: ytInitialPlayerResponse): PlayerInfo
export function extractPlayerInfo(source: string): PlayerInfo
export function extractPlayerInfo(source: string | ytInitialPlayerResponse): PlayerInfo {
    const playerResponse : ytInitialPlayerResponse = typeof source === "string" ? parseRawData({source, ytInitialPlayerResponse: true}).ytInititalPlayerRespone! : source;
    if (!playerResponse) throw new TypeError(`No player response in provided source! Make sure the source is from /watch or a youtu.be link!`);


    const {
        playabilityStatus, 
        streamingData,
        videoDetails,
        microformat
    } = playerResponse;

    const {
        videoId,
        lengthSeconds: length,
        keywords, 
        channelId,
        thumbnail: thumbnailRaw,
        viewCount: viewers,
        author: channelName,
        isLiveContent,
        allowRatings: ratable
    } = videoDetails;

    const thumbnail = sanitizeUrl(getLastItem(thumbnailRaw.thumbnails).url);

    const {
        status,
        playableInEmbed: embeddable,
        miniplayer,
        errorScreen
    } = playabilityStatus;

    const {
        title: rawTitle,
        description,
        isFamilySafe: familySafe,
        isUnlisted: unlisted,
        liveBroadcastDetails
    } = microformat.playerMicroformatRenderer;


    const playerInfo: PlayerInfo = {
        videoId,
        channelId,
        channelName,
        description: description.simpleText,
        thumbnail,
        viewers, 
        ratable,
        title: rawTitle.simpleText,
        length,
        keywords,
        playability: status,
        unlisted,
        familySafe,
        membersOnly: false,
        embeddable,
        isStream: isLiveContent,
        live: false, 
        hasEnded: false
    }

    if (streamingData) {
        const {formats} = streamingData;
        if (formats) {
            playerInfo.formats = formats.map((format: any): VideoFormat => ({
                url: format.url,
                mimeType: format.mimeType,
                label: format.qualityLabel,
                bitrate: format.bitrate,
                video: {
                    width: format.width,
                    height: format.height,
                    fps: format.fps,
                },
                audio: {
                    sampleRate: Number(format.sampleRate),
                    channels: format.channels
                }
            }));
        }
    }

    if (errorScreen?.playerLegacyDesktopYpcOfferRenderer) {
        const {playerLegacyDesktopYpcOfferRenderer: offer} = errorScreen;
        
        switch(offer.offerId) {
            case "sponsors_only_video":
                playerInfo.membersOnly = true;
                break;
        }
    }

    if (liveBroadcastDetails) {
        const {
            isLiveNow,
            startTimestamp, 
            endTimestamp
        } = liveBroadcastDetails;

        playerInfo.live = isLiveNow;
        playerInfo.startTime = tryParseDate(startTimestamp)
        playerInfo.endTime = tryParseDate(endTimestamp);

        if (playerInfo.endTime) playerInfo.hasEnded = true;

        if (streamingData) {
            var {
                dashManifestUrl: dash,
                hlsManifestUrl: hls
            } = streamingData;
            const manifests: {hls?: string, dash?: string} = {};
            dash && (manifests.dash = dash);
            hls && (manifests.hls = hls);

            playerInfo.manifests = manifests;
        }

    }

    return playerInfo;
}