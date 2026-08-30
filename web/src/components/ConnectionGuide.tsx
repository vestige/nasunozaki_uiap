const steps = [
  ["1", "ボタンを押し続ける", "UIAPduinoのボタンを押したままにします。"],
  ["2", "USBをつなぐ", "ボタンから指を離さず、PCへ接続します。"],
  ["3", "1秒待って離す", "接続後に1秒数えてから、ボタンを離します。"],
  ["4", "ボードを選ぶ", "下のボタンを押し、表示された32V003を選びます。"],
];

export function ConnectionGuide() {
  return (
    <section
      className="relative z-10 mx-auto -mt-8 w-full max-w-6xl px-5 sm:px-8"
      aria-labelledby="steps-title"
    >
      <h2 id="steps-title" className="sr-only">
        接続手順
      </h2>
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {steps.map(([number, title, detail]) => (
          <article
            className="card border-2 border-neutral bg-base-100 shadow-[5px_5px_0_#172638]"
            key={number}
          >
            <div className="card-body flex-row gap-4 p-5">
              <div className="badge badge-warning size-10 shrink-0 rounded-full border-0 text-lg font-black">
                {number}
              </div>
              <div>
                <h3 className="font-black">{title}</h3>
                <p className="mt-2 text-sm leading-6 text-base-content/65">
                  {detail}
                </p>
              </div>
            </div>
          </article>
        ))}
      </div>
      <div
        role="alert"
        className="alert mt-6 border-2 border-neutral bg-warning text-warning-content shadow-[4px_4px_0_#172638]"
      >
        <span className="text-2xl" aria-hidden="true">
          ☝️
        </span>
        <div>
          <h3 className="font-black">先にUSBをつながないでね</h3>
          <p className="text-sm">
            ボタンを押したままUSBをつなぎ、1秒待ってから指を離します。
          </p>
        </div>
      </div>
    </section>
  );
}
