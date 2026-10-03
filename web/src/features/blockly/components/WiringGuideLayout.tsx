import type { ReactNode } from "react";

export type WiringStep = {
  title: string;
  description: string;
};

type Props = {
  titleId: string;
  title: string;
  summary: string;
  diagram: ReactNode;
  steps: WiringStep[];
  details: ReactNode;
};

export function WiringGuideLayout({ titleId, title, summary, diagram, steps, details }: Props) {
  return (
    <section className="rounded-box border-2 border-base-300 bg-base-100 p-4 shadow-sm sm:p-5" aria-labelledby={titleId}>
      <h3 id={titleId} className="text-xl font-black">{title}</h3>
      <p className="mt-1 text-sm leading-6 text-base-content/70">{summary}</p>

      <p role="note" className="alert alert-warning mt-4 text-sm font-bold">
        配線する前に、USBを抜いてください。
      </p>

      <div className="mt-5 grid min-w-0 gap-5 xl:grid-cols-[minmax(0,1fr)_17rem]">
        <div className="min-w-0 overflow-x-auto rounded-box bg-base-200 p-2 sm:p-3">
          {diagram}
        </div>
        <ol className="grid content-start gap-4" aria-label="配線の手順">
          {steps.map((step, index) => (
            <li key={step.title} className="grid grid-cols-[2rem_1fr] gap-3">
              <span className="grid size-8 place-items-center rounded-full bg-primary font-black text-primary-content">{index + 1}</span>
              <div>
                <p className="font-black">{step.title}</p>
                <p className="mt-1 text-sm leading-6 text-base-content/70">{step.description}</p>
              </div>
            </li>
          ))}
        </ol>
      </div>

      <details className="mt-5 rounded-box border border-base-300 bg-base-200 p-3 text-sm leading-6">
        <summary className="cursor-pointer font-bold">しくみ・くわしい説明</summary>
        <div className="mt-3 space-y-2 text-base-content/75">{details}</div>
      </details>
    </section>
  );
}
