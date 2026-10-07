/**
 * Ajuste aqui nome, foto, preços, WhatsApp e links de checkout.
 * productImage: caminho da foto, ex. "produto.png"
 * price: valor à vista. installment: valor de cada parcela no cartão.
 * whatsapp: só números, com DDI. Ex.: "5511999999999"
 * url: link da Hotmart, Kiwify ou página de pagamento daquele plano.
 * O ID do pixel da Meta fica em index.html, na linha window.META_PIXEL_ID.
 */
const CONFIG = {
  productName: "nosso produto",
  productLabel: "Suplemento alimentar",
  productImage: "",
  whatsapp: "",
  installments: 12,
  plans: {
    "1": { months: 1, title: "1 mês", price: 147, compareAt: 187, installment: 15.12, note: "Para começar", url: "" },
    "2": { months: 2, title: "2 meses", price: 167, compareAt: 294, installment: 17.18, note: "Ciclo curto", url: "" },
    "3": {
      months: 3,
      title: "3 meses",
      price: 197,
      compareAt: 392,
      installment: 20.27,
      note: "Tratamento ideal para você",
      promo: "Em promoção",
      url: "",
    },
    "4": { months: 4, title: "4 meses", price: 247, compareAt: 467, installment: 25.41, note: "Período estendido", url: "" },
    "6": { months: 6, title: "6 meses", price: 377, compareAt: 597, installment: 38.78, note: "Ciclo mais longo", url: "" },
  },
};

const OTHER_ORDER = ["1", "2", "6", "4"];

const QUESTIONS = [
  {
    id: "motivo",
    prompt: "Hoje a senhora procura emagrecer, por quê?",
    type: "single",
    options: [
      { value: "aparencia", label: "Apenas pela aparência." },
      { value: "rotina", label: "Isso também atrapalha na minha rotina." },
      {
        value: "bemestar",
        label: "Isso atrapalha no meu bem-estar e faz eu sentir dor nas articulações.",
      },
    ],
  },
  {
    id: "tentativa",
    prompt: "Você já tentou emagrecer antes?",
    type: "single",
    options: [
      { value: "treinos", label: "Sim, fiz uma rotina de treinos." },
      { value: "nutricionista", label: "Sim, fiz dieta com nutricionista." },
      { value: "suplemento", label: "Sim, fiz o uso de suplemento para auxiliar no emagrecimento." },
      { value: "nunca", label: "Ainda não tentei de forma consistente." },
    ],
  },
  {
    id: "resultado",
    prompt: "Você já teve resultados satisfatórios?",
    hint: "O que você tentou entregou o que prometia?",
    type: "single",
    when: (answers) => answers.tentativa && answers.tentativa !== "nunca",
    options: [
      { value: "sim", label: "Sim." },
      { value: "nao-rotina", label: "Não, porque eu não segui a rotina corretamente." },
      { value: "nao-efeito", label: "Não, porque o produto não causou efeito." },
      {
        value: "efeito-sanfona",
        label: "Não, porque eu emagreci durante o uso do produto, mas depois engordei tudo de novo.",
      },
    ],
  },
  {
    id: "problemas",
    prompt: "Com quais desses problemas você se identifica?",
    hint: "Pode marcar mais de um.",
    type: "multi",
    options: [
      { value: "doces", label: "Sinto vontade de comer doces toda hora." },
      { value: "fome", label: "Sinto fome fora de hora." },
      { value: "cansaco", label: "Sinto sensação de cansaço durante o meu dia." },
      { value: "articulacoes", label: "Sinto dores nas articulações." },
      { value: "metabolismo", label: "Sinto que o metabolismo está lento e o peso não sai." },
    ],
  },
];

const MOTIVO_LABEL = {
  aparencia: "Aparência",
  rotina: "Rotina travada",
  bemestar: "Bem-estar e articulações",
};

const PROBLEMA_LABEL = {
  doces: "Vontade de doce",
  fome: "Fome fora de hora",
  cansaco: "Cansaço",
  articulacoes: "Dores nas articulações",
  metabolismo: "Metabolismo lento",
};

const state = {
  screen: "intro",
  index: 0,
  direction: "forward",
  busy: false,
  leaving: false,
  answers: { motivo: null, tentativa: null, resultado: null, problemas: [] },
  selectedPlan: null,
  trackedResult: false,
  timers: [],
  observer: null,
};

