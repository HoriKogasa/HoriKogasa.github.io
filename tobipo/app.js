const state = { songs: [], query: "", sort: "average" };

const rankingModes = {
  average: { label: "平均", description: "平均は、入力されている採点者の点数だけで計算。推定値も含みます。" },
  horikogasa: { label: "ホリ", description: "horikogasaの点数だけで順位を計算。推定値も含みます。" },
  ask0414: { label: "アスク", description: "ask0414の点数だけで順位を計算。推定値も含みます。" },
};

const el = {
  ranking: document.querySelector("#ranking"),
  template: document.querySelector("#song-template"),
  search: document.querySelector("#search"),
  empty: document.querySelector("#empty"),
  visible: document.querySelector("#visible-count"),
  max: document.querySelector("#max-score"),
  count: document.querySelector("#song-count"),
  mode: document.querySelector("#ranking-mode"),
  description: document.querySelector("#ranking-description"),
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
  const songs = [...state.songs];
  songs.sort((a, b) => {
    const aScore = a[state.sort];
    const bScore = b[state.sort];
    if ((aScore === null || aScore === undefined) && (bScore === null || bScore === undefined)) {
      return b.average - a.average || a.title.localeCompare(b.title, "ja");
    }
    if (aScore === null || aScore === undefined) return 1;
    if (bScore === null || bScore === undefined) return -1;
    return bScore - aScore || b.average - a.average || b.high - a.high || a.title.localeCompare(b.title, "ja");
  });

  let previous = null;
  let displayedRank = 0;
  songs.forEach((song, index) => {
    const score = song[state.sort];
    if (score === null || score === undefined) {
      song.displayedRank = null;
    } else {
      if (score !== previous) displayedRank = index + 1;
      song.displayedRank = displayedRank;
      previous = score;
    }
  });
  return songs.filter((song) => !q || `${song.title} ${song.note}`.toLocaleLowerCase("ja").includes(q));
}

function render() {
  const songs = visibleSongs();
  el.ranking.replaceChildren();
  const fragment = document.createDocumentFragment();

  songs.forEach((song) => {
    const node = el.template.content.cloneNode(true);
    const card = node.querySelector(".song-card");
    const linkTargets = node.querySelectorAll(".art-link, .listen");
    node.querySelector(".rank-number").textContent = song.displayedRank === null ? "—" : String(song.displayedRank).padStart(2, "0");
    node.querySelector(".song-title").textContent = song.title;
    node.querySelector(".song-note").textContent = song.note || "—";
    node.querySelector(".average").textContent = fmt(song.average);
    node.querySelector(".h-score").textContent = fmt(song.horikogasa);
    node.querySelector(".a-score").textContent = fmt(song.ask0414);

    const selectedScore = song[state.sort];
    const gradeEl = node.querySelector(".grade");
    if (selectedScore === null || selectedScore === undefined) {
      gradeEl.textContent = "NO SCORE";
    } else {
      const g = grade(selectedScore);
      gradeEl.textContent = `${g} RANK`;
      gradeEl.classList.add(g.toLowerCase());
    }

    node.querySelector(".average-score").classList.toggle("primary", state.sort === "average");
    node.querySelector(".h-score-wrap").classList.toggle("primary", state.sort === "horikogasa");
    node.querySelector(".a-score-wrap").classList.toggle("primary", state.sort === "ask0414");

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
    el.max.textContent = fmt(Math.max(...state.songs.map((song) => song.average)));
    el.count.textContent = state.songs.length;
    el.mode.textContent = rankingModes[state.sort].label;
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
    state.sort = button.dataset.sort;
    el.mode.textContent = rankingModes[state.sort].label;
    el.description.textContent = rankingModes[state.sort].description;
    render();
  });
});

init();
