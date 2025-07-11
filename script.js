// PollZ: Beginner-Friendly Poll App (with Azure Functions backend)

// Use your Azure Functions App URL (no trailing slash)
const API_BASE = "https://mohsin-pollz-function-ebf4fad7ame7hhcj.northeurope-01.azurewebsites.net/api";

// --- Get references to HTML elements ---
const feed = document.getElementById('feed');
const fab = document.getElementById('create-poll-fab');
const modal = document.getElementById('create-poll-modal');
const closeModalBtn = document.getElementById('close-modal-btn');
const addOptionBtn = document.getElementById('add-option-btn');
const optionsWrapper = document.getElementById('poll-options-inputs');
const form = document.getElementById('create-poll-form');
const questionInput = document.getElementById('poll-question');

// --- User vote is stored locally so user can't vote twice ---
const VOTE_KEY_PREFIX = "pollz_vote_";
function getUserVote(pollId) {
  return localStorage.getItem(VOTE_KEY_PREFIX + pollId);
}
function setUserVote(pollId, optionIndex) {
  localStorage.setItem(VOTE_KEY_PREFIX + pollId, optionIndex);
}

// --- Show all polls in the feed ---
async function showAllPolls() {
  feed.innerHTML = "";
  const polls = await fetchPolls();
  for (let i = 0; i < polls.length; i++) {
    showOnePoll(polls[i]);
  }
}

// --- Fetch all polls from backend ---
async function fetchPolls() {
  const res = await fetch(API_BASE + "/getAllPolls");
  return await res.json();
}

// --- Show one poll card ---
function showOnePoll(poll) {
  const card = document.createElement('div');
  card.className = 'poll';
  card.dataset.pollId = poll.poll_id;

  const questionDiv = document.createElement('div');
  questionDiv.className = 'poll-header';
  questionDiv.textContent = poll.question;
  card.appendChild(questionDiv);

  const optionsList = document.createElement('ul');
  optionsList.className = 'poll-options';
  const totalVotes = poll.votes.reduce(function(a, b) { return a + b; }, 0);
  const userVote = getUserVote(poll.poll_id);

  for (let i = 0; i < poll.options.length; i++) {
    const optionText = poll.options[i];
    const li = document.createElement('li');
    li.className = 'poll-option';
    li.textContent = optionText;

    if (userVote == i) {
      li.classList.add('voted');
      li.title = 'You voted for this option.';
    }
    if (totalVotes > 0) {
      const pct = Math.round((poll.votes[i] || 0) / totalVotes * 100);
      const span = document.createElement('span');
      span.textContent = pct + "%";
      li.appendChild(span);
    }
    if (userVote === null) {
      li.addEventListener('click', function() {
        voteForOption(poll.poll_id, i);
      });
    } else {
      li.style.cursor = 'default';
      li.style.opacity = userVote == i ? '1' : '0.6';
    }
    optionsList.appendChild(li);
  }
  card.appendChild(optionsList);
  feed.appendChild(card);
}

// --- When a user votes for an option ---
async function voteForOption(pollId, optionIndex) {
  setUserVote(pollId, optionIndex);
  await fetch(API_BASE + "/votePoll", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ poll_id: pollId, option_index: optionIndex })
  });
  showAllPolls();
}

// --- Modal and Poll Creation ---
document.addEventListener('DOMContentLoaded', function() {
  modal.classList.add('hidden');
  showAllPolls();

  fab.addEventListener('click', function() {
    modal.classList.remove('hidden');
    questionInput.focus();
  });
  closeModalBtn.addEventListener('click', function(e) {
    e.preventDefault();
    modal.classList.add('hidden');
  });
  modal.addEventListener('click', function(e) {
    if (e.target === modal) modal.classList.add('hidden');
  });
  document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') modal.classList.add('hidden');
  });

  addOptionBtn.addEventListener('click', function() {
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
    inp.placeholder = 'Option ' + idx;
    inp.className = 'poll-option-input';
    optionsWrapper.appendChild(inp);
    inp.focus();
  });

  form.addEventListener('submit', async function(e) {
    e.preventDefault();
    const question = questionInput.value.trim();
    const options = Array.from(optionsWrapper.querySelectorAll('input'))
      .map(function(i) { return i.value.trim(); })
      .filter(function(v) { return v !== ''; });
    if (options.length < 2) {
      alert('Please enter at least 2 options.');
      return;
    }
    await fetch(API_BASE + "/createPoll", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ question: question, options: options })
    });
    showAllPolls();
    form.reset();
    while (optionsWrapper.children.length > 2) {
      optionsWrapper.removeChild(optionsWrapper.lastChild);
    }
    modal.classList.add('hidden');
  });
});
