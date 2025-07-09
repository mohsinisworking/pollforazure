// ==== CONFIG & HELPERS ====

// Your Azure Function base URL:
const BASE_URL = "https://mohsin-pollz-function-ebf4fad7ame7hhcj.northeurope-01.azurewebsites.net/api";

// LocalStorage keys use a consistent prefix:
const STORAGE_PREFIX = "poll_vote_";

// Get stored vote index (or null)
function getUserVote(pollId) {
  return localStorage.getItem(STORAGE_PREFIX + pollId);
}
// Store vote index
function setUserVote(pollId, optionIndex) {
  localStorage.setItem(STORAGE_PREFIX + pollId, optionIndex);
}

// ==== DOM REFERENCES ====
const feed             = document.getElementById('feed');
const fab              = document.getElementById('create-poll-fab');
const modal            = document.getElementById('create-poll-modal');
const closeModalBtn    = document.getElementById('close-modal-btn');
const addOptionBtn     = document.getElementById('add-option-btn');
const optionsWrapper   = document.getElementById('poll-options-inputs');
const form             = document.getElementById('create-poll-form');
const questionInput    = document.getElementById('poll-question');

// ==== SAMPLE POLLS (pre‑seeded) ====
const samplePolls = [
  {
    poll_id: "sample1",
    question: "Best Economic Plan?",
    options: ["Capitalism", "Communism", "Socialism"],
    votes:    [0, 0, 0]
  },
  {
    poll_id: "sample2",
    question: "Best Season?",
    options: ["Spring", "Summer", "Autumn", "Winter"],
    votes:    [0, 0, 0, 0]
  },
  {
    poll_id: "sample3",
    question: "Should Pakistan adopt Secularism?",
    options: ["YES!", "NO!"],
    votes:    [0, 0]
  }
];

// ==== EVENT BINDINGS ====
document.addEventListener('DOMContentLoaded', () => {
  // 1) show samples immediately
  samplePolls.forEach(p => renderPoll(p));

  // 2) then load any real polls from backend
  loadPolls();

  // 3) FAB — open modal
  fab.addEventListener('click', () => {
    modal.classList.remove('hidden');
    questionInput.focus();
  });

  // 4) close modal in any of three ways
  closeModalBtn.addEventListener('click', () => modal.classList.add('hidden'));
  modal.addEventListener('click', e => { if (e.target === modal) modal.classList.add('hidden'); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape') modal.classList.add('hidden'); });

  // 5) add extra option (up to 6)
  addOptionBtn.addEventListener('click', () => {
    const inputs = optionsWrapper.querySelectorAll('.poll-option-input');
    if (inputs.length >= 6) {
      alert('Maximum of 6 options allowed.');
      return;
    }
    const idx = inputs.length + 1;
    const inp = document.createElement('input');
    inp.name = 'option';
    inp.type = 'text';
    inp.required = true;
    inp.placeholder = `Option ${idx}`;
    inp.className = 'poll-option-input';
    optionsWrapper.appendChild(inp);
    inp.focus();
  });

  // 6) handle form submission
  form.addEventListener('submit', async e => {
    e.preventDefault();

    // collect question + options
    const question = questionInput.value.trim();
    const options  = Array.from(optionsWrapper.querySelectorAll('input'))
                          .map(i => i.value.trim())
                          .filter(v => v !== '');

    // enforce at least 2 options
    if (options.length < 2) {
      alert('Please enter at least 2 options.');
      return;
    }

    // build payload
    const newPoll = {
      poll_id : Date.now().toString(),
      question,
      options
    };

    try {
      // send to backend
      const res = await fetch(`${BASE_URL}/createPoll`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(newPoll)
      });
      if (!res.ok) throw new Error('Create failed');
      const created = await res.json();

      // render it immediately
      renderPoll({ ...newPoll, votes: options.map(_=>0) });
    } catch(err) {
      console.error(err);
      alert('Could not create poll. See console.');
    }

    // reset form
    form.reset();
    // remove extra inputs beyond the first two
    while (optionsWrapper.children.length > 2) {
      optionsWrapper.removeChild(optionsWrapper.lastChild);
    }
    modal.classList.add('hidden');
  });
});

// ==== DATA FETCH & RENDERING ====

async function loadPolls() {
  try {
    const res      = await fetch(`${BASE_URL}/getAllPolls`);
    const pollsArr = await res.json();      // expect [{poll_id, question, options, votes}, ...]
    pollsArr.forEach(renderPoll);
  } catch(err) {
    console.error('Error loading polls:', err);
    feed.insertAdjacentHTML('beforeend', '<p class="error">Could not load polls.</p>');
  }
}

function renderPoll(poll) {
  // if passed separate args, normalize:
  if (!poll.question) {
    const [poll_id, question, options, votes] = arguments;
    poll = { poll_id, question, options, votes };
  }

  // remove existing DOM node if re‑rendering
  const existing = feed.querySelector(`[data-poll-id="${poll.poll_id}"]`);
  if (existing) existing.remove();

  // build the card
  const card = document.createElement('div');
  card.className     = 'poll';
  card.dataset.pollId = poll.poll_id;

  // header
  const hdr = document.createElement('div');
  hdr.className   = 'poll-header';
  hdr.textContent = poll.question;
  card.appendChild(hdr);

  // options list
  const ul = document.createElement('ul');
  ul.className = 'poll-options';

  // total votes (for percentages)
  const totalVotes = Array.isArray(poll.votes)
    ? poll.votes.reduce((a,b)=>a+b, 0)
    : 0;

  poll.options.forEach((opt, idx) => {
    const li = document.createElement('li');
    li.className   = 'poll-option';
    li.textContent = opt;

    // if user has voted here, highlight
    if (getUserVote(poll.poll_id) == idx) {
      li.classList.add('voted');
    }

    // show percentage
    if (totalVotes > 0) {
      const pct = Math.round((poll.votes[idx] || 0) / totalVotes * 100);
      const span = document.createElement('span');
      span.textContent = `${pct}%`;
      li.appendChild(span);
    }

    // clicking casts vote
    li.addEventListener('click', () => {
      const prev = getUserVote(poll.poll_id);
      if (prev == idx) return;         // no change

      setUserVote(poll.poll_id, idx);
      voteOnPoll(poll.poll_id, idx, card);
    });

    ul.appendChild(li);
  });

  card.appendChild(ul);
  feed.appendChild(card);
}

async function voteOnPoll(pollId, optionIndex, cardEl) {
  try {
    await fetch(`${BASE_URL}/votePoll`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ poll_id: pollId, option_index: optionIndex })
    });
    // re‑fetch just this poll’s newest data
    const res  = await fetch(`${BASE_URL}/getPoll?poll_id=${encodeURIComponent(pollId)}`);
    const data = await res.json();
    renderPoll(data);
  } catch(err) {
    console.error('Vote error:', err);
  }
}
