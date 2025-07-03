const BASE_URL = "https://mohsin-pollz-function-ebf4fad7ame7hhcj.northeurope-01.azurewebsites.net/api";

document.addEventListener('DOMContentLoaded', () => {
    const createPollBtn = document.getElementById('create-poll-fab');
    const modal = document.getElementById('create-poll-modal');
    const closeModalBtn = document.getElementById('close-modal-btn');
    const addOptionBtn = document.getElementById('add-option-btn');
    const pollOptionsInputs = document.getElementById('poll-options-inputs');
    const createPollForm = document.getElementById('create-poll-form');
    const feed = document.getElementById('feed');

    createPollBtn.addEventListener('click', () => {
        modal.style.display = 'flex';
        document.getElementById('poll-question').focus();
    });
    closeModalBtn.addEventListener('click', () => {
        modal.style.display = 'none';
    });
    modal.addEventListener('click', (event) => {
        if (event.target === modal) {
            modal.style.display = 'none';
        }
    });

    addOptionBtn.addEventListener('click', () => {
        const optionInputs = pollOptionsInputs.querySelectorAll('.poll-option-input');
        if (optionInputs.length < 6) {
            const newOption = document.createElement('input');
            newOption.type = 'text';
            newOption.classList.add('poll-option-input');
            newOption.placeholder = `Option ${optionInputs.length + 1}`;
            newOption.required = true;
            pollOptionsInputs.appendChild(newOption);
            newOption.focus();
        }
    });

    createPollForm.addEventListener('submit', async (event) => {
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
            const res = await fetch(`${BASE_URL}/createPoll`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newPoll)
            });

            if (!res.ok) throw new Error("Create failed");
            await loadPolls();
        } catch (err) {
            console.error("Create error", err);
        }

        questionInput.value = '';
        pollOptionsInputs.innerHTML = `
            <input type="text" class="poll-option-input" placeholder="Option 1" required>
            <input type="text" class="poll-option-input" placeholder="Option 2" required>
        `;
        modal.style.display = 'none';
    });

    async function loadPolls() {
        try {
            const res = await fetch(`${BASE_URL}/getAllPolls`);
            console.log("Status:", res.status);
            const text = await res.text();
            console.log("Raw response text:", text);
            const pollList = JSON.parse(text);
            console.log("Parsed JSON:", pollList);

            feed.innerHTML = '';

            for (const poll of pollList) {
                const res = await fetch(`${BASE_URL}/getPoll?poll_id=${encodeURIComponent(poll.poll_id)}`);
                const fullPoll = await res.json();
                renderPoll(poll.poll_id, fullPoll.question, fullPoll.options, fullPoll.votes);
            }
        } catch (err) {
            console.error("Error loading polls:", err);
            feed.innerHTML = '<p>Error loading polls.</p>';
        }
    }

    function renderPoll(pollId, question, options, votes) {
        const pollElement = document.createElement('div');
        pollElement.classList.add('poll');
        pollElement.dataset.pollId = pollId;

        const questionElement = document.createElement('div');
        questionElement.classList.add('poll-header');
        questionElement.textContent = question;
        pollElement.appendChild(questionElement);

        const optionsElement = document.createElement('ul');
        optionsElement.classList.add('poll-options');

        options.forEach((option, index) => {
            const optionElement = createPollOptionElement(option, index);
            optionElement.addEventListener('click', () => vote(pollId, index));
            optionsElement.appendChild(optionElement);
        });

        pollElement.appendChild(optionsElement);
        feed.appendChild(pollElement);
        updateResultBars(pollElement, votes);
    }

    async function vote(pollId, optionIndex) {
        try {
            const res = await fetch(`${BASE_URL}/votePoll`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ poll_id: pollId, option_index: optionIndex })
            });

            if (!res.ok) throw new Error("Vote failed");
            await loadPolls();
        } catch (err) {
            console.error("Vote error:", err);
        }
    }

    function createPollOptionElement(option, index) {
        const optionElement = document.createElement('li');
        optionElement.classList.add('poll-option');
        optionElement.dataset.optionIndex = index;

        const optionText = document.createElement('span');
        optionText.classList.add('option-text');
        optionText.textContent = option;
        optionElement.appendChild(optionText);

        const resultPercentage = document.createElement('span');
        resultPercentage.classList.add('result-percentage');
        optionElement.appendChild(resultPercentage);

        return optionElement;
    }

    function updateResultBars(pollElement, votes) {
        const options = pollElement.querySelectorAll('.poll-option');
        const total = votes.reduce((sum, count) => sum + count, 0);

        votes.forEach((count, index) => {
            const percent = total > 0 ? Math.round((count / total) * 100) : 0;
            let bar = options[index].querySelector('.result-bar');
            if (!bar) {
                bar = document.createElement('div');
                bar.classList.add('result-bar');
                options[index].insertBefore(bar, options[index].firstChild);
            }
            bar.style.width = `${percent}%`;
            const percentageEl = options[index].querySelector('.result-percentage');
            percentageEl.textContent = `${percent}%`;
        });
    }

    loadPolls();
});