const app = document.querySelector("#app");

function money(value, cents = value % 1 !== 0) {
  return value.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: cents ? 2 : 0,
    maximumFractionDigits: cents ? 2 : 0,
  });
}

function bottleMarkup() {
  return `
    <svg class="bottle" viewBox="0 0 70 148" aria-hidden="true">
      <rect x="28" y="2" width="14" height="14" rx="3" fill="#e7ebef"/>
      <rect x="31" y="14" width="8" height="12" fill="#c5ccd3"/>
      <path d="M16 38c0-8 8-14 19-14s19 6 19 14v80c0 12-8 20-19 20s-19-8-19-20V38z" fill="#6a4032"/>
      <path d="M20 46c1 22 1 50 0 72 8 6 22 6 30 0-1-22-1-50 0-72-8-5-22-5-30 0z" fill="#fff" opacity=".16"/>
      <rect x="21" y="66" width="28" height="36" rx="3" fill="#f6f1e7"/>
      <rect x="26" y="76" width="18" height="2.5" rx="1" fill="#c44732"/>
      <rect x="26" y="82" width="12" height="2" rx="1" fill="#1b3a32" opacity=".35"/>
    </svg>
  `;
}

function productVisual() {
  if (CONFIG.productImage) {
    return `<img class="product-photo" src="${CONFIG.productImage}" alt="${CONFIG.productLabel}">`;
  }
  return `<div class="bottle-row" aria-hidden="true">${bottleMarkup()}${bottleMarkup()}${bottleMarkup()}</div>`;
}

function visibleQuestions() {
  return QUESTIONS.filter((question) => !question.when || question.when(state.answers));
}

function currentQuestion() {
  return visibleQuestions()[state.index];
}

function clearTimer() {
  state.timers.forEach((id) => clearTimeout(id));
  state.timers = [];
}

function later(fn, ms) {
  const id = setTimeout(fn, ms);
  state.timers.push(id);
  return id;
}

function reducedMotion() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function shellClass() {
  const result = state.screen === "result" ? " result" : "";
  const motion = state.direction === "back"
    ? " enter-back"
    : state.direction === "forward"
      ? " enter-forward"
      : "";
  return `shell${result}${motion}`;
}

function playTransition(direction, apply) {
  if (state.leaving) return;
  const shell = document.querySelector(".shell");
  const run = () => {
    state.leaving = false;
    state.direction = direction;
    apply();
    render();
  };
  if (!shell || reducedMotion()) {
    run();
    return;
  }
  state.leaving = true;
  shell.classList.add(direction === "back" ? "leave-back" : "leave-forward");
  later(run, 230);
}

function scrollToPrice() {
  document.getElementById("preco")?.scrollIntoView({ behavior: reducedMotion() ? "auto" : "smooth", block: "start" });
}

function render() {
  if (state.screen === "intro") renderIntro();
  else if (state.screen === "question") renderQuestion();
  else if (state.screen === "analysis") renderAnalysis();
  else renderResult();
}

function renderIntro() {
  app.innerHTML = `
    <div class="${shellClass()}">
      <div class="topbar"><span>Avaliação de perfil</span><span>2 min</span></div>
      <section class="card">
        <p class="eyebrow">Pré-venda</p>
        <h1>Vamos indicar o tratamento certo para o seu momento.</h1>
        <p class="lede">Algumas perguntas sobre o que você sente hoje. A forma como apresentamos o suplemento muda conforme as suas respostas.</p>
        <button class="btn primary full" id="start" type="button">Começar</button>
      </section>
    </div>
  `;
  document.querySelector("#start").addEventListener("click", () => {
    playTransition("forward", () => {
      state.screen = "question";
      state.index = 0;
    });
  });
}

