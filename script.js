// PollZ: Beginner-Friendly Poll App (with Azure Functions backend)

const API_BASE = window.location.hostname === 'localhost' 
  ? "http://localhost:7071/api"
  : "https://mohsin-pollz-function-ebf4fad7ame7hhcj.northeurope-01.azurewebsites.net/api";

const feed = document.getElementById('feed');
const fab = document.getElementById('create-poll-fab');
const modal = document.getElementById('create-poll-modal');
const closeModalBtn = document.getElementById('close-modal-btn');
const addOptionBtn = document.getElementById('add-option-btn');
const optionsWrapper = document.getElementById('poll-options-inputs');
const form = document.getElementById('create-poll-form');
const questionInput = document.getElementById('poll-question');

const VOTE_KEY_PREFIX = "pollz_vote_";
function getUserVote(pollId) {
  return localStorage.getItem(VOTE_KEY_PREFIX + pollId);
}
function setUserVote(pollId, optionIndex) {
  localStorage.setItem(VOTE_KEY_PREFIX + pollId, optionIndex);
}

async function showAllPolls() {
  feed.innerHTML = '<div class="loading">Loading polls...</div>';
  let polls = [];
  try {
    const res = await fetch(API_BASE + "/getAllPolls");
    polls = await res.json();
  } catch (e) {
    feed.innerHTML = '<div class="error">Could not load polls.</div>';
    return;
  }
  feed.innerHTML = "";
  for (let i = 0; i < polls.length; i++) {
    showOnePoll(polls[i]);
  }
}

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

async function voteForOption(pollId, optionIndex) {
  setUserVote(pollId, optionIndex);
  try {
    await fetch(API_BASE + "/votePoll", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ poll_id: pollId, option_index: optionIndex })
    });
  } catch (e) {
    localStorage.removeItem(VOTE_KEY_PREFIX + pollId);
    alert('Failed to vote.');
  }
  showAllPolls();
}

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
    try {
      await fetch(API_BASE + "/createPoll", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: question, options: options })
      });
    } catch (e) {
      alert('Failed to create poll.');
    }
    showAllPolls();
    form.reset();
    while (optionsWrapper.children.length > 2) {
      optionsWrapper.removeChild(optionsWrapper.lastChild);
    }
    modal.classList.add('hidden');
  });
});