const state = { songs: [], query: "", filter: "all" };

const el = {
  ranking: document.querySelector("#ranking"),
  template: document.querySelector("#song-template"),
  search: document.querySelector("#search"),
  empty: document.querySelector("#empty"),
  visible: document.querySelector("#visible-count"),
  max: document.querySelector("#max-score"),
  count: document.querySelector("#song-count"),
  high: document.querySelector("#high-count"),
};

function fmt(value) {
  if (value === null || value === undefined) return "—";
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

function grade(score) {
  if (score >= 80) return "S";
  if (score >= 75) return "A";
  if (score >= 70) return "B";
  if (score >= 60) return "C";
  return "D";
}

function visibleSongs() {
  const q = state.query.trim().toLocaleLowerCase("ja");
  return state.songs.filter((song) => {
    const textMatch = !q || `${song.title} ${song.note}`.toLocaleLowerCase("ja").includes(q);
    const filterMatch = state.filter === "all"
      || (state.filter === "75" && song.average >= 75)
      || (state.filter === "70" && song.average >= 70)
      || (state.filter === "inferred" && song.confidence === "推定");
    return textMatch && filterMatch;
  });
}

function render() {
  const songs = visibleSongs();
  el.ranking.replaceChildren();
  const fragment = document.createDocumentFragment();

  songs.forEach((song) => {
    const node = el.template.content.cloneNode(true);
    const card = node.querySelector(".song-card");
    const linkTargets = node.querySelectorAll(".art-link, .listen");
    node.querySelector(".rank-number").textContent = String(song.rank).padStart(2, "0");
    node.querySelector(".song-title").textContent = song.title;
    node.querySelector(".song-note").textContent = song.note || "—";
    node.querySelector(".average").textContent = fmt(song.average);
    node.querySelector(".h-score").textContent = fmt(song.horikogasa);
    node.querySelector(".a-score").textContent = fmt(song.ask0414);

    const gradeEl = node.querySelector(".grade");
    const g = grade(song.average);
    gradeEl.textContent = `${g} RANK`;
    gradeEl.classList.add(g.toLowerCase());

    const confidence = node.querySelector(".confidence");
    confidence.textContent = song.confidence;
    if (song.confidence === "確定") confidence.classList.add("certain");

    const img = node.querySelector(".art");
    img.src = song.thumbnail;
    img.alt = `${song.title}のサムネイル`;
    img.addEventListener("error", () => {
      img.removeAttribute("src");
      img.alt = "サムネイルを読み込めませんでした";
      card.classList.add("image-error");
    }, { once: true });

    linkTargets.forEach((link) => {
      link.href = song.url;
      link.setAttribute("aria-label", `${song.title}を聴く`);
    });
    fragment.append(node);
  });

  el.ranking.append(fragment);
  el.visible.textContent = songs.length;
  el.empty.hidden = songs.length !== 0;
}

async function init() {
  try {
    const response = await fetch("./data.json", { cache: "no-store" });
    if (!response.ok) throw new Error("data load failed");
    state.songs = await response.json();
    state.songs.sort((a, b) => b.average - a.average || b.high - a.high || a.title.localeCompare(b.title, "ja"));
    let previous = null;
    let displayedRank = 0;
    state.songs.forEach((song, index) => {
      if (song.average !== previous) displayedRank = index + 1;
      song.rank = displayedRank;
      previous = song.average;
    });
    el.max.textContent = fmt(Math.max(...state.songs.map((song) => song.average)));
    el.count.textContent = state.songs.length;
    el.high.textContent = state.songs.filter((song) => song.average >= 75).length;
    render();
  } catch {
    el.ranking.innerHTML = '<div class="empty">ランキングを読み込めませんでした。時間をおいて再読み込みしてください。</div>';
  }
}

el.search.addEventListener("input", (event) => {
  state.query = event.target.value;
  render();
});

document.querySelectorAll(".filter").forEach((button) => {
  button.addEventListener("click", () => {
    document.querySelectorAll(".filter").forEach((item) => item.classList.toggle("active", item === button));
    state.filter = button.dataset.filter;
    render();
  });
});

init();