function renderQuestion() {
  const questions = visibleQuestions();
  const question = questions[state.index];
  const progress = ((state.index + 1) / questions.length) * 100;
  const selected = state.answers[question.id];

  const options = question.options.map((option) => {
    const checked = question.type === "multi"
      ? selected.includes(option.value)
      : selected === option.value;
    return `
      <button class="option${question.type === "multi" ? " multi" : ""}" type="button" role="${question.type === "multi" ? "checkbox" : "radio"}" aria-checked="${checked}" data-value="${option.value}">
        <i class="mark" aria-hidden="true"></i>
        <span class="copy">${option.label}</span>
      </button>
    `;
  }).join("");

  const keepValue = document.activeElement?.dataset?.value || "";

  app.innerHTML = `
    <div class="${shellClass()}">
      <div class="topbar"><span>Avaliação de perfil</span><span>${state.index + 1} de ${questions.length}</span></div>
      <section class="card">
        <div class="progress" aria-hidden="true"><span style="width:${progress}%"></span></div>
        <p class="step-label">Pergunta ${state.index + 1}</p>
        <h2 class="prompt" tabindex="-1">${question.prompt}</h2>
        ${question.hint ? `<p class="hint">${question.hint}</p>` : `<div class="hint"></div>`}
        <div class="options" role="${question.type === "multi" ? "group" : "radiogroup"}">${options}</div>
        <div class="actions">
          ${state.index > 0 ? '<button class="btn ghost" id="back" type="button">Voltar</button>' : ""}
          ${question.type === "multi" ? `<button class="btn primary" id="next" type="button" ${selected.length ? "" : "disabled"}>Continuar</button>` : ""}
        </div>
      </section>
    </div>
  `;

  app.dataset.question = question.id;
  const keep = keepValue ? document.querySelector(`[data-value="${keepValue}"]`) : null;
  if (keep) keep.focus();
  else document.querySelector(".prompt").focus();

  document.querySelectorAll(".option").forEach((button) => {
    button.addEventListener("click", () => choose(question, button.dataset.value, button));
  });

  const back = document.querySelector("#back");
  if (back) back.addEventListener("click", goBack);

  const next = document.querySelector("#next");
  if (next) next.addEventListener("click", goNext);
}

function choose(question, value, button) {
  if (state.busy || state.leaving) return;

  if (question.type === "multi") {
    const list = state.answers.problemas;
    const next = list.includes(value)
      ? list.filter((item) => item !== value)
      : [...list, value];
    state.answers.problemas = next;
    const on = next.includes(value);
    button.setAttribute("aria-checked", String(on));
    button.classList.remove("pop");
    void button.offsetWidth;
    button.classList.add("pop");
    const nextButton = document.querySelector("#next");
    if (nextButton) nextButton.disabled = next.length === 0;
    return;
  }

  state.busy = true;
  button.classList.add("picked");
  button.setAttribute("aria-checked", "true");
  document.querySelector(".options").style.pointerEvents = "none";
  state.answers[question.id] = value;
  if (question.id === "tentativa" && value === "nunca") state.answers.resultado = null;
  later(() => {
    state.busy = false;
    goNext();
  }, reducedMotion() ? 40 : 380);
}

function goBack() {
  if (state.busy || state.leaving || state.index === 0) return;
  playTransition("back", () => {
    state.index -= 1;
  });
}

function goNext() {
  if (state.leaving) return;
  playTransition("forward", () => {
    const questions = visibleQuestions();
    if (state.index < questions.length - 1) state.index += 1;
    else state.screen = "analysis";
  });
}

function renderAnalysis() {
  const phrases = [
    "Analisando o seu perfil",
    "Vendo qual tratamento é ideal para você",
    "Fechando o motivo dessa indicação",
  ];
  app.innerHTML = `
    <div class="${shellClass()}">
      <section class="card analysis">
        <div class="ring" aria-hidden="true"></div>
        <p class="eyebrow">Um instante</p>
        <h2 id="phrase" class="show">${phrases[0]}</h2>
        <div class="loader-track" aria-hidden="true"><span></span></div>
        <ul class="checks">
          <li class="on"><i class="dot" aria-hidden="true"></i> Lendo o motivo para emagrecer</li>
          <li><i class="dot" aria-hidden="true"></i> Comparando o que você já tentou</li>
          <li><i class="dot" aria-hidden="true"></i> Definindo o tratamento ideal</li>
        </ul>
      </section>
    </div>
  `;

  const step = reducedMotion() ? 80 : 950;
  phrases.forEach((text, index) => {
    if (index === 0) return;
    later(() => {
      const phrase = document.querySelector("#phrase");
      const item = document.querySelectorAll(".checks li")[index];
      if (!phrase) return;
      phrase.classList.remove("show");
      phrase.textContent = text;
      requestAnimationFrame(() => phrase.classList.add("show"));
      item?.classList.add("on");
    }, index * step);
  });

  later(() => {
    state.screen = "result";
    state.selectedPlan = null;
    state.direction = "forward";
    render();
  }, reducedMotion() ? 280 : step * phrases.length + 280);
}

