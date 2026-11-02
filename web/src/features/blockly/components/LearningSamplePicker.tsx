import { useEffect, useRef } from "react";
import { learningSampleCategories, learningSamples, type LearningSample } from "../samples/learningSamples";

type Props = {
  open: boolean;
  disabled: boolean;
  onClose: () => void;
  onSelect: (sample: LearningSample) => void;
};

export function LearningSamplePicker({ open, disabled, onClose, onSelect }: Props) {
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);
  useEffect(() => {
    if (!open) return;
    closeButtonRef.current?.focus();
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [onClose, open]);
  if (!open) return null;
  return (
    <div className="modal modal-open" role="dialog" aria-modal="true" aria-labelledby="learning-samples-title">
      <div className="modal-box max-w-4xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 id="learning-samples-title" className="text-2xl font-black">サンプルからはじめる</h3>
            <p className="mt-2 text-sm leading-6 text-base-content/70">使ってみたいブロックのグループから、作品をえらぼう。</p>
          </div>
          <button ref={closeButtonRef} type="button" className="btn btn-circle btn-ghost btn-sm" aria-label="サンプル一覧を閉じる" onClick={onClose}>×</button>
        </div>
        <div className="mt-6 space-y-7">
          {learningSampleCategories.map((category) => {
            const samples = learningSamples.filter((sample) => sample.category === category);
            return (
              <section key={category} aria-labelledby={`sample-category-${category}`}>
                <h4 id={`sample-category-${category}`} className="text-lg font-black">{category}</h4>
                {samples.length > 0 ? (
                  <div className="mt-3 grid gap-3 sm:grid-cols-2">
                    {samples.map((sample) => (
                      <button key={sample.id} type="button" disabled={disabled} className="card border-2 border-base-300 bg-base-100 text-left shadow-sm transition hover:border-primary focus-visible:outline-2 focus-visible:outline-primary disabled:opacity-50" onClick={() => onSelect(sample)}>
                        <span className="card-body gap-2 p-4">
                          <span className="card-title text-base font-black">{sample.name}</span>
                          <span className="text-sm leading-6 text-base-content/75">{sample.description}</span>
                          <span className="mt-1 text-xs font-bold text-base-content/60">必要なもの: {sample.parts}</span>
                          <span className="text-xs font-bold text-base-content/60">ためせる場所: {sample.worksOn}</span>
                        </span>
                      </button>
                    ))}
                  </div>
                ) : <p className="mt-2 text-sm text-base-content/55">サンプルを準備中です。</p>}
              </section>
            );
          })}
        </div>
      </div>
      <button type="button" className="modal-backdrop" aria-label="サンプル一覧を閉じる" onClick={onClose}>閉じる</button>
    </div>
  );
}
