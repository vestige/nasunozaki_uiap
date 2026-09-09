import { useRef } from "react";

type Props = {
  disabled: boolean;
  message: string | null;
  onExport: () => void;
  onImport: (file: File) => void;
};

export function ProjectFileActions({
  disabled,
  message,
  onExport,
  onImport,
}: Props) {
  const inputRef = useRef<HTMLInputElement | null>(null);

  return (
    <div className="min-w-0 flex flex-col gap-2 lg:items-end">
      <div className="flex min-w-0 flex-wrap gap-2">
        <button
          className="btn btn-outline btn-sm"
          onClick={onExport}
          disabled={disabled}
        >
          作品をファイル保存
        </button>
        <button
          className="btn btn-outline btn-sm"
          onClick={() => inputRef.current?.click()}
          disabled={disabled}
        >
          作品ファイルを開く
        </button>
        <input
          ref={inputRef}
          className="hidden"
          type="file"
          accept=".json,.uiap.json,application/json"
          onChange={(event) => {
            const file = event.target.files?.[0];
            event.target.value = "";
            if (file) onImport(file);
          }}
        />
      </div>
      {message && (
        <p className="text-sm font-bold text-base-content/70" role="status">
          {message}
        </p>
      )}
    </div>
  );
}
