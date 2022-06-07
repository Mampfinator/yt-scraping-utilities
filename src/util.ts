import type {
    ytInitialData, 
    ytInitialPlayerResponse, 
    YTInitialDataChannelTab
} from "./youtube-types";

/**
 * Tries to match ytInitialData variable on a YouTube page.
 */
export const initialDataRe = /(?<=var ytInitialData *\= *)\{.*?}(?=\;)(?<![A-z<>])/;
/**
 * Tries to match ytInitialPlayerResponse variable on a YouTube page.
 */
export const playerResponseRe = /(?<=var ytInitialPlayerResponse *\= *)\{.*?}(?=\;)(?<![A-z<>])/;


interface ParseRawOptions {
    source: string;
    ytInitialData?: boolean;
    ytInitialPlayerResponse?: boolean;
}
/**
 * Extract raw full objects (`ytInitialData` and `ytInitialPlayerResponse`) from a YT page string.
 * @param options.source - the YouTube page body as string.
 * @param options.ytInitialData - whether or not to parse and return ytInitialData. 
 * @param options.ytInitialPlayerResponse - whether or not to parse and return ytInitialPlayerResponse (only present on /watch and youtu.be pages).
 */
export function parseRawData(options: ParseRawOptions) {
    const {
        source,
        ytInitialData: extractInitialData,
        ytInitialPlayerResponse: extractPlayerResponse
    } = options;
    if (!source) throw new TypeError("No source string to search provided.");
    if (!extractInitialData && !extractPlayerResponse) throw new TypeError("At least one of ytInitialData and ytInitialPlayerResponse need to be parsed.");

    const ret: {ytInitialData?: ytInitialData, ytInititalPlayerRespone?: ytInitialPlayerResponse} = {};
    if (extractInitialData) {
        const match = initialDataRe.exec(source);
        match && (ret.ytInitialData = JSON.parse(match[0]));
    }

    if (extractPlayerResponse) {
        const match = playerResponseRe.exec(source);
        match && (ret.ytInititalPlayerRespone = JSON.parse(match[0])); 
    }

    return ret;
}

/**
 * Finds active tab in provided **full** `ytInitialData`.
 * @param ytInitialData 
 */
export function findActiveTab(ytInitialData: ytInitialData) {
    try {
        return ytInitialData.contents.twoColumnBrowseResultsRenderer.tabs.find((tab: YTInitialDataChannelTab) => tab.tabRenderer.selected)
    } catch (error) {
        throw new Error(`Error accessing initial data: ${error}`);
    }
}

export const findValuesByKeys = (
    object: Record<string, any>,
    keys: string[],
): any[] => {
    const values: any[] = [];
    const seenObjects = new WeakSet();
    const find = (object: Record<string, any>, keys: string[]) => {
        Object.keys(object).some((k) => {
            if (keys.includes(k)) values.push(object[k]);
            // Make this an else since its only use is extracting renderers.
            // The renderers we're interested in are never nested inside each other.
            // For community tabs, reduces # searches by >= 50%. 
            else if (
                object[k] &&
                !seenObjects.has(object[k]) &&
                typeof object[k] === 'object'
            ) {
                find(object[k], keys);
                seenObjects.add(object[k]);
            }
        });

        return values;
    };
    return find(object, keys);
};

/**
 * Returns the last item in an Array because YouTube *loves* deeply nested objects.
 */
export const getLastItem = (input: Array<any>) => input[input.length-1];

/**
 * Sanitizes non-standard (YouTube) URL parameters.
 */
export const sanitizeUrl = (url: string, offset = 0): string => {
    return url.split("=").slice(0, offset+1).join("");
}

/**
 * Merges runs Arrays into a single text string.
 */
export const mergeRuns = (runs: {text: string}[]) => runs.map(r => r.text).join("");

export const isValidDate = (date: Date) => !isNaN(date.getTime());
export const tryParseDate = (timestamp: string) => {
    const date = new Date(timestamp);
    if (!isValidDate(date)) return undefined;
    return date;
}