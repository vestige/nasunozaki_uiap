export function PageHeader() {
  return (
    <header className="hero-grid bg-neutral text-neutral-content">
      <div className="mx-auto w-full max-w-6xl px-5 py-10 sm:px-8 sm:py-14">
        <div className="navbar min-h-0 px-0">
          <div className="flex-1 gap-3 font-black tracking-wide">
            <span className="grid size-10 place-items-center rounded-xl bg-primary text-xl text-primary-content">
              U
            </span>
            UIAPduino Workshop
          </div>
          <div className="badge badge-warning badge-outline font-bold">
            PHASE 0
          </div>
        </div>
        <div className="max-w-3xl pb-8 pt-16 sm:pt-24">
          <p className="mb-3 font-black tracking-[.22em] text-warning">
            実機調査
          </p>
          <h1 className="text-4xl font-black leading-tight tracking-tight sm:text-6xl">
            ボードとブラウザの
            <br />
            相性をチェックしよう
          </h1>
          <p className="mt-6 max-w-2xl text-base leading-8 text-neutral-content/75 sm:text-lg">
            正しい順番でUIAPduinoをつなぎ、WebHIDで使うための情報を確認します。この診断ではLEDやプログラムの書き換えは行いません。
          </p>
        </div>
      </div>
    </header>
  );
}
