import { readFileSync } from "fs";
import path from "path";
import { assert } from "chai";
import { extractChannelInfo } from "../src";

const getPathName = (fileName: string) => path.join(__dirname, "res", fileName);


describe("Channel info tests", () => {
    describe("General tests", () => {
        it("Should parse channel info from any page with ytInitialData.", () => {
            const ytInitialData = JSON.parse(readFileSync(getPathName("selen-poll-no-images.json")).toString());
            const channelInfo = extractChannelInfo(ytInitialData);

            assert.isDefined(channelInfo);


            assert.equal(channelInfo.name, "Selen Tatsuki 【NIJISANJI EN】");
            assert.equal(channelInfo.id, "UCV1xUwfM2v2oBtT3JNvic3w");
            assert.equal(channelInfo.avatarUrl, "https://yt3.ggpht.com/OLpUvHlKRG9RrHxJo_QV0OYrh_bvUPpKI-MK80f8SBA2uTmre_Kx1Gq9lZhU6rmOEYlvo33Pp3M");
            assert.equal(channelInfo.isFamilySafe, true);

            assert.isUndefined(channelInfo.vanityId); // since Selen doesn't have a vanity URL

            assert.includeMembers(channelInfo.tags, ["NIJISANJI EN"]);
        });
    });
});