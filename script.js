// PollZ: Beginner-Friendly Poll App (with Azure Functions backend)

// Use your Azure Functions App URL (no trailing slash)
const API_BASE = window.location.hostname === 'localhost' 
  ? "http://localhost:7071/api"
  : "https://mohsin-pollz-function-ebf4fad7ame7hhcj.northeurope-01.azurewebsites.net/api";

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
  feed.innerHTML = '<div class="loading">Loading polls...</div>';
  const polls = await fetchPolls();
  feed.innerHTML = "";
  
  // Sort polls by creation time (newest first)
  polls.sort((a, b) => parseInt(b.poll_id) - parseInt(a.poll_id));
  
  for (let i = 0; i < polls.length; i++) {
    showOnePoll(polls[i]);
  }
}

// --- Fetch all polls from backend ---
async function fetchPolls() {
  try {
    const res = await fetch(API_BASE + "/getAllPolls");
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (error) {
    console.error('Failed to fetch polls:', error);
    feed.innerHTML = '<div class="error">Failed to load polls. Please try again.</div>';
    return [];
  }
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
        voteForOption(poll.poll_id, i, li, poll);
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

// --- When a user votes for an option (FIXED: No more reload) ---
async function voteForOption(pollId, optionIndex, clickedElement, pollData) {
  try {
    // Optimistic update - show vote immediately
    setUserVote(pollId, optionIndex);
    
    // Update the clicked option immediately
    clickedElement.classList.add('voted');
    clickedElement.title = 'You voted for this option.';
    
    // Disable all options in this poll
    const pollCard = clickedElement.closest('.poll');
    const allOptions = pollCard.querySelectorAll('.poll-option');
    allOptions.forEach(option => {
      option.style.cursor = 'default';
      if (!option.classList.contains('voted')) {
        option.style.opacity = '0.6';
      }
    });
    
    // Update vote count optimistically
    pollData.votes[optionIndex]++;
    updatePollPercentages(pollCard, pollData);
    
    // Send vote to backend
    const response = await fetch(API_BASE + "/votePoll", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ poll_id: pollId, option_index: optionIndex })
    });
    
    if (!response.ok) throw new Error('Vote failed');
    
    // Get updated data from server and update percentages
    const updatedPoll = await response.json();
    updatePollPercentages(pollCard, updatedPoll);
    
  } catch (error) {
    console.error('Vote failed:', error);
    // Remove the vote from localStorage if it failed
    localStorage.removeItem(VOTE_KEY_PREFIX + pollId);
    
    // Revert optimistic update
    clickedElement.classList.remove('voted');
    clickedElement.title = '';
    
    // Re-enable voting
    const pollCard = clickedElement.closest('.poll');
    const allOptions = pollCard.querySelectorAll('.poll-option');
    allOptions.forEach(option => {
      option.style.cursor = 'pointer';
      option.style.opacity = '1';
    });
    
    alert('Failed to submit vote. Please try again.');
  }
}

// --- Update poll percentages without rebuilding ---
function updatePollPercentages(pollCard, pollData) {
  const totalVotes = pollData.votes.reduce((a, b) => a + b, 0);
  const options = pollCard.querySelectorAll('.poll-option');
  
  options.forEach((option, index) => {
    // Remove existing percentage
    const existingSpan = option.querySelector('span');
    if (existingSpan) {
      existingSpan.remove();
    }
    
    // Add new percentage
    if (totalVotes > 0) {
      const pct = Math.round((pollData.votes[index] || 0) / totalVotes * 100);
      const span = document.createElement('span');
      span.textContent = pct + "%";
      option.appendChild(span);
    }
  });
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
    
    try {
      const response = await fetch(API_BASE + "/createPoll", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: question, options: options })
      });
      
      if (!response.ok) throw new Error('Failed to create poll');
      
      // Refresh to show new poll at the top
      showAllPolls();
      form.reset();
      while (optionsWrapper.children.length > 2) {
        optionsWrapper.removeChild(optionsWrapper.lastChild);
      }
      modal.classList.add('hidden');
    } catch (error) {
      console.error('Failed to create poll:', error);
      alert('Failed to create poll. Please try again.');
    }
  });
});
