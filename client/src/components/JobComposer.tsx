import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Download, FileText, FolderOpen, Image, Plus, ShieldCheck, Sparkles, Upload, Video, X } from "lucide-react";
import { formatSrt, type SubtitleCue } from "../lib/subtitles";

export type JobDraft = {
  source_url: string;
  title: string;
  description: string;
  subtitle_text: string;
  thumbnail_text: string;
};

type JobComposerProps = {
  saving: boolean;
  onClose: () => void;
  onSave: (draft: JobDraft) => Promise<void>;
};

export default function JobComposer({ saving, onClose, onSave }: JobComposerProps) {
  const [sourceUrl, setSourceUrl] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [thumbnailText, setThumbnailText] = useState("");
  const [cues, setCues] = useState<SubtitleCue[]>([{ id: 1, start: "00:00", end: "00:03", text: "" }]);
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);
  const [videoUrl, setVideoUrl] = useState("");
  const [thumbnailUrl, setThumbnailUrl] = useState("");
  const [formError, setFormError] = useState("");
  const subtitleSrt = useMemo(() => formatSrt(cues), [cues]);

  useEffect(() => {
    if (!videoFile) {
      setVideoUrl("");
      return;
    }
    const url = URL.createObjectURL(videoFile);
    setVideoUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [videoFile]);

  useEffect(() => {
    if (!thumbnailFile) {
      setThumbnailUrl("");
      return;
    }
    const url = URL.createObjectURL(thumbnailFile);
    setThumbnailUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [thumbnailFile]);

  const updateCue = (id: number, key: keyof SubtitleCue, value: string) => {
    setCues((current) => current.map((cue) => cue.id === id ? { ...cue, [key]: value } : cue));
  };

  const addCue = () => {
    const next = Math.max(0, ...cues.map((cue) => cue.id)) + 1;
    const last = cues.at(-1);
    setCues((current) => [...current, { id: next, start: last?.end || "00:03", end: "00:06", text: "" }]);
  };

  const removeCue = (id: number) => {
    setCues((current) => current.length > 1 ? current.filter((cue) => cue.id !== id) : current.map((cue) => ({ ...cue, text: "" })));
  };

  const handleSave = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError("");
    try {
      const source = new URL(sourceUrl.trim());
      if (source.protocol !== "https:" && source.protocol !== "http:") throw new Error("Invalid protocol");
    } catch {
      setFormError("Masukkan URL video yang valid untuk diproses lewat GitHub Actions.");
      return;
    }
    try {
      await onSave({
        source_url: sourceUrl.trim(),
        title: title.trim(),
        description: description.trim(),
        subtitle_text: subtitleSrt,
        thumbnail_text: thumbnailText.trim(),
      });
    } catch (error) {
      setFormError(error instanceof Error ? error.message : "Draf belum berhasil disimpan.");
    }
  };

  const downloadThumbnail = async () => {
    const canvas = document.createElement("canvas");
    canvas.width = 1280;
    canvas.height = 720;
    const context = canvas.getContext("2d");
    if (!context) return;

    const gradient = context.createLinearGradient(0, 0, 1280, 720);
    gradient.addColorStop(0, "#0b1420");
    gradient.addColorStop(1, "#163e49");
    context.fillStyle = gradient;
    context.fillRect(0, 0, canvas.width, canvas.height);

    if (thumbnailUrl) {
      try {
        const image = new window.Image();
        await new Promise<void>((resolve, reject) => {
          image.onload = () => resolve();
          image.onerror = () => reject(new Error("Gambar tidak bisa dibaca"));
          image.src = thumbnailUrl;
        });
        const scale = Math.max(canvas.width / image.width, canvas.height / image.height);
        const width = image.width * scale;
        const height = image.height * scale;
        context.drawImage(image, (canvas.width - width) / 2, (canvas.height - height) / 2, width, height);
        const shade = context.createLinearGradient(0, 250, 0, 720);
        shade.addColorStop(0, "rgba(4, 12, 20, 0)");
        shade.addColorStop(1, "rgba(4, 12, 20, .9)");
        context.fillStyle = shade;
        context.fillRect(0, 0, 1280, 720);
      } catch {
        // Keep the generated gradient background if the local image cannot be decoded.
      }
    }

    context.fillStyle = "#3ae2bb";
    context.fillRect(76, 84, 16, 124);
    context.fillStyle = "rgba(255,255,255,.9)";
    context.font = "700 30px system-ui, sans-serif";
    context.fillText("AUTO-TUBE STUDIO", 120, 122);
    context.fillStyle = "#ffffff";
    context.font = "800 76px system-ui, sans-serif";
    const words = (thumbnailText || title || "VIDEO BARU").split(/\s+/);
    const lines: string[] = [];
    let line = "";
    for (const word of words) {
      const next = line ? `${line} ${word}` : word;
      if (context.measureText(next).width > 1040 && line) {
        lines.push(line);
        line = word;
      } else line = next;
    }
    if (line) lines.push(line);
    lines.slice(0, 3).forEach((text, index) => context.fillText(text, 120, 520 + index * 86));

    const link = document.createElement("a");
    link.download = "auto-tube-thumbnail.png";
    link.href = canvas.toDataURL("image/png");
    link.click();
  };

  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section className="composer-modal" role="dialog" aria-modal="true" aria-labelledby="composer-title">
        <header className="composer-header">
          <div>
            <div className="eyebrow"><Sparkles size={13} /> STUDIO PRODUKSI</div>
            <h2 id="composer-title">Buat video baru</h2>
            <p>Masukkan URL sumber. Pipeline AI dapat membuat subtitle, metadata, dan thumbnail untuk ditinjau sebelum publikasi.</p>
          </div>
          <button className="icon-button" type="button" aria-label="Tutup" onClick={onClose}><X size={19} /></button>
        </header>

        <form className="composer-form" onSubmit={handleSave}>
          <div className="composer-columns">
            <div className="composer-column">
              <section className="form-section">
                <div className="section-heading"><span className="section-index">01</span><div><h3>Sumber video</h3><p>URL diperlukan oleh workflow Actions yang tersedia saat ini.</p></div></div>
                <label className="field-label" htmlFor="source-url">URL video sumber</label>
                <input id="source-url" className="input" type="url" placeholder="https://youtu.be/..." value={sourceUrl} onChange={(event) => setSourceUrl(event.target.value)} required />
                <label className="field-label file-label" htmlFor="video-file"><span><Video size={16} /> Pratinjau file dari perangkat</span><Upload size={15} /></label>
                <input id="video-file" className="visually-hidden" type="file" accept="video/*" onChange={(event) => setVideoFile(event.target.files?.[0] ?? null)} />
                {videoUrl ? <video className="video-preview" controls src={videoUrl} /> : <div className="upload-hint"><FolderOpen size={21} /><span>Pilih file untuk pratinjau lokal. File ini belum diunggah ke cloud.</span></div>}
                <p className="field-note">Untuk memproses video, tetap masukkan URL sumber. Unggah langsung dari perangkat belum tersambung ke Storage.</p>
              </section>

              <section className="form-section">
                <div className="section-heading"><span className="section-index">02</span><div><h3>Judul &amp; description</h3><p>Opsional. Kosongkan agar Gemini membuat metadata saat workflow dijalankan.</p></div></div>
                <label className="field-label" htmlFor="video-title">Judul YouTube</label>
                <input id="video-title" className="input" maxLength={100} placeholder="Kosongkan untuk dibuat otomatis" value={title} onChange={(event) => setTitle(event.target.value)} />
                <label className="field-label" htmlFor="video-description">Description</label>
                <textarea id="video-description" className="input textarea" rows={4} maxLength={5000} placeholder="Opsional — kosongkan untuk dibuat otomatis" value={description} onChange={(event) => setDescription(event.target.value)} />
                <div className="character-count">{description.length} / 5000</div>
              </section>
            </div>

            <div className="composer-column">
              <section className="form-section">
                <div className="section-heading"><span className="section-index">03</span><div><h3>Subtitle teks</h3><p>Opsional. Jika kosong, pipeline membuat subtitle otomatis dari audio video.</p></div></div>
                <div className="cue-list">
                  {cues.map((cue, index) => (
                    <div className="cue-row" key={cue.id}>
                      <div className="cue-number">{String(index + 1).padStart(2, "0")}</div>
                      <div className="cue-fields">
                        <div className="cue-times">
                          <label><span>Mulai</span><input className="input time-input" aria-label={`Subtitle ${index + 1} mulai`} value={cue.start} onChange={(event) => updateCue(cue.id, "start", event.target.value)} placeholder="00:00" /></label>
                          <label><span>Selesai</span><input className="input time-input" aria-label={`Subtitle ${index + 1} selesai`} value={cue.end} onChange={(event) => updateCue(cue.id, "end", event.target.value)} placeholder="00:03" /></label>
                          <button className="icon-button small" type="button" aria-label={`Hapus subtitle ${index + 1}`} onClick={() => removeCue(cue.id)}><X size={14} /></button>
                        </div>
                        <input className="input cue-text" aria-label={`Teks subtitle ${index + 1}`} value={cue.text} onChange={(event) => updateCue(cue.id, "text", event.target.value)} placeholder="Tulis teks subtitle..." />
                      </div>
                    </div>
                  ))}
                </div>
                <button className="text-button" type="button" onClick={addCue}><Plus size={15} /> Tambah baris subtitle</button>
                <div className="subtitle-export"><FileText size={15} /><span>{subtitleSrt ? `${subtitleSrt.split("\n\n").length} cue siap disimpan sebagai SRT` : "Kosongkan agar subtitle dibuat otomatis oleh pipeline"}</span></div>
              </section>

              <section className="form-section thumbnail-section">
                <div className="section-heading"><span className="section-index">04</span><div><h3>Thumbnail</h3><p>Pipeline membuat thumbnail otomatis; pilihan di sini hanya pratinjau lokal.</p></div></div>
                <div className={`thumbnail-preview ${thumbnailUrl ? "has-image" : ""}`} style={thumbnailUrl ? { backgroundImage: `linear-gradient(0deg, rgba(4,12,20,.86), transparent 72%), url(${thumbnailUrl})` } : undefined}>
                  {!thumbnailUrl && <span className="preview-glow" />}
                  <span className="thumbnail-kicker"><Image size={13} /> AUTO-TUBE STUDIO</span>
                  <strong>{thumbnailText || title || "VIDEO BARU"}</strong>
                </div>
                <div className="thumbnail-actions">
                  <label className="button button-secondary file-button" htmlFor="thumbnail-file"><Image size={15} /> Pilih gambar</label>
                  <input id="thumbnail-file" className="visually-hidden" type="file" accept="image/*" onChange={(event) => setThumbnailFile(event.target.files?.[0] ?? null)} />
                  <button className="button button-secondary" type="button" onClick={downloadThumbnail}><Download size={15} /> Unduh PNG</button>
                </div>
                <label className="field-label" htmlFor="thumbnail-text">Teks thumbnail</label>
                <input id="thumbnail-text" className="input" maxLength={60} value={thumbnailText} onChange={(event) => setThumbnailText(event.target.value)} placeholder="Teks besar pada thumbnail" />
                <p className="field-note">PNG ini hanya dibuat di perangkat. Workflow menghasilkan thumbnail untuk video; file lokal tidak diunggah.</p>
              </section>
            </div>
          </div>

          {formError && <div className="form-error" role="alert">{formError}</div>}
          <footer className="composer-footer">
            <span className="approval-note"><ShieldCheck size={15} /> Simpan draft saja. Pilih PREVIEW_ONLY di Actions untuk meninjau; PUBLISH hanya setelah disetujui.</span>
            <div className="composer-footer-actions">
              <button className="button button-quiet" type="button" onClick={onClose}>Batal</button>
              <button className="button button-primary" type="submit" disabled={saving}>{saving ? "Menyimpan…" : "Simpan draft"}<span aria-hidden="true">→</span></button>
            </div>
          </footer>
        </form>
      </section>
    </div>
  );
}
