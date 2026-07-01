export declare const ensureDir: (dirPath: string) => Promise<string | undefined>;
export declare const emptyDir: (dirPath: string) => Promise<void>;
export declare const move: (src: string, dest: string) => Promise<void>;
export declare const remove: (filePath: string) => Promise<void>;
