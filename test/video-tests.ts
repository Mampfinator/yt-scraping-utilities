import { readFileSync } from "fs";
import path from "path";
import { assert } from "chai";
import { extractPlayerInfo, Playability } from "../src";

const getPathName = (fileName: string) => path.join(__dirname, "res", fileName);

describe("Video tests", () => {
    describe("Player info tests", () => {
        it("Extracts player info of a video", () => {
            const ytInitialPlayerResponse = JSON.parse(readFileSync(getPathName("archived-stream-playerinfo.json")).toString());
            const playerInfo = extractPlayerInfo(ytInitialPlayerResponse);
            
            assert.isTrue(playerInfo.isStream);
            assert.isTrue(playerInfo.hasEnded, "incorrectly assumes video was an upload and not a stream");
            
    
            assert.equal(playerInfo.videoId, "EIGTwGXzEb0");
            assert.equal(playerInfo.channelId, "UCRXqXc_ixp62KiSckhocSSw");
    
            assert.equal(playerInfo.playability, Playability.Ok);
            assert.isDefined(playerInfo.manifests);
            assert.isDefined(playerInfo.formats);
    
    
            assert.isFalse(playerInfo.membersOnly);
        });
    
        it("Correctly extracts a members only video", () => {
            const ytInitialPlayerResponse = JSON.parse(readFileSync(getPathName("mo-archived-stream-playerinfo.json")).toString());
            const playerInfo = extractPlayerInfo(ytInitialPlayerResponse);
    
            assert.isTrue(playerInfo.membersOnly);
        });
    });

    describe("GridVideo- and ReelItemRenderer (shorts) tests", () => {
        // TODO
    });
})

