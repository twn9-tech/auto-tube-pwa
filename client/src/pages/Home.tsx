import { useCallback, useEffect, useMemo, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import {
  Activity, ArrowRight, ArrowUpRight, Captions, Check, CircleHelp, Clock3, Cloud, Download, FileText,
  Film, Image, LayoutDashboard, ListVideo, LogOut, MonitorPlay, Plus, Settings2, ShieldCheck,
  Sparkles, Upload, Youtube,
} from "lucide-react";
import JobComposer, { type JobDraft } from "../components/JobComposer";
import { supabase, type UploadJob } from "../lib/supabase";

const ACTIONS_URL = "https://github.com/twn9-tech/auto-tube/actions/workflows/manual-youtube-publish.yml";
type Section = "overview" | "queue" | "integrations";
type InstallPromptEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: "accepted" | "dismissed" }> };

const statusText: Record<UploadJob["status"], string> = {
  draft: "Draf", approved: "Siap diproses", processing: "Diproses", uploaded: "Tayang", failed: "Perlu ditinjau", archived: "Arsip",
};

function BrandMark({ small = false }: { small?: boolean }) {
  return <span className={`brand-mark ${small ? "brand-mark-small" : ""}`} aria-hidden="true"><span /></span>;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "short" }).format(new Date(value));
}

function safeErrorMessage(message: string) {
  if (message.toLowerCase().includes("unsupported provider")) return "Google Login belum diaktifkan pada Supabase Auth.";
  if (message.toLowerCase().includes("row-level security")) return "Akses antrean ditolak oleh kebijakan Supabase. Periksa sesi dan RLS.";
  return message;
}

