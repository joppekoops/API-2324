// Counts down the countdown elements and plays sounds and music

const timerInterval = ''; // variable used for timer intervals

// check for a timer element when the document changes
const mutationObserver = new MutationObserver((entries) => {
	const countdown = document.querySelector('.countdown');
	const questionCountdown = document.querySelector('.question-countdown');

	// losse countdown
	if (countdown) {
		let time = parseInt(countdown.textContent);
		const timerInterval = setInterval(() => {

			if(time <= 1) { //stop bij 1
				if(countdownSound) { //check for sound, because only the master has them, defined in master.js
					countdownSound.play();
				}
				clearInterval(timerInterval);
			} else {

				if(countdownSound) {
					countdownSound.play();
				}

				time--;
				countdown.innerHTML = time;
			}
		}, 1000);

	// countdown bij de question
	} else if (questionCountdown) {
		let time = parseInt(questionCountdown.textContent);
		const timerInterval = setInterval(() => {

			if(time <= 1) {
				if (music) {
					music.pause();
					music.currentTime = 0;
				}
				clearInterval(timerInterval);
			} else {

				if (music) {
					music.play();
				}

				time--;
				questionCountdown.innerHTML = time;
			}
		}, 1000);
	} else {
		clearInterval(timerInterval);
		if (music) {
			music.pause();
			music.currentTime = 0;
		}
	}
});

mutationObserver.observe(main, {childList: true, subtree: true});