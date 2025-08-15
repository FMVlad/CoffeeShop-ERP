import React, { useEffect, useRef, useState } from "react";

/**
 * Універсальний пошук-вибір.
 * Обов'язково передай:
 *  - searchFn(q: string) -> Promise<Array<any>>
 *  - getKey(item) -> any (унікальний ключ)
 *  - getLabel(item) -> string (що показувати в інпуті/плейсхолдері)
 *
 * Поведінка:
 *  - інпут керований локальним станом `text`
 *  - коли value змінюється ззовні, ми підставляємо getLabel(value) в інпут
 *  - onSelect(item|null) викликається при виборі/очищенні
 */
export default function SearchPicker({
  value = null,
  searchFn,
  getKey,
  getLabel,
  renderItem,          // (item) => JSX (опційно)
  onSelect,            // (item|null) => void
  placeholder = "Пошук…",
  minChars = 2,
  disabled = false,
  className = "",
  inputClassName = "",
}) {
  const [text, setText] = useState("");
  const [opened, setOpened] = useState(false);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState([]);
  const wrapRef = useRef(null);

  // >>> СИНХРОНІЗАЦІЯ ІНПУТУ З value
  useEffect(() => {
    if (!value) {
      setText("");
    } else {
      try {
        const label = (getLabel && getLabel(value)) || "";
        setText(label || "");
      } catch {
        setText("");
      }
    }
  }, [value, getLabel]);

  // Клік поза — закриваємо список
  useEffect(() => {
    const onDocClick = (e) => {
      if (!wrapRef.current) return;
      if (!wrapRef.current.contains(e.target)) setOpened(false);
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  // Пошук
  async function doSearch(q) {
    if (!searchFn) return;
    if (!q || q.trim().length < minChars) {
      setResults([]);
      return;
    }
    setLoading(true);
    try {
      const items = await searchFn(q.trim());
      setResults(Array.isArray(items) ? items : []);
    } finally {
      setLoading(false);
    }
  }

  function handleChange(e) {
    const v = e.target.value;
    setText(v);
    setOpened(true);
    doSearch(v);
  }

  function handleClear() {
    setText("");
    setResults([]);
    setOpened(false);
    onSelect?.(null);
  }

  function pick(item) {
    const label = (getLabel && getLabel(item)) || "";
    setText(label);
    setOpened(false);
    onSelect?.(item);
  }

  return (
    <div className={`relative ${className}`} ref={wrapRef}>
      <input
        className={`w-full border rounded p-2 ${inputClassName}`}
        value={text}
        onChange={handleChange}
        onFocus={() => {
          setOpened(true);
          if (text.trim().length >= minChars) doSearch(text);
        }}
        placeholder={placeholder}
        disabled={disabled}
      />
      {value && (
        <button
          type="button"
          className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500"
          onClick={handleClear}
          title="Очистити"
        >
          ×
        </button>
      )}

      {opened && (
        <div className="absolute z-20 mt-1 w-full max-h-72 overflow-auto bg-white border rounded shadow">
          {loading ? (
            <div className="p-2 text-sm text-gray-500">Пошук…</div>
          ) : results.length === 0 ? (
            <div className="p-2 text-sm text-gray-500">Нічого не знайдено</div>
          ) : (
            results.map((item) => {
              const key = getKey ? getKey(item) : Math.random().toString(36);
              return (
                <div
                  key={key}
                  className="px-3 py-2 hover:bg-gray-100 cursor-pointer"
                  onClick={() => pick(item)}
                >
                  {renderItem ? (
                    renderItem(item)
                  ) : (
                    <div className="text-sm">
                      {getLabel ? getLabel(item) : String(item)}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