export default function Home() {
  const [session, setSession] = useState<Session | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [loginLoading, setLoginLoading] = useState(false);
  const [jobs, setJobs] = useState<UploadJob[]>([]);
  const [jobsLoading, setJobsLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [section, setSection] = useState<Section>("overview");
  const [composerOpen, setComposerOpen] = useState(false);
  const [notice, setNotice] = useState("");
  const [noticeKind, setNoticeKind] = useState<"info" | "error">("info");
  const [installPrompt, setInstallPrompt] = useState<InstallPromptEvent | null>(null);

  useEffect(() => {
    let mounted = true;
    supabase.auth.getSession().then(({ data, error }) => {
      if (!mounted) return;
      if (error) {
        setNotice(safeErrorMessage(error.message));
        setNoticeKind("error");
      }
      setSession(data.session);
      setAuthLoading(false);
    });
    const { data: authListener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      setAuthLoading(false);
    });

    const captureInstall = (event: Event) => {
      event.preventDefault();
      setInstallPrompt(event as InstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", captureInstall);
    return () => {
      mounted = false;
      authListener.subscription.unsubscribe();
      window.removeEventListener("beforeinstallprompt", captureInstall);
    };
  }, []);

  const loadJobs = useCallback(async () => {
    if (!session) {
      setJobs([]);
      return;
    }
    setJobsLoading(true);
    const { data, error } = await supabase
      .from("upload_jobs")
      .select("id,source_url,title,description,status,created_at,youtube_video_id,last_error")
      .order("created_at", { ascending: false })
      .limit(20);
    setJobsLoading(false);
    if (error) {
      setNotice(safeErrorMessage(error.message));
      setNoticeKind("error");
      return;
    }
    setJobs((data ?? []) as UploadJob[]);
  }, [session]);

  useEffect(() => { void loadJobs(); }, [loadJobs]);

  const stats = useMemo(() => ({
    drafts: jobs.filter((job) => job.status === "draft").length,
    processing: jobs.filter((job) => job.status === "processing" || job.status === "approved").length,
    published: jobs.filter((job) => job.status === "uploaded").length,
  }), [jobs]);

  const signIn = async () => {
    setLoginLoading(true);
    setNotice("");
    const callback = new URL(import.meta.env.BASE_URL, window.location.origin).toString();
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: callback, queryParams: { prompt: "select_account" } },
    });
    if (error) {
      setNotice(safeErrorMessage(error.message));
      setNoticeKind("error");
      setLoginLoading(false);
    }
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      setNotice(safeErrorMessage(error.message));
      setNoticeKind("error");
    }
  };

  const saveDraft = async (draft: JobDraft) => {
    if (!session?.user) throw new Error("Masuk dengan Google sebelum menyimpan draft.");
    setSaving(true);
    const { data, error } = await supabase.from("upload_jobs").insert({
      source_url: draft.source_url,
      title: draft.title,
      description: draft.description,
      subtitle_text: draft.subtitle_text,
      thumbnail_text: draft.thumbnail_text,
      status: "draft",
    }).select("id,source_url,title,description,status,created_at,youtube_video_id,last_error").single();
    setSaving(false);
    if (error) throw new Error(safeErrorMessage(error.message));
    setJobs((current) => [data as UploadJob, ...current]);
    setComposerOpen(false);
    setSection("queue");
    setNotice("Draft tersimpan di Supabase. Untuk memprosesnya, buka workflow GitHub Actions dan isi konfirmasi publikasi di sana.");
    setNoticeKind("info");
  };

  const installApp = async () => {
    if (installPrompt) {
      await installPrompt.prompt();
      const result = await installPrompt.userChoice;
      if (result.outcome === "accepted") setNotice("Auto-Tube berhasil ditambahkan ke layar utama.");
      setInstallPrompt(null);
      return;
    }
    setNotice("Di Android Chrome, buka menu ⋮ lalu pilih ‘Install app’ atau ‘Tambahkan ke layar utama’.");
    setNoticeKind("info");
  };

  if (authLoading) {
    return <div className="loading-screen"><BrandMark /><span>Menyiapkan Studio Auto-Tube…</span></div>;
  }

  if (!session) {
    return (
      <div className="login-shell">
        <div className="login-atmosphere" />
        <header className="login-brand"><BrandMark /><span>Auto-Tube<span className="brand-dot">.</span></span><span className="brand-tag">CREATOR STUDIO</span></header>
        <main className="login-main">
          <section className="login-story">
            <div className="eyebrow"><Sparkles size={14} /> VIDEO WORKFLOW, RAPI</div>
            <h1>Dari bahan mentah<br />ke <em>siap tayang.</em></h1>
            <p>Satu ruang untuk menyusun video, subtitle, metadata, dan thumbnail sebelum masuk ke proses publikasi YouTube.</p>
            <div className="login-feature-list">
              <div><span><Captions size={17} /></span><div><strong>Subtitle terarah</strong><small>Susun teks dan timecode cue.</small></div></div>
              <div><span><FileText size={17} /></span><div><strong>Metadata tersusun</strong><small>Judul dan description dalam satu draft.</small></div></div>
              <div><span><Image size={17} /></span><div><strong>Thumbnail siap ditinjau</strong><small>Rancang visual sebelum publikasi.</small></div></div>
            </div>
          </section>
          <section className="login-card">
            <div className="login-card-icon"><BrandMark small /></div>
            <div className="eyebrow">MASUK KE WORKSPACE</div>
            <h2>Studio Anda,<br />siap dilanjutkan.</h2>
            <p>Gunakan akun Google untuk mengakses antrean video pribadi Anda.</p>
            {notice && <div className="notice notice-error" role="alert">{notice}</div>}
            <button className="button google-button" type="button" onClick={signIn} disabled={loginLoading}>
              <span className="google-g">G</span>{loginLoading ? "Menghubungkan…" : "Lanjutkan dengan Google"}<ArrowRight size={16} />
            </button>
            <div className="login-security"><ShieldCheck size={15} /><span>Sesi dan data draft dikelola oleh Supabase Auth dengan kebijakan akses pengguna.</span></div>
            <div className="login-testing">Google OAuth masih dalam mode pengujian; hanya akun yang terdaftar sebagai tester yang dapat masuk.</div>
          </section>
        </main>
        <footer className="login-footer"><span>© Auto-Tube Studio</span><button type="button" className="install-link" onClick={installApp}><Download size={14} /> Pasang aplikasi</button><span>Offline shell tersedia setelah instalasi pertama</span></footer>
      </div>
    );
  }

  const displayName = session.user.user_metadata?.full_name || session.user.user_metadata?.name || session.user.email || "Creator";
  const initial = displayName.trim().charAt(0).toUpperCase() || "A";
  const activeTitle = section === "overview" ? "Ringkasan" : section === "queue" ? "Antrean produksi" : "Integrasi";

  return (
    <div className="dashboard-shell">
      <aside className="sidebar">
        <a className="sidebar-brand" href={import.meta.env.BASE_URL} aria-label="Auto-Tube Studio"><BrandMark /><span>Auto-Tube<span className="brand-dot">.</span></span></a>
        <div className="workspace-switch"><span className="workspace-avatar">AT</span><span><small>WORKSPACE</small><strong>Studio utama</strong></span><span className="switch-caret">⌄</span></div>
        <nav className="side-nav" aria-label="Menu utama">
          <span className="nav-caption">RUANG KERJA</span>
          <button className={`nav-item ${section === "overview" ? "active" : ""}`} type="button" onClick={() => setSection("overview")}><LayoutDashboard size={17} /> Ringkasan</button>
          <button className={`nav-item ${section === "queue" ? "active" : ""}`} type="button" onClick={() => setSection("queue")}><ListVideo size={17} /> Antrean produksi<span className="nav-count">{jobs.length}</span></button>
          <button className={`nav-item ${section === "integrations" ? "active" : ""}`} type="button" onClick={() => setSection("integrations")}><Settings2 size={17} /> Integrasi</button>
          <span className="nav-caption nav-caption-spaced">PINTASAN</span>
          <a className="nav-item nav-anchor" href={ACTIONS_URL} target="_blank" rel="noreferrer"><Youtube size={17} /> Workflow YouTube<ArrowUpRight size={13} className="nav-external" /></a>
        </nav>
        <div className="sidebar-bottom">
          <div className="privacy-card"><ShieldCheck size={16} /><div><strong>Draft privat</strong><span>Data dibatasi oleh RLS Supabase.</span></div></div>
          <button className="profile-button" type="button" onClick={signOut}><span className="profile-avatar">{initial}</span><span className="profile-copy"><strong>{displayName}</strong><small>Keluar dari akun</small></span><LogOut size={16} /></button>
        </div>
      </aside>

      <div className="main-panel">
        <header className="topbar">
          <div><div className="breadcrumb">AUTO-TUBE STUDIO <span>/</span> {activeTitle.toUpperCase()}</div><h1>{activeTitle}</h1></div>
          <div className="topbar-actions">
            <span className="connection-pill"><span className="connection-dot" /> SUPABASE TERHUBUNG</span>
            <button className="button button-secondary install-button" type="button" onClick={installApp}><Download size={15} /> Pasang</button>
            <span className="profile-avatar top-avatar" title={displayName}>{initial}</span>
          </div>
        </header>

        <main className="page-content">
          {notice && <div className={`notice ${noticeKind === "error" ? "notice-error" : "notice-info"}`} role="status"><span>{notice}</span><button type="button" aria-label="Tutup pesan" onClick={() => setNotice("")}>×</button></div>}

          {section === "overview" && (
            <>
              <section className="hero-panel">
                <div className="hero-copy">
                  <div className="eyebrow"><Sparkles size={14} /> CREATOR WORKFLOW</div>
                  <h2>Siapkan video.<br /><em>Biar siap tayang.</em></h2>
                  <p>Atur sumber, subtitle, metadata, dan thumbnail dalam satu alur yang jelas.</p>
                  <button className="button button-hero" type="button" onClick={() => setComposerOpen(true)}><Plus size={17} /> Mulai produksi <ArrowRight size={16} /></button>
                </div>
                <div className="hero-art" aria-hidden="true">
                  <div className="art-orbit orbit-one" /><div className="art-orbit orbit-two" />
                  <div className="art-video-card"><div className="art-window"><span className="art-window-dot" /><span className="art-window-dot" /><span className="art-window-dot" /><span className="art-time">00:24 / 02:10</span></div><div className="art-play"><span /></div><div className="art-caption">CERITA ANDA, SIAP TAYANG</div></div>
                  <div className="art-chip chip-subtitle"><Captions size={14} /> SUBTITLE</div><div className="art-chip chip-thumbnail"><Image size={14} /> THUMBNAIL</div>
                </div>
              </section>

              <section className="stats-row" aria-label="Statistik produksi">
                <article className="stat-card"><div className="stat-icon mint"><FileText size={18} /></div><div><span>DRAFT</span><strong>{stats.drafts}</strong><small>Menunggu ditinjau</small></div><span className="stat-mark">01</span></article>
                <article className="stat-card"><div className="stat-icon amber"><Activity size={18} /></div><div><span>DALAM PROSES</span><strong>{stats.processing}</strong><small>Render atau publikasi</small></div><span className="stat-mark">02</span></article>
                <article className="stat-card"><div className="stat-icon blue"><Youtube size={18} /></div><div><span>SUDAH TAYANG</span><strong>{stats.published}</strong><small>Video terunggah</small></div><span className="stat-mark">03</span></article>
              </section>

              <section className="workflow-card">
                <div className="section-title-row"><div><div className="eyebrow">ALUR PRODUKSI</div><h3>Lima langkah, satu workspace</h3></div><span className="stage-count">01—05</span></div>
                <div className="workflow-steps">
                  <div className="workflow-step"><span className="step-number"><Film size={16} /></span><span><strong>Video</strong><small>Pilih sumber</small></span></div><span className="step-line" />
                  <div className="workflow-step"><span className="step-number"><Captions size={16} /></span><span><strong>Subtitle</strong><small>Atur timecode</small></span></div><span className="step-line" />
                  <div className="workflow-step"><span className="step-number"><FileText size={16} /></span><span><strong>Metadata</strong><small>Judul &amp; detail</small></span></div><span className="step-line" />
                  <div className="workflow-step"><span className="step-number"><Image size={16} /></span><span><strong>Thumbnail</strong><small>Rancang visual</small></span></div><span className="step-line" />
                  <div className="workflow-step"><span className="step-number"><MonitorPlay size={16} /></span><span><strong>Render &amp; unggah</strong><small>Konfirmasi manual</small></span></div>
                </div>
              </section>

              <section className="recent-section">
                <div className="section-title-row"><div><div className="eyebrow">TERBARU</div><h3>Antrean produksi</h3></div><button className="text-button" type="button" onClick={() => setSection("queue")}>Lihat semua <ArrowRight size={15} /></button></div>
                <JobList jobs={jobs.slice(0, 4)} loading={jobsLoading} onCreate={() => setComposerOpen(true)} />
              </section>
            </>
          )}

          {section === "queue" && (
            <section className="queue-page">
              <div className="queue-heading"><div><div className="eyebrow">WORKSPACE VIDEO</div><h2>Draft dan status publikasi.</h2><p>Draft disimpan pada Supabase. Pemrosesan YouTube tetap melalui workflow GitHub Actions.</p></div><button className="button button-primary" type="button" onClick={() => setComposerOpen(true)}><Plus size={16} /> Buat video</button></div>
              <JobList jobs={jobs} loading={jobsLoading} onCreate={() => setComposerOpen(true)} large />
              <div className="workflow-callout"><div className="callout-icon"><ShieldCheck size={18} /></div><div><strong>Publikasi tidak berjalan otomatis dari halaman ini</strong><p>Setelah memeriksa draft, buka workflow privat GitHub Actions dan ketik konfirmasi hak penggunaan serta <code>PUBLISH</code>.</p></div><a className="button button-secondary" href={ACTIONS_URL} target="_blank" rel="noreferrer">Buka Actions <ArrowUpRight size={14} /></a></div>
            </section>
          )}

          {section === "integrations" && (
            <section className="integrations-page">
              <div className="queue-heading"><div><div className="eyebrow">KONEKSI LAYANAN</div><h2>Integrasi Auto-Tube.</h2><p>Rahasia dipisahkan dari situs publik. Yang dibutuhkan browser hanya Supabase publishable key.</p></div></div>
              <div className="integration-grid">
                <article className="integration-card"><span className="integration-icon supa-icon"><Cloud size={20} /></span><div className="integration-state"><span className="connection-dot" /> TERHUBUNG</div><h3>Supabase</h3><p>Login dan antrean membaca data sesuai kebijakan RLS pengguna.</p><span className="integration-detail">Project: nzsqrcnvahlxvxcbdibj</span></article>
                <article className="integration-card"><span className="integration-icon google-icon">G</span><div className="integration-state pending"><Clock3 size={13} /> PERLU CEK</div><h3>Google Login</h3><p>Provider Google Supabase harus aktif dan alamat halaman Pages harus ada di daftar redirect yang diizinkan.</p><span className="integration-detail">Redirect: {new URL(import.meta.env.BASE_URL, window.location.origin).toString()}</span></article>
                <article className="integration-card"><span className="integration-icon youtube-icon"><Youtube size={20} /></span><div className="integration-state pending"><Clock3 size={13} /> TOKEN TERPISAH</div><h3>YouTube &amp; Actions</h3><p>Unggah menggunakan workflow manual. Token kanal tetap di GitHub Actions Secrets, tidak dikirim ke PWA.</p><a className="integration-link" href={ACTIONS_URL} target="_blank" rel="noreferrer">Buka workflow YouTube <ArrowUpRight size={14} /></a></article>
                <article className="integration-card"><span className="integration-icon safe-icon"><ShieldCheck size={20} /></span><div className="integration-state"><span className="connection-dot" /> PUBLIK AMAN</div><h3>GitHub Pages</h3><p>Halaman hanya berisi antarmuka statis. Backend Python dan credential tidak dipaketkan ke browser.</p><span className="integration-detail">Situs Pages akan dipublikasi dari repo PWA terpisah.</span></article>
              </div>
              <div className="security-note"><CircleHelp size={17} /><p><strong>Perbedaan penting:</strong> Google Login hanya mengautentikasi pengguna. Izin YouTube untuk mengunggah adalah OAuth terpisah dan memerlukan token kanal yang valid.</p></div>
            </section>
          )}
        </main>

        <footer className="app-footer"><span><span className="offline-dot" /> PWA siap untuk mode offline dasar</span><span>Versi PWA · Studio Auto-Tube</span></footer>
      </div>

      <nav className="mobile-nav" aria-label="Navigasi ponsel">
        <button type="button" className={section === "overview" ? "active" : ""} onClick={() => setSection("overview")}><LayoutDashboard size={18} /><span>Ringkasan</span></button>
        <button type="button" className={section === "queue" ? "active" : ""} onClick={() => setSection("queue")}><ListVideo size={18} /><span>Antrean</span></button>
        <button type="button" className="mobile-create" onClick={() => setComposerOpen(true)} aria-label="Buat video"><Plus size={21} /></button>
        <button type="button" className={section === "integrations" ? "active" : ""} onClick={() => setSection("integrations")}><Settings2 size={18} /><span>Integrasi</span></button>
        <button type="button" onClick={signOut}><LogOut size={18} /><span>Keluar</span></button>
      </nav>

      {composerOpen && <JobComposer saving={saving} onClose={() => setComposerOpen(false)} onSave={saveDraft} />}
    </div>
  );
}

