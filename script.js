document.addEventListener('DOMContentLoaded', () => {
    // --- Poll Data ---
    let polls = JSON.parse(localStorage.getItem('polls'));
    if (!Array.isArray(polls) || polls.length === 0) {
        polls = [
            {
                id: 1,
                question: 'What car do you have?',
                options: ['Sedan', 'Truck', 'EV', 'No Car']
            },
            {
                id: 2,
                question: 'Apple or Android for gaming?',
                options: ['APPLE', 'ANDROID', 'nokia']
            }
        ];
        localStorage.setItem('polls', JSON.stringify(polls));
    }

    function savePolls() {
        localStorage.setItem('polls', JSON.stringify(polls));
    }

    // --- Modal Logic ---
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

    createPollForm.addEventListener('submit', (event) => {
        event.preventDefault();
        const questionInput = document.getElementById('poll-question');
        const optionInputs = pollOptionsInputs.querySelectorAll('.poll-option-input');
        const options = Array.from(optionInputs).map(input => input.value.trim()).filter(Boolean);

        if (options.length < 2) {
            alert('Please provide at least two options.');
            return;
        }

        const newPoll = {
            id: Date.now(),
            question: questionInput.value.trim(),
            options: options
        };
        polls.unshift(newPoll);
        savePolls();
        displayPolls();

        // Reset form
        questionInput.value = '';
        pollOptionsInputs.innerHTML = `
            <input type="text" class="poll-option-input" placeholder="Option 1" required>
            <input type="text" class="poll-option-input" placeholder="Option 2" required>
        `;
        modal.style.display = 'none';
    });

    // --- Poll Rendering & Voting ---
    function displayPolls() {
        feed.innerHTML = '';
        polls.forEach(poll => {
            const pollElement = document.createElement('div');
            pollElement.classList.add('poll');
            pollElement.dataset.pollId = poll.id;

            const questionElement = document.createElement('div');
            questionElement.classList.add('poll-header');
            questionElement.textContent = poll.question;
            pollElement.appendChild(questionElement);

            const optionsElement = document.createElement('ul');
            optionsElement.classList.add('poll-options');

            poll.options.forEach((option, index) => {
                const optionElement = createPollOptionElement(option, index);
                optionElement.addEventListener('click', () => handleVote(poll.id, index, pollElement));
                optionsElement.appendChild(optionElement);
            });

            pollElement.appendChild(optionsElement);
            feed.appendChild(pollElement);

            // Show results if voted
            const votesData = JSON.parse(localStorage.getItem('pollVotes') || '{}');
            const pollVotes = votesData[poll.id] || [];
            const userVote = pollVotes.find(vote => vote.user === 'me');
            if (userVote) {
                showResults(pollElement, userVote.selectedOption);
            }
        });
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

    function handleVote(pollId, selectedOption, pollElement) {
        // Save vote
        const votesData = JSON.parse(localStorage.getItem('pollVotes') || '{}');
        if (!votesData[pollId]) votesData[pollId] = [];
        // Only allow one vote per user (simulate with 'me')
        votesData[pollId] = votesData[pollId].filter(vote => vote.user !== 'me');
        votesData[pollId].push({ user: 'me', selectedOption });
        localStorage.setItem('pollVotes', JSON.stringify(votesData));
        showResults(pollElement, selectedOption);
    }

    function showResults(pollElement, userSelectedOption) {
        const options = pollElement.querySelectorAll('.poll-option');
        options.forEach(option => option.classList.remove('selected'));
        if (userSelectedOption !== undefined) {
        options[userSelectedOption].classList.add('selected');
        }
        const pollId = parseInt(pollElement.dataset.pollId);
        const results = getVoteResults(pollId, options.length);
        updateResultBars(options, results);
    }   

    function getVoteResults(pollId, numOptions) {
        const votesData = JSON.parse(localStorage.getItem('pollVotes') || '{}');
        const pollVotes = votesData[pollId] || [];
        const counts = Array(numOptions).fill(0);
        pollVotes.forEach(vote => {
            if (vote.selectedOption >= 0 && vote.selectedOption < numOptions) {
                counts[vote.selectedOption]++;
            }
        });
        const total = pollVotes.length;
        return counts.map(count => total ? Math.round((count / total) * 100) : 0);
    }

    function updateResultBars(options, results) {
        options.forEach((option, index) => {
            let bar = option.querySelector('.result-bar');
            if (!bar) {
                bar = document.createElement('div');
                bar.classList.add('result-bar');
                option.insertBefore(bar, option.firstChild);
            }
            bar.style.width = `${results[index]}%`;
            const percentageEl = option.querySelector('.result-percentage');
            percentageEl.textContent = `${results[index]}%`;
        });
    }

    displayPolls();
});