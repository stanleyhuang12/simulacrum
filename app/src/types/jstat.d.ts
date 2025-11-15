declare module 'jstat' {
    export const beta: {
        sample: (alpha: number, beta: number) => number;
    };
}