import type { ytInitialData } from "./youtube-types";
import { 
    mergeRuns, 
    getThumbnail,
    transformYtInitialData
} from "./util";

export enum AttachmentType {
    Image = "IMAGE",
    Poll = "POLL",
    Video = "VIDEO",
    Playlist = "PLAYLIST",
    None = "NONE",
}

export interface PollChoice {
    text: string; 
    imageUrl?: string;
}

export interface CommunityPost {
    id: string;
    /**
     * To display just the text content of a post, use `content.map(({text}) => text).join("");`.
     */
    content?: {text: string, url?: string}[];

    attachmentType: AttachmentType;

    /* Only present if attachmentType is `IMAGE` */
    images?: string[];

    /* Only present if attachmentType is `POLL` */
    choices?: PollChoice[];

    /* Only present if attachmentType is `VIDEO` */
    video?: {
        id?: string; // TODO: test for invalid cases 
        title: string;
        descriptionSnippet?: string;
        thumbnail: string;
        membersOnly: boolean;
    }

    playlist?: {
        /**
         * If ID is undefined, the playlist is no longer available.
         */
        id?: string;
        title: string;
        thumbail: string;
    }

    sharedPost?: CommunityPost;
}

// NOTE: the order here is important, otherwise the sharedPostRenderer and its original post would appear in separate results.
const communityPostKeys = ["sharedPostRenderer", "backstagePostRenderer"];

/**
 * Extracts a simplified community post from a `backstagePostRenderer` or a `sharedPostRenderer`.
 */
export function extractPost(rawPost: Record<string, any>): CommunityPost {
    const {postId: id, contentText: text, backstageAttachment: attachment, originalPost} = rawPost;

    let attachmentType: AttachmentType | "INVALID";
    switch (true) {
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

    const content: {text: string, url?: string}[] | undefined = text?.runs && text.runs.map(
        (run: any) => {
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
    )

    const post: CommunityPost = {id, attachmentType};
    
    // avoid ugly {content: undefined}s
    if (content) post.content = content;
    if (images) post.images = images;
    if (choices) post.choices = choices;
    if (video) post.video = video;
    if (playlist) post.playlist = playlist; 

    if (originalPost) post.sharedPost = extractPost(originalPost.backstagePostRenderer);

    return post;
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