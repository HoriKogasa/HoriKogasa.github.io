const config = window.TOBIPO_CONFIG ?? {};
const configured = Boolean(
  window.supabase &&
  config.url &&
  config.publishableKey &&
  !config.url.includes("YOUR_PROJECT") &&
  !config.publishableKey.includes("YOUR_PUBLISHABLE_KEY")
);

const el = {
  configError: document.querySelector("#config-error"),
  loginForm: document.querySelector("#login-form"),
  email: document.querySelector("#email"),
  authState: document.querySelector("#auth-state"),
  sessionPanel: document.querySelector("#session-panel"),
  sessionEmail: document.querySelector("#session-email"),
  logout: document.querySelector("#logout"),
  editorPanel: document.querySelector("#editor-panel"),
  songForm: document.querySelector("#song-form"),
  songId: document.querySelector("#song-id"),
  title: document.querySelector("#title"),
  horikogasa: document.querySelector("#horikogasa"),
  ask0414: document.querySelector("#ask0414"),
  url: document.querySelector("#url"),
  thumbnail: document.querySelector("#thumbnail"),
  confidence: document.querySelector("#confidence"),
  note: document.querySelector("#note"),
  saveSong: document.querySelector("#save-song"),
  resetForm: document.querySelector("#reset-form"),
  editingLabel: document.querySelector("#editing-label"),
  songCount: document.querySelector("#admin-song-count"),
  importLegacy: document.querySelector("#import-legacy"),
  feedback: document.querySelector("#feedback"),
  songList: document.querySelector("#admin-song-list"),
  songTemplate: document.querySelector("#admin-song-template"),
};

let client = null;
let session = null;
let songs = [];

function setFeedback(message, type = "") {
  el.feedback.textContent = message;
  el.feedback.className = `feedback ${type}`.trim();
}

function numberOrNull(value) {
  if (value.trim() === "") return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function averageOf(song) {
  const scores = [song.horikogasa, song.ask0414]
    .map((value) => value === null ? null : Number(value))
    .filter((value) => value !== null && Number.isFinite(value));
  return scores.length ? scores.reduce((sum, value) => sum + value, 0) / scores.length : null;
}

function fmt(value) {
  if (value === null || value === undefined) return "—";
  const number = Number(value);
  return Number.isInteger(number) ? String(number) : number.toFixed(1);
}

function renderAuth() {
  const loggedIn = Boolean(session?.user);
  el.authState.textContent = loggedIn ? "ログイン中" : "未ログイン";
  el.authState.classList.toggle("active", loggedIn);
  el.loginForm.hidden = loggedIn;
  el.sessionPanel.hidden = !loggedIn;
  el.editorPanel.hidden = !loggedIn;
  el.sessionEmail.textContent = session?.user?.email ?? "";
  el.importLegacy.hidden = !loggedIn || songs.length !== 0;
  renderSongs();
}

function renderSongs() {
  el.songList.replaceChildren();
  el.songCount.textContent = songs.length;
  const fragment = document.createDocumentFragment();
  [...songs]
    .sort((a, b) => (averageOf(b) ?? -Infinity) - (averageOf(a) ?? -Infinity) || a.title.localeCompare(b.title, "ja"))
    .forEach((song) => {
      const node = el.songTemplate.content.cloneNode(true);
      node.querySelector(".admin-song-title").textContent = song.title;
      node.querySelector(".admin-song-scores").textContent = `平均 ${fmt(averageOf(song))} / horikogasa ${fmt(song.horikogasa)} / ask0414 ${fmt(song.ask0414)}`;
      const editButton = node.querySelector(".edit-song");
      editButton.dataset.id = song.id;
      editButton.disabled = !session;
      editButton.textContent = session ? "編集" : "ログインで編集";
      fragment.append(node);
    });
  el.songList.append(fragment);
  if (!songs.length) {
    const empty = document.createElement("p");
    empty.className = "empty compact";
    empty.textContent = "Supabaseにはまだ曲がありません。ログイン後、既存のdata.jsonを取り込めます。";
    el.songList.append(empty);
  }
}

async function loadSongs() {
  if (!client) return;
  const { data, error } = await client
    .from("songs")
    .select("id,title,horikogasa,ask0414,url,thumbnail,note,confidence,created_at,updated_at");
  if (error) {
    setFeedback(`曲を読み込めませんでした: ${error.message}`, "error");
    return;
  }
  songs = data ?? [];
  renderAuth();
}

function resetForm() {
  el.songForm.reset();
  el.songId.value = "";
  el.confidence.value = "確定";
  el.saveSong.textContent = "この曲を保存";
  el.editingLabel.textContent = "新しい曲を追加します";
}

function startEditing(id) {
  const song = songs.find((item) => item.id === id);
  if (!song || !session) return;
  el.songId.value = song.id;
  el.title.value = song.title;
  el.horikogasa.value = song.horikogasa ?? "";
  el.ask0414.value = song.ask0414 ?? "";
  el.url.value = song.url;
  el.thumbnail.value = song.thumbnail;
  el.confidence.value = song.confidence;
  el.note.value = song.note ?? "";
  el.saveSong.textContent = "変更を保存";
  el.editingLabel.textContent = `「${song.title}」を編集中`;
  el.editorPanel.scrollIntoView({ behavior: "smooth", block: "start" });
}

function youtubeVideoId(value) {
  try {
    const url = new URL(value);
    if (url.hostname === "youtu.be") return url.pathname.split("/").filter(Boolean)[0] ?? null;
    if (url.hostname.endsWith("youtube.com")) {
      if (url.searchParams.get("v")) return url.searchParams.get("v");
      const parts = url.pathname.split("/").filter(Boolean);
      if (["shorts", "embed", "live"].includes(parts[0])) return parts[1] ?? null;
    }
  } catch {
    return null;
  }
  return null;
}

el.url.addEventListener("change", () => {
  if (el.thumbnail.value) return;
  const videoId = youtubeVideoId(el.url.value);
  if (videoId) el.thumbnail.value = `https://i.ytimg.com/vi/${videoId}/maxresdefault.jpg`;
});

el.loginForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!client) return;
  setFeedback("ログインメールを送信しています…");
  const redirectTo = new URL("./admin.html", window.location.href).href;
  const { error } = await client.auth.signInWithOtp({
    email: el.email.value,
    options: { emailRedirectTo: redirectTo },
  });
  setFeedback(
    error ? `送信できませんでした: ${error.message}` : "ログインリンクを送信しました。メールを確認してください。",
    error ? "error" : "success"
  );
});

