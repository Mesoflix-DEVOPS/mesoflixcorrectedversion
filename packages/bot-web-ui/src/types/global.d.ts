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
    export default any;
}

declare module 'react/jsx-runtime' {
    export const jsx: any;
    export const jsxs: any;
    export const Fragment: any;
}

export {};
