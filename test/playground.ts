import {readFileSync} from "fs";
import { join } from "path";
import { extractCommunityPosts, findActiveTab, parseRawData } from "../src";
import axios from "axios";

const source = readFileSync(join(__dirname, "patraChannelCommunityTab.html")).toString();


// console.log(
//     extractCommunityPosts(source)
//     .map(post => post.images)
//     .filter(images => images)
// );

(async () => {
    const result = await axios.get("https://www.youtube.com/channel/UCV1xUwfM2v2oBtT3JNvic3w/community", {});
    
    console.log(
        extractCommunityPosts(result.data)
    );
})();