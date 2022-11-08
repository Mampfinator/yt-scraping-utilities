import { readFileSync } from "fs";
import path from "path";
import { assert } from "chai";
import { extractCommunityPosts, AttachmentType, PollCommunityPost, ImageCommunityPost, SharedPostCommunityPost, VideoCommunityPost, PlaylistCommunityPost } from "../src";

const getPathName = (fileName: string) => path.join(__dirname, "res", fileName);

describe("Community post tests", () => {
    describe("General posts tests", () => {
        it("should parse a full community page properly", () => {
            const communityPage = readFileSync(getPathName("natsume-community-page.html"))?.toString();
    
            const posts = extractCommunityPosts(communityPage);
            // fixed number in pre-downloaded reference HTML.
            assert.lengthOf(posts, 8);
        });
    });


    describe("Poll posts tests", () => {
        it("should parse a normal poll from a community post", () => {
            const ytInitialData = JSON.parse(readFileSync(getPathName("selen-poll-no-images.json")).toString());
            const [post] = extractCommunityPosts(ytInitialData) as PollCommunityPost[];
            
            assert.isDefined(post.choices);
            const choices = post.choices!;

            assert.lengthOf(choices, 2);
            assert.isUndefined(choices[0].imageUrl);
        });

        it("should parse a poll with images from a community post", () => {
            const ytInitialData = JSON.parse(readFileSync(getPathName("poll-with-images.json")).toString());
            const [post] = extractCommunityPosts(ytInitialData) as PollCommunityPost[];
    
            assert.isDefined(post.choices);
            const choices = post.choices!;
    
            assert.lengthOf(choices, 4, "did not parse the right amount of choices.");
            assert.isString(choices[0].imageUrl, "failed to parse image in poll.");
        });
    });
    
    
    describe("Image posts tests", () => {
        it("should parse images from a community post with one image", () => {
            const ytInitialData = JSON.parse(readFileSync(getPathName("natsume-single-image-post.json")).toString());
            const [post] = extractCommunityPosts(ytInitialData) as ImageCommunityPost[];
    
            const images = post.images!;
    
            assert.isDefined(images);
            assert.lengthOf(images, 1);
            assert.isString(images[0]);
        }); 
    
        it("should parse images from a community post with multiple images", () => {
            const ytInitialData = JSON.parse(readFileSync(getPathName("pina-multi-image-post.json")).toString());
            const [post] = extractCommunityPosts(ytInitialData) as ImageCommunityPost[];
    
            const images = post.images!;
    
            assert.isDefined(images);
            assert.lengthOf(images, 4);
    
            assert.isTrue(images.reduce((prev, current) => {
                // make sure every image is defined.
                return prev && typeof current == "string";
            }, true));
        });
    });
    
    
    describe("Shared posts tests", () => {
        it("should deal with quoted community posts properly", () => {
            const ytInitialData = JSON.parse(readFileSync(getPathName("shared-post.json")).toString());

            const posts = extractCommunityPosts(ytInitialData);
            


            assert.lengthOf(posts, 1, "parsed parent & child post separately");
            const [post] = posts;
    
            assert.isUndefined((post as ImageCommunityPost).images, "Parsed originalPost's images.");
            

            assert.isDefined((post as SharedPostCommunityPost).sharedPost);
    
            const sharedPost = (post as SharedPostCommunityPost).sharedPost;        
            assert.isString(sharedPost.id, "Did not parse shared post's ID");
            assert.lengthOf((sharedPost as ImageCommunityPost).images, 1);
        });


        it("should put a shared post's content in its content field, ignoring the child post's content", () => {
            const ytInitialData = JSON.parse(readFileSync(getPathName("shared-post.json")).toString());
            const [post] = extractCommunityPosts(ytInitialData) as SharedPostCommunityPost[];

            assert.nestedPropertyVal(post.content, "[0].text", "🤣")
            assert.isFalse(post.content?.[0].text === post.sharedPost.content?.[0].text);
        });
    });

    describe("Video posts tests", () => {
        it("should extract a video", () => {
            const ytInitialData = JSON.parse(readFileSync(getPathName("video-post.json")).toString());
            const [post] = extractCommunityPosts(ytInitialData) as VideoCommunityPost[];

            assert.equal(post.attachmentType, AttachmentType.Video);
            
            const video = post.video!;

            assert.equal(video.id, "tzXcH4Q1iiY");
            assert.isString(video.thumbnail);
            assert.isString(video.title);
            assert.isString(video.descriptionSnippet);
            assert.isFalse(video.membersOnly);
        });

        it("should extract a members only video", () => {
            const ytInitialData = JSON.parse(readFileSync(getPathName("mo-video-post.json")).toString());
            const [post] = extractCommunityPosts(ytInitialData) as VideoCommunityPost[];

            assert.equal(post.attachmentType, AttachmentType.Video);
            assert.isTrue(post.video!.membersOnly);
        });

        it("should not throw on a deleted video", () => {
            const ytInitialData = JSON.parse(readFileSync(getPathName("deleted-video-post.json")).toString());
            const [post] = extractCommunityPosts(ytInitialData) as VideoCommunityPost[];

            assert.isUndefined(post.video!.id);
        });
    });

    describe("Playlist posts tests", () => {
        // TODO: find a post with a playlist that hasn't been deleted
        it("should extract a playlist", () => {

        });

        it("should not throw on a deleted playlist", () => {
            const ytInitialData = JSON.parse(readFileSync(getPathName("yuuri-unavailable-playlist-post.json")).toString());
            const [post] = extractCommunityPosts(ytInitialData) as PlaylistCommunityPost[]; 

            assert.isDefined(post);
            assert.equal(post.attachmentType, AttachmentType.Playlist);

            const playlist = post.playlist!;

            assert.isDefined(playlist);
            assert.isUndefined(playlist.id);
            assert.isString(playlist.title);
        });
    });
});