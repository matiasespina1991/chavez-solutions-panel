export declare const sendWithGmailApi: (params: {
    to: string;
    subject: string;
    text: string;
    attachment?: {
        filename: string;
        contentBase64: string;
        mimeType: string;
    };
}) => Promise<void>;
