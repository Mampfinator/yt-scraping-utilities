import type { ytInitialData } from "./youtube-types";
import { 
    mergeRuns, 
    getThumbnail,
    transformYtInitialData,
    getTextOrMergedRuns
} from "./util";

export enum AttachmentType {
    Image = "Image",
    Poll = "Poll",
    Video = "Video",
    Playlist = "Playlist",
    SharedPost = "SharedPost",
    None = "None",
}

export interface PollChoice {
    text: string; 
    imageUrl?: string;
}


interface BaseCommunityPost {
    id: string;
    content?: {text: string, url?: string}[];
    attachmentType: AttachmentType;
}

export interface TextOnlyCommunityPost extends BaseCommunityPost {
    attachmentType: AttachmentType.None;
    content: {text: string, url?: string}[];
}

export interface ImageCommunityPost extends BaseCommunityPost {
    attachmentType: AttachmentType.Image;
    images: string[];
}

export interface PollCommunityPost extends BaseCommunityPost {
    attachmentType: AttachmentType.Poll;
    choices: PollChoice[];
}

export interface VideoCommunityPost extends BaseCommunityPost {
    attachmentType: AttachmentType.Video;
    video: {
        id?: string; // TODO: test for invalid cases 
        title: string;
        descriptionSnippet?: string;
        thumbnail: string;
        membersOnly: boolean;
    }
}

export interface PlaylistCommunityPost extends BaseCommunityPost {
    attachmentType: AttachmentType.Playlist;
    playlist: {
        /**
         * If ID is undefined, the playlist is no longer available.
         */
        id?: string;
        title: string;
        thumbail: string;
    }
}


export interface SharedPostCommunityPost extends BaseCommunityPost {
    attachmentType: AttachmentType.SharedPost;
    sharedPost: CommunityPost;
}

export type CommunityPost = SharedPostCommunityPost | ImageCommunityPost | PollCommunityPost | VideoCommunityPost | PlaylistCommunityPost | TextOnlyCommunityPost;

// NOTE: the order here is important, otherwise the sharedPostRenderer and its original post would appear in separate results.
const communityPostKeys = ["sharedPostRenderer", "backstagePostRenderer"];

/**
 * Extracts a simplified community post from a `backstagePostRenderer` or a `sharedPostRenderer`.
 */