function JobList({ jobs, loading, onCreate, large = false }: { jobs: UploadJob[]; loading: boolean; onCreate: () => void; large?: boolean }) {
  if (loading) return <div className="empty-state"><span className="loading-pulse" /> Memuat antrean dari Supabase…</div>;
  if (!jobs.length) {
    return <div className={`empty-state ${large ? "empty-large" : ""}`}><span className="empty-icon"><Film size={20} /></span><strong>Belum ada video di antrean</strong><p>Buat draft pertama untuk mulai menyusun subtitle, metadata, dan thumbnail.</p><button className="button button-secondary" type="button" onClick={onCreate}><Plus size={15} /> Buat draft</button></div>;
  }
  return (
    <div className={`job-list ${large ? "job-list-large" : ""}`}>
      {jobs.map((job) => (
        <article className="job-row" key={job.id}>
          <div className="job-thumb"><Film size={17} /><span>{job.title?.slice(0, 1).toUpperCase() || "V"}</span></div>
          <div className="job-info"><strong>{job.title || "Video tanpa judul"}</strong><span>{job.source_url || "URL sumber belum tersedia"}</span></div>
          <span className={`status-badge status-${job.status}`}><span />{statusText[job.status]}</span>
          <time>{formatDate(job.created_at)}</time>
          {job.status === "draft" && <a className="job-action" href={ACTIONS_URL} target="_blank" rel="noreferrer" aria-label="Buka workflow GitHub Actions"><ArrowUpRight size={15} /></a>}
          {job.status === "uploaded" && job.youtube_video_id && <a className="job-action" href={`https://youtu.be/${encodeURIComponent(job.youtube_video_id)}`} target="_blank" rel="noreferrer" aria-label="Lihat video YouTube"><ArrowUpRight size={15} /></a>}
          {job.status === "failed" && job.last_error && <span className="job-error" title={job.last_error}>Perlu dicek</span>}
        </article>
      ))}
    </div>
  );
}
