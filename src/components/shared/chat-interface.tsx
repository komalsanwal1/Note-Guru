
"use client";

import { useState, useRef, useEffect } from "react";
import ChatMessage, { type ChatMessageProps } from "./chat-message";
import ChatInput from "./chat-input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Terminal } from "lucide-react";
import { cn } from "@/lib/utils";

interface ChatInterfaceProps<TInput, TOutput> {
  aiFlow: (input: TInput) => Promise<TOutput>;
  transformInput: (userInput: string, history: ChatMessageProps[]) => TInput;
  transformOutput: (aiResponse: TOutput) => string;
  initialMessages?: ChatMessageProps[];
  chatContainerClassName?: string;
  inputPlaceholder?: string;
  onNewAiMessageContent?: (messageContent: string, aiResponse: TOutput) => void; // Added aiResponse
  instanceKey?: string | number; // Added to help with re-initialization
}

function ChatInterface<TInput, TOutput>({
  aiFlow,
  transformInput,
  transformOutput,
  initialMessages = [],
  chatContainerClassName = "h-[500px]",
  inputPlaceholder,
  onNewAiMessageContent,
  instanceKey,
}: ChatInterfaceProps<TInput, TOutput>) {
  const [messages, setMessages] = useState<ChatMessageProps[]>(initialMessages);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // If instanceKey changes, re-initialize messages.
    // This is useful if the chat needs to be reset with new initial messages.
    setMessages(initialMessages);
    setError(null);
  }, [instanceKey, initialMessages]);


  useEffect(() => {
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTo({ top: scrollAreaRef.current.scrollHeight, behavior: 'smooth' });
    }
  }, [messages]);

  const handleSendMessage = async (userInput: string) => {
    setIsLoading(true);
    setError(null);
    const userMessage: ChatMessageProps = { role: "user", content: userInput, createdAt: new Date() };
    // Use a functional update for messages to ensure we have the latest state
    const currentMessages = [...messages, userMessage];
    setMessages(currentMessages);


    try {
      const flowInput = transformInput(userInput, currentMessages); // Pass currentMessages
      const aiResponse = await aiFlow(flowInput);
      const assistantMessageContent = transformOutput(aiResponse);
      const assistantMessage: ChatMessageProps = {
        role: "assistant",
        content: assistantMessageContent,
        createdAt: new Date(),
      };
      setMessages((prevMessages) => [...prevMessages, assistantMessage]);
      if (onNewAiMessageContent) {
        onNewAiMessageContent(assistantMessageContent, aiResponse);
      }
    } catch (err) {
      console.error("AI flow error:", err);
      const errorMessage = err instanceof Error ? err.message : "An unexpected error occurred.";
      setError(errorMessage);
      setMessages((prevMessages) => [
        ...prevMessages,
        { role: "system", content: `Error: ${errorMessage}`, createdAt: new Date() },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="flex flex-col w-full shadow-lg">
      <CardContent className="p-0 flex-grow flex flex-col">
        <ScrollArea className={cn("flex-grow p-4", chatContainerClassName)} ref={scrollAreaRef}>
          {messages.map((msg, index) => (
            <ChatMessage key={`${instanceKey}-${index}`} {...msg} />
          ))}
          {error && (
            <Alert variant="destructive" className="my-4">
              <Terminal className="h-4 w-4" />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
        </ScrollArea>
        <ChatInput onSubmit={handleSendMessage} isLoading={isLoading} placeholder={inputPlaceholder} />
      </CardContent>
    </Card>
  );
}

export default ChatInterface;

// Utility function to create a ChatMessage (can be moved to utils if needed)
export const createChatMessage = (role: ChatMessageProps['role'], content: string): ChatMessageProps => ({
  role,
  content,
  createdAt: new Date(),
});
