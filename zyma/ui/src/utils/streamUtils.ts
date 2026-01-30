import { Channel } from '@tauri-apps/api/core';

/**
 * 将 Tauri 的 Channel 回调转换为异步生成器 (AsyncGenerator)
 * 允许使用 for await...of 语法处理后端推送的数据
 */
export async function* createChannelGenerator<T>(
    invokeWithChannel: (channel: Channel<string>) => Promise<any>
): AsyncIterableIterator<T> {
    const channel = new Channel<string>();
    const queue: T[] = [];
    let resolveSignal: (() => void) | null = null;
    let isDone = false;
    let error: any = null;

    channel.onmessage = (msg) => {
        if (msg === '[DONE]') {
            isDone = true;
        } else {
            try {
                const data = JSON.parse(msg);
                if (data.error) {
                    error = data.error;
                    isDone = true;
                } else {
                    queue.push(data);
                }
            } catch (e) {
                console.error("Failed to parse channel message", e);
            }
        }
        if (resolveSignal) {
            resolveSignal();
            resolveSignal = null;
        }
    };

    // 执行后台任务，并将生成的 channel 传回给调用者
    invokeWithChannel(channel).catch(err => {
        error = err;
        isDone = true;
        if (resolveSignal) {
            resolveSignal();
            resolveSignal = null;
        }
    });

    while (true) {
        if (queue.length > 0) {
            yield queue.shift()!;
        } else if (isDone) {
            if (error) throw new Error(error);
            break;
        } else {
            await new Promise<void>(r => resolveSignal = r);
        }
    }
}