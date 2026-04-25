"use client"

import { KeyboardEvent, useState } from "react"
import { Loader2, Send } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

type ChatMessage = {
  role: "assistant" | "user"
  text: string
}

export default function ChatPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: "assistant",
      text: "Hi, I'm your CycleSync assistant. Ask me about your next period, ovulation window, symptom trends, sleep and energy patterns, or PCOS risk.",
    },
  ])
  const [input, setInput] = useState("")
  const [isSending, setIsSending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const sendMessage = async () => {
    const trimmed = input.trim()
    if (!trimmed || isSending) return

    setMessages((prev) => [...prev, { role: "user", text: trimmed }])
    setInput("")
    setError(null)
    setIsSending(true)

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ message: trimmed }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "The assistant could not respond right now.")
      }

      setMessages((prev) => [...prev, { role: "assistant", text: data.reply }])
    } catch (err) {
      const message = err instanceof Error ? err.message : "Something went wrong."
      setError(message)
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          text: "I hit an error while replying. Please try again in a moment.",
        },
      ])
    } finally {
      setIsSending(false)
    }
  }

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") {
      event.preventDefault()
      void sendMessage()
    }
  }

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-4">
      <div className="rounded-xl border bg-background p-4 shadow-sm">
        <div className="mb-4">
          <h1 className="text-2xl font-semibold">Chat Assistant</h1>
          <p className="text-sm text-muted-foreground">
            Get quick answers from your tracked cycle, symptom, and prediction data.
          </p>
        </div>

        <div className="flex h-[65vh] flex-col gap-3 overflow-y-auto rounded-lg border bg-muted/20 p-4">
          {messages.map((message, index) => (
            <div
              key={`${message.role}-${index}`}
              className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-6 ${
                message.role === "user"
                  ? "ml-auto bg-primary text-primary-foreground"
                  : "bg-secondary text-secondary-foreground"
              }`}
            >
              {message.text}
            </div>
          ))}

          {isSending && (
            <div className="flex max-w-[85%] items-center gap-2 rounded-2xl bg-secondary px-4 py-3 text-sm text-secondary-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Thinking...
            </div>
          )}
        </div>

        {error && <p className="mt-3 text-sm text-destructive">{error}</p>}

        <div className="mt-4 flex gap-2">
          <Input
            value={input}
            onChange={(event) => setInput(event.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask about your cycle insights..."
            disabled={isSending}
          />
          <Button onClick={() => void sendMessage()} disabled={isSending || !input.trim()}>
            {isSending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            Send
          </Button>
        </div>
      </div>
    </div>
  )
}