el.logout.addEventListener("click", async () => {
  if (!client) return;
  const { error } = await client.auth.signOut();
  if (error) setFeedback(`ログアウトできませんでした: ${error.message}`, "error");
});

el.songForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!client || !session) return;

  const horikogasa = numberOrNull(el.horikogasa.value);
  const ask0414 = numberOrNull(el.ask0414.value);
  if (horikogasa === null && ask0414 === null) {
    setFeedback("どちらか一方の点数を入力してください。", "error");
    return;
  }

  const payload = {
    title: el.title.value.trim(),
    horikogasa,
    ask0414,
    url: el.url.value.trim(),
    thumbnail: el.thumbnail.value.trim(),
    note: el.note.value.trim(),
    confidence: el.confidence.value,
  };

  el.saveSong.disabled = true;
  setFeedback("保存しています…");
  const request = el.songId.value
    ? client.from("songs").update(payload).eq("id", el.songId.value)
    : client.from("songs").insert(payload);
  const { error } = await request;
  el.saveSong.disabled = false;

  if (error) {
    setFeedback(`保存できませんでした: ${error.message}`, "error");
    return;
  }
  setFeedback(el.songId.value ? "変更を保存しました。" : "曲を追加しました。", "success");
  resetForm();
  await loadSongs();
});

el.resetForm.addEventListener("click", resetForm);
el.songList.addEventListener("click", (event) => {
  const button = event.target.closest(".edit-song");
  if (button) startEditing(button.dataset.id);
});

el.importLegacy.addEventListener("click", async () => {
  if (!client || !session || songs.length) return;
  el.importLegacy.disabled = true;
  setFeedback("既存の曲を取り込んでいます…");
  try {
    const response = await fetch("./data.json", { cache: "no-store" });
    if (!response.ok) throw new Error("data.jsonを読み込めませんでした");
    const legacySongs = await response.json();
    const payload = legacySongs.map((song) => ({
      title: song.title,
      horikogasa: song.horikogasa,
      ask0414: song.ask0414,
      url: song.url,
      thumbnail: song.thumbnail,
      note: song.note ?? "",
      confidence: song.confidence ?? "確定",
    }));
    const { error } = await client.from("songs").insert(payload);
    if (error) throw error;
    setFeedback(`${payload.length}曲を取り込みました。`, "success");
    await loadSongs();
  } catch (error) {
    setFeedback(`取り込めませんでした: ${error.message}`, "error");
  } finally {
    el.importLegacy.disabled = false;
  }
});

async function init() {
  if (!configured) {
    el.configError.hidden = false;
    el.loginForm.querySelector("button").disabled = true;
    setFeedback("Supabaseの設定後に曲一覧を読み込みます。");
    return;
  }

  client = window.supabase.createClient(config.url, config.publishableKey);
  const { data, error } = await client.auth.getSession();
  if (error) setFeedback(`ログイン状態を確認できませんでした: ${error.message}`, "error");
  session = data?.session ?? null;
  renderAuth();
  await loadSongs();

  client.auth.onAuthStateChange((_event, nextSession) => {
    session = nextSession;
    renderAuth();
  });
}

init();
