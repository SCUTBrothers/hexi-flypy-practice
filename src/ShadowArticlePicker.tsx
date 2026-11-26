import { useRef, useState } from "react";
import { Button } from "@ui-sdk/react/button";
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
  ComboboxTrigger,
} from "@ui-sdk/react/combobox";
import { Badge } from "@/components/reui/badge";
import { ARTICLES } from "./data";

type Article = (typeof ARTICLES)[number];
const articleOptions = ARTICLES.map((article) => ({
  value: article.id,
  label: article.title,
  tag: article.tag,
  keywords: [article.tag, article.text, article.description],
}));

export function ShadowArticlePicker({
  article,
  completed,
  onChoose,
  typingInput,
}: {
  article: Article;
  completed: ReadonlySet<string>;
  onChoose: (id: string) => void;
  typingInput: React.RefObject<HTMLInputElement | null>;
}) {
  const [anchor, setAnchor] = useState<HTMLButtonElement | null>(null);
  const [query, setQuery] = useState("");
  const searchRef = useRef<HTMLInputElement>(null);
  const returnToPractice = useRef(false);

  return (
    <div className="flex min-w-0 flex-col items-start gap-2">
      <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
        <span>{article.tag}</span>
        {completed.has(article.id) ? (
          <Badge variant="success-light">已练习</Badge>
        ) : (
          <span>未练习</span>
        )}
      </div>
      <Combobox<string>
        items={articleOptions}
        value={article.id}
        query={query}
        onQueryChange={setQuery}
        autoHighlight
        onOpenChange={(open, details) => {
          returnToPractice.current =
            !open && (details.reason === "escape-key" || details.reason === "item-press");
          if (open) setQuery("");
        }}
        onOpenChangeComplete={(open) => {
          if (!open && returnToPractice.current) {
            const field = typingInput.current;
            (field && !field.disabled ? field : anchor)?.focus({ preventScroll: true });
          }
        }}
        onValueChange={(id) => {
          if (id && id !== article.id) onChoose(id);
        }}
      >
        <ComboboxTrigger
          ref={setAnchor}
          aria-label={`切换跟打文章，当前《${article.title}》`}
          className="article-trigger"
        >
          {article.title}
        </ComboboxTrigger>
        <ComboboxContent anchor={anchor} className="article-options">
          <ComboboxInput
            ref={searchRef}
            autoFocus
            aria-label="查找跟打文章"
            placeholder="搜索篇名、正文或专项音节"
          />
          <ComboboxEmpty>
            <span>没有找到匹配的文章</span>
            <Button
              data-variant="ghost"
              onClick={() => {
                setQuery("");
                searchRef.current?.focus();
              }}
            >
              清空搜索
            </Button>
          </ComboboxEmpty>
          <ComboboxList>
            {(state) =>
              (state.items as typeof articleOptions).map((item) => (
                <ComboboxItem key={item.value} value={item.value} label={item.label}>
                  <span>{item.label}</span>
                  <span className="ml-auto text-xs text-muted-foreground">
                    {completed.has(item.value) ? "已练习" : item.tag}
                  </span>
                </ComboboxItem>
              ))
            }
          </ComboboxList>
        </ComboboxContent>
      </Combobox>
    </div>
  );
}