function profileCopy(answers) {
  const problems = new Set(answers.problemas);
  const appetite = problems.has("doces") || problems.has("fome");
  const energy = problems.has("cansaco");
  const joints = problems.has("articulacoes") || answers.motivo === "bemestar";

  let showAppetite = appetite;
  let showEnergy = energy;
  if (!showAppetite && !showEnergy) {
    if (answers.motivo === "rotina") showEnergy = true;
    else if (answers.motivo !== "bemestar") showAppetite = true;
  }

  let headline = "Para o seu perfil, o suplemento acelera o metabolismo e busca mais leveza no dia a dia.";
  if (showAppetite && showEnergy) {
    headline = "Para o seu perfil, o suplemento acelera o metabolismo, controla o apetite e eleva a sua energia.";
  } else if (showAppetite) {
    headline = "Para o seu perfil, o suplemento acelera o metabolismo e controla a vontade de comer doce.";
  } else if (showEnergy) {
    headline = "Para o seu perfil, o suplemento acelera o metabolismo e aumenta a sua energia ao longo do dia.";
  }

  const paragraphs = [];
  if (answers.motivo === "aparencia") {
    paragraphs.push("Você procura emagrecer pela aparência. A indicação é um suplemento alimentar para o metabolismo acelerar e o corpo começar a responder de um jeito visível.");
  } else if (answers.motivo === "rotina") {
    paragraphs.push("O peso não está só na aparência: ele atrapalha a sua rotina. A indicação é um suplemento alimentar para o metabolismo trabalhar a favor do seu dia.");
  } else {
    paragraphs.push("Você quer emagrecer porque o peso atravessa o bem-estar e chega nas articulações. A indicação é um suplemento alimentar para o metabolismo acelerar e o corpo ficar mais leve ao longo do uso.");
  }

  if (answers.tentativa === "treinos") {
    paragraphs.push("Você já fez rotina de treinos. O produto entra como apoio de metabolismo, para o esforço não depender só da academia.");
  } else if (answers.tentativa === "nutricionista") {
    paragraphs.push("Você já fez dieta com nutricionista. O suplemento não substitui esse cuidado: ele apoia o metabolismo para o plano ser mais sustentável.");
  } else if (answers.tentativa === "suplemento") {
    paragraphs.push("Você já usou suplemento para emagrecer. Aqui a apresentação muda conforme o seu perfil, em vez de repetir uma promessa igual para todo mundo.");
  } else {
    paragraphs.push("Como este é um começo, a indicação parte do que você sente hoje, sem copiar um protocolo genérico.");
  }

  if (answers.resultado === "nao-rotina") {
    const blocks = [];
    if (problems.has("doces") || problems.has("fome")) blocks.push("a fome e a vontade de doce");
    if (problems.has("cansaco")) blocks.push("o cansaço");
    const because = blocks.length ? `, principalmente ${blocks.join(" e ")}` : "";
    paragraphs.push(`Da última vez o resultado não veio porque a rotina não foi seguida até o fim. O encaixe agora é reduzir o que sabota essa constância${because}.`);
  } else if (answers.resultado === "nao-efeito") {
    paragraphs.push("O que você usou não causou o efeito esperado. Por isso o produto, aqui, fala do que o seu perfil precisa: metabolismo, apetite ou energia.");
  } else if (answers.resultado === "efeito-sanfona") {
    paragraphs.push("Você emagreceu durante o uso e depois recuperou o peso. Um ciclo curto demais é o que costuma deixar esse resultado para trás.");
  } else if (answers.resultado === "sim") {
    paragraphs.push("Você já teve um resultado satisfatório. O próximo passo é sustentar o que funcionou por tempo suficiente para o corpo estabilizar.");
  }

  const effects = [
    {
      title: "Metabolismo",
      short: "Acelera o metabolismo",
      text: "É um suplemento alimentar que age acelerando o seu metabolismo.",
    },
  ];
  if (showAppetite) {
    effects.push({
      title: "Apetite",
      short: "Controla a vontade de comer doce",
      text: "Também ajuda a controlar o apetite, para você não sentir aquela vontade de comer doce, nem a fome fora de hora.",
    });
  }
  if (showEnergy) {
    effects.push({
      title: "Energia",
      short: "Aumenta a energia durante o dia",
      text: "Tem elementos na composição que elevam o seu nível de energia, para você sentir mais disposição durante o dia e conseguir gastar mais.",
    });
  }
  if (joints) {
    effects.push({
      title: "Leveza",
      short: "Mais leveza na rotina",
      text: "Com o emagrecimento ao longo do tratamento, a rotina tende a pesar menos, inclusive para quem sente as articulações no dia a dia.",
    });
  }

  let whyThree = "É o período com melhor equilíbrio entre resultado e constância para o perfil que você descreveu.";
  if (answers.resultado === "efeito-sanfona") {
    whyThree = "Três meses dão tempo de consolidar o emagrecimento, para o peso não voltar quando o uso acaba.";
  } else if (answers.resultado === "nao-rotina") {
    whyThree = "Três meses cabem melhor do que um ciclo curto: dá tempo de a rotina encaixar de verdade.";
  } else if (answers.resultado === "nao-efeito") {
    whyThree = "Um prazo curto demais foi, muitas vezes, o que fez o produto parecer sem efeito. Três meses mudam essa conta.";
  }

  const feels = [];
  if (problems.has("doces")) feels.push("vontade de comer doce o tempo todo");
  if (problems.has("fome")) feels.push("fome fora de hora");
  if (problems.has("cansaco")) feels.push("cansaço durante o dia");
  if (problems.has("articulacoes")) feels.push("dores nas articulações");
  if (problems.has("metabolismo")) feels.push("metabolismo lento");

  let because = "Porque este é o encaixe com o que você respondeu.";
  if (answers.motivo === "aparencia") because = "Porque você procura emagrecer pela aparência";
  else if (answers.motivo === "rotina") because = "Porque o peso está atrapalhando a sua rotina";
  else if (answers.motivo === "bemestar") because = "Porque o peso está pesando no seu bem-estar e nas articulações";
  if (feels.length) because += ` e convive com ${listPt(feels)}`;
  because += ".";

  return { headline, paragraphs, effects, whyThree, because };
}

