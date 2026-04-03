declare global {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let google: any;
    interface Window {
        sendRequestsStatistic: (is_running: boolean) => void;
    }

    namespace JSX {
        interface IntrinsicElements {
            [elemName: string]: any;
        }
        type Element = any;
    }
}

declare module 'react' {
    export type FC<P = {}> = any;
    export type ReactNode = any;
    export type ChangeEvent<T = any> = any;
    export function useState<T>(initialState: T | (() => T)): [T, (newState: T | ((prevState: T) => T)) => void];
    export function useEffect(effect: () => void | (() => void), deps?: any[]): void;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const React: any;
    export default React;
}

declare module 'react/jsx-runtime' {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    export const jsx: any;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    export const jsxs: any;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    export const Fragment: any;
}

declare module 'react/jsx-dev-runtime' {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    export const jsxDEV: any;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    export const Fragment: any;
}

export {};
