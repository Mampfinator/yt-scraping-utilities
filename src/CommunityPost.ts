import type { ytInitialData } from "./youtube-types";
import { 
    findValuesByKeys,  
    parseRawData, 
    mergeRuns, 
    findActiveTab, 
    getThumbnail
} from "./util";

export enum AttachmentType {
    Image = "IMAGE",
    Poll = "POLL",
    Video = "VIDEO",
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
        id: string;
        title: string;
        descriptionSnippet: string;
        thumbnail: string;
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
        if (attachmentType !== AttachmentType.Poll || !attachment.pollRenderer) return;
        const {choices: rawChoices} = attachment.pollRenderer;

        // TODO: proper YouTube typings for easier development because ytInitialData is a mess.
        return rawChoices.map((rawChoice: {text: Record<string, any>, image: Record<string, any>}): PollChoice => {
            const text = mergeRuns(rawChoice.text.runs);
            const choice: PollChoice = {text};
            if (rawChoice.image) choice.imageUrl = getThumbnail(rawChoice.image.thumbnails);
            return choice;
        });
    })();

    const video = (() => {
        if (attachmentType !== AttachmentType.Video) return;

        const {videoId: id, thumbnail: thumbnails, title: titleRaw, descriptionSnippet: descriptionSnippetRaw} = attachment.videoRenderer;


        // ? Is this even required? https://i.ytimg.com/vi/[id]/maxresdefault.jpg is a thing.
        const thumbnail =  getThumbnail(thumbnails.thumbnails);
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
    const ytInitialData : ytInitialData = typeof source === "string" ? parseRawData({source, ytInitialData: true}).ytInitialData! : source;
    if (!ytInitialData) throw new TypeError(`No YT initial data in provided source.`);
    
    // Slight optimization to skip unused tabs and meta tags.
    const rawPosts = findValuesByKeys(findActiveTab(ytInitialData), communityPostKeys);
    return rawPosts.map(post => extractPost(post));
}