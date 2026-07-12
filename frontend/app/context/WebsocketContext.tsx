"use client"

import { createContext, useCallback, useContext, useRef } from "react"
import { useWebsocket } from "@/hooks/useWebsocket";




type MessageMap = {
    code_change: {
        type: "code_change",
        code: string
    },

    language_change: {
        type: "language_change";
        language: string;
        code: string;
    };

    output: {
        type: "output";
        output: string[];
    };
}

// keyof MessageMap is "code_change" | "language_change" | "output"
// so WebSocketMessage = {type: "code_change", code: string} | etc..

type WebSocketMessage = MessageMap[keyof MessageMap]


// T extends keyof MessageMap means T can only be one of the keys(code_change" | "language_change" | "output).
// so T = "code_change" | T = "language_change" | T = "output"

// so MessageMap[T] = MessageMap["output"] | MessageMap["language_change"] | MessageMap["code_change"]

// so type MessageHandler<"output"> becomes (message: { type: "output"; output: string[]; }) => void

type MessageHandler<T extends keyof MessageMap> = (message: MessageMap[T]) => void


// subscribe(
//     type: "output",
//     handler: MessageHandler<"output">
// )

//expands to 


// subscribe(
//     type: "output",
//     handler: (
//         message: {
//             type: "output";
//             output: string[];
//         }
//     ) => void
// )

type WebsocketContextType = {
    isConnected: boolean,
    sendMessage: (message: WebSocketMessage) => void,
    subscribe: <T extends keyof MessageMap> (
        type: T,
        handler: MessageHandler<T>
    ) => () => void
}


const WebsocketContext = createContext<WebsocketContextType | null>(null);




export function WebsocketProvider({
    roomId,
    children
}: {
    roomId: string;
    children: React.ReactNode
}) {


    const listeners = useRef(
        new Map<keyof MessageMap, Set<(message: WebSocketMessage) => void>>()
    );


    const { isConnected, sendMessage } = useWebsocket({
        roomId,
        onMessage: (data) => {
            const handlers = listeners.current.get(data.type);

            handlers?.forEach(handler => handler(data))
        }
    })




    const subscribe = useCallback(
        <T extends keyof MessageMap>(type: T, handler: MessageHandler<T>) => {
            if (!listeners.current.get(type)) {
                listeners.current.set(type, new Set())
            }

            listeners.current.get(type)?.add(handler as (message : WebSocketMessage) => void);

            //unsubscribe

            return () => {
                listeners.current.get(type)?.delete(handler as ((message : WebSocketMessage) => void));

                if (listeners.current.get(type)?.size === 0) {
                    listeners.current.delete(type)
                }
            }
        }, [])



    return (
        <WebsocketContext.Provider
            value={{
                isConnected, sendMessage, subscribe
            }}
        >
            {children}
        </WebsocketContext.Provider>
    )
}

export function useWebsocketContext() {
    const context = useContext(WebsocketContext);

    if (!context) {
        throw new Error(
            "useWebsocketContext must be used inside WebsocketProvider"
        );
    }

    return context;
}