function listPt(items) {
  if (items.length <= 1) return items[0] || "";
  return `${items.slice(0, -1).join(", ")} e ${items[items.length - 1]}`;
}

function renderResult() {
  clearTimer();
  const copy = profileCopy(state.answers);
  const featured = CONFIG.plans["3"];
  const chips = [
    MOTIVO_LABEL[state.answers.motivo],
    ...state.answers.problemas.map((item) => PROBLEMA_LABEL[item]),
  ].filter(Boolean);

  const others = OTHER_ORDER.map((id) => {
    const plan = CONFIG.plans[id];
    const selected = state.selectedPlan === id ? " is-selected" : "";
    return `
      <button class="plan-mini${selected}" type="button" data-plan="${id}">
        <span class="mini-title">Tratamento de ${plan.title}</span>
        <span class="mini-of">${CONFIG.installments}x de</span>
        <span class="mini-big">${money(plan.installment, true)}</span>
        <span class="mini-cash">ou ${money(plan.price)} à vista</span>
      </button>
    `;
  }).join("");

  const choice = state.selectedPlan
    ? `<div class="choice">${choiceMessage(state.selectedPlan)}</div>`
    : "";

  app.innerHTML = `
    <div class="buybar">
      <div>
        <strong>Tratamento de 3 meses</strong>
        <span>O mais indicado para você</span>
      </div>
      <button class="buybar-btn" id="buy-now" type="button">Comprar agora</button>
    </div>
    <div class="${shellClass()}">
      <div class="topbar"><span>Sua indicação</span><button class="linkish" id="restart" type="button">Refazer</button></div>
      <section class="reason">
        <p class="eyebrow">Resultado do seu perfil</p>
        <h2 tabindex="-1">O melhor tratamento para você é o de 3 meses.</h2>
        <p class="because">${copy.because}</p>
        <p class="why">${copy.whyThree}</p>
        <p class="verdict">De acordo com as suas respostas, analisando seu perfil e a sua necessidade como paciente, nós recomendamos para você o tratamento de três meses com ${CONFIG.productName}.</p>
        <div class="chips">${chips.map((chip) => `<span class="chip">${chip}</span>`).join("")}</div>
        <button class="scroll-cue" id="scroll-cue" type="button">
          <span>Role para ver o valor</span>
          <i class="chevron" aria-hidden="true"></i>
        </button>
      </section>
      <article class="offer" id="preco">
          <div class="offer-stage">${productVisual()}</div>
          <p class="offer-banner">Tratamento de 3 meses</p>
          <div class="offer-body">
            <p class="offer-kicker">${featured.note}</p>
            <h3>${CONFIG.productLabel}</h3>
            <ul class="offer-points">
              ${copy.effects.map((effect) => `<li>${effect.short}</li>`).join("")}
            </ul>
            <div class="price-box">
              <p class="from">De <s>${money(featured.compareAt)}</s></p>
              <p class="of">por apenas ${CONFIG.installments}x de</p>
              <p class="big">${money(featured.installment, true)}</p>
              <p class="avista">ou ${money(featured.price)} à vista</p>
            </div>
            <button class="btn primary full" id="buy-featured" type="button">${state.selectedPlan === "3" ? "Tratamento de 3 meses selecionado" : "Quero o tratamento de 3 meses"}</button>
          </div>
        </article>
        <h3 class="others-title">Outros períodos</h3>
        <p class="others-note">Se preferir outro prazo, o valor parcelado também aparece em cada um.</p>
        <div class="plan-grid">${others}</div>
        ${choice}
        <p class="footer-note">Suplemento alimentar. Não é medicamento. Este questionário organiza uma recomendação comercial de acordo com as suas respostas e não substitui orientação médica ou nutricional.</p>
    </div>
    <button class="float-hint" id="float-hint" type="button">
      <span>Ver o valor</span>
      <i class="chevron" aria-hidden="true"></i>
    </button>
  `;

  if (!state.selectedPlan) document.querySelector("h2")?.focus({ preventScroll: true });
  else document.querySelector(".choice")?.scrollIntoView({ block: "nearest" });

  document.querySelector("#restart").addEventListener("click", restart);
  document.querySelector("#buy-now").addEventListener("click", scrollToPrice);
  document.querySelector("#scroll-cue").addEventListener("click", scrollToPrice);
  document.querySelector("#float-hint").addEventListener("click", scrollToPrice);
  document.querySelector("#buy-featured").addEventListener("click", () => selectPlan("3"));
  document.querySelectorAll(".plan-mini").forEach((row) => {
    row.addEventListener("click", () => selectPlan(row.dataset.plan));
  });
  watchPrice();
  if (!state.trackedResult) {
    state.trackedResult = true;
    if (window.fbq) {
      fbq("track", "ViewContent", {
        content_name: "Resultado do quiz",
        content_category: "Tratamento de 3 meses",
      });
    }
  }
}