export function extractPost(rawPost: Record<string, any>): CommunityPost {
    // normal posts store text in `contentText`, quote posts store them in `content`.
    const {postId: id, contentText, backstageAttachment: attachment, originalPost, content: sharedPostContent} = rawPost;

    let attachmentType: AttachmentType | "INVALID";
    switch (true) {
        case originalPost?.backstagePostRenderer !== undefined: attachmentType = AttachmentType.SharedPost; break;
        case !attachment: attachmentType = AttachmentType.None; break;
        case attachment.backstageImageRenderer != undefined || attachment.postMultiImageRenderer != undefined: attachmentType = AttachmentType.Image; break;
        case attachment.pollRenderer != undefined: attachmentType = AttachmentType.Poll; break;
        case attachment.videoRenderer != undefined: attachmentType = AttachmentType.Video; break;
        case attachment.playlistRenderer != undefined: attachmentType = AttachmentType.Playlist; break;
        default: attachmentType = "INVALID";
    }

    
    if (attachmentType === "INVALID") {
        throw new Error(`Could not resolve attachmentType in ${JSON.stringify(attachment)}! Please open an issue with this error!`);
    }


    const content: {text: string, url?: string}[] | undefined = (() => {
        const runMapper = (run: any) => {
            const {text, navigationEndpoint} = run;
            if (navigationEndpoint) {
                const {commandMetadata} = navigationEndpoint;

                let url: string;
                const {url: parsedUrl} = commandMetadata.webCommandMetadata as {url: string};
                const initialUrl = new URL(commandMetadata.webCommandMetadata.url, parsedUrl.startsWith("http") ? undefined : "https://youtube.com/");
                // q parameter is the redirect target for /redirect links
                if (initialUrl.searchParams.has("q")) {
                    url = initialUrl.searchParams.get("q")!;
                // if &q is not present, it's a YouTube-internal link.
                } else {
                    url = initialUrl.toString();
                }

                if (!url) throw new Error(`Could not find URL in ${JSON.stringify(navigationEndpoint)}! Please open an issue with this error message!`);

                return {
                    text,
                    url 
                }
            }

            return {text}
        }
        // this is a mess.
        return (
            contentText?.runs?.map(runMapper) ?? (contentText?.simpleText ? {text: contentText.simpleText} : undefined) ??
            sharedPostContent?.runs?.map(runMapper) ?? (sharedPostContent?.simpleText ? {text: sharedPostContent.simpleText} : undefined)
        );
    })();


    const post: BaseCommunityPost & Record<string, any> = {id, content, attachmentType};


    const images = (() => {
        if (attachmentType !== AttachmentType.Image) return;
        const images: string[] = [];

        const addToImages = (imageRenderer: any) => {
            images.push(
                getThumbnail(imageRenderer.image.thumbnails)
            )
        }

        if (attachment.backstageImageRenderer) addToImages(attachment.backstageImageRenderer);
        else {
            for (const {backstageImageRenderer} of attachment.postMultiImageRenderer.images) {
                addToImages(backstageImageRenderer)
            }
        }

        return images;
    })();

    const choices = (() => {
        if (attachmentType !== AttachmentType.Poll) return;
        const {choices: rawChoices} = attachment.pollRenderer;

        return rawChoices.map((rawChoice: {text: Record<string, any>, image: Record<string, any>}): PollChoice => {
            const text = mergeRuns(rawChoice.text.runs);
            const choice: PollChoice = {text};
            if (rawChoice.image) choice.imageUrl = getThumbnail(rawChoice.image.thumbnails);
            return choice;
        });
    })();

    const video = (() => {
        if (attachmentType !== AttachmentType.Video) return;

        const {videoId: id, thumbnail: thumbnails, title: titleRaw, descriptionSnippet: descriptionSnippetRaw, badges} = attachment.videoRenderer;

        // ? Is this even required? https://i.ytimg.com/vi/[id]/maxresdefault.jpg is a thing.
        const thumbnail =  getThumbnail(thumbnails.thumbnails);

        const title =  titleRaw.simpleText ?? mergeRuns(titleRaw.runs);
        const descriptionSnippet = descriptionSnippetRaw ? mergeRuns(descriptionSnippetRaw.runs) : undefined;

        const membersOnly: boolean = (badges && badges.some(({metadataBadgeRenderer}: any) => metadataBadgeRenderer?.style == "BADGE_STYLE_TYPE_MEMBERS_ONLY")) ?? false;

        return {
            id,
            title, 
            descriptionSnippet,
            thumbnail,
            membersOnly
        }
    })();

    const playlist = (() => {
        // TODO: find a members only playlist shared in a post to find out if that's even a thing that'd be displayed.
        if (attachmentType !== AttachmentType.Playlist) return;
        const {title: titleRenderer, thumbnailRenderer, playlistId: id} = attachment.playlistRenderer;
        const title: string = titleRenderer.simpleText ?? mergeRuns(titleRenderer.text.runs);
        const thumbail: string = getThumbnail(thumbnailRenderer.playlistVideoThumbnailRenderer.thumbnail.thumbnails);

        return {
            id, title, thumbail
        }
    })();

    
    // avoid ugly {content: undefined}s
    if (post.attachmentType === AttachmentType.Image) post.images = images!;
    else if (post.attachmentType === AttachmentType.Poll) post.choices = choices;
    else if (post.attachmentType === AttachmentType.Video) post.video = video!;
    else if (post.attachmentType === AttachmentType.Playlist) post.playlist = playlist!; 
    else if (post.attachmentType === AttachmentType.SharedPost) post.sharedPost = extractPost(originalPost.backstagePostRenderer);

    // this is really inelegant.
    return post as unknown as CommunityPost;
}

/**
 * Extracts community posts from a YouTube page or already parsed ytInitialData.
 * @param source - either parsed `ytInitialData` via `parseRawData` or raw page string from a community tab or post.
 */
export function extractCommunityPosts(source: ytInitialData): CommunityPost[]
export function extractCommunityPosts(source: string): CommunityPost[]
export function extractCommunityPosts(source: string | ytInitialData): CommunityPost[] {
    return transformYtInitialData(source, communityPostKeys, extractPost);
}