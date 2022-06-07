export type ytInitialData = Record<string, any>;
export type ytInitialPlayerResponse = Record<string, any>

export interface YTInitialDataChannelTab {
    tabRenderer: {
        endpoint: {
            clickTrackingParams: string;
            commandMetadata: {
                webCommandMetadata: {
                    url: string;
                    webPageType: string;
                    rootVe: number;
                    apiUrl: string;
                }
            }
            browseEndpoint: {
                browseId: string;
                params: string;
                canonicalBaseUrl: string;
            }
        }
        title: string;
        selected: boolean; 
        trackingParams: string;
    }
}