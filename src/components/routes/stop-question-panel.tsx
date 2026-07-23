"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { MessageCircle, Send } from "lucide-react";
import {
  askStopQuestionWithDeepSeek,
  isDeepSeekProxyConfigured,
  type StopQuestionAnswer,
} from "@/lib/ai/deepseek";
import type { RoutePlan, RouteStop } from "@/lib/route";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
  answer?: StopQuestionAnswer;
};

export function StopQuestionPanel({
  route,
  stop,
}: {
  route: RoutePlan;
  stop: RouteStop;
}) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [question, setQuestion] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSignedIn, setIsSignedIn] = useState(false);
  const [notice, setNotice] = useState("");
  const suggestions = useMemo(() => buildSuggestions(stop), [stop]);

  useEffect(() => {
    const client = createBrowserSupabaseClient();

    if (!client) {
      return;
    }

    void client.auth.getUser().then(({ data }) => {
      setIsSignedIn(Boolean(data.user));
    });

    const { data } = client.auth.onAuthStateChange((_event, session) => {
      setIsSignedIn(Boolean(session?.user));
    });

    return () => data.subscription.unsubscribe();
  }, []);

  async function submit(event?: FormEvent<HTMLFormElement>) {
    event?.preventDefault();
    const trimmed = question.trim();

    if (!trimmed || isLoading) {
      return;
    }

    if (!isDeepSeekProxyConfigured()) {
      setNotice("现场问答暂未启用，请先阅读本页导览和资料来源。");
      return;
    }

    if (!isSignedIn) {
      setNotice("登录后可以针对当前站点提问，回答会附上本次使用的资料来源。");
      return;
    }

    const history = messages.map(({ role, content }) => ({ role, content }));
    setMessages((current) => [...current, { role: "user", content: trimmed }]);
    setQuestion("");
    setNotice("");
    setIsLoading(true);

    try {
      const result = await askStopQuestionWithDeepSeek(stop, route, trimmed, history);
      setMessages((current) => [
        ...current,
        { role: "assistant", content: result.data.answer, answer: result.data },
      ]);
    } catch (error) {
      const message = error instanceof Error ? error.message : "";
      setNotice(
        message.includes("deepseek_auth_required")
          ? "登录状态已失效，请重新登录后再问。"
          : "暂时无法确认这个问题。你可以稍后再试，或先查看下方资料来源。",
      );
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <section className="stop-question-panel" aria-label="问问这座城">
      <div className="stop-question-heading">
        <span>
          <MessageCircle size={16} />
          问问这座城
        </span>
        <small>{isSignedIn ? "回答附带资料来源" : "登录后可提问"}</small>
      </div>
      <p>围绕眼前这座站点，问一个你真正好奇的问题。</p>
      <div className="stop-question-suggestions" aria-label="推荐问题">
        {suggestions.map((suggestion) => (
          <button
            key={suggestion}
            onClick={() => setQuestion(suggestion)}
            type="button"
          >
            {suggestion}
          </button>
        ))}
      </div>
      {messages.map((message, index) => (
        <article
          className={`stop-question-message ${message.role}`}
          key={`${message.role}-${index}-${message.content}`}
        >
          <strong>{message.role === "user" ? "你问" : "导览回答"}</strong>
          <p>{message.content}</p>
          {message.answer ? (
            <div className="stop-question-sources">
              {message.answer.sourceReferences
                .filter((source) =>
                  message.answer?.sourceIds.length
                    ? message.answer.sourceIds.includes(source.id)
                    : true,
                )
                .map((source) => (
                  <a href={source.href} key={source.id} rel="noreferrer" target="_blank">
                    {source.label}
                  </a>
                ))}
            </div>
          ) : null}
        </article>
      ))}
      <form onSubmit={submit}>
        <label className="sr-only" htmlFor={`stop-question-${stop.id}`}>
          向当前站点提问
        </label>
        <textarea
          id={`stop-question-${stop.id}`}
          onChange={(event) => setQuestion(event.target.value)}
          placeholder="例如：这里和这条街为什么会形成这样的关系？"
          value={question}
        />
        <button disabled={!question.trim() || isLoading} type="submit">
          <Send size={15} />
          {isLoading ? "正在查资料…" : "提问"}
        </button>
      </form>
      {notice ? <p className="stop-question-notice">{notice}</p> : null}
    </section>
  );
}

function buildSuggestions(stop: RouteStop) {
  if (stop.themes.includes("建筑")) {
    return ["这处建筑最值得从哪里看起？", "它和这片街区是怎样形成关系的？"];
  }

  if (stop.themes.includes("文学") || stop.themes.includes("书店")) {
    return ["这里和南京的文学生活有什么联系？", "站在这里，最值得留意什么细节？"];
  }

  return ["这里为什么会成为重要的历史现场？", "这座站点和今天的南京有什么关系？"];
}
