const BASE_URL = "https://mohsin-pollz-function-ebf4fad7ame7hhcj.northeurope-01.azurewebsites.net/api";

// Helper functions for storing user's vote in localStorage
function getUserVote(pollId) {
    return localStorage.getItem("poll_vote_" + pollId);
}
function setUserVote(pollId, optionIndex) {
    localStorage.setItem("poll_vote_" + pollId, optionIndex);
}

document.addEventListener('DOMContentLoaded', function() {
    // Get references to elements
    const createPollBtn = document.getElementById('create-poll-fab');
    const modal = document.getElementById('create-poll-modal');
    const closeModalBtn = document.getElementById('close-modal-btn');
    const addOptionBtn = document.getElementById('add-option-btn');
    const pollOptionsInputs = document.getElementById('poll-options-inputs');
    const createPollForm = document.getElementById('create-poll-form');
    const feed = document.getElementById('feed');

    // Show modal when create poll button is clicked
    createPollBtn.addEventListener('click', function() {
        modal.style.display = 'flex';
        document.getElementById('poll-question').focus();
    });

    // Hide modal when close button is clicked
    closeModalBtn.addEventListener('click', function() {
        modal.style.display = 'none';
    });

    // Hide modal when clicking outside the form
    modal.addEventListener('click', function(event) {
        if (event.target === modal) {
            modal.style.display = 'none';
        }
    });

    // Add a new option input (up to 6)
    addOptionBtn.addEventListener('click', function() {
        const optionInputs = pollOptionsInputs.querySelectorAll('.poll-option-input');
        if (optionInputs.length < 6) {
            const newOption = document.createElement('input');
            newOption.type = 'text';
            newOption.className = 'poll-option-input';
            newOption.placeholder = 'Option ' + (optionInputs.length + 1);
            newOption.required = true;
            pollOptionsInputs.appendChild(newOption);
            newOption.focus();
        }
    });

    // Handle poll creation
    createPollForm.addEventListener('submit', async function(event) {
        event.preventDefault();
        const questionInput = document.getElementById('poll-question');
        const optionInputs = pollOptionsInputs.querySelectorAll('.poll-option-input');
        const options = Array.from(optionInputs).map(input => input.value.trim()).filter(Boolean);

        if (options.length < 2) {
            alert('Please provide at least two options.');
            return;
        }

        const newPoll = {
            poll_id: Date.now().toString(),
            question: questionInput.value.trim(),
            options: options
        };

        try {
            const res = await fetch(BASE_URL + '/createPoll', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newPoll)
            });

            if (!res.ok) throw new Error("Create failed");
            await loadPolls();
        } catch (err) {
            console.error("Create error", err);
        }

        // Reset form
        questionInput.value = '';
        optionInputs.forEach((input, idx) => {
            input.value = '';
            input.placeholder = 'Option ' + (idx + 1);
        });
        // Remove extra option inputs beyond the first two
        while (pollOptionsInputs.children.length > 2) {
            pollOptionsInputs.removeChild(pollOptionsInputs.lastChild);
        }
        modal.style.display = 'none';
    });

    // Load and display all polls
    async function loadPolls() {
        try {
            const res = await fetch(BASE_URL + '/getAllPolls');
            const pollList = await res.json();
            feed.innerHTML = '';
            for (const poll of pollList) {
                const pollRes = await fetch(BASE_URL + '/getPoll?poll_id=' + encodeURIComponent(poll.poll_id));
                const fullPoll = await pollRes.json();
                renderPoll(poll.poll_id, fullPoll.question, fullPoll.options, fullPoll.votes);
            }
        } catch (err) {
            console.error("Error loading polls:", err);
            feed.innerHTML = '<p>Error loading polls.</p>';
        }
    }

    // Render a poll in the feed
    function renderPoll(pollId, question, options, votes) {
        const pollElement = document.createElement('div');
        pollElement.className = 'poll';
        pollElement.dataset.pollId = pollId;

        const questionElement = document.createElement('div');
        questionElement.className = 'poll-header';
        questionElement.textContent = question;
        pollElement.appendChild(questionElement);

        const optionsElement = document.createElement('ul');
        optionsElement.className = 'poll-options';

        // Show vote percentages if votes are available
        let totalVotes = 0;
        if (votes && Array.isArray(votes)) {
            totalVotes = votes.reduce((a, b) => a + b, 0);
        }

        options.forEach(function(option, index) {
            const optionElement = document.createElement('li');
            optionElement.className = 'poll-option';
            optionElement.textContent = option;

            // Highlight user's vote
            if (getUserVote(pollId) == index) {
                optionElement.classList.add('voted');
            }

            // Show percentage if votes available
            if (votes && typeof votes[index] === 'number') {
                const percent = totalVotes > 0 ? Math.round((votes[index] / totalVotes) * 100) : 0;
                const percentSpan = document.createElement('span');
                percentSpan.textContent = percent + '%';
                percentSpan.style.marginLeft = '10px';
                percentSpan.style.color = '#2563eb';
                optionElement.appendChild(percentSpan);
            }

            // Smooth highlight on click
            optionElement.addEventListener('click', function() {
                // Optimistically update UI
                const prevVote = getUserVote(pollId);
                if (prevVote == index) return;
                setUserVote(pollId, index);
                // Remove voted class from all options
                const allOptions = optionsElement.querySelectorAll('.poll-option');
                allOptions.forEach(opt => opt.classList.remove('voted'));
                optionElement.classList.add('voted');
                // Optionally show a quick animation
                optionElement.style.transition = 'background 0.3s, border-color 0.3s';
                optionElement.style.background = '#dbeafe';
                optionElement.style.borderColor = '#2563eb';
                // Send vote to backend, then update just this poll
                vote(pollId, index, pollElement);
            });
            optionsElement.appendChild(optionElement);
        });

        pollElement.appendChild(optionsElement);
        feed.appendChild(pollElement);
    }

    // Vote for an option (one vote per person, can change vote)
    async function vote(pollId, optionIndex, pollElement) {
        // Optimistically update localStorage and UI already done
        try {
            const res = await fetch(BASE_URL + '/votePoll', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ poll_id: pollId, option_index: optionIndex })
            });

            if (!res.ok) throw new Error("Vote failed");
            // Only update this poll's results
            const pollRes = await fetch(BASE_URL + '/getPoll?poll_id=' + encodeURIComponent(pollId));
            const fullPoll = await pollRes.json();
            // Remove old pollElement and rerender just this poll
            pollElement.remove();
            renderPoll(pollId, fullPoll.question, fullPoll.options, fullPoll.votes);
        } catch (err) {
            console.error("Vote error:", err);
        }
    }

    // Load polls on page load
    loadPolls();
});