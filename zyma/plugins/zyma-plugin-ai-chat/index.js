module.exports = {
  activate: async (zyma, React, Lucide) => {
    // 1. Register Chat Participant
    zyma.chat.registerChatParticipant({
      id: 'core-ai',
      name: 'Zyma',
      fullName: 'Zyma AI Assistant',
      description: 'Advanced Agent with Tool Use (implemented in plugin).',
      handler: async (req, stream) => {
        try {
          stream.status('thinking');
          
          let messages = [
            { role: 'system', content: "You are a Zyma Agent. You have access to tools. If you need to read a file, use 'read_file'." }
          ];

          messages.push(...req.history.map(h => ({
              role: h.role === 'agent' ? 'assistant' : 'user',
              content: h.content
          })));
          
          messages.push({ role: 'user', content: req.prompt });

          // 定义工具
          const tools = [{
            type: 'function',
            function: {
              name: 'read_file',
              description: 'Read the content of a file in the workspace',
              parameters: {
                type: 'object',
                properties: { path: { type: 'string' } },
                required: ['path']
              }
            }
          }];

          // 运行循环 (最多 3 轮，防止死循环)
          for (let i = 0; i < 3; i++) {
            const responseStream = zyma.ai.stream({ messages, tools, stream: true });
            
            let fullContent = '';
            let toolCalls = [];
            
            stream.status('streaming');
            for await (const chunk of responseStream) {
                const choice = chunk.choices?.[0];
                if (!choice) continue;

                // 处理文本内容
                if (choice.delta?.content) {
                    fullContent += choice.delta.content;
                    stream.markdown(choice.delta.content);
                }

                // 处理工具调用 (SSE 模式下 tool_calls 是增量的)
                if (choice.delta?.tool_calls) {
                    for (const tc of choice.delta.tool_calls) {
                        if (!toolCalls[tc.index]) toolCalls[tc.index] = { id: '', function: { name: '', arguments: '' } };
                        if (tc.id) toolCalls[tc.index].id = tc.id;
                        if (tc.function?.name) toolCalls[tc.index].function.name = tc.function.name;
                        if (tc.function?.arguments) toolCalls[tc.index].function.arguments += tc.function.arguments;
                    }
                }

                if (choice.finish_reason === 'tool_calls') break;
            }

            const activeToolCalls = toolCalls.filter(t => t);
            if (activeToolCalls.length === 0) break; // 没有工具调用，任务结束

            // 执行工具
            const assistantMsg = { role: 'assistant', content: fullContent || null, tool_calls: activeToolCalls };
            messages.push(assistantMsg);

            for (const tc of activeToolCalls) {
                stream.toolCall(tc.function.name, tc.function.arguments, 'calling');
                
                let result = '';
                if (tc.function.name === 'read_file') {
                    try {
                        const args = JSON.parse(tc.function.arguments);
                        result = await zyma.workspace.readFile(args.path);
                        stream.toolCall(tc.function.name, tc.function.arguments, 'success', `Read ${args.path} successfully`);
                    } catch (e) {
                        result = `Error: ${e.message}`;
                        stream.toolCall(tc.function.name, tc.function.arguments, 'error', result);
                    }
                }

                messages.push({ 
                    role: 'tool', 
                    tool_call_id: tc.id, 
                    name: tc.function.name, 
                    content: result 
                });
            }
            // 继续下一轮循环让 LLM 分析工具执行结果
          }
          
          stream.done();
        } catch (err) {
          stream.error(err.message || String(err));
        }
      }
    });

    // 2. Open Tab Command
    zyma.commands.register({
      id: 'ai.chat.open',
      title: 'Open AI Assistant',
      handler: () => {
        const ChatPanel = zyma.components.ChatPanel;
        if (ChatPanel) {
           const panelElement = React.createElement(ChatPanel, { 
               participantId: 'core-ai',
               title: 'Zyma Assistant'
           });
           zyma.window.openTab('ai-assistant', 'AI Assistant', panelElement);
        }
      }
    });

    zyma.menus.registerFileMenu({ label: 'AI Assistant', commandId: 'ai.chat.open', order: 999 });
  }
};
