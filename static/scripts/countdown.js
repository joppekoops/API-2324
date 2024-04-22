const timerInterval = '';

const mutationObserver = new MutationObserver((entries) => {
	const countdown = document.querySelector('.countdown');
	const questionCountdown = document.querySelector('.question-countdown');

	if (countdown) {
		let time = parseInt(countdown.textContent);
		const timerInterval = setInterval(() => {

			if(time <= 1) {
				if(countdownSound) {
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