function choiceMessage(id) {
  const plan = CONFIG.plans[id];
  return `Você escolheu o tratamento de ${plan.title}: ${CONFIG.installments}x de ${money(plan.installment, true)} ou ${money(plan.price)} à vista.`;
}

function watchPrice() {
  state.observer?.disconnect();
  const price = document.getElementById("preco");
  const hint = document.getElementById("float-hint");
  if (!price || !hint) return;
  state.observer = new IntersectionObserver(([entry]) => {
    hint.hidden = entry.isIntersecting;
  }, { threshold: 0.35 });
  state.observer.observe(price);
}

function selectPlan(id) {
  const plan = CONFIG.plans[id];
  state.selectedPlan = id;
  state.direction = "none";
  if (window.fbq) {
    fbq("track", "InitiateCheckout", {
      content_name: "Tratamento de " + plan.title,
      value: plan.price,
      currency: "BRL",
    });
  }
  if (plan.url) {
    window.open(plan.url, "_blank", "noopener");
  } else if (CONFIG.whatsapp) {
    const text = `Olá! Quero o tratamento de ${plan.title} de ${CONFIG.productName}.`;
    window.open(`https://wa.me/${CONFIG.whatsapp}?text=${encodeURIComponent(text)}`, "_blank", "noopener");
  }
  const top = window.scrollY;
  render();
  window.scrollTo(0, top);
}

function restart() {
  clearTimer();
  state.observer?.disconnect();
  state.screen = "intro";
  state.index = 0;
  state.direction = "forward";
  state.busy = false;
  state.leaving = false;
  state.selectedPlan = null;
  state.trackedResult = false;
  state.answers = { motivo: null, tentativa: null, resultado: null, problemas: [] };
  render();
}

render();
