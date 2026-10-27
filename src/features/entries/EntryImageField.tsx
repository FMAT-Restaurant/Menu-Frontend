import { LoadingValue } from "../../shared/LoadingState";
import { useEffect, useRef, useState, type ChangeEvent } from "react";
import type { MenuEntryDetail } from "../../application/catalog";
import { Icon } from "../../shared/Icon";

interface Props {
  loading?: boolean;
  file: File | null;
  entry: MenuEntryDetail | null;
  validating: boolean;
  error: string;
  disabled: boolean;
  onSelect(file: File): void;
}

function imageLabels(file: File | null, editing: boolean) {
  if (file) return { action: "Cambiar imagen", help: file.name };
  if (editing) return { action: "Reemplazar imagen", help: "Si no seleccionas otra imagen, se conservará la actual." };
  return { action: "Seleccionar imagen", help: "Imagen obligatoria para la nueva entrada." };
}

function ImageContent({ source, broken, reference }: Readonly<{ source: string; broken: boolean; reference?: string }>) {
  if (broken) return <span>No se pudo mostrar la imagen. Puedes seleccionar otra; la referencia actual se conserva.</span>;
  if (reference && !source) return <span>Imagen actual conservada · referencia {reference}</span>;
  return <span>Selecciona una imagen de referencia</span>;
}

export function EntryImageField({ loading = false, file, entry, validating, error, disabled, onSelect }: Readonly<Props>) {
  const input = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState("");
  const [broken, setBroken] = useState(false);
  const source = preview || entry?.image?.thumbnailUrl || entry?.image?.url || "";
  const labels = imageLabels(file, Boolean(entry));

  useEffect(() => {
    if (!file) { setPreview(""); return; }
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);
  useEffect(() => { setBroken(false); }, [source]);

  function select(event: ChangeEvent<HTMLInputElement>) {
    const selected = event.currentTarget.files?.[0];
    event.currentTarget.value = "";
    if (selected) onSelect(selected);
  }

  return <section className="entry-image-field" aria-labelledby="entry-image-title">
    <h2 id="entry-image-title">Imagen de referencia</h2>
    {loading ? <div className="entry-image-field__zone" aria-hidden="true">
      <span className="entry-image-field__preview"><LoadingValue kind="image" /></span>
      <span className="entry-image-field__action">{labels.action}</span>
    </div> : <button id="entry-image" className="entry-image-field__zone" type="button" disabled={disabled} onClick={() => input.current?.click()} aria-label={labels.action} data-invalid={Boolean(error)} aria-describedby="entry-image-help entry-image-error">
      <span className="entry-image-field__preview">
        {source && !broken && <img src={source} alt="Vista previa de la imagen de la entrada" onError={() => setBroken(true)} />}
        {(!source || broken) && <span className="entry-image-field__placeholder"><Icon name="image" /><ImageContent source={source} broken={broken} reference={entry?.imageRef} /></span>}
      </span>
      <span className="entry-image-field__action">{labels.action}</span>
    </button>}
    <input ref={input} className="entry-image-field__input" id="entry-image-file" aria-label="Archivo de imagen" type="file" accept="image/jpeg,image/png,image/webp" onChange={select} disabled={disabled} tabIndex={-1} aria-invalid={Boolean(error)} aria-describedby="entry-image-help entry-image-error" />
    <p id="entry-image-help" className="entry-form__muted">{loading ? "La imagen actual se conservará si no seleccionas otra." : labels.help}</p>
    <p className="entry-form__muted">JPEG, PNG o WebP. Máximo 10 MiB y 4096 × 4096 px.</p>
    {validating && <output className="entry-image-field__validation" aria-live="polite">Validando archivo e imagen…</output>}
    <p id="entry-image-error" className="entry-form__error" role={error ? "alert" : undefined}>{error}</p>
  </section>;
}
