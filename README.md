# yt-scraping-utilities
Assorted scraping utilities for YouTube because some things (like Community Posts) just can't be done with their official API.

```
npm install yt-scraping-utilities
```


## Usage
Important to note: this package does not do any requests on its own. **You** will have to fetch the data yourself. Keep in mind that YouTube ratelimits are somewhat strict, so keep your requests/minute in moderation; you'll likely be 403'd otherwise.


YouTube doesn't offer an API for community posts, but you can still scrape them fairly easily: 
```ts
import { extractCommunityPosts } from "yt-scraping-utilities";
import axios from "axios";


(async () => {
    // Extract posts from an entire community tab
    const {data: communityPage} = await axios.get("https://www.youtube.com/channel/UCV1xUwfM2v2oBtT3JNvic3w/community", {});
    const posts = extractCommunityPosts(communityPage);

    // or a single post page directly
    const {data: postPage} = await axios.get("https://www.youtube.com/post/Ugkxw-otENY0Su_1-C2HbZ1qeANvU3-Wtyg_", {});
    const [singlePost] = extractCommunityPosts(postPage);
})();
```

You can also check if a YouTube video is membership locked (you can't, however, find out which tier it's locked behind (yet)):
```ts
import { extractPlayerInfo } from "yt-scraping-utilities";
async function isMembershipVideo(videoId: string): Promise<boolean> {
    const { data } = await axios.get(`https://youtu.be/${videoId}`);
    const playerInfo = extractPlayerInfo(data);

    return playerInfo.membersOnly;
}
```

You can also use some of the internally used functions for yourself, if you know what to look for and just need a parser:
```ts
import { parseRawData, findActiveTab } from "yt-scraping-utilities";

(async () => {
    const {data: source} = await axios.get("https://youtube.com");

    const { ytInitialData } = parseRawData({
        source,
        ytInitialData: true
    });

    // contains all the videos on YouTube home in subrenderers.
    const homePageVideos = findActiveTab(ytInitialData).tabRenderer.content.richGridRenderer;
})();
```