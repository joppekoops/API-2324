const eventSrc = new EventSource('/events/master');
const main = document.querySelector('main');

eventSrc.onmessage = async (event) => {
	//const data = await (JSON.parse(event.data));
	if (event.data != 'undefined') {
		main.innerHTML = event.data;
	}

	// buttons.forEach((button, i) => {
	// 	button.innerHTML = data.answers[i];
	// 	questionNumberInput.value = data.question;
	// });

}

const countdownSound = new Audio('../sounds/countdown.mp3');

const music = new Audio('../sounds/music.mp3');