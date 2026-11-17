import { useEffect, useRef, useState, type FormEvent } from "react";

export type VariableCreateAnchor = { left: number; top: number };

type Props = {
  anchor: VariableCreateAnchor;
  onClose(): void;
  onCreate(name: string): string | null;
};

export function VariableCreatePopover({ anchor, onClose, onCreate }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const left = Math.max(12, Math.min(anchor.left, window.innerWidth - 308));
  const top = Math.max(12, Math.min(anchor.top, window.innerHeight - 190));

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const createError = onCreate(name);
    if (createError) {
      setError(createError);
      return;
    }
    onClose();
  };

  return (
    <form
      className="card fixed z-[1000] w-72 border border-base-300 bg-base-100 shadow-2xl"
      onSubmit={submit}
      role="dialog"
      aria-labelledby="variable-create-title"
      style={{ left, top }}
    >
      <div className="card-body gap-3 p-4">
        <h3 id="variable-create-title" className="card-title text-base">数値の変数を作る</h3>
        <label className="form-control gap-1">
          <span className="text-sm font-bold">変数の名前</span>
          <input
            ref={inputRef}
            className={`input input-bordered w-full ${error ? "input-error" : ""}`}
            value={name}
            onChange={(event) => {
              setName(event.target.value);
              setError(null);
            }}
            onKeyDown={(event) => {
              if (event.key === "Escape") onClose();
            }}
            placeholder="例：かいすう"
            aria-invalid={Boolean(error)}
            aria-describedby={error ? "variable-create-error" : undefined}
          />
        </label>
        {error && <p id="variable-create-error" className="text-sm font-bold text-error" role="alert">{error}</p>}
        <div className="card-actions justify-end">
          <button className="btn btn-ghost btn-sm" type="button" onClick={onClose}>やめる</button>
          <button className="btn btn-primary btn-sm" type="submit">作る</button>
        </div>
      </div>
    </form>
  );
}
