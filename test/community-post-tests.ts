import { readFileSync } from "fs";
import path from "path";
import { assert } from "chai";
import { extractCommunityPosts } from "../src";

const getPathName = (fileName: string) => path.join(__dirname, "res", fileName);

describe("Community post tests", () => {
    describe("General tests", () => {
        it("Should parse a full community page properly", () => {
            const communityPage = readFileSync(getPathName("natsume-community-page.html"))?.toString();
    
            const posts = extractCommunityPosts(communityPage);
            // fixed number in pre-downloaded reference HTML.
            assert.lengthOf(posts, 8);
        });
    });


    describe("Poll tests", () => {
        it("should parse a normal poll from a community post", () => {
            const ytInitialData = JSON.parse(readFileSync(getPathName("selen-poll-no-images.json")).toString());
            const [post] = extractCommunityPosts(ytInitialData);

            assert.isDefined(post.choices);
            const choices = post.choices!;

            assert.lengthOf(choices, 2);
            assert.isUndefined(choices[0].imageUrl);
        });

        it("should parse a poll with images from a community post", () => {
            const ytInitialData = JSON.parse(readFileSync(getPathName("poll-with-images.json")).toString());
            const [post] = extractCommunityPosts(ytInitialData);
    
    
            assert.isDefined(post.choices);
            const choices = post.choices!;
    
            assert.lengthOf(choices, 4, "did not parse the right amount of choices.");
            assert.isString(choices[0].imageUrl, "failed to parse image in poll.");
        });
    });
    
    
    describe("Images tests", () => {
        it("Should parse images from a community post with one image", () => {
            const ytInitialData = JSON.parse(readFileSync(getPathName("natsume-single-image-post.json")).toString());
            const [post] = extractCommunityPosts(ytInitialData);
    
            const images = post.images!;
    
            assert.isDefined(images);
            assert.lengthOf(images, 1);
            assert.isString(images[0]);
        }); 
    
        it("Should parse images from a community post with multiple images", () => {
            const ytInitialData = JSON.parse(readFileSync(getPathName("pina-multi-image-post.json")).toString());
            const [post] = extractCommunityPosts(ytInitialData);
    
            const images = post.images!;
    
            assert.isDefined(images);
            assert.lengthOf(images, 4);
    
            assert.isTrue(images.reduce((prev, current) => {
                // make sure every image is defined.
                return prev && typeof current == "string";
            }, true));
        });
    });
    
    
    describe("Quoted post tests", () => {
        it("Should deal with quoted community posts properly.", () => {
            const ytInitialData = JSON.parse(readFileSync(getPathName("shared-post.json")).toString());
            const posts = extractCommunityPosts(ytInitialData);
    
            assert.lengthOf(posts, 1);
            const [post] = posts;
    
            assert.isUndefined(post.images, "Parsed originalPost's images.");
            assert.isDefined(post.sharedPost);
    
            const sharedPost = post.sharedPost!;        
            assert.isString(sharedPost.id, "Did not parse shared post's ID");
            assert.lengthOf(sharedPost.images!, 1);
        });
    });
});