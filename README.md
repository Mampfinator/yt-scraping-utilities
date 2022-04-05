# yt-scraping-utilities
Assorted scraping utilities for YouTube because some things (like Community Posts) just can't be done with their official API.

## Installation
```
npm install yt-scraping-utilities
```
(soon™)


## Usage
Basic usage (for community posts).
```ts
import { extractCommunityPosts } from "yt-scraping-utilities";
import axios from "axios";

// Extract from a community tab
(async () => {
    const {data} = await axios.get("https://www.youtube.com/channel/UCV1xUwfM2v2oBtT3JNvic3w/community", {});
    console.log(extractCommunityPosts(data));
})();

// Or from a single post directly. 
(async () => {
    const {data} = await axios.get("https://www.youtube.com/post/Ugkxw-otENY0Su_1-C2HbZ1qeANvU3-Wtyg_", {});
    console.log(extractCommunityPosts(data));
})();
```


Advanced usage (extracting `ytInitialData` directly) using `parseRawData` and `findActiveTab`:
```ts
import { parseRawData, findActiveTab } from "yt-scraping-utilities";
import axios from "axios";

(async () => {
    const {data: source} = await axios.get("https://youtube.com");
    const {ytInitialData} = parseRawData({
        source,
        ytInitialData: true
    });

    console.log(
        findActiveTab(ytInitialData)
        .tabRenderer.content.richGridRenderer // contains all initially loaded YouTube home videos
    )
})();
```
`findActiveTab` is a convenience method that finds entry in a `tabs` array where `tabRenderer.selected` is `true`.

Advanced usage (for player responses). - coming soon to a README.md near you!