"use client";

import React, { useMemo, useRef, useState } from "react";

type Props = {
  title?: string;
  helperText?: string;
  onImageSelected?: (file: File, dataUrl: string) => void;
};

type UploadError =
  | "FILE_TOO_LARGE"
  | "UNSUPPORTED_TYPE"
  | "READ_FAILED"
  | "NONE";

const MAX_MB = 12;
const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp"];

function formatBytes(bytes: number) {
  const mb = bytes / (1024 * 1024);
  return `${mb.toFixed(2)} MB`;
}

export default function DailyEntryUploader({
  title = "Günlük Girişler — Yumurta Sayım Fişi",
  helperText = "Fişin fotoğrafını yükle. Sonraki adımda LLM ile okuyacağız.",
  onImageSelected,
}: Props) {
  const inputRef = useRef<HTMLInputElement | null>(null);

  const [file, setFile] = useState<File | null>(null);
  const [dataUrl, setDataUrl] = useState<string | null>(null);
  const [err, setErr] = useState<UploadError>("NONE");

  const fileMeta = useMemo(() => {
    if (!file) return null;
    return {
      name: file.name,
      type: file.type || "unknown",
      size: file.size,
      sizeLabel: formatBytes(file.size),
    };
  }, [file]);

  function reset() {
    setFile(null);
    setDataUrl(null);
    setErr("NONE");
    if (inputRef.current) inputRef.current.value = "";
  }

  async function readAsDataURL(f: File) {
    return new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = () => reject(new Error("read_failed"));
      reader.onload = () => resolve(String(reader.result));
      reader.readAsDataURL(f);
    });
  }

  async function handleFiles(files: FileList | null) {
    setErr("NONE");
    if (!files || files.length === 0) return;

    const f = files[0];

    // type check
    if (!ACCEPTED_TYPES.includes(f.type)) {
      setErr("UNSUPPORTED_TYPE");
      return;
    }

    // size check
    const maxBytes = MAX_MB * 1024 * 1024;
    if (f.size > maxBytes) {
      setErr("FILE_TOO_LARGE");
      return;
    }

    try {
      const url = await readAsDataURL(f);
      setFile(f);
      setDataUrl(url);
      onImageSelected?.(f, url);
    } catch {
      setErr("READ_FAILED");
    }
  }

  function openPicker() {
    inputRef.current?.click();
  }

  function onDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    e.stopPropagation();
    void handleFiles(e.dataTransfer.files);
  }

  function onDragOver(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    e.stopPropagation();
  }

  const errorText =
    err === "UNSUPPORTED_TYPE"
      ? "Sadece JPG / PNG / WEBP kabul ediliyor."
      : err === "FILE_TOO_LARGE"
      ? `Dosya çok büyük. Maksimum ${MAX_MB} MB.`
      : err === "READ_FAILED"
      ? "Dosya okunamadı. Tekrar dene."
      : null;

  return (
    <section className="w-full max-w-3xl rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-4">
        <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
        <p className="mt-1 text-sm text-slate-600">{helperText}</p>
      </div>

      {/* Dropzone */}
      <div
        onDrop={onDrop}
        onDragOver={onDragOver}
        className={[
          "rounded-2xl border-2 border-dashed p-5 transition",
          dataUrl
            ? "border-slate-200 bg-slate-50"
            : "border-slate-300 bg-white hover:bg-slate-50",
        ].join(" ")}
      >
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPTED_TYPES.join(",")}
          className="hidden"
          onChange={(e) => void handleFiles(e.target.files)}
        />

        {!dataUrl ? (
          <div className="flex flex-col items-center justify-center gap-3 text-center">
            <div className="text-sm text-slate-700">
              <span className="font-medium">Sürükle-bırak</span> yap veya{" "}
              <button
                type="button"
                onClick={openPicker}
                className="font-semibold text-slate-900 underline underline-offset-4"
              >
                dosya seç
              </button>
              .
            </div>

            <div className="text-xs text-slate-500">
              JPG / PNG / WEBP • Max {MAX_MB} MB
            </div>

            {errorText ? (
              <div className="mt-2 rounded-xl bg-red-50 px-3 py-2 text-xs text-red-700">
                {errorText}
              </div>
            ) : null}
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-[1fr_240px]">
            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
              {/* Preview */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={dataUrl}
                alt="Yüklenen fiş önizlemesi"
                className="h-auto w-full object-contain"
              />
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-4">
              <div className="text-sm font-semibold text-slate-900">
                Dosya Bilgisi
              </div>

              {fileMeta ? (
                <dl className="mt-3 space-y-2 text-xs text-slate-700">
                  <div>
                    <dt className="text-slate-500">Ad</dt>
                    <dd className="wrap-break-word">{fileMeta.name}</dd>
                  </div>
                  <div>
                    <dt className="text-slate-500">Tür</dt>
                    <dd>{fileMeta.type}</dd>
                  </div>
                  <div>
                    <dt className="text-slate-500">Boyut</dt>
                    <dd>{fileMeta.sizeLabel}</dd>
                  </div>
                </dl>
              ) : null}

              <div className="mt-4 flex flex-col gap-2">
                <button
                  type="button"
                  onClick={openPicker}
                  className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-900 hover:bg-slate-50"
                >
                  Başka görsel seç
                </button>
                <button
                  type="button"
                  onClick={reset}
                  className="rounded-xl bg-slate-900 px-3 py-2 text-sm font-semibold text-white hover:opacity-95"
                >
                  Kaldır
                </button>
              </div>

              <div className="mt-4 rounded-xl bg-slate-50 p-3 text-xs text-slate-600">
                Sonraki adım: LLM bu görselden tabloyu okuyacak, sen “OK”
                dediğinde kayıt edeceğiz.
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
