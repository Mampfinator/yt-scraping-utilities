import { 
    findValuesByKeys,  
    parseRawData, 
    getLastItem, 
    sanitizeUrl, 
    mergeRuns, 
    findActiveTab 
} from "./util";

import type { ytInitialData } from "./util";

export enum AttachmentType {
    Image = "IMAGE",
    Poll = "POLL",
    Video = "VIDEO",
    None = "NONE"
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
    choices?: string[];

    /* Only present if attachmentType is `VIDEO` */
    video?: {
        id: string;
        title: string;
        descriptionSnippet: string;
        thumbnail: string;
    }
}

// kept here for adjustments because I could swear there was something off about this at some point.
const communityPostKeys = ["backstagePostRenderer"];

/**
 * Extracts a simplified community post from a `backstagePostRenderer`.
 */
export function extractPost(rawPost: Record<string, any>): CommunityPost {
    const {postId: id, contentText: text, backstageAttachment: attachment} = rawPost;

    const attachmentType = attachment ? (
        attachment?.backstageImageRenderer ? AttachmentType.Image :
        attachment?.postMultiImageRenderer ? AttachmentType.Image :
        attachment?.pollRenderer ? AttachmentType.Poll :  
        attachment?.videoRenderer ? AttachmentType.Video : "INVALID"
    ) : AttachmentType.None;
    
    if (attachmentType === "INVALID") {
        throw new Error(`Could not resolve attachmentType in ${JSON.stringify(attachment)}! Please open a PR with this error!`);
    }

    const images = (() => {
        if (attachmentType !== AttachmentType.Image) return undefined;
        const images: string[] = [];

        const addToImages = (imageRenderer: any) => {
            images.push(
                sanitizeUrl(getLastItem(imageRenderer.image.thumbnails).url)
            )
        }

        attachment.backstageImageRenderer ? 
            addToImages(attachment.backstageImageRenderer) : 
            attachment.postMultiImageRenderer.images.forEach(
            ({backstageImageRenderer}: any) => {
                    addToImages(backstageImageRenderer)
                }
            );

        return images;
    })();

    const choices = attachmentType === AttachmentType.Poll && attachment.pollRenderer?.choices.map((choice: any) => mergeRuns(choice.text.runs));

    const video = (() => {
        if (attachmentType !== AttachmentType.Video) return;

        const {videoId: id, thumbnail: thumbnails, title: titleRaw, descriptionSnippet: descriptionSnippetRaw} = attachment.videoRenderer;


        // ? Is this even required? https://i.ytimg.com/vi/[id]/maxresdefault.jpg is a thing.
        const thumbnail = sanitizeUrl(getLastItem(thumbnails.thumbnails).url);
        const title = mergeRuns(titleRaw.runs);
        const descriptionSnippet = mergeRuns(descriptionSnippetRaw.runs);

        return {
            id,
            title, 
            descriptionSnippet,
            thumbnail
        }
    })();

    const content: {text: string, url?: string}[] | undefined = text?.runs && text.runs.map(
        (run: any) => {
            const {text, navigationEndpoint} = run;
            if (navigationEndpoint) {
                const {commandMetadata} = navigationEndpoint;

                let url: string;
                const initialUrl = new URL(commandMetadata.webCommandMetadata.url);
                
                // q parameter is the redirect target for /redirect links
                if (initialUrl.searchParams.has("q")) {
                    url = initialUrl.searchParams.get("q")!;
                // if &q is not present, it's a YouTube-internal link.
                } else {
                    url = initialUrl.toString();
                }

                if (!url) throw new Error(`Could not find URL in ${JSON.stringify(navigationEndpoint)}! Please open a PR with this error message!`);

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

    return post;
}

/**
 * Extracts community posts from a YouTube page or already parsed ytInitialData.
 * @param source - either parsed `ytInitialData` via `parseRawData` or raw page string from a community tab or post. Extracting from a string will always be faster.
 */
export function extractCommunityPosts(source: ytInitialData): CommunityPost[]
export function extractCommunityPosts(source: string): CommunityPost[]
export function extractCommunityPosts(source: string | ytInitialData): CommunityPost[] {
    const ytInitialData : ytInitialData = typeof source === "string" ? parseRawData({source, ytInitialData: true}).ytInitialData! : source;
    if (!ytInitialData) throw new TypeError(`No YT initial data in provided source!`);
    
    // Slight optimization to skip unused tabs and meta tags.
    const rawPosts = findValuesByKeys(findActiveTab(ytInitialData), communityPostKeys);
    return rawPosts.map(post => extractPost(post));
}