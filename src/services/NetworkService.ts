import { requestUrl, RequestUrlResponse, RequestUrlParam } from 'obsidian';

export class NetworkService {
    async request(options: RequestUrlParam): Promise<RequestUrlResponse> {
        try {
            return await requestUrl(options);
        } catch (error) {
            throw error;
        }
    }
